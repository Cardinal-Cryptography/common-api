# Common API

API server intended to connect multiple sources of data:

1. GraphQL database, populated by Common Indexer.
2. Archive nodes.
3. Coingecko API

and exposing it all over unified APIs:

1. HTTP REST - for request<->response updates.
2. Websocket - for live updates of the state.

Currently does the following:

1. Connects to a GraphQL DB and subscribes to:

- Updates of pools' reserves.
- Updates of accounts' PSP22 token balances.

2. Sets up up a HTTP REST server.
3. Sets up up a Websocket server.

## Usage

1. GraphQL client controlled with three env variables:

- `COMMON_API_GRAPHQL_PROTO` - defaults to `ws`
- `COMMON_API_GRAPHQL_HOST` - defaults to `localhost`
- `COMMON_API_GRAPHQL_PORT` - defaults to `4351`

Subscription can be turned off by setting env `COMMON_API_ENABLE_GRAPHQL=false`.

2. HTTP REST controlled with:

- `COMMON_API_HTTP_PORT` specifies the port to which the HTTP server binds to. Defaults to `3000`.

3. Websocket server controlled with:

- `COMMON_API_WS_PORT` defaults to `80`.

When client connects over websocket - it will push `pool` updates to the client. Data format description below.

HTTP server, currently, supports the following endpoints:

- `GET /api/v1/price/usd/azero` where it serves the A0 price in dollars.
- `GET /api/v1/accounts/:accountId` returns account's tokens balances.
- `GET /api/v1/accounts/:accountId/tokens/:token` returns a balance of `:token` under `:accountId`
- `GET /api/v1/pools` returns reserves of all indexed pools.
- `GET /api/v1/pools/:poolId` returns reserves of a specific pool
- `GET /api/v1/pools/:poolId/volume?from={from}&to={to}` - returns swaps volume for the `poolId` and requested period.

## Configuration

Application's settings can be controlled in three ways (from highest to lowest priority):

