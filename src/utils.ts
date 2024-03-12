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
