import { Client } from "graphql-ws";
import { RawElement, readWholeConnection } from ".";
import { PoolV2 } from "../models/pool";
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
