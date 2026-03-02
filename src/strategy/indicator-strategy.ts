import { ATR, EMA, MACD, RSI } from 'technicalindicators';
import { BotConfig, Candle, Signal } from '../types';

export class IndicatorStrategy {
  generateSignal(config: BotConfig, candles: Candle[]): { signal: Signal; score: number; reason: string } {
    if (candles.length < Math.max(config.strategy.emaSlow, config.strategy.rsiPeriod) + 5) {
      return { signal: 'flat', score: 0, reason: 'not_enough_data' };
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    const emaFast = EMA.calculate({ period: config.strategy.emaFast, values: closes }).at(-1)!;
    const emaSlow = EMA.calculate({ period: config.strategy.emaSlow, values: closes }).at(-1)!;
    const rsi = RSI.calculate({ period: config.strategy.rsiPeriod, values: closes }).at(-1)!;

    let scoreLong = 0;
    let scoreShort = 0;
    if (emaFast > emaSlow) scoreLong += 1;
    if (emaFast < emaSlow) scoreShort += 1;
    if (rsi < config.strategy.rsiOs) scoreLong += 1;
    if (rsi > config.strategy.rsiOb) scoreShort += 1;

    if (config.strategy.macdEnabled) {
      const macd = MACD.calculate({
        values: closes,
        fastPeriod: config.strategy.macdFast,
        slowPeriod: config.strategy.macdSlow,
        signalPeriod: config.strategy.macdSignal,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      }).at(-1);
      if (macd) {
        if (macd.MACD > macd.signal) scoreLong += 1;
        if (macd.MACD < macd.signal) scoreShort += 1;
      }
    }

    if (config.strategy.volumeFilterEnabled && volumes.length > 20) {
      const recent = volumes.at(-1)!;
      const mean = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      if (recent > mean) {
        scoreLong += 1;
        scoreShort += 1;
      }
    }

    const score = Math.max(scoreLong, scoreShort);
    if (score < config.strategy.minSignalScore) return { signal: 'flat', score, reason: 'score_too_low' };

    if (scoreLong > scoreShort) return { signal: 'long', score, reason: 'bullish_conditions' };
    if (scoreShort > scoreLong) return { signal: 'short', score, reason: 'bearish_conditions' };
    return { signal: 'flat', score, reason: 'tie' };
  }

  latestAtr(config: BotConfig, candles: Candle[]): number | undefined {
    if (!config.risk.atrEnabled || candles.length < config.risk.atrPeriod + 2) return undefined;
    return ATR.calculate({
      period: config.risk.atrPeriod,
      close: candles.map((c) => c.close),
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
    }).at(-1);
  }
}
