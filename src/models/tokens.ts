import { NamedTokens } from "../config";
import { NamedUsdPriceCaches, UsdPriceCache } from "../services/coingeckoPriceCache";
import { TokenId } from "../shared";

export class TokenInfoById {
  idToDecimals: Map<TokenId, number>;
  idToUsdPriceCache: Map<TokenId, UsdPriceCache>;
  idToName: Map<TokenId, string>;
  
  constructor(tokens: NamedTokens, priceCaches: NamedUsdPriceCaches) {
    const idToDecimals = new Map();
    const idToUsdPriceCache = new Map();
    const idToName = new Map();

    if (tokens.azero !== null) {
      idToDecimals.set(tokens.azero.id, tokens.azero.decimals)
      idToUsdPriceCache.set(tokens.azero.id, priceCaches.azero)
      idToName.set(tokens.azero.id, 'AZERO')
    }
    if (tokens.weth !== null) {
      idToDecimals.set(tokens.weth.id, tokens.weth.decimals)
      idToUsdPriceCache.set(tokens.weth.id, priceCaches.weth)
      idToName.set(tokens.weth.id, 'WETH')
    }
    if (tokens.wbtc !== null) {
      idToDecimals.set(tokens.wbtc.id, tokens.wbtc.decimals)
      idToUsdPriceCache.set(tokens.wbtc.id, priceCaches.wbtc)
      idToName.set(tokens.wbtc.id, 'WBTC')
    }
    if (tokens.usdt !== null) {
      idToDecimals.set(tokens.usdt.id, tokens.usdt.decimals)
      idToUsdPriceCache.set(tokens.usdt.id, priceCaches.usdt)
      idToName.set(tokens.usdt.id, 'USDT')
    }
    if (tokens.usdc !== null) {
      idToDecimals.set(tokens.usdc.id, tokens.usdc.decimals)
      idToUsdPriceCache.set(tokens.usdc.id, priceCaches.usdc)
      idToName.set(tokens.usdc.id, 'USDC')
    }

    this.idToDecimals = idToDecimals
    this.idToUsdPriceCache = idToUsdPriceCache
    this.idToName = idToName
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

  getName(tokenId: TokenId): string | undefined {
    return this.idToName.get(tokenId)
  }
}