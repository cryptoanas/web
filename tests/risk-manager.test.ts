import { describe, expect, it } from 'vitest';
import { RiskManager } from '../src/risk/risk-manager';
import { BotConfig } from '../src/types';
import cfg from '../config/runtime-config.json';

describe('RiskManager', () => {
  const config = cfg as BotConfig;

  it('enforces leverage bounds', () => {
    const risk = new RiskManager();
    expect(risk.validateLeverage(config, 3)).toBe(true);
    expect(risk.validateLeverage(config, 99)).toBe(false);
  });

  it('detects daily loss breaches', () => {
    const risk = new RiskManager();
    risk.setDailyStartEquity(1000);
    expect(risk.evaluateDailyLoss(config, 950)).toBe(true);
  });
});
