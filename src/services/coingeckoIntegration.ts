import { Pools, PoolV2 } from "../models/pool";
import { PairSwapVolume } from "../models/pool";
import { UsdPriceCache } from "./coingeckoPriceCache";

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

export class CoingeckoIntegration {
  pools: Pools;
  alephUsdPriceCache: UsdPriceCache;

  constructor(pools: Pools, alephUsdPriceCache: UsdPriceCache) {
    this.pools = pools;
    this.alephUsdPriceCache = alephUsdPriceCache;
  }

  async getTickers(): Promise<Ticker[]> {
    let tickers: Ticker[] = [];
    for (let pool of this.pools.pools.values()) {
      let poolId = pool.id;
      let poolVolume = await this.pairVolume(poolId);
      let ticker = this.poolToTicker(pool, poolVolume);
      tickers.push(ticker);
    }
    return tickers;
  }

  private async pairVolume(poolId: string): Promise<PairSwapVolume> {
    let now_millis = new Date().getTime();
    let yesterday_millis = now_millis - DAY_IN_MILLIS;
    const volume = await this.pools.poolSwapVolume(
      poolId,
      BigInt(yesterday_millis),
      BigInt(now_millis),
    );
    if (!volume) {
      return {
        pool: poolId,
        amount0_in: 0n,
        amount1_in: 0n,
      };
    } else {
      return volume;
    }
  }

  private poolToTicker(pool: PoolV2, poolVolume: PairSwapVolume): Ticker {
    return {
      tickerId: `${pool.token0}_${pool.token1}`,
      baseCurrency: pool.token0,
      targetCurrency: pool.token1,
      poolId: pool.id,
      lastPrice: "0",
      baseVolume: poolVolume.amount0_in.toString(),
      targetVolume: poolVolume.amount1_in.toString(),
      liquidityInUsd: "0",
      high: "0",
      low: "0",
    };
  }
}

export interface Ticker {
  tickerId: string;
  baseCurrency: string;
  targetCurrency: string;
  poolId: string;
  lastPrice: string;
  baseVolume: string;
  targetVolume: string;
  liquidityInUsd: string;
  high: string;
  low: string;
}
