import { TokenBalances } from "../../models/psp22";
import { UsdPriceCache } from "../../services/usdPriceCache";
import { Pools } from "../../models/pool";
import express from "express";

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
    let pool = pools.pools.get(req.params.poolId);
    if (pool === undefined) {
      res.status(404).send("Pool not found");
      return;
    }
    res.json(pool);
  });
}

export function accountPsp22BalancesEndpoint(
  app: express.Express,
  balances: TokenBalances,
) {
  app.get("/api/accounts/:accountId", (req, res) => {
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
