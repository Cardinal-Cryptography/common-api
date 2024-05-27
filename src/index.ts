import { Client, createClient } from "graphql-ws";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import http from "http";
import express from "express";

import { Config } from "./config";
import * as rest from "./servers/http";
import { coingeckoTickers } from "./servers/http/coingecko";
import { graphqlSubscribe$, RawElement } from "./grapqhl";
import { poolsV2SubscriptionQuery as v2PoolSubscriptionQuery } from "./grapqhl/v2/queries";
import { poolsV2SubscriptionQuery as v1PoolSubscriptionQuery } from "./grapqhl/v1/queries";
import { setupPoolsV2OverWs } from "./servers/ws/amm";
import { UsdPriceCache } from "./services/coingeckoPriceCache";
import { CoingeckoIntegration } from "./services/coingeckoIntegration";
import {
  loadInitReservesV1,
  loadInitReservesV2,
  poolsV2$,
} from "./grapqhl/pools";
import { poolDataSample$ } from "./mocks/pools";
import { Pools, PoolV2 } from "./models/pool";
import { Observable, share } from "rxjs";
import { SubscriptionQuery } from "./grapqhl/subscription";

function updatePools(
  graphqlClient: Client,
  pools: Pools,
  subscriptionQuery: SubscriptionQuery,
): Observable<PoolV2> {
  let graphqlPoolV2$ = graphqlSubscribe$(graphqlClient, subscriptionQuery);

  // Share the observable to enable multiple subscriptions (forEach and setupPoolsV2OverWs).
  let poolsV2Updates$ = poolsV2$(graphqlPoolV2$).pipe(share());

  poolsV2Updates$.forEach((pool) => pools.update(pool));
  return poolsV2Updates$;
}

import { Logger, ILogObj } from "tslog";

export const log: Logger<ILogObj> = new Logger({
  stylePrettyLogs: false,
  prettyLogTemplate:
    "{{logLevelName}}\t{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t[{{filePathWithLine}}{{name}}]\t",
});

async function main(): Promise<void> {
  log.info("Starting Common API server");

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

  server.listen(config.http.port, () => {
    log.info(`HTTP server listening at http://localhost:${config.http.port}`);
  });

  let pools = new Pools();
  rest.poolsV2Endpoints(app, pools);
  rest.healthcheckEnpoint(app, config);

  log.info("USD price cache enabled");
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

  const conigeckoIntegration = new CoingeckoIntegration(
    pools,
    azeroUsdPriceCache,
  );
  coingeckoTickers(app, conigeckoIntegration);

  if (config.enableDemoMode || config.enableGraphql) {
    const wsServer = new WebSocketServer(config.ws, () => {
      log.info(
        `WS server listening at ws://${config.ws.host}:${config.ws.port}`,
      );
    });

    if (config.enableDemoMode) {
      log.info("Running in demo mode");
      const source = poolDataSample$.pipe(share());
      source.forEach((pool) => pools.update(pool));
      setupPoolsV2OverWs(wsServer, source, pools);
    } else if (config.enableGraphql) {
      const graphqlClientUrl = `${config.graphql.proto}://${config.graphql.host}:${config.graphql.port}/graphql`;

      log.info("Enabling updates over GraphQL/WS");
      log.info(`Connecting Graphql client to ${graphqlClientUrl}`);

      const graphqlClient = createClient({
        webSocketImpl: WebSocket,
        url: graphqlClientUrl,
      });

      // TODO: handle GraphQL client connection.
      pools.setGraphqlClient(graphqlClient);
      rest.poolsSwapVolume(app, pools);

      // Try loading initial pool reserves using query of type v1. If the updates are empty,
      // try using the v2 query types.
      const useV1Subscription = await loadInitReservesV1(graphqlClient).then(
        (initPools) => {
          pools.updateBatch(initPools);
          return initPools.length > 0;
        },
      );

      if (useV1Subscription) {
        log.info("Proceeding with v1 subscription query on pool updates");
        let poolsV2Updates$ = updatePools(
          graphqlClient,
          pools,
          v1PoolSubscriptionQuery,
        );
        setupPoolsV2OverWs(wsServer, poolsV2Updates$, pools);
      } else {
        await loadInitReservesV2(graphqlClient).then((initPools) => {
          pools.updateBatch(initPools);
        });

        log.info("Proceeding with v2 subscription query on pool updates");
        let poolsV2Updates$ = updatePools(
          graphqlClient,
          pools,
          v2PoolSubscriptionQuery,
        );
        setupPoolsV2OverWs(wsServer, poolsV2Updates$, pools);
      }

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
    log.info("Updates over GraphQL/WS are disabled.");
  }
}

main();
