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

export function isV2GraphQLReservesError(err: any): boolean {
  let v2QueryErrors = new Set([
    `Value "blockTimestamp_ASC" does not exist in "PoolOrderByInput" enum.`,
    `Cannot query field "blockTimestamp" on type "Pool".`,
  ]);
  let errMsgs = Array.isArray(err) ? err : [err];
  return errMsgs.every((errMsg) => v2QueryErrors.has(errMsg.message));
}

export function isV1GraphQLReservesError(err: any): boolean {
  let v1QueryErrors = new Set([
    `Cannot query field "lastUpdateTimestamp" on type "Pool".`,
    `Value "lastUpdateTimestamp_ASC" does not exist in "PoolOrderByInput" enum. Did you mean the enum value "blockTimestamp_ASC"?`,
  ]);
  let errMsgs = Array.isArray(err) ? err : [err];
  return errMsgs.every((errMsg) => v1QueryErrors.has(errMsg.message));
}
