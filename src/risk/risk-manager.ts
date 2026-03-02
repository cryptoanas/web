import { BotConfig, PositionInfo } from '../types';

export class RiskManager {
  private dailyStartEquity = 0;
  private tradingDisabledByLoss = false;
  private lastTradeTs = 0;

  setDailyStartEquity(equity: number): void {
    if (this.dailyStartEquity === 0) this.dailyStartEquity = equity;
  }

  markTrade(): void {
    this.lastTradeTs = Date.now();
  }

  shouldCooldown(config: BotConfig): boolean {
    const diffMs = Date.now() - this.lastTradeTs;
    return diffMs < config.risk.cooldownMinutes * 60_000;
  }

  evaluateDailyLoss(config: BotConfig, currentEquity: number): boolean {
    if (this.dailyStartEquity <= 0) return false;
    const drawdownPct = ((this.dailyStartEquity - currentEquity) / this.dailyStartEquity) * 100;
    if (drawdownPct >= config.risk.maxDailyLossPercent) {
      this.tradingDisabledByLoss = true;
    }
    return this.tradingDisabledByLoss;
  }

  isTradingDisabledByLoss(): boolean {
    return this.tradingDisabledByLoss;
  }

  computePositionNotional(config: BotConfig, equity: number): number {
    const boundedPct = Math.min(config.trading.capitalPercent, config.risk.maxCapitalPercent);
    return equity * (boundedPct / 100) * config.trading.leverage;
  }

  validateLeverage(config: BotConfig, leverage: number): boolean {
    return leverage >= config.risk.minLeverage && leverage <= config.risk.maxLeverage;
  }

  shouldFlipOrWait(config: BotConfig, current: PositionInfo, nextSide: 'long' | 'short'): 'flip' | 'ignore' | 'open' {
    if (current.side === 'flat') return 'open';
    if (current.side === nextSide) return 'ignore';
    return config.trading.onePositionMode === 'flip' ? 'flip' : 'ignore';
  }

  computeBrackets(config: BotConfig, entryPrice: number, atrValue?: number): { sl: number; tp: number } {
    if (config.risk.atrEnabled && atrValue && atrValue > 0) {
      return {
        sl: atrValue * config.risk.atrSlMult,
        tp: atrValue * config.risk.atrTpMult,
      };
    }
    return {
      sl: entryPrice * (config.risk.slPercent / 100),
      tp: entryPrice * (config.risk.tpPercent / 100),
    };
  }
}
