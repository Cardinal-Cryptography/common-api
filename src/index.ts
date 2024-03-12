import { createClient } from "graphql-ws";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import express from "express";

import { tokenBalancesFromArray } from "./models/psp22";
import { tokenBalances$, loadInitBalances } from "./grapqhl/psp22";
import * as rest from "./servers/http";
import { graphqlSubscribe$ } from "./grapqhl";
import {
  pspTokenBalancesSubscriptionQuery,
  nativeTransfersSubscriptionQuery,
  poolsV2SubscriptionQuery,
} from "./grapqhl/queries";
import { setupNativeTransfersOverWss } from "./servers/ws/nativeTransfers";
import { setupPoolsV2OverWs } from "./servers/ws/amm";
import { nativeTransfers$ } from "./grapqhl/nativeTransfers";
import { AzeroUsdPriceCache } from "./services/azeroPrice";
import { poolsV2$ } from "./grapqhl/pools";

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

  let graphqlPoolV2$ = graphqlSubscribe$(
    graphqlClient,
    poolsV2SubscriptionQuery,
  );

  tokenBalances$(graphqlPsp$, initBalances).forEach(
    (balances) => (initBalances = balances),
  );

  rest.azeroUsdEndpoint(app, azeroUsdPriceCache);
  rest.accountPsp22BalancesEndpoint(app, initBalances);

  // setupNativeTransfersOverWss(
  //   wssServer,
  //   nativeTransfers$(graphQlNativeTransfers$),
  // );

  setupPoolsV2OverWs(wssServer, poolsV2$(graphqlPoolV2$));

  server.listen(httpPort, () => {
    console.log(`HTTP server listening at http://localhost:${httpPort}`);
  });
}

main();
