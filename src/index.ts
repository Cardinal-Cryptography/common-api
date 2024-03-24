import { createClient } from "graphql-ws";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import express from "express";

import { Config } from "./config";
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

async function main(): Promise<void> {
  const app = express();
  const server = http.createServer(app);
  const config = new Config();

  console.log("Starting Common API server");

  server.listen(config.http.port, () => {
    console.log(
      `HTTP server listening at http://localhost:${config.http.port}`,
    );
  });

  if (config.enablePriceCache) {
    console.log("USD price cache enabled");

    const azeroUsdPriceCache = new UsdPriceCache(
      "aleph-zero",
      config.priceCacheInvaliditySeconds,
    );
    const ethUsdPriceCache = new UsdPriceCache(
      "ethereum",
      config.priceCacheInvaliditySeconds,
    );
    const bitcoinUsdPriceCache = new UsdPriceCache(
      "bitcoin",
      config.priceCacheInvaliditySeconds,
    );
    const usdtUsdPriceCache = new UsdPriceCache(
      "tether",
      config.priceCacheInvaliditySeconds,
    );
    const usdcUsdPriceCache = new UsdPriceCache(
      "usd-coin",
      config.priceCacheInvaliditySeconds,
    );

    rest.usdPriceEndpoints(
      app,
      azeroUsdPriceCache,
      ethUsdPriceCache,
      bitcoinUsdPriceCache,
      usdtUsdPriceCache,
      usdcUsdPriceCache,
    );
  }

  if (config.enableDemoMode || config.enableGraphql) {
    const wsServer = new WebSocketServer(config.ws, () => {
      console.log(
        `WS server listening at ws://${config.ws.host}:${config.ws.port}`,
      );
    });

    if (config.enableDemoMode) {
      console.log("Running in demo mode");
      setupPoolsV2OverWs(wsServer, poolDataSample$);
    } else if (config.enableGraphql) {
      console.log("Enabling updates over GraphQL/WS");
      const graphqlClientUrl = `${config.graphql.proto}://${config.graphql.host}:${config.graphql.port}/graphql`;
      console.log(`Connecting Graphql client to ${graphqlClientUrl}`);
      const graphqlClient = createClient({
        webSocketImpl: WebSocket,
        url: graphqlClientUrl,
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
