import { RawElement } from ".";
import { NativeTransfer } from "../tokens/native";
import { Observable, mergeMap } from "rxjs";

export function nativeTransfers$(
  rawObservable: Observable<RawElement>,
): Observable<NativeTransfer> {
  return rawObservable.pipe(
    mergeMap((element) => element.data?.nativeTransfers as NativeTransfer[]),
  );
}
