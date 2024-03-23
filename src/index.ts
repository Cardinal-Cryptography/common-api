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

const config = require("config");

async function main(): Promise<void> {
  const app = express();
  const server = http.createServer(app);

  const httpPort = process.env.HTTP_PORT || config.http.port;

  server.listen(httpPort, () => {
    console.log(`HTTP server listening at http://localhost:${httpPort}`);
  });

  if (process.env.PRICE_CACHE) {
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

  const isDemo = process.env.DEMO_MODE === "true";
  const isGraphqlEnabled = process.env.ENABLE_GRAPHQL === "true";

  if (isDemo || isGraphqlEnabled) {
    const wsPort = process.env.WS_PORT || config.ws.port;
    const wsHost = process.env.WS_HOST || config.ws.host;

    const wsOptions = {
      host: wsHost as string,
      port: wsPort as unknown as number,
    };

    const wsServer = new WebSocketServer(wsOptions, () => {
      console.log(`WS server listening at ws://localhost:${wsPort}`);
    });

    if (isDemo) {
      console.log("Running in demo mode");
      setupPoolsV2OverWs(wsServer, poolDataSample$);
    } else if (isGraphqlEnabled) {
      console.log("Enabling updates over GraphQL/WS");
      const proto = process.env.GRAPHQL_PROTO || config.graphql.proto;
      const host = process.env.GRAPHQL_HOST || config.graphql.host;
      const port = process.env.GRAPHQL_PORT || config.graphql.port;

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
        wsServer,
        nativeTransfers$(graphQlNativeTransfers$),
      );

      setupPoolsV2OverWs(wsServer, poolsV2$(graphqlPoolV2$));
    }
  } else {
    console.log("Updates over GraphQL/WS are disabled.");
  }
}

main();
