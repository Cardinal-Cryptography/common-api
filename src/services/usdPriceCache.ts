import axios from "axios";

import { UsdTokenPrice } from "../models/usdTokenPrice";

export class UsdPriceCache {
  ticker: string;
  price: number;
  lastUpdateTimestampSeconds: number;
  cacheInvaliditySeconds: number;

  constructor(ticker: string, cacheInvaliditySeconds: number) {
    this.ticker = ticker;
    this.price = 0;
    this.lastUpdateTimestampSeconds = 0;
    this.cacheInvaliditySeconds = cacheInvaliditySeconds;
  }

  async getPrice(): Promise<UsdTokenPrice> {
    if (!this.refreshPrice()) {
      return {
        price: this.price,
        lastUpdateTimestampSeconds: this.lastUpdateTimestampSeconds,
      };
    }
    try {
      const response = await axios.get(this.query());
      if (response.status == 200) {
        const data = response.data;
        this.price = data[this.ticker]["usd"];
        // Multiply by 1000, Coingecko API returns timestamp in seconds.
        this.lastUpdateTimestampSeconds = data[this.ticker]["last_updated_at"];
        return {
          price: this.price,
          lastUpdateTimestampSeconds: this.lastUpdateTimestampSeconds,
        };
      } else if (response.status == 429) {
        console.log("Rate limited, returning cached price");
        return {
          price: this.price,
          lastUpdateTimestampSeconds: this.lastUpdateTimestampSeconds,
        };
      } else {
        console.error(
          `Unhandled status when fetching ${this.ticker} price`,
          response,
        );
        return {
          price: this.price,
          lastUpdateTimestampSeconds: this.lastUpdateTimestampSeconds,
        };
      }
    } catch (e) {
      console.error(`Error fetching ${this.ticker} price`, e);
      return {
        price: this.price,
        lastUpdateTimestampSeconds: this.lastUpdateTimestampSeconds,
      };
    }
  }

  private refreshPrice(): boolean {
    const cacheAge = Date.now() / 1000 - this.lastUpdateTimestampSeconds;
    return cacheAge > this.cacheInvaliditySeconds;
  }

  private query(): string {
    return `https://api.coingecko.com/api/v3/simple/price?ids=${this.ticker}&vs_currencies=usd&include_last_updated_at=true`;
  }
}
