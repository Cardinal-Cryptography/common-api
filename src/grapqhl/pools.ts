import { RawElement } from ".";
import { PoolV2 } from "../models/pool";
import { Observable, mergeMap } from "rxjs";

export function poolsV2$(
  rawObservable: Observable<RawElement>,
): Observable<PoolV2> {
  return rawObservable.pipe(
    mergeMap((element) => element.data?.pools as PoolV2[]),
  );
}
