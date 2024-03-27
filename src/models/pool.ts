import { Client } from "graphql-ws";
import { TokenId } from "../shared";
import { pairSwapVolume, pairsSwapVolumes } from "../grapqhl/pools";

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
  amount1_in: bigint;
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

  async poolSwapVolume(
    poolId: string,
    fromMillis: bigint,
    toMillis: bigint,
  ): Promise<PairSwapVolume | null> {
    if (!this.graphqlClient) {
      return null;
    }
    // We want to query the volumes for the nearest minut.
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
    //TODO: round down to nearest hours
    return pairsSwapVolumes(this.graphqlClient, fromMillis, toMillis);
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
