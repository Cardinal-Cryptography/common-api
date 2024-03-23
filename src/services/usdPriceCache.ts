import axios from "axios";

import { UsdTokenPrice } from "../models/usdTokenPrice";

const INVALIDATE_EVERY_HOUR: number = 60 * 60;

// Default to 1 hour price cache validity.
// According to Coingecko docs, the price is updated every 60 seconds.
const USD_PRICE_INVALIDITY_SECONDS: number =
  parseInt(process.env.USD_PRICE_INVALIDITY_SECONDS as string) ||
  INVALIDATE_EVERY_HOUR;

export class UsdPriceCache {
  ticker: string;
  price: number;
  lastUpdateTimestampMillis: number;

  constructor(ticker: string) {
    this.ticker = ticker;
    this.price = 0;
    this.lastUpdateTimestampMillis = 0;
  }

  async getPrice(): Promise<UsdTokenPrice> {
    if (!this.refreshPrice()) {
      return {
        price: this.price,
        lastUpdateTimestampMillis: this.lastUpdateTimestampMillis,
      };
    }
    try {
      const response = await axios.get(this.query());
      if (response.status == 200) {
        const data = response.data;
        this.price = data[this.ticker]["usd"];
        // Multiply by 1000, Coingecko API returns timestamp in seconds.
        this.lastUpdateTimestampMillis =
          data[this.ticker]["last_updated_at"] * 1000;
        return {
          price: this.price,
          lastUpdateTimestampMillis: this.lastUpdateTimestampMillis,
        };
      } else if (response.status == 429) {
        console.log("Rate limited, returning cached price");
        return {
          price: this.price,
          lastUpdateTimestampMillis: this.lastUpdateTimestampMillis,
        };
      } else {
        console.error(
          `Unhandled status when fetching ${this.ticker} price`,
          response,
        );
        return {
          price: this.price,
          lastUpdateTimestampMillis: this.lastUpdateTimestampMillis,
        };
      }
    } catch (e) {
      console.error(`Error fetching ${this.ticker} price`, e);
      return {
        price: this.price,
        lastUpdateTimestampMillis: this.lastUpdateTimestampMillis,
      };
    }
  }

  private refreshPrice(): boolean {
    const cacheAge = Date.now() - this.lastUpdateTimestampMillis;
    return cacheAge > USD_PRICE_INVALIDITY_SECONDS * 1000;
  }

  private query(): string {
    return `https://api.coingecko.com/api/v3/simple/price?ids=${this.ticker}&vs_currencies=usd&include_last_updated_at=true`;
  }
}
