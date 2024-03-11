import { Observable } from "zen-observable-ts";
import { Client, ExecutionResult } from "graphql-ws";

type Element = ExecutionResult<Record<string, unknown>, unknown>;

export function toObservable(
  client: Client,
  operation: any,
): Observable<Element> {
  return new Observable((observer) =>
    client.subscribe(operation, {
      next: (data) => observer.next(data),
      error: (err) => observer.error(err),
      complete: () => observer.complete(),
    }),
  );
}

export function runProgram(
  main: () => Promise<void>,
  log?: (err: Error) => void,
): void {
  function onerror(err: unknown) {
    console.error(err);
    process.exit(1);
  }

  try {
    main().then(() => process.exit(0), onerror);
  } catch (e: unknown) {
    onerror(e);
  }
}
