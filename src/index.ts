import { createClient } from "graphql-ws";
import { WebSocket } from "ws";
import express from "express";
import { loadInitBalances, tokenBalancesFromArray } from "./balances/index";
import { azeroUsdEndpoint, AzeroUsdPriceCache } from "./servers/http";

const port = process.env.GQL_PORT || 4351;
const host = process.env.GQL_HOST || "localhost";
const proto = process.env.GQL_PROTO || "ws";

const httpPort = process.env.HTTP_PORT || 3000;

async function main(): Promise<void> {
  const graphqlClient = createClient({
    webSocketImpl: WebSocket,
    url: `${proto}://${host}:${port}/graphql`,
  });

  const httpServer = express();

  const azeroUsdPriceCache = new AzeroUsdPriceCache(0, 0);

  let tokenBalances = await loadInitBalances(graphqlClient);
  console.log("balances size:", tokenBalances.length);
  let initBalances = tokenBalancesFromArray(tokenBalances);
  console.log(`${initBalances}`);

  azeroUsdEndpoint(httpServer, azeroUsdPriceCache);

  httpServer.listen(httpPort, () => {
    console.log(`HTTP server listening at http://localhost:${httpPort}`);
  });
}

main();
