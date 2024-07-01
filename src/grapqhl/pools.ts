import { Client } from "graphql-ws";
import { RawElement, readWholeConnection } from ".";
import {
  LowestHighestSwapPrice,
  PairSwapVolume,
  PoolV2,
  SwapAmounts,
} from "../models/pool";
import { Observable, mergeMap } from "rxjs";
import { poolsV2ConnectionsQuery as poolReservesV2 } from "./v2/queries";
import { poolsV2ConnectionsQuery as poolReservesV1 } from "./v1/queries";
import { TokenInfoById } from "../models/tokens";

export function poolsV2$(
  rawObservable: Observable<RawElement>,
): Observable<PoolV2> {
  return rawObservable.pipe(
    mergeMap((element) => element.data?.pools as PoolV2[]),
  );
}

export function loadInitReservesV1(client: Client): Promise<PoolV2[]> {
  return readWholeConnection<PoolV2>(client, poolReservesV1);
}

export function loadInitReservesV2(client: Client): Promise<PoolV2[]> {
  return readWholeConnection<PoolV2>(client, poolReservesV2);
}

// Price of the target currency in the base currency (i.e. amount1_out / amount0_in or amount1_in / amount0_out)
// in the most recent transaction
export async function lastPairSwapPrice(
  client: Client,
  pool: PoolV2,
  tokenInfo: TokenInfoById,
): Promise<number | null> {
  const query = client.iterate({
    query: lastPairSwapQuery(pool.id),
  });

  try {
    const next = await query.next();
    const result = next.value;
    if (result.data) {
      const swapAmounts = result.data.pairSwaps as SwapAmounts[];
      if (swapAmounts.length > 1 || swapAmounts.length == 0) {
        console.error(`Expected 1 volume, got ${swapAmounts.length}`);
      } else {
        const amount0_in = Number(swapAmounts[0].amount0In);
        const amount0_out = Number(swapAmounts[0].amount0Out);
        const amount1_in = Number(swapAmounts[0].amount1In);
        const amount1_out = Number(swapAmounts[0].amount1Out);
        const decimals0 = tokenInfo.getDecimals(pool.token0);
        const decimals1 = tokenInfo.getDecimals(pool.token1);
        if (decimals0 && decimals1) {
          return amount0_in == 0
            ? (amount1_in * 10 ** decimals0) / (amount0_out * 10 ** decimals1)
            : (amount1_out * 10 ** decimals0) / (amount0_in * 10 ** decimals1);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  return null;
}

/// Query pair lowest-highest swap price for a specific pool from the GraphQL server.
export async function pairLowestHighestSwapPrice(
  client: Client,
  pool: PoolV2,
  tokenInfo: TokenInfoById,
  fromMillis: bigint,
  toMillis: bigint,
): Promise<LowestHighestSwapPrice> {
  let swapPrice: LowestHighestSwapPrice = {
    pool: pool.id,
    min_price_0in: null,
    max_price_0in: null,
  };
  const query = client.iterate({
    query: lowestHighestSwapsPriceQuery(pool.id, fromMillis, toMillis),
  });
  try {
    const next = await query.next();
    const result = next.value;
    if (result.data) {
      const swapPrices = result.data
        .lowestHighestSwapPrice as LowestHighestSwapPrice[];
      if (swapPrices.length > 2 || swapPrices.length == 0) {
        console.error(`Expected 1 or 2 swap prices, got ${swapPrices.length}`);
      } else {
        if (swapPrices[0].min_price_0in === null || swapPrices[0].max_price_0in === null) {
          return swapPrice
        }
        const decimals0 = tokenInfo.getDecimals(pool.token0);
        const decimals1 = tokenInfo.getDecimals(pool.token1);
        if (decimals0 && decimals1) {
          const minPrice = swapPrices[0].min_price_0in * (10 ** (decimals0 - decimals1))
          const maxPrice = swapPrices[0].max_price_0in * (10 ** (decimals0 - decimals1))
          swapPrice = {
            pool: pool.id,
            min_price_0in: minPrice,
            max_price_0in: maxPrice,
          };
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  return swapPrice;
}

/// Query all pair swap volumes from the GraphQL server.
export async function pairsSwapVolumes(
  client: Client,
  fromMillis: bigint,
  toMillis: bigint,
): Promise<PairSwapVolume[]> {
  let volumes: PairSwapVolume[] = [];
  const query = client.iterate({
    query: pairSwapVolumesQuery(fromMillis, toMillis),
  });
  try {
    const next = await query.next();
    const result = next.value;
    if (result.data) {
      volumes = result.data.pairSwapVolumes as PairSwapVolume[];
    }
  } catch (err) {
    console.error(err);
  }

  return volumes;
}

/// Query pair swap volume for a specific pool from the GraphQL server.
export async function pairSwapVolume(
  client: Client,
  poolId: string,
  fromMillis: bigint,
  toMillis: bigint,
): Promise<PairSwapVolume> {
  let volume: PairSwapVolume = {
    pool: poolId,
    // can't do 0n b/c it breaks in runtime with serialization error.
    amount0_in: 0 as unknown as bigint,
    amount1_in: 0 as unknown as bigint,
  };
  const query = client.iterate({
    query: pairSwapVolumeQuery(poolId, fromMillis, toMillis),
  });
  try {
    const next = await query.next();
    const result = next.value;
    if (result.data) {
      const volumes = result.data.pairSwapVolume as PairSwapVolume[];
      if (volumes.length > 1) {
        console.error(`Expected 1 volume, got ${volumes.length}`);
      }
      if (volumes.length == 1) {
        volume = volumes[0];
      }
    }
  } catch (err) {
    console.error(err);
  }

  return volume;
}

function lastPairSwapQuery(poolId: string): string {
  return `
  query {
    pairSwaps(where: {poolId_eq: "${poolId}"}, orderBy: timestamp_DESC, limit: 1) {
      amount0In
      amount0Out
      amount1In
      amount1Out
    }
  }
`;
}

function lowestHighestSwapsPriceQuery(
  poolId: string,
  fromMillis: bigint,
  toMillis: bigint,
): string {
  return `
  query {
    lowestHighestSwapPrice(poolId: "${poolId}", fromMillis: ${fromMillis}, toMillis: ${toMillis}) {
      pool
      min_price_0in
      max_price_0in
    }
  }
`;
}

function pairSwapVolumesQuery(fromMillis: bigint, toMillis: bigint): string {
  return `
  query {
    pairSwapVolumes(fromMillis: ${fromMillis}, toMillis: ${toMillis}) {
      pool
      amount0_in
      amount1_in
    }
  }
`;
}

function pairSwapVolumeQuery(
  poolId: string,
  fromMillis: bigint,
  toMillis: bigint,
): string {
  return `
  query {
    pairSwapVolume(poolId: "${poolId}", fromMillis: ${fromMillis}, toMillis: ${toMillis}) {
      pool
      amount0_in
      amount1_in
    }
  }
`;
}
