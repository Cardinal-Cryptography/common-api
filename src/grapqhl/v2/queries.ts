import { ConnectionQuery } from "../connection";
import { SubscriptionQuery } from "../subscription";

export const psp22TokenBalancesConnectionsQuery: ConnectionQuery =
  new ConnectionQuery(
    "psp22TokenBalances",
    "account amount token blockHeight blockTimestamp id",
  );

export const pspTokenBalancesSubscriptionQuery: SubscriptionQuery =
  new SubscriptionQuery(
    "psp22TokenBalances",
    "account amount token blockHeight blockTimestamp",
  );

export const nativeTransfersSubscriptionQuery: SubscriptionQuery =
  new SubscriptionQuery(
    "nativeTransfers",
    "extrinsicHash sender recipient amount blockNumber timestamp",
    50,
    "timestamp_ASC",
  );

export const poolsV2SubscriptionQuery: SubscriptionQuery =
  new SubscriptionQuery(
    "pools",
    "id token0 token1 reserves0 reserves1 blockTimestamp",
    200,
    "blockTimestamp_ASC",
  );

export const poolsV2ConnectionsQuery: ConnectionQuery = new ConnectionQuery(
  "pools",
  "id token0 token1 reserves0 reserves1 blockTimestamp",
);
