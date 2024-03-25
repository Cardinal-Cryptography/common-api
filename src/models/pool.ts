import { TokenId } from "../shared";

export interface PoolV2 {
  id: string;
  token0: TokenId;
  token1: TokenId;
  reserves0: bigint;
  reserves1: bigint;
  lastUpdateTimestamp: bigint;
}

export class Pools {
  pools: Map<string, PoolV2>;

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
