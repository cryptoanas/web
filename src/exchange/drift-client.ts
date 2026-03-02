import {
  BASE_PRECISION,
  DriftClient,
  initialize,
  MarketType,
  OrderType,
  PositionDirection,
  User,
} from '@drift-labs/sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { BotConfig, Candle, PositionInfo } from '../types';
import { logger } from '../utils/logger';

export class DriftExchange {
  private connection!: Connection;
  private driftClient!: DriftClient;
  private user!: User;

  async init(config: BotConfig, keypair: Keypair): Promise<void> {
    this.connection = new Connection(config.network.rpcUrl, { commitment: 'confirmed', wsEndpoint: config.network.websocketUrl });
    const env = config.network.driftEnv === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
    initialize({ env });

    this.driftClient = new DriftClient({ connection: this.connection, wallet: { publicKey: keypair.publicKey, payer: keypair } as never, env });
    await this.driftClient.subscribe();
    this.user = new User({ driftClient: this.driftClient, userAccountPublicKey: await this.driftClient.getUserAccountPublicKey() });
    await this.user.subscribe();
    logger.info('drift_initialized', { env, market: config.network.marketSymbol });
  }

  async getEquity(): Promise<number> {
    const collateral = this.user.getTotalCollateral();
    return Number(collateral.toString()) / 1e6;
  }

  async getPosition(config: BotConfig): Promise<PositionInfo> {
    const pos = this.user.getPerpPosition(config.network.marketIndex);
    if (!pos || pos.baseAssetAmount.eqn(0)) {
      return { side: 'flat', baseAssetAmount: 0, entryPrice: 0, unrealizedPnl: 0 };
    }

    const base = Number(pos.baseAssetAmount.toString()) / BASE_PRECISION.toNumber();
    const side = base > 0 ? 'long' : 'short';
    return {
      side,
      baseAssetAmount: Math.abs(base),
      entryPrice: Number(pos.quoteEntryAmount.toString()) / Math.max(Math.abs(base), 1e-9),
      unrealizedPnl: Number(this.user.getUnrealizedPNL(true, undefined, config.network.marketIndex).toString()) / 1e6,
    };
  }

  async setLeverage(config: BotConfig): Promise<void> {
    // Drift uses risk engine + collateral. There is no direct isolated lever setter in cross mode;
    // this exists to enforce app-level leverage for sizing and user display.
    logger.info('leverage_configured', { leverage: config.trading.leverage, marginMode: config.trading.marginMode });
  }

  async placeDirectionalOrder(config: BotConfig, side: 'long' | 'short', baseAmount: number): Promise<string> {
    const direction = side === 'long' ? PositionDirection.LONG : PositionDirection.SHORT;
    const orderType = config.trading.orderType === 'market' ? OrderType.MARKET : OrderType.LIMIT;
    const sig = await this.driftClient.placePerpOrder({
      marketIndex: config.network.marketIndex,
      direction,
      baseAssetAmount: this.driftClient.convertToPerpPrecision(baseAmount),
      orderType,
      marketType: MarketType.PERP,
      reduceOnly: false,
    });
    return sig;
  }

  async closePosition(config: BotConfig): Promise<string | null> {
    const pos = await this.getPosition(config);
    if (pos.side === 'flat') return null;

    const direction = pos.side === 'long' ? PositionDirection.SHORT : PositionDirection.LONG;
    return this.driftClient.placePerpOrder({
      marketIndex: config.network.marketIndex,
      direction,
      baseAssetAmount: this.driftClient.convertToPerpPrecision(pos.baseAssetAmount),
      orderType: OrderType.MARKET,
      marketType: MarketType.PERP,
      reduceOnly: true,
    });
  }

  async getRecentTrades(): Promise<Array<{ price: number; size: number; side: string }>> {
    return [];
  }

  async getCandles(_config: BotConfig): Promise<Candle[]> {
    // Placeholder: use Drift historical endpoint / oracle+book aggregation in production.
    return [];
  }

  async getSpreadBps(_market: number): Promise<number> {
    // Implement from bid/ask L2 data. Keep configurable and safety-gated.
    return 5;
  }

  async healthcheck(): Promise<boolean> {
    try {
      const version = await this.connection.getVersion();
      return Boolean(version['solana-core']);
    } catch {
      return false;
    }
  }

  getUserPublicKey(): PublicKey {
    return this.driftClient.wallet.publicKey;
  }
}

export function loadKeypairFromEnv(): Keypair {
  const raw = process.env.SOLANA_KEYPAIR_JSON;
  if (!raw) throw new Error('SOLANA_KEYPAIR_JSON missing');
  const arr = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}
