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
  new SubscriptionQuery(
    "nativeTransfers",
    "extrinsicHash sender recipient amount blockNumber timestamp",
    50,
    "timestamp_ASC",
  );
