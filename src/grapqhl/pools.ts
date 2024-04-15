import { Client } from "graphql-ws";
import { RawElement, readWholeConnection } from ".";
import { PairSwapVolume, PoolV2 } from "../models/pool";
import { Observable, mergeMap } from "rxjs";
import { poolsV2ConnectionsQuery } from "./queries";

export function poolsV2$(
  rawObservable: Observable<RawElement>,
): Observable<PoolV2> {
  return rawObservable.pipe(
    mergeMap((element) => element.data?.pools as PoolV2[]),
  );
}

export function loadInitPoolReserves(client: Client): Promise<PoolV2[]> {
  return readWholeConnection<PoolV2>(client, poolsV2ConnectionsQuery);
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
    amount0_in: 0n,
    amount1_in: 0n,
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
