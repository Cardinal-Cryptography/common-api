import axios from "axios";
import { LowestHighestSwapPrice, Pools, PoolV2 } from "../models/pool";
import { PairSwapVolume } from "../models/pool";
import { UsdPriceCache, NamedUsdPriceCaches } from "./coingeckoPriceCache";
import {log} from "../index"
import { NamedTokens } from "../config";
import { TokenId } from "../shared";
import { TokenInfoById } from "../models/tokens";

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;
const NATIVE_UNITS_IN_ONE = 1_000_000_000_000n; // TODO, consider passing in a better way than constants
const SPOT_TRADE_AMOUNT = 1_000_000n; // TODO consider varying spot trade amount based on the token's decimals

export class CoingeckoIntegration {
  pools: Pools;
  nativeUsdPriceCache: UsdPriceCache;
  tokenInfo: TokenInfoById;

  constructor(pools: Pools, alephUsdPriceCache: UsdPriceCache, tokenInfo: TokenInfoById) {
    this.pools = pools
    this.nativeUsdPriceCache = alephUsdPriceCache
    this.tokenInfo = tokenInfo
  }

  async getTickers(): Promise<Ticker[]> {
    let tickers: Ticker[] = [];
    for (let pool of this.pools.pools.values()) {
      const poolId = pool.id;
      const liquidityInUsd = await this.liquidityInUsd(pool);
      if (!liquidityInUsd) {
        // no ticker for a pair for which liquidity in usd is not supported
        continue
      }
      const poolVolume = await this.pairVolume(poolId);
      const lowestHighest = await this.pairLowestHighestSwapPrice(poolId);
      const ticker = this.poolToTicker(pool, poolVolume, liquidityInUsd, lowestHighest);
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

  private poolToTicker(pool: PoolV2, poolVolume: PairSwapVolume, liquidityInUsd: number, lowestHighest: LowestHighestSwapPrice): Ticker {
    return {
      ticker_id: pool.id,
      base_currency: pool.token0,
      target_currency: pool.token1,
      pool_id: pool.id,
      last_price: "0",
      base_volume: poolVolume.amount0_in.toString(),
      target_volume: poolVolume.amount1_in.toString(),
      liquidity_in_usd: liquidityInUsd.toString(),
      high: (lowestHighest.max_price_0in ?? 0.0).toString(),
      low: (lowestHighest.min_price_0in ?? 0.0).toString(),
    };
  }

  // use only for tokens present in this.tokenUsdPrices
  private async liquidityInUsd(pool: PoolV2): Promise<number | undefined> {
    let price0 = await this.tokenInfo.getUsdPrice(pool.token0)
    let price1 = await this.tokenInfo.getUsdPrice(pool.token1)
    let decimals0 = this.tokenInfo.getDecimals(pool.token0)
    let decimals1 = this.tokenInfo.getDecimals(pool.token1)
    if (price0 && price1 && decimals0 && decimals1) {
      let liq0 = price0 * Number(BigInt(pool.reserves0)) / (10 ** decimals0)
      let liq1 = price1 * Number(BigInt(pool.reserves1)) / (10 ** decimals1)
      return liq0 + liq1
    }
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