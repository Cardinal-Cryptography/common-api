import { TokenBalances } from "../../models/psp22";
import { UsdPriceCache } from "../../services/usdPriceCache";
import { Pools } from "../../models/pool";
import express from "express";
import { Config } from "../../config";

const addressRegex = /[\w\d]{48}/;

export function healthcheckEnpoint(app: express.Express, config: Config) {
  app.get("/health", (_req, res) => {
    const status = {
      priceCacheEnabled: config.enablePriceCache,
      demoModeEnabled: config.enableDemoMode,
      graphqlUpdatesEnabled: config.enableGraphql,
    };
    res.send(status);
  });
}

export function usdPriceEndpoints(
  app: express.Express,
  azeroUsdPriceCache: UsdPriceCache,
  ethereumUsdPriceCache: UsdPriceCache,
  bitcoinUsdPriceCache: UsdPriceCache,
  usdtUsdPriceCache: UsdPriceCache,
  usdcUsdPriceCache: UsdPriceCache,
) {
  app.get("/api/v1/price/usd/azero", (_req, res) => {
    azeroUsdPriceCache.getPrice().then((response) => {
      res.send(response);
    });
  });
  app.get("/api/v1/price/usd/ethereum", (_req, res) => {
    ethereumUsdPriceCache.getPrice().then((response) => {
      res.send(response);
    });
  });
  app.get("/api/v1/price/usd/bitcoin", (_req, res) => {
    bitcoinUsdPriceCache.getPrice().then((response) => {
      res.send(response);
    });
  });
  app.get("/api/v1/price/usd/usdt", (_req, res) => {
    usdtUsdPriceCache.getPrice().then((response) => {
      res.send(response);
    });
  });
  app.get("/api/v1/price/usd/usdc", (_req, res) => {
    usdcUsdPriceCache.getPrice().then((response) => {
      res.send(response);
    });
  });
}

export function poolsV2Endpoints(app: express.Express, pools: Pools) {
  app.get("/api/v1/pools", (_req, res) => {
    const obj = Object.fromEntries(pools.pools);
    // Not the same as `res.json` as that would escape the string
    // which we don't want.
    res.contentType("application/json").send(obj);
  });

  app.get("/api/v1/pools/:poolId", (req, res) => {
    if (!addressRegex.test(req.params.poolId)) {
      res.status(400).send("Invalid pool address");
      return;
    }
    let pool = pools.pools.get(req.params.poolId);
    if (pool === undefined) {
      res.status(404).send("Pool not found");
      return;
    }
    res.json(pool);
  });
}

export async function poolsSwapVolume(app: express.Express, pools: Pools) {
  app.get("/api/v1/pools/:poolId/volume", async (req, res) => {
    if (!addressRegex.test(req.params.poolId)) {
      res.status(400).send("Invalid pool address");
      return;
    }
    let pool = pools.pools.get(req.params.poolId);
    if (pool === undefined) {
      res.status(404).send("Pool not found");
      return;
    }
    let fromQuery = req.query.from;
    let toQuery = req.query.to;
    if (fromQuery === undefined || toQuery === undefined) {
      res.status(400).send("from and to query parameters are required");
      return;
    }
    let fromMillis = BigInt(fromQuery as string);
    let toMillis = BigInt(toQuery as string);
    if (fromMillis < 0 || toMillis < 0) {
      res.status(400).send("from and to query parameters must be positive");
      return;
    }
    const volume = await pools.poolSwapVolume(pool.id, fromMillis, toMillis);
    if (!volume) {
      res.status(404).send("Pool not found");
      return;
    }
    if (volume.pool !== pool.id) {
      res.status(404).send("Pool not found");
    }

    res.send({
      pool: pool.id,
      fromMillis: fromQuery,
      toMillis: toQuery,
      amount0_in: volume.amount0_in,
      amount1_in: volume.amount1_in,
    });
  });
}

export function accountPsp22BalancesEndpoint(
  app: express.Express,
  balances: TokenBalances,
) {
  app.get("/api/accounts/:accountId", (req, res) => {
    if (!addressRegex.test(req.params.accountId)) {
      res.status(400).send("Invalid account address");
      return;
    }
    let accountBalances = balances.balances.get(req.params.accountId);
    if (accountBalances === undefined) {
      res.status(404).send("Account not found");
      return;
    }
    // Custom replacer to format nested objects.
    const str = JSON.stringify(accountBalances, replacer);
    // Not the same as `res.json` as that would escape the string
    // which we don't want.
    res.contentType("application/json").send(str);
  });

  app.get("/api/accounts/:accountId/tokens/:token", (req, res) => {
    if (!addressRegex.test(req.params.accountId)) {
      res.status(400).send("Invalid account address");
      return;
    }
    if (!addressRegex.test(req.params.token)) {
      res.status(400).send("Invalid token address");
      return;
    }
    let accountBalances = balances.balances.get(req.params.accountId);
    if (accountBalances === undefined) {
      res.status(404).send("Account not found");
      return;
    }
    let tokenBalance = accountBalances.tokens.get(req.params.token);
    if (tokenBalance === undefined) {
      res.status(404).send("Token not found");
      return;
    }
    res.json(tokenBalance);
  });
}

function replacer(key: any, value: any) {
  if (key == "tokens" && value instanceof Map) {
    return mapToArr(value);
  } else {
    return value;
  }
}

// Convert a map to an array of its values.
const mapToArr = (m: Map<any, any>) => {
  return Array.from(m).reduce((arr: any, [key, value]) => {
    arr.push(value);
    return arr;
  }, []);
};
