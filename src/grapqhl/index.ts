import { Client, ExecutionResult } from "graphql-ws";
import { Observable } from "rxjs";

import { Connection, ConnectionQuery } from "./connection";
import { SubscriptionQuery } from "./subscription";

import { log } from "../index";

/**
 * Executes GraphQL connection query that iterates over the paginated results.
 *
 * @param client GraphQL client
 * @param connectionQuery GraphQL connection query to be executed
 * @returns Promise containing an array of elements of type T from the connection
 */
export async function readWholeConnection<T>(
  client: Client,
  connectionQuery: ConnectionQuery,
): Promise<T[]> {
  var nodes: T[] = [];
  var after = 0;
  while (after != -1) {
    const query = client.iterate({ query: connectionQuery.intoQuery(after) });
    try {
      // TODO: handle errors and IteratorReturnResult variant
      const next = await query.next();
      if (!next.done) {
        const result = next.value;
        if (result.data) {
          const connectionAny = result.data[connectionQuery.nodeKey];
          if (!connectionAny) {
            return nodes;
          }
          const connection = connectionAny as Connection<T>;
          if (connection.edges) {
            nodes = nodes.concat(connection.edges.map((edge) => edge.node));
          }
          if (connection.pageInfo?.hasNextPage) {
            after = connection.pageInfo.endCursor as number;
          } else {
            after = -1;
          }
        }
      }
    } catch (err) {
      log.error(err);
      break;
    }
  }
  return nodes;
}

export type RawElement = ExecutionResult<Record<string, unknown>, unknown>;

export function graphqlSubscribe$(
  client: Client,
  subscription: SubscriptionQuery,
): Observable<RawElement> {
  return new Observable((observer) =>
    client.subscribe(
      { query: subscription.intoQuery() },
      {
        next: (data) => observer.next(data),
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      },
    ),
  );
}
