import { TokenBalances } from "../../models/psp22";
import { AzeroUsdPrice, AzeroUsdPriceCache } from "./azeroPrice";
import express from "express";

export { AzeroUsdPrice, AzeroUsdPriceCache };

export function azeroUsdEndpoint(
  app: express.Express,
  azeroUsdPriceCache: AzeroUsdPriceCache,
) {
  app.get("/azero_usd", (req, res) => {
    azeroUsdPriceCache.getPrice().then((response) => {
      res.send(response);
    });
  });
}

export function accountPsp22Balances(
  app: express.Express,
  balances: TokenBalances,
) {
  app.get("/accounts/:accountId", (req, res) => {
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

  app.get("/accounts/:accountId/tokens/:token", (req, res) => {
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
