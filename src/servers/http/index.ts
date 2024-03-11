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
