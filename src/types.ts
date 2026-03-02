export type OrderType = 'market' | 'limit';
export type OnePositionMode = 'flip' | 'wait_flat';

export interface BotConfig {
  network: {
    driftEnv: 'mainnet-beta' | 'devnet';
    rpcUrl: string;
    websocketUrl: string;
    marketIndex: number;
    marketSymbol: string;
  };
  trading: {
    enabled: boolean;
    orderType: OrderType;
    marginMode: 'cross';
    leverage: number;
    capitalPercent: number;
    timeframe: '1m' | '5m' | '15m' | '1h';
    onePositionMode: OnePositionMode;
  };
  strategy: {
    emaFast: number;
    emaSlow: number;
    rsiPeriod: number;
    rsiOb: number;
    rsiOs: number;
    macdEnabled: boolean;
    macdFast: number;
    macdSlow: number;
    macdSignal: number;
    volumeFilterEnabled: boolean;
    minSignalScore: number;
  };
  risk: {
    slPercent: number;
    tpPercent: number;
    atrEnabled: boolean;
    atrPeriod: number;
    atrSlMult: number;
    atrTpMult: number;
    maxDailyLossPercent: number;
    cooldownMinutes: number;
    maxSpreadBps: number;
    maxSlippageBps: number;
    maxLeverage: number;
    minLeverage: number;
    maxCapitalPercent: number;
  };
}

export type Signal = 'long' | 'short' | 'flat';

export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PositionInfo {
  side: 'long' | 'short' | 'flat';
  baseAssetAmount: number;
  entryPrice: number;
  unrealizedPnl: number;
}
