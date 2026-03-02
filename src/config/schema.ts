import { z } from 'zod';

export const botConfigSchema = z.object({
  network: z.object({
    driftEnv: z.enum(['mainnet-beta', 'devnet']),
    rpcUrl: z.string().url(),
    websocketUrl: z.string(),
    marketIndex: z.number().int().nonnegative(),
    marketSymbol: z.string().min(1),
  }),
  trading: z.object({
    enabled: z.boolean(),
    orderType: z.enum(['market', 'limit']),
    marginMode: z.literal('cross'),
    leverage: z.number().positive(),
    capitalPercent: z.number().positive().max(100),
    timeframe: z.enum(['1m', '5m', '15m', '1h']),
    onePositionMode: z.enum(['flip', 'wait_flat']),
  }),
  strategy: z.object({
    emaFast: z.number().int().positive(),
    emaSlow: z.number().int().positive(),
    rsiPeriod: z.number().int().positive(),
    rsiOb: z.number().min(1).max(99),
    rsiOs: z.number().min(1).max(99),
    macdEnabled: z.boolean(),
    macdFast: z.number().int().positive(),
    macdSlow: z.number().int().positive(),
    macdSignal: z.number().int().positive(),
    volumeFilterEnabled: z.boolean(),
    minSignalScore: z.number().int().min(1),
  }),
  risk: z.object({
    slPercent: z.number().positive(),
    tpPercent: z.number().positive(),
    atrEnabled: z.boolean(),
    atrPeriod: z.number().int().positive(),
    atrSlMult: z.number().positive(),
    atrTpMult: z.number().positive(),
    maxDailyLossPercent: z.number().positive(),
    cooldownMinutes: z.number().int().nonnegative(),
    maxSpreadBps: z.number().positive(),
    maxSlippageBps: z.number().positive(),
    maxLeverage: z.number().positive(),
    minLeverage: z.number().positive(),
    maxCapitalPercent: z.number().positive().max(100),
  }),
});

export type BotConfigSchema = z.infer<typeof botConfigSchema>;
