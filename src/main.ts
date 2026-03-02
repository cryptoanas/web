import 'dotenv/config';
import path from 'node:path';
import { ConfigStore } from './config/store';
import { DriftExchange, loadKeypairFromEnv } from './exchange/drift-client';
import { RiskManager } from './risk/risk-manager';
import { IndicatorStrategy } from './strategy/indicator-strategy';
import { createTelegramBot } from './telegram/bot';
import { BotConfig } from './types';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const configPath = process.env.CONFIG_PATH ?? path.resolve('config/runtime-config.json');
  const configStore = new ConfigStore(configPath);
  const exchange = new DriftExchange();
  const risk = new RiskManager();
  const strategy = new IndicatorStrategy();
  const keypair = loadKeypairFromEnv();

  let config = configStore.load();
  await exchange.init(config, keypair);
  await exchange.setLeverage(config);

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!telegramToken) throw new Error('TELEGRAM_BOT_TOKEN missing');
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const notify = async (msg: string) => {
    logger.info('alert', { msg });
    if (chatId && telegram.api) {
      await telegram.api.sendMessage(chatId, msg);
    }
  };

  const telegram = createTelegramBot(telegramToken, configStore, risk, {
    getStatus: async () => {
      const pos = await exchange.getPosition(configStore.load());
      return `enabled=${configStore.load().trading.enabled} side=${pos.side} size=${pos.baseAssetAmount} pnl=${pos.unrealizedPnl}`;
    },
    getBalance: async () => `equity=${await exchange.getEquity()}`,
    getPositions: async () => JSON.stringify(await exchange.getPosition(configStore.load())),
    getTrades: async () => JSON.stringify(await exchange.getRecentTrades()),
    killSwitch: async () => {
      configStore.update((c) => ({ ...c, trading: { ...c.trading, enabled: false } }));
      await exchange.closePosition(configStore.load());
      await notify('Kill switch fired.');
    },
    notify,
  });
  await telegram.start();

  setInterval(async () => {
    try {
      config = configStore.load();
      const alive = await exchange.healthcheck();
      if (!alive) {
        await notify('RPC/WebSocket healthcheck failed; retry loop active.');
        return;
      }

      const equity = await exchange.getEquity();
      risk.setDailyStartEquity(equity);
      if (risk.evaluateDailyLoss(config, equity)) {
        configStore.update((c) => ({ ...c, trading: { ...c.trading, enabled: false } }));
        await notify('Daily max loss triggered. Trading disabled.');
        return;
      }
      if (!config.trading.enabled || risk.shouldCooldown(config)) return;

      const candles = await exchange.getCandles(config);
      const signal = strategy.generateSignal(config, candles);
      const current = await exchange.getPosition(config);
      const spreadBps = await exchange.getSpreadBps(config.network.marketIndex);
      if (spreadBps > config.risk.maxSpreadBps) return;
      if (signal.signal === 'flat') return;

      const decision = risk.shouldFlipOrWait(config, current, signal.signal);
      if (decision === 'ignore') return;
      if (decision === 'flip') await exchange.closePosition(config);

      const notional = risk.computePositionNotional(config, equity);
      const markPrice = candles.at(-1)?.close ?? 0;
      const baseAmount = markPrice > 0 ? notional / markPrice : 0;
      if (baseAmount <= 0) return;

      const atr = strategy.latestAtr(config, candles);
      const brackets = risk.computeBrackets(config, markPrice, atr);
      const tx = await exchange.placeDirectionalOrder(config, signal.signal, baseAmount);
      risk.markTrade();
      await notify(`Entry ${signal.signal} size=${baseAmount.toFixed(4)} tx=${tx} sl=${brackets.sl.toFixed(4)} tp=${brackets.tp.toFixed(4)}`);
    } catch (error) {
      logger.error('main_loop_error', { error });
    }
  }, 5_000);
}

bootstrap().catch((e) => {
  logger.error('fatal_boot_error', { e });
  process.exit(1);
});
