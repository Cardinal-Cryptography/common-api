import { createClient } from "graphql-ws";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import http from "http";
import express from "express";

import { Config } from "./config";
import * as rest from "./servers/http";
import { graphqlSubscribe$, RawElement } from "./grapqhl";
import { poolsV2SubscriptionQuery as v2PoolSubscriptionQuery } from "./grapqhl/v2/queries";
import { poolsV2SubscriptionQuery as v1PoolSubscriptionQuery } from "./grapqhl/v1/queries";
import { setupPoolsV2OverWs } from "./servers/ws/amm";
import { UsdPriceCache } from "./services/usdPriceCache";
import { loadInitPoolReserves, poolsV2$ } from "./grapqhl/pools";
import { poolDataSample$ } from "./mocks/pools";
import { Pools } from "./models/pool";
import { merge, Observable, share } from "rxjs";
import { isV2GraphQLReservesError, isV1GraphQLReservesError } from "./utils";

async function main(): Promise<void> {
  const app = express();
  app.use(
    cors({
      origin: [
        /\.common\.fi$/, // mainnet, testnet
        /\.azero\.dev$/, // devnet, branch previews
        /\.d15umvvtx19run\.amplifyapp\.com$/, // AWS amplify previews
        /^http:\/\/localhost:[0-9]*$/, // local development
        /^http:\/\/127\.0\.0\.1:[0-9]*$/, // local development
      ],
    }),
  );
  const server = http.createServer(app);
  const config = new Config();

  console.log("Starting Common API server");

  server.listen(config.http.port, () => {
    console.log(
      `HTTP server listening at http://localhost:${config.http.port}`,
    );
  });

  let pools = new Pools();
  rest.poolsV2Endpoints(app, pools);
  rest.healthcheckEnpoint(app, config);

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
      const source = poolDataSample$.pipe(share());
      source.forEach((pool) => pools.update(pool));
      setupPoolsV2OverWs(wsServer, source, pools);
    } else if (config.enableGraphql) {
      const graphqlClientUrl = `${config.graphql.proto}://${config.graphql.host}:${config.graphql.port}/graphql`;

      console.log("Enabling updates over GraphQL/WS");
      console.log(`Connecting Graphql client to ${graphqlClientUrl}`);

      const graphqlClient = createClient({
        webSocketImpl: WebSocket,
        url: graphqlClientUrl,
      });

      // TODO: handle GraphQL client connection.
      pools.setGraphqlClient(graphqlClient);
      rest.poolsSwapVolume(app, pools);

      loadInitPoolReserves(graphqlClient).then((initPools) => {
        pools.updateBatch(initPools);
      });

      // It's safe to run both subscriptions since one of them is bound to fail.
      new Observable<RawElement>((_observer) => {});
      new Observable<RawElement>((_observer) => {});

      let v2graphqlPoolV2$ = graphqlSubscribe$(
        graphqlClient,
        v2PoolSubscriptionQuery,
      );

      let v1graphqlPoolV1$ = graphqlSubscribe$(
        graphqlClient,
        v1PoolSubscriptionQuery,
      );

      // Share the observable to enable multiple subscriptions (forEach and setupPoolsV2OverWs).
      let v2poolsV2Updates$ = poolsV2$(v2graphqlPoolV2$).pipe(share());
      let v1poolsV2Updates$ = poolsV2$(v1graphqlPoolV1$).pipe(share());

      let poolsV2Updates$ = merge(v1poolsV2Updates$, v2poolsV2Updates$);

      poolsV2Updates$
        .forEach((pool) => pools.update(pool))
        .catch((err) => {
          // We expect certain types of errors to happen b/c of the migration.
          // Anything else should be a fatal error.
          if (
            !isV2GraphQLReservesError(err) &&
            !isV1GraphQLReservesError(err)
          ) {
            console.error("Error updating pools", err);
            Promise.reject(err);
          }
        });
      setupPoolsV2OverWs(wsServer, poolsV2Updates$, pools);

      // let initBalances = tokenBalancesFromArray(
      //   await loadInitBalances(graphqlClient),
      // );

      // let graphqlPsp$ = graphqlSubscribe$(
      //   graphqlClient,
      //   pspTokenBalancesSubscriptionQuery,
      // );

      // let graphQlNativeTransfers$ = graphqlSubscribe$(
      //   graphqlClient,
      //   nativeTransfersSubscriptionQuery,
      // );

      // tokenBalances$(graphqlPsp$, initBalances).forEach(
      //   (balances) => (initBalances = balances),
      // );

      // rest.accountPsp22BalancesEndpoint(app, initBalances);

      // setupNativeTransfersOverWss(
      //   wsServer,
      //   nativeTransfers$(graphQlNativeTransfers$),
      // );
    }
  } else {
    console.log("Updates over GraphQL/WS are disabled.");
  }
}

main();