1. Env variables. All variables have a common prefix `COMMON_API_`. To list all currently set envs run `make show-envs` in the root directory.
2. Configuration file. We use [node-config](https://github.com/node-config/node-config) for managing the configuration. There's a strict order of loading files so consult the [wiki](https://github.com/node-config/node-config/wiki/Configuration-Files#file-load-order) to understand it. Currently, `/config` directory contains a single `local.json` file which is quite low on the precedence list.
3. Defaults.

## Demo mode

So called DEMO mode is available. If enabled, Common API will not subscribe to updates from the GraphQL database but send a mocked pool reserves data every second, down to the client.

To enable demo mode, set env variable `ENABLE_DEMO_MODE=true` or in the `config/*.json` set the `enableDemoMode` to `true`.

## Websocket server

### `Pool` data format

Example line sent to WS client:

```json
{
  "id": "5GHmztr49msyhZqp57tkwBwMn7k84yMBmkdxoyozQFzKcKuZ",
  "token0": "5CQyQesQgHj9sPrvtQwnyY6ZWRqBStvTVHMBQWawxNJpuzJS",
  "token1": "5HqSLGvq2qRrAtSqMEcz35rCzr57e1w75cuRGa1CLdNDB3gi",
  "reserves0": "40000000000000",
  "reserves1": "1000000000000000",
  "lastUpdateTimestamp": "1703774206000"
}
```

so the format is:

```
interface PoolV2 {
  id: string;
  token0: TokenId;
  token1: TokenId;
  reserves0: bigint;
  reserves1: bigint;
  lastUpdateTimestamp: bigint;
}
```

where `id` is the address of the pool.

## HTTP REST server

### `GET /api/v1/price/usd/:ticker` - USD token prices

Returns cached USD prices of selected tickers. Prices fetched from Coingecko API and cached up to `PRICE_CACHE_INVALIDITY_SECONDS` or every hour (default) after which it's invalidated and re-requested. Note that Coingecko itself updates the price every 60 seconds. If we can't query the Coingecko API, we return cached price. If `PRICE_CACHE_INVALIDITY_SECONDS` is unset, it defaults to 3600 seconds.

Currently supported tickers are:

- AZERO
- Bitcoin
- Ethereum
- USDT
- USDC

#### Example

```json
{ "price": 1.52, "lastUpdateTimestampSeconds": 1710250979 }
```

### `GET /api/v1/accounts/:accountId` - Account balance

Returns last known state of the `:accountId`.

#### Example

```json
{
  "account": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "tokens": [
    {
      "account": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "amount": "589379986793",
      "token": "5GtkZxmJtKmzygr3CkgFjhmmaGprYNb6XYnMxLRy9BKharh1",
      "lastUpdateBlockHeight": "50928711",
      "lastUpdateTimestamp": "1704291321000",
      "id": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY-5GtkZxmJtKmzygr3CkgFjhmmaGprYNb6XYnMxLRy9BKharh1"
    },
    {
      "account": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "amount": "50000000000000000000",
      "token": "5GUfU2RbEPyGjvojUwoZua3L4X2FiYf213Lddvj3PgFYpAAL",
      "lastUpdateBlockHeight": "50928589",
      "lastUpdateTimestamp": "1704291199000",
      "id": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY-5GUfU2RbEPyGjvojUwoZua3L4X2FiYf213Lddvj3PgFYpAAL"
    }
  ]
}
```

### `GET /api/v1/accounts/:accountId/tokens/:token` - Account's specific token state

Returns last known state of `:token` for `:accountId`. Example format of the response is:

```json
{
  "account": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "amount": "589379986793",
  "token": "5GtkZxmJtKmzygr3CkgFjhmmaGprYNb6XYnMxLRy9BKharh1",
  "lastUpdateBlockHeight": "50928711",
  "lastUpdateTimestamp": "1704291321000",
  "id": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY-5GtkZxmJtKmzygr3CkgFjhmmaGprYNb6XYnMxLRy9BKharh1"
}
```

### `GET /api/v1/pools`

Returns all known pools' reserves. Example response is:

```json
{
  "5CanvcAQYZqJ4Qa3LUCqGJZhoa3cDPQxbV22y4DC6DdjXNEd": {
    "id": "5CanvcAQYZqJ4Qa3LUCqGJZhoa3cDPQxbV22y4DC6DdjXNEd",
    "token0": "5E2xuRb3k5h4TdrPAK543TiFBdRvhWSTmz6qT6b1hfq6LA2U",
    "token1": "5HKuP2yvvK2MXst7sgGnG715DqVifidEzwopunjKVtRNA1tf",
    "reserves0": "4000000000000000000000",
    "reserves1": "80000000000000000",
    "lastUpdateTimestamp": "1703774256000"
  },
  "5CtfFw2GBs2MTppjWPWx8ewSwVGpwVyfyj9E4GKf4SetxHJm": {
    "id": "5CtfFw2GBs2MTppjWPWx8ewSwVGpwVyfyj9E4GKf4SetxHJm",
    "token0": "5EAAet9jxK8a4xZk35YeMJgTFUVswEQzbRox32qYK8W2KBCn",
    "token1": "5GUfU2RbEPyGjvojUwoZua3L4X2FiYf213Lddvj3PgFYpAAL",
    "reserves0": "1993375349255972651",
    "reserves1": "3010000000000000000000",
    "lastUpdateTimestamp": "1708125424000"
  }
}
```

So `Map<PoolId, Pool>` - a mapping between pool's ID (address) and its last-known state.

### `GET /api/v1/pools/:poolId` - specific pool's reserves

Returns current reserves of a specific pool, identifier by `poolId`. Example response:

```json
{
  "id": "5CanvcAQYZqJ4Qa3LUCqGJZhoa3cDPQxbV22y4DC6DdjXNEd",
  "token0": "5E2xuRb3k5h4TdrPAK543TiFBdRvhWSTmz6qT6b1hfq6LA2U",
  "token1": "5HKuP2yvvK2MXst7sgGnG715DqVifidEzwopunjKVtRNA1tf",
  "reserves0": "4000000000000000000000",
  "reserves1": "80000000000000000",
  "lastUpdateTimestamp": "1703774256000"
}
```

### `GET /api/v1/pools/:poolId/volume?from={from}&to={to}` - pool's swap volume

Returns swap volume starting from `{from}` until `{to}` (both argument expected to be milliseconds). The server rounds them down to the nearest minute so that we can levarage GraphQL server's caching.

Example response:

```json
{
  "pool": "5Ek4Z1rkEx8aS1oRTekEZ3MtDseurx4ZQV8v56YE6Bj8BqMp",
  "fromMillis": "1",
  "toMillis": "1704294000100",
  "amount0_in": 15000000000000,
  "amount1_in": 0
}
```

### `GET /health` - health check endpoint

Returns basic information about the Common API configuration.

Response format:
```json
{
      priceCacheEnabled: <boolean>,
      demoModeEnabled: <boolean>,
      graphqlUpdatesEnabled: <boolean>,
    }
```
