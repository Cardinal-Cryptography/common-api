import { Client } from "graphql-ws";
import { TokenId } from "../shared";
import {
  lastPairSwapPrice,
  pairLowestHighestSwapPrice,
  pairSwapVolume,
  pairsSwapVolumes,
} from "../grapqhl/pools";
import { TokenInfoById } from "./tokens";

export interface PoolV2 {
  id: string;
  token0: TokenId;
  token1: TokenId;
  reserves0: bigint;
  reserves1: bigint;
  lastUpdateTimestamp: bigint;
}

export interface PairSwapVolume {
  pool: string;
  amount0_in: bigint;
  amount0_out: bigint;
  amount1_in: bigint;
  amount1_out: bigint;
}

export interface TotalPairSwapVolume {
  token0Volume: number;
  token1Volume: number;
}

export interface LowestHighestSwapPrice {
  pool: string;
  min_price_0in: number | null;
  min_price_0out: number | null;
  max_price_0in: number | null;
  max_price_0out: number | null;
}

export interface TotalLowestHighestSwapPrice {
  lowestPrice: number | null;
  highestPrice: number | null;
}

export interface SwapAmounts {
  amount0In: string;
  amount0Out: string;
  amount1In: string;
  amount1Out: string;
}

export class Pools {
  pools: Map<string, PoolV2>;
  graphqlClient: Client | undefined;

  constructor() {
    this.pools = new Map();
  }

  static fromArray(pools: PoolV2[]): Pools {
    var tokenPools = new Pools();
    tokenPools.updateBatch(pools);
    return tokenPools;
  }

  update(newPool: PoolV2) {
    // TODO remove this hack when there are no longer 2 versions of subscription query
    newPool = fixBrokenPoolV2(newPool);

    let pool = this.pools.get(newPool.id);
    if (pool === undefined) {
      this.pools.set(newPool.id, newPool);
      return;
    }
    if (pool.lastUpdateTimestamp < newPool.lastUpdateTimestamp) {
      this.pools.set(newPool.id, newPool);
    }
  }

  updateBatch(pools: PoolV2[]) {
    pools.forEach((pool) => this.update(pool));
  }

  async setGraphqlClient(client: Client) {
    this.graphqlClient = client;
  }

  async lastPoolSwapPrice(
    pool: PoolV2,
    tokenInfo: TokenInfoById,
  ): Promise<number | null> {
    if (!this.graphqlClient) {
      return null;
    }
    return lastPairSwapPrice(this.graphqlClient, pool, tokenInfo);
  }

  async poolLowestHighestSwapPrice(
    pool: PoolV2,
    tokenInfo: TokenInfoById,
    fromMillis: bigint,
    toMillis: bigint,
  ): Promise<LowestHighestSwapPrice | null> {
    if (!this.graphqlClient) {
      return null;
    }
    // We want to query the volumes for the nearest minute.
    // This way we can leverage GraphQL caching functionality.
    const fromNearestMinute = (fromMillis / 60000n) * 60000n;
    const toNearestMinute = (toMillis / 60000n) * 60000n;
    return pairLowestHighestSwapPrice(
      this.graphqlClient,
      pool,
      tokenInfo,
      fromNearestMinute,
      toNearestMinute,
    );
  }

  async poolSwapVolume(
    poolId: string,
    fromMillis: bigint,
    toMillis: bigint,
  ): Promise<PairSwapVolume | null> {
    if (!this.graphqlClient) {
      return null;
    }
    // We want to query the volumes for the nearest minute.
    // This way we can leverage GraphQL caching functionality.
    const fromNearestMinute = (fromMillis / 60000n) * 60000n;
    const toNearestMinute = (toMillis / 60000n) * 60000n;
    return pairSwapVolume(
      this.graphqlClient,
      poolId,
      fromNearestMinute,
      toNearestMinute,
    );
  }

  async poolsSwapVolumes(
    fromMillis: bigint,
    toMillis: bigint,
  ): Promise<PairSwapVolume[]> {
    if (!this.graphqlClient) {
      return [];
    }
    // We want to query the volumes for the nearest minut.
    // This way we can leverage GraphQL caching functionality.
    const fromNearestMinute = (fromMillis / 60000n) * 60000n;
    const toNearestMinute = (toMillis / 60000n) * 60000n;
    return pairsSwapVolumes(
      this.graphqlClient,
      fromNearestMinute,
      toNearestMinute,
    );
  }

  public toString(): string {
    let result = "Pools:\n";
    this.pools.forEach((pool) => {
      result += `\t${pool.id}\n`;
      result += `\t${pool.token0} : ${pool.reserves0.toString().padEnd(25, " ")}\n`;
      result += `\t${pool.token1} : ${pool.reserves1.toString().padEnd(25, " ")}\n`;
      result += `\t updatedAt : ${pool.lastUpdateTimestamp}\n`;
    });
    return result;
  }
}

export function poolsV2FromArray(pools: PoolV2[]): Pools {
  return Pools.fromArray(pools);
}

// While 2 versions of subscription query exist, we may get a PoolV2 value from the observer
// which doesn't contain the `lastUpdateTimestamp` field, and contains `blockTimestamp` instead.
// Formally, it shouldn't be typed with `PoolV2` but due to the sketchy behaviour of `Observable`
// it is possible. This function "fixes" the `PoolV2` by returning a proper object of type `PoolV2`
// which doesn't contain `blockTimestamp` but contains `lastUpdateTimestamp` instead.
function fixBrokenPoolV2(pool: any): PoolV2 {
  if (pool["blockTimestamp"]) {
    return {
      id: pool.id,
      token0: pool.token0,
      token1: pool.token1,
      reserves0: pool.reserves0,
      reserves1: pool.reserves1,
      lastUpdateTimestamp: pool.blockTimestamp,
    };
  }
  return pool as PoolV2;
}
