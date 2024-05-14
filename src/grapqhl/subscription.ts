export class SubscriptionQuery {
  orderBy: string;
  limit: number;
  nodeDesc: string;
  nodeKey: string;

  constructor(
    nodeKey: string,
    nodeDesc: string,
    limit: number = 50,
    orderBy: string = "lastUpdateTimestamp_ASC",
  ) {
    this.orderBy = orderBy;
    this.limit = limit;
    this.nodeKey = nodeKey;
    this.nodeDesc = nodeDesc;
  }

  intoQuery(): string {
    return `subscription {
            ${this.nodeKey}(limit: ${this.limit}, orderBy: ${this.orderBy}) {
                ${this.nodeDesc}
            }
        }`;
  }
}
