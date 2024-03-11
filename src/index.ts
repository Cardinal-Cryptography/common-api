import { createClient } from "graphql-ws";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import { loadInitBalances, tokenBalancesFromArray } from "./balances/index";
import {
  accountPsp22Balances,
  azeroUsdEndpoint,
  AzeroUsdPriceCache,
} from "./servers/http";
import * as wss from "./servers/ws";

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

  azeroUsdEndpoint(app, azeroUsdPriceCache);
  accountPsp22Balances(app, initBalances);

  wss.setup(wssServer);

  server.listen(httpPort, () => {
    console.log(`HTTP server listening at http://localhost:${httpPort}`);
  });
}

main();
