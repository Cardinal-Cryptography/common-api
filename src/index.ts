import { createClient } from "graphql-ws";
import { WebSocket } from "ws";
import { loadInitBalances, tokenBalancesFromArray } from "./balances/index";

const port = process.env.GQL_PORT || 4351;
const host = process.env.GQL_HOST || "localhost";
const proto = process.env.GQL_PROTO || "ws";

async function main(): Promise<void> {
  const client = createClient({
    webSocketImpl: WebSocket,
    url: `${proto}://${host}:${port}/graphql`,
  });

  let tokenBalances = await loadInitBalances(client);
  console.log("balances size:", tokenBalances.length);
  let initBalances = tokenBalancesFromArray(tokenBalances);
  console.log(`${initBalances}`);
}

main();
