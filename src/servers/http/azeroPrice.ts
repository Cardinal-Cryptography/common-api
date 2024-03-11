import axios from "axios";

const INVALIDATE_EVERY_HOUR: number = 60 * 60;

// Default to 1 hour price cache validity.
// According to Coingecko docs, the price is updated every 60 seconds.
const AZERO_USD_PRICE_INVALIDITY_SECONDS: number =
  parseInt(process.env.AZERO_USD_PRICE_INVALIDITY_SECONDS as string) ||
  INVALIDATE_EVERY_HOUR;

export class AzeroUsdPriceCache {
  price: number;
  lastUpdateTimestampMillis: number;

  static query: string =
    "https://api.coingecko.com/api/v3/simple/price?ids=aleph-zero&vs_currencies=usd&include_last_updated_at=true";

  constructor(price: number, lastUpdate: number) {
    this.price = price;
    this.lastUpdateTimestampMillis = lastUpdate;
  }

  async getPrice(): Promise<AzeroUsdPrice> {
    if (!this.refreshPrice()) {
      return {
        price: this.price,
        lastUpdateTimestampMillis: this.lastUpdateTimestampMillis,
      };
    }
    try {
      const response = await axios.get(AzeroUsdPriceCache.query);
      if (response.status == 200) {
        const data = response.data;
        this.price = data["aleph-zero"]["usd"];
        // Multiply by 1000, Coingecko API returns timestamp in seconds.
        this.lastUpdateTimestampMillis =
          data["aleph-zero"]["last_updated_at"] * 1000;
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
          "Unhandled status when fetching AZERO-USD price",
          response,
        );
        return {
          price: this.price,
          lastUpdateTimestampMillis: this.lastUpdateTimestampMillis,
        };
      }
    } catch (e) {
      console.error("Error fetching Azero price", e);
      return {
        price: this.price,
        lastUpdateTimestampMillis: this.lastUpdateTimestampMillis,
      };
    }
  }

  private refreshPrice(): boolean {
    const cacheAge = Date.now() - this.lastUpdateTimestampMillis;
    return cacheAge > AZERO_USD_PRICE_INVALIDITY_SECONDS * 1000;
  }
}

export interface AzeroUsdPrice {
  price: number;
  lastUpdateTimestampMillis: number;
}
