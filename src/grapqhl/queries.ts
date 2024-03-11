import { ConnectionQuery } from "./connection";

export const psp22TokenBalancesConnectionsQuery: ConnectionQuery =
  new ConnectionQuery(
    "psp22TokenBalances",
    "account amount token lastUpdateBlockHeight lastUpdateTimestamp id",
  );

export const pspTokenBalancesSubscriptionQuery = `subscription { 
    psp22TokenBalances(limit: 50, orderBy: lastUpdateTimestamp_ASC) {
        account
        token
        amount
        lastUpdateTimestamp
        lastUpdateBlockHeight
    }
}`;

export const nativeTransfersSubscriptionQuery = `subscription {
    nativeTransfers(limit: 10, orderBy: timestamp_ASC) {
        amount
        recipient
        sender
        timestamp
    }
}`;
