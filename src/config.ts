const config = require("config");

export class Config {
  enablePriceCache: boolean;
  enableDemoMode: boolean;
  enableGraphql: boolean;
  http: {
    port: number;
  };
  ws: {
    host: string;
    port: number;
  };
  graphql: {
    proto: string;
    host: string;
    port: number;
  };
  priceCacheInvaliditySeconds: number;

  constructor() {
    const http_port: number =
      process.env.HTTP_PORT ||
      (config.has("http.port") ? config.http.port : 3000);

    const ws_host =
      process.env.WS_HOST ||
      (config.has("ws.host") ? config.ws.host : "localhost");
    const ws_port =
      process.env.WS_PORT || (config.has("ws.port") ? config.ws.port : 80);

    const graphql_proto =
      process.env.GRAPHQL_PROTO ||
      (config.has("graphql.proto") ? config.graphql.proto : "ws");
    const graphql_host =
      process.env.GRAPHQL_HOST ||
      (config.has("graphql.host") ? config.graphql.host : "localhost");
    const graphql_port =
      process.env.GRAPHQL_PORT ||
      (config.has("graphql.port") ? config.graphql.port : 4351);

    const priceCacheInvaliditySeconds =
      process.env.PRICE_CACHE_INVALIDITY_SECONDS ||
      (config.has("priceCacheInvaliditySeconds")
        ? config.priceCacheInvaliditySeconds
        : 3600);

    this.enablePriceCache = process.env.ENABLE_PRICE_CACHE
      ? process.env.ENABLE_PRICE_CACHE === "true"
      : true;
    this.enableDemoMode = process.env.ENABLE_DEMO_MODE
      ? process.env.ENABLE_DEMO_MODE === "true"
      : false;
    this.enableGraphql = process.env.ENABLE_GRAPHQL
      ? process.env.ENABLE_GRAPHQL === "true"
      : false;

    this.priceCacheInvaliditySeconds = priceCacheInvaliditySeconds;

    this.http = {
      port: http_port,
    };
    this.ws = {
      host: ws_host,
      port: ws_port,
    };
    this.graphql = {
      proto: graphql_proto,
      host: graphql_host,
      port: graphql_port,
    };
  }
}