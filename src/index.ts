import { createClient } from "graphql-ws";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import express from "express";

import { tokenBalancesFromArray } from "./models/psp22";
import { tokenBalances$, loadInitBalances } from "./grapqhl/psp22";
import {
  accountPsp22Balances,
  azeroUsdEndpoint,
  AzeroUsdPriceCache,
} from "./servers/http";
import { graphqlSubscribe$ } from "./grapqhl";
import {
  pspTokenBalancesSubscriptionQuery,
  nativeTransfersSubscriptionQuery,
} from "./grapqhl/queries";
import { setupNativeTransfersOverWss } from "./servers/ws/nativeTransfers";
import { nativeTransfers$ } from "./grapqhl/nativeTransfers";

const port = process.env.GQL_PORT || 4351;
const host = process.env.GQL_HOST || "localhost";
const proto = process.env.GQL_PROTO || "ws";

const httpPort = process.env.HTTP_PORT || 3000;
const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 80;

async function main(): Promise<void> {
  const graphqlClient = createClient({
    webSocketImpl: WebSocket,
    url: `${proto}://${host}:${port}/graphql`,
  });

  const app = express();

  const wsOptions = { port: wsPort };

  const wssServer = new WebSocketServer(wsOptions, () => {
    console.log(`WS server listening at ws://localhost:${wsPort}`);
  });

  const server = http.createServer(app);

  const azeroUsdPriceCache = new AzeroUsdPriceCache(0, 0);

  let initBalances = tokenBalancesFromArray(
    await loadInitBalances(graphqlClient),
  );

  let graphqlPsp$ = graphqlSubscribe$(
    graphqlClient,
    pspTokenBalancesSubscriptionQuery,
  );

  let graphQlNativeTransfers$ = graphqlSubscribe$(
    graphqlClient,
    nativeTransfersSubscriptionQuery,
  );

  tokenBalances$(graphqlPsp$, initBalances).forEach(
    (balances) => (initBalances = balances),
  );

  azeroUsdEndpoint(app, azeroUsdPriceCache);
  accountPsp22Balances(app, initBalances);

  setupNativeTransfersOverWss(
    wssServer,
    nativeTransfers$(graphQlNativeTransfers$),
  );

  server.listen(httpPort, () => {
    console.log(`HTTP server listening at http://localhost:${httpPort}`);
  });
}

main();
