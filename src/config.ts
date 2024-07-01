const config = require("config");

export interface TokenInfo {
  id: string;
  decimals: number;
}

export interface NamedTokens {
  azero: TokenInfo | null;
  weth: TokenInfo | null;
  wbtc: TokenInfo | null;
  usdt: TokenInfo | null;
  usdc: TokenInfo | null;
}

export class Config {
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
  tokens: NamedTokens;
  priceCacheInvaliditySeconds: number;

  constructor() {
    const http_port: number =
      process.env.COMMON_API_HTTP_PORT ||
      (config.has("http.port") ? config.http.port : 3000);

    const ws_host =
      process.env.COMMON_API_WS_HOST ||
      (config.has("ws.host") ? config.ws.host : "localhost");
    const ws_port =
      process.env.COMMON_API_WS_PORT ||
      (config.has("ws.port") ? config.ws.port : 80);

    const graphql_proto =
      process.env.COMMON_API_GRAPHQL_PROTO ||
      (config.has("graphql.proto") ? config.graphql.proto : "ws");
    const graphql_host =
      process.env.COMMON_API_GRAPHQL_HOST ||
      (config.has("graphql.host") ? config.graphql.host : "localhost");
    const graphql_port =
      process.env.COMMON_API_GRAPHQL_PORT ||
      (config.has("graphql.port") ? config.graphql.port : 4351);

    const azero =
      config.has("tokens.azero.id") && config.has("tokens.azero.decimals")
        ? config.tokens.azero
        : null;
    const weth =
      config.has("tokens.weth.id") && config.has("tokens.weth.decimals")
        ? config.tokens.weth
        : null;
    const wbtc =
      config.has("tokens.wbtc.id") && config.has("tokens.wbtc.decimals")
        ? config.tokens.wbtc
        : null;
    const usdt =
      config.has("tokens.usdt.id") && config.has("tokens.usdt.decimals")
        ? config.tokens.usdt
        : null;
    const usdc =
      config.has("tokens.usdc.id") && config.has("tokens.usdc.decimals")
        ? config.tokens.usdc
        : null;

    const priceCacheInvaliditySeconds =
      process.env.COMMON_API_PRICE_CACHE_INVALIDITY_SECONDS ||
      (config.has("priceCacheInvaliditySeconds")
        ? config.priceCacheInvaliditySeconds
        : 3600);

    this.enableDemoMode = process.env.COMMON_API_ENABLE_DEMO_MODE
      ? process.env.COMMON_API_ENABLE_DEMO_MODE === "true"
      : false;
    this.enableGraphql = process.env.COMMON_API_ENABLE_GRAPHQL
      ? process.env.COMMON_API_ENABLE_GRAPHQL === "true"
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
    this.tokens = {
      azero,
      weth,
      wbtc,
      usdt,
      usdc,
    };
  }
}
