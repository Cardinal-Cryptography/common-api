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

- `GQL_PROTO` - defaults to `ws`
- `GQL_HOST` - defaults to `localhost`
- `GQL_PORT` - defaults to `4351`

Subscription can be turned off by setting env `ENABLE_GRAPHQL=false`.

2. HTTP REST controlled with:

- `HTTP_PORT` specifies the port to which the HTTP server binds to. Defaults to `3000`.

3. Websocket server controlled with:

- `WS_PORT` defaults to `80`.

When client connects over websocket - it will push `pool` updates to the client. Data format description below.

HTTP server, currently, supports the following endpoints:

- `GET /azero_usd` where it serves the A0 price in dollars.
- `GET /accounts/:accountId` returns account's tokens balances.
- `GET /accounts/:accountId/tokens/:token` returns a balance of `:token` under `:accountId`

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

### `GET /accounts/:accountId` - Account balance

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

### `GET /accounts/:accountId/tokens/:token` - Account's specific token state

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
