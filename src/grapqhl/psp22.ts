import { RawElement, readWholeConnection } from ".";
import { psp22TokenBalancesConnectionsQuery } from "./queries";
import { TokenBalances, TokenBalance } from "../models/psp22";
import { Observable, map, reduce } from "rxjs";
import { Client } from "graphql-ws";

export function tokenBalances$(
  rawObservable: Observable<RawElement>,
  initState: TokenBalances,
): Observable<TokenBalances> {
  return rawObservable
    .pipe(map((element) => element.data?.psp22TokenBalances as TokenBalance[]))
    .pipe(reduce(updateState, initState));
}

function updateState(
  latestState: TokenBalances,
  newValues: TokenBalance[],
): TokenBalances {
  latestState.updateBatch(newValues);
  return latestState;
}

export function loadInitBalances(client: Client): Promise<TokenBalance[]> {
  return readWholeConnection<TokenBalance>(
    client,
    psp22TokenBalancesConnectionsQuery,
  );
}
