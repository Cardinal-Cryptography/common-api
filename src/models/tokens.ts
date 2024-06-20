import { NamedTokens } from "../config";
import { NamedUsdPriceCaches, UsdPriceCache } from "../services/coingeckoPriceCache";
import { TokenId } from "../shared";

export class TokenInfoById {
  idToDecimals: Map<TokenId, number>;
  idToUsdPriceCache: Map<TokenId, UsdPriceCache>;
  
  constructor(tokens: NamedTokens, priceCaches: NamedUsdPriceCaches) {
    const idToDecimals = new Map();
    const idToUsdPriceCache = new Map();

    if (tokens.azero !== null) {
      idToDecimals.set(tokens.azero.id, tokens.azero.decimals)
      idToUsdPriceCache.set(tokens.azero.id, priceCaches.azero)
    }
    if (tokens.weth !== null) {
      idToDecimals.set(tokens.weth.id, tokens.weth.decimals)
      idToUsdPriceCache.set(tokens.weth.id, priceCaches.weth)
    }
    if (tokens.wbtc !== null) {
      idToDecimals.set(tokens.wbtc.id, tokens.wbtc.decimals)
      idToUsdPriceCache.set(tokens.wbtc.id, priceCaches.wbtc)
    }
    if (tokens.usdt !== null) {
      idToDecimals.set(tokens.usdt.id, tokens.usdt.decimals)
      idToUsdPriceCache.set(tokens.usdt.id, priceCaches.usdt)
    }
    if (tokens.usdc !== null) {
      idToDecimals.set(tokens.usdc.id, tokens.usdc.decimals)
      idToUsdPriceCache.set(tokens.usdc.id, priceCaches.usdc)
    }

    this.idToDecimals = idToDecimals
    this.idToUsdPriceCache = idToUsdPriceCache
  }

  async getUsdPrice(tokenId: TokenId): Promise<number | undefined> {
    const price = await this.idToUsdPriceCache.get(tokenId)?.getPrice()
    if (price) {
      return price.price
    }
  }

  getDecimals(tokenId: TokenId): number | undefined {
    return this.idToDecimals.get(tokenId)
  }
}