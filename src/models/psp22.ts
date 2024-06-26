import { AccountId, TokenId } from "../shared";

export interface TokenBalance {
  account: AccountId;
  token: TokenId;
  amount: bigint;
  lastUpdateTimestamp: bigint;
  lastUpdateBlockHeight: bigint;
}

export interface AccountTokensBalances {
  account: AccountId;
  tokens: Map<TokenId, TokenBalance>;
}

export class TokenBalances {
  balances: Map<AccountId, AccountTokensBalances>;

  constructor() {
    this.balances = new Map();
  }

  static fromArray(balances: TokenBalance[]): TokenBalances {
    var tokenBalances = new TokenBalances();
    tokenBalances.updateBatch(balances);
    return tokenBalances;
  }

  update(newBalance: TokenBalance) {
    let account = this.balances.get(newBalance.account);
    if (account === undefined) {
      const newAccountState = {
        account: newBalance.account,
        tokens: new Map(),
      };
      this.balances.set(newBalance.account, newAccountState);
      return;
    }
    let oldTokenBalance = account.tokens.get(newBalance.token);
    if (oldTokenBalance === undefined) {
      account.tokens.set(newBalance.token, newBalance);
      return;
    }
    if (
      oldTokenBalance.lastUpdateBlockHeight < newBalance.lastUpdateBlockHeight
    ) {
      account.tokens.set(newBalance.token, newBalance);
    }
  }

  updateBatch(tokenBalances: TokenBalance[]) {
    tokenBalances.forEach((tokenBalance) => this.update(tokenBalance));
  }

  public toString(): string {
    let result = "TokenBalances:\n";
    this.balances.forEach((accountTokensBalances) => {
      result += `\t${accountTokensBalances.account}\n`;
      accountTokensBalances.tokens.forEach((tokenBalance) => {
        let amountPaded = tokenBalance.amount.toString().padEnd(25, " ");
        result += `\t\t${tokenBalance.token} ${amountPaded} ${tokenBalance.lastUpdateBlockHeight}\n`;
      });
    });
    return result;
  }
}
