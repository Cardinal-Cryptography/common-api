import {
  LowestHighestSwapPrice,
  Pools,
  PoolV2,
  TotalLowestHighestSwapPrice,
  TotalPairSwapVolume,
} from "../models/pool";
import { PairSwapVolume } from "../models/pool";
import { UsdPriceCache, NamedUsdPriceCaches } from "./coingeckoPriceCache";
import { TokenInfoById } from "../models/tokens";

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

export class CoingeckoIntegration {
  pools: Pools;
  nativeUsdPriceCache: UsdPriceCache;
  tokenInfo: TokenInfoById;

  constructor(
    pools: Pools,
    alephUsdPriceCache: UsdPriceCache,
    tokenInfo: TokenInfoById,
  ) {
    this.pools = pools;
    this.nativeUsdPriceCache = alephUsdPriceCache;
    this.tokenInfo = tokenInfo;
  }

  async getTickers(): Promise<Ticker[]> {
    let tickers: Ticker[] = [];

    const pools = [];
    const liquidities = [];

    // collect liquidities sequentially so that coingecko doesn't think it's being spammed
    for (const pool of this.pools.pools.values()) {
      const liquidity = await this.liquidityInUsd(pool);
      if (liquidity === null) {
        continue;
      }
      pools.push(pool);
      liquidities.push(liquidity);
    }

    const lastPrices = await Promise.all(
      pools.map((pool) => this.pools.lastPoolSwapPrice(pool, this.tokenInfo)),
    );
    const poolVolumes = await Promise.all(
      pools.map((pool) => this.pairVolume(pool, this.tokenInfo)),
    );
    const lowestHighest = await Promise.all(
      pools.map((pool) =>
        this.pairLowestHighestSwapPrice(pool, this.tokenInfo),
      ),
    );

    for (let i = 0; i < pools.length; i++) {
      const ticker = this.poolToTicker(
        pools[i],
        poolVolumes[i],
        lastPrices[i],
        liquidities[i],
        lowestHighest[i],
      );
      tickers.push(ticker);
    }
    return tickers;
  }

  private async pairVolume(
    pool: PoolV2,
    tokenInfo: TokenInfoById,
  ): Promise<TotalPairSwapVolume> {
    // token0 volume, token1 volume
    let volume = {
      token0Volume: 0,
      token1Volume: 0,
    };
    let now_millis = new Date().getTime();
    let yesterday_millis = now_millis - DAY_IN_MILLIS;
    const poolVolume = await this.pools.poolSwapVolume(
      pool.id,
      BigInt(yesterday_millis),
      BigInt(now_millis),
    );
    if (poolVolume) {
      let decimals0 = this.tokenInfo.getDecimals(pool.token0);
      let decimals1 = this.tokenInfo.getDecimals(pool.token1);
      if (decimals0 && decimals1) {
        const vol0 =
          Number(poolVolume.amount0_in + poolVolume.amount0_out) /
          10 ** decimals0;
        const vol1 =
          Number(poolVolume.amount1_in + poolVolume.amount1_out) /
          10 ** decimals1;
        volume = {
          token0Volume: vol0,
          token1Volume: vol1,
        };
      }
    }
    return volume;
  }

  private async pairLowestHighestSwapPrice(
    pool: PoolV2,
    tokenInfo: TokenInfoById,
  ): Promise<TotalLowestHighestSwapPrice> {
    let swapPrice: TotalLowestHighestSwapPrice = {
      lowestPrice: null,
      highestPrice: null,
    };
    let now_millis = new Date().getTime();
    let yesterday_millis = now_millis - DAY_IN_MILLIS;
    const price = await this.pools.poolLowestHighestSwapPrice(
      pool,
      tokenInfo,
      BigInt(yesterday_millis),
      BigInt(now_millis),
    );
    const decimals0 = tokenInfo.getDecimals(pool.token0);
    const decimals1 = tokenInfo.getDecimals(pool.token1);
    if (price !== null && decimals0 && decimals1) {
      let minPrice = price.min_price_0in;
      let maxPrice = price.max_price_0in;
      if (price.min_price_0out !== null) {
        minPrice =
          minPrice === null
            ? price.min_price_0out
            : Math.min(minPrice, price.min_price_0out);
      }
      if (price.max_price_0out !== null) {
        maxPrice =
          maxPrice === null
            ? price.max_price_0out
            : Math.max(maxPrice, price.max_price_0out);
      }

      // both are null, or both aren't
      if (minPrice !== null && maxPrice !== null) {
        minPrice *= 10 ** (decimals0 - decimals1);
        maxPrice *= 10 ** (decimals0 - decimals1);
      }
      swapPrice = {
        lowestPrice: minPrice,
        highestPrice: maxPrice,
      };
    }
    return swapPrice;
  }

  private poolToTicker(
    pool: PoolV2,
    poolVolume: TotalPairSwapVolume,
    lastPrice: number | null,
    liquidityInUsd: number,
    lowestHighest: TotalLowestHighestSwapPrice,
  ): Ticker {
    return {
      ticker_id: `${pool.token0}_${pool.token1}`,
      base_currency: pool.token0,
      target_currency: pool.token1,
      pool_id: pool.id,
      last_price: lastPrice !== null ? lastPrice.toString() : null,
      base_volume: poolVolume.token0Volume.toString(),
      target_volume: poolVolume.token1Volume.toString(),
      liquidity_in_usd: liquidityInUsd.toString(),
      high:
        lowestHighest.highestPrice !== null
          ? lowestHighest.highestPrice.toString()
          : null,
      low:
        lowestHighest.lowestPrice !== null
          ? lowestHighest.lowestPrice.toString()
          : null,
    };
  }

  // use only for tokens present in this.tokenUsdPrices
  private async liquidityInUsd(pool: PoolV2): Promise<number | null> {
    let price0 = await this.tokenInfo.getUsdPrice(pool.token0);
    let price1 = await this.tokenInfo.getUsdPrice(pool.token1);
    let decimals0 = this.tokenInfo.getDecimals(pool.token0);
    let decimals1 = this.tokenInfo.getDecimals(pool.token1);
    if (price0 && price1 && decimals0 && decimals1) {
      let liq0 = (price0 * Number(BigInt(pool.reserves0))) / 10 ** decimals0;
      let liq1 = (price1 * Number(BigInt(pool.reserves1))) / 10 ** decimals1;
      return liq0 + liq1;
    }
    return null;
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
  last_price: string | null;
  // 24 hour trading volume for the pair (unit in base)
  base_volume: string;
  // 24 hour trading volume for the pair (unit in target)
  target_volume: string;
  // Pool liquidity in USD
  liquidity_in_usd: string;
  // Rolling 24-hours highest transaction price
  high: string | null;
  // Rolling 24-hours lowest transaction price
  low: string | null;
}
