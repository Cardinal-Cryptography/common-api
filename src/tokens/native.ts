import { AccountId } from "../shared";

export interface NativeTransfer {
  extrinsicHash: string;
  sender: AccountId;
  recipient: AccountId;
  amount: bigint;
  blockTimestamp: bigint;
  blockNumber: bigint;
}
