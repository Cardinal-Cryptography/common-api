import { Client } from "graphql-ws";
import { RawElement, readWholeConnection } from ".";
import { PairSwapVolume, PoolV2 } from "../models/pool";
import { Observable, mergeMap } from "rxjs";
import { poolsV2ConnectionsQuery as poolReservesV2 } from "./v2/queries";
import { poolsV2ConnectionsQuery as poolReservesV1 } from "./v1/queries";

export function poolsV2$(
  rawObservable: Observable<RawElement>,
): Observable<PoolV2> {
  return rawObservable.pipe(
    mergeMap((element) => element.data?.pools as PoolV2[]),
  );
}

export function loadInitPoolReserves(client: Client): Promise<PoolV2[]> {
  const v1 = loadInitReservesV1(client);
  const v2 = loadInitReservesV2(client);
  return Promise.all([v1, v2]).then((values) => values.flat());
}

export function loadInitReservesV1(client: Client): Promise<PoolV2[]> {
  return readWholeConnection<PoolV2>(client, poolReservesV1);
}

export function loadInitReservesV2(client: Client): Promise<PoolV2[]> {
  return readWholeConnection<PoolV2>(client, poolReservesV2);
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
