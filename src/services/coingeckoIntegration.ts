import { LowestHighestSwapPrice, Pools, PoolV2 } from "../models/pool";
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
      let lowestHighest = await this.pairLowestHighestSwapPrice(poolId);
      let ticker = this.poolToTicker(pool, poolVolume, lowestHighest);
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

  private async pairLowestHighestSwapPrice(
    poolId: string,
  ): Promise<LowestHighestSwapPrice> {
    let now_millis = new Date().getTime();
    let yesterday_millis = now_millis - DAY_IN_MILLIS;
    const price = await this.pools.poolLowestHighestSwapPrice(
      poolId,
      BigInt(yesterday_millis),
      BigInt(now_millis),
    );
    if (!price) {
      return {
        pool: poolId,
        min_price_0in: null,
        max_price_0in: null,
      };
    } else {
      return price;
    }
  }

  private poolToTicker(pool: PoolV2, poolVolume: PairSwapVolume, lowestHighest: LowestHighestSwapPrice): Ticker {
    return {
      ticker_id: pool.id,
      base_currency: pool.token0,
      target_currency: pool.token1,
      pool_id: pool.id,
      last_price: "0",
      base_volume: poolVolume.amount0_in.toString(),
      target_volume: poolVolume.amount1_in.toString(),
      liquidity_in_usd: "0",
      high: (lowestHighest.max_price_0in ?? 0.0).toString(),
      low: (lowestHighest.min_price_0in ?? 0.0).toString(),
    };
  }
}

export interface Ticker {
  // Pool contract address for DEX
  ticker_id: string;
  // Contract Address of a the base cryptoasset
  base_currency: string;
  // Contract Address of a the target cryptoasset
  target_currency: string;
  // pool/pair address or unique ID
  pool_id: string;
  // Last transacted price of base currency based on given target currency (unit in base or target)
  last_price: string;
  // 24 hour trading volume for the pair (unit in base)
  base_volume: string;
  // 24 hour trading volume for the pair (unit in target)
  target_volume: string;
  // Pool liquidity in USD
  liquidity_in_usd: string;
  // Rolling 24-hours highest transaction price
  high: string;
  // Rolling 24-hours lowest transaction price
  low: string;
}
