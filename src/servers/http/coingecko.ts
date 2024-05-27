import express from "express";

import { CoingeckoIntegration } from "../../services/coingeckoIntegration";

export async function coingeckoTickers(
  app: express.Express,
  coingeckoIntegration: CoingeckoIntegration,
) {
  app.get("/api/v1/coingecko/tickers", async (_req, res) => {
    const tickers = await coingeckoIntegration.getTickers();
    res.json(tickers);
  });
}
