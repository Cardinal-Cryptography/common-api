import { ConnectionQuery } from "./connection";
import { SubscriptionQuery } from "./subscription";

export const psp22TokenBalancesConnectionsQuery: ConnectionQuery =
  new ConnectionQuery(
    "psp22TokenBalances",
    "account amount token lastUpdateBlockHeight lastUpdateTimestamp id",
  );

export const pspTokenBalancesSubscriptionQuery: SubscriptionQuery =
  new SubscriptionQuery(
    "psp22TokenBalances",
    "account amount token lastUpdateBlockHeight lastUpdateTimestamp",
  );

export const nativeTransfersSubscriptionQuery: SubscriptionQuery =
  new SubscriptionQuery("nativeTransfers", "amount recipient sender timestamp");
