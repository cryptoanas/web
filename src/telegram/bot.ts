import { Bot } from 'grammy';
import { BotConfig } from '../types';
import { ConfigStore } from '../config/store';
import { RiskManager } from '../risk/risk-manager';

type Deps = {
  getStatus: () => Promise<string>;
  getBalance: () => Promise<string>;
  getPositions: () => Promise<string>;
  getTrades: () => Promise<string>;
  killSwitch: () => Promise<void>;
  notify: (msg: string) => Promise<void>;
};

export function createTelegramBot(token: string, configStore: ConfigStore, risk: RiskManager, deps: Deps): Bot {
  const bot = new Bot(token);

  bot.command('start', async (ctx) => ctx.reply('Drift bot online. Use /config or /status.'));
  bot.command('on', async (ctx) => {
    configStore.update((cfg) => ({ ...cfg, trading: { ...cfg.trading, enabled: true } }));
    await ctx.reply('Trading enabled');
  });
  bot.command('off', async (ctx) => {
    configStore.update((cfg) => ({ ...cfg, trading: { ...cfg.trading, enabled: false } }));
    await ctx.reply('Trading disabled');
  });

  bot.command('leverage', async (ctx) => {
    const [, val] = ctx.message!.text.split(' ');
    const leverage = Number(val);
    const cfg = configStore.load();
    if (!risk.validateLeverage(cfg, leverage)) return ctx.reply('Invalid leverage for configured min/max.');
    configStore.update((c) => ({ ...c, trading: { ...c.trading, leverage } }));
    return ctx.reply(`Leverage set to ${leverage}x`);
  });

  bot.command('risk', async (ctx) => {
    const [, val] = ctx.message!.text.split(' ');
    const pct = Number(val);
    configStore.update((c) => ({ ...c, trading: { ...c.trading, capitalPercent: pct } }));
    await ctx.reply(`Capital per trade set to ${pct}%`);
  });

  bot.command('ema', async (ctx) => {
    const text = ctx.message!.text;
    const fast = /fast=(\d+)/.exec(text)?.[1];
    const slow = /slow=(\d+)/.exec(text)?.[1];
    configStore.update((c) => ({
      ...c,
      strategy: {
        ...c.strategy,
        emaFast: fast ? Number(fast) : c.strategy.emaFast,
        emaSlow: slow ? Number(slow) : c.strategy.emaSlow,
      },
    }));
    await ctx.reply('EMA updated');
  });

  bot.command('rsi', async (ctx) => {
    const text = ctx.message!.text;
    const period = /period=(\d+)/.exec(text)?.[1];
    const ob = /ob=(\d+)/.exec(text)?.[1];
    const os = /os=(\d+)/.exec(text)?.[1];
    configStore.update((c) => ({
      ...c,
      strategy: {
        ...c.strategy,
        rsiPeriod: period ? Number(period) : c.strategy.rsiPeriod,
        rsiOb: ob ? Number(ob) : c.strategy.rsiOb,
        rsiOs: os ? Number(os) : c.strategy.rsiOs,
      },
    }));
    await ctx.reply('RSI updated');
  });

  bot.command('macd', async (ctx) => {
    const text = ctx.message!.text;
    const on = text.includes('on');
    const off = text.includes('off');
    const fast = /fast=(\d+)/.exec(text)?.[1];
    const slow = /slow=(\d+)/.exec(text)?.[1];
    const signal = /signal=(\d+)/.exec(text)?.[1];
    configStore.update((c) => ({
      ...c,
      strategy: {
        ...c.strategy,
        macdEnabled: on ? true : off ? false : c.strategy.macdEnabled,
        macdFast: fast ? Number(fast) : c.strategy.macdFast,
        macdSlow: slow ? Number(slow) : c.strategy.macdSlow,
        macdSignal: signal ? Number(signal) : c.strategy.macdSignal,
      },
    }));
    await ctx.reply('MACD updated');
  });

  bot.command('tf', async (ctx) => {
    const [, tf] = ctx.message!.text.split(' ');
    configStore.update((c) => ({ ...c, trading: { ...c.trading, timeframe: tf as BotConfig['trading']['timeframe'] } }));
    await ctx.reply(`Timeframe set to ${tf}`);
  });

  bot.command('sl', async (ctx) => {
    const [, val] = ctx.message!.text.split(' ');
    configStore.update((c) => ({ ...c, risk: { ...c.risk, slPercent: Number(val) } }));
    await ctx.reply(`SL set to ${val}%`);
  });
  bot.command('tp', async (ctx) => {
    const [, val] = ctx.message!.text.split(' ');
    configStore.update((c) => ({ ...c, risk: { ...c.risk, tpPercent: Number(val) } }));
    await ctx.reply(`TP set to ${val}%`);
  });
  bot.command('atr', async (ctx) => {
    const text = ctx.message!.text;
    const on = text.includes('on');
    const off = text.includes('off');
    const period = /period=(\d+)/.exec(text)?.[1];
    const slMult = /sl_mult=(\d+(?:\.\d+)?)/.exec(text)?.[1];
    const tpMult = /tp_mult=(\d+(?:\.\d+)?)/.exec(text)?.[1];
    configStore.update((c) => ({
      ...c,
      risk: {
        ...c.risk,
        atrEnabled: on ? true : off ? false : c.risk.atrEnabled,
        atrPeriod: period ? Number(period) : c.risk.atrPeriod,
        atrSlMult: slMult ? Number(slMult) : c.risk.atrSlMult,
        atrTpMult: tpMult ? Number(tpMult) : c.risk.atrTpMult,
      },
    }));
    await ctx.reply('ATR settings updated');
  });
  bot.command('maxloss', async (ctx) => {
    const [, val] = ctx.message!.text.split(' ');
    configStore.update((c) => ({ ...c, risk: { ...c.risk, maxDailyLossPercent: Number(val) } }));
    await ctx.reply(`Max daily loss set to ${val}%`);
  });
  bot.command('cooldown', async (ctx) => {
    const [, val] = ctx.message!.text.split(' ');
    configStore.update((c) => ({ ...c, risk: { ...c.risk, cooldownMinutes: Number(val) } }));
    await ctx.reply(`Cooldown set to ${val} minutes`);
  });

  bot.command('kill', async (ctx) => {
    await deps.killSwitch();
    await ctx.reply('Kill switch executed: positions closed, trading disabled.');
  });

  bot.command('config', async (ctx) => ctx.reply(`\n${JSON.stringify(configStore.load(), null, 2)}`));
  bot.command('status', async (ctx) => ctx.reply(await deps.getStatus()));
  bot.command('balance', async (ctx) => ctx.reply(await deps.getBalance()));
  bot.command('positions', async (ctx) => ctx.reply(await deps.getPositions()));
  bot.command('trades', async (ctx) => ctx.reply(await deps.getTrades()));

  bot.catch(async (err) => {
    await deps.notify(`Telegram error: ${String(err.error)}`);
  });

  return bot;
}
