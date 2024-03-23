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
import { UsdPriceCache } from "./services/usdPriceCache";
import { poolsV2$ } from "./grapqhl/pools";
import { poolDataSample$ } from "./mocks/pools";

const port = process.env.GQL_PORT || 4351;
const host = process.env.GQL_HOST || "172.30.21.24";
const proto = process.env.GQL_PROTO || "ws";

const httpPort = process.env.HTTP_PORT || 3000;
const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080;
const wsHost = process.env.WS_HOST || "localhost";

const isDemo = process.env.DEMO || false;

const USD_PRICE_CACHE = process.env.ENABLE_PRICE_CACHE ? true : false;

async function main(): Promise<void> {
  const app = express();
  const server = http.createServer(app);

  const wsOptions = { host: wsHost, port: wsPort };

  const wssServer = new WebSocketServer(wsOptions, () => {
    console.log(`WS server listening at ws://localhost:${wsPort}`);
  });

  server.listen(httpPort, () => {
    console.log(`HTTP server listening at http://localhost:${httpPort}`);
  });

  if (USD_PRICE_CACHE) {
    console.log("USD price cache enabled");

    const azeroUsdPriceCache = new UsdPriceCache("aleph-zero");
    const ethUsdPriceCache = new UsdPriceCache("ethereum");
    const bitcoinUsdPriceCache = new UsdPriceCache("bitcoin");
    const usdtUsdPriceCache = new UsdPriceCache("tether");
    const usdcUsdPriceCache = new UsdPriceCache("usd-coin");

    rest.usdPriceEndpoints(
      app,
      azeroUsdPriceCache,
      ethUsdPriceCache,
      bitcoinUsdPriceCache,
      usdtUsdPriceCache,
      usdcUsdPriceCache,
    );
  }

  if (isDemo) {
    setupPoolsV2OverWs(wssServer, poolDataSample$);
  } else {
    const graphqlClient = createClient({
      webSocketImpl: WebSocket,
      url: `${proto}://${host}:${port}/graphql`,
    });

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

    rest.accountPsp22BalancesEndpoint(app, initBalances);

    setupNativeTransfersOverWss(
      wssServer,
      nativeTransfers$(graphQlNativeTransfers$),
    );

    setupPoolsV2OverWs(wssServer, poolsV2$(graphqlPoolV2$));
  }
}

main();
