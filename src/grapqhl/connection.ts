export interface Connection<T> {
  edges: Edge<T>[];
  totalCount: number | undefined;
  pageInfo: PageInfo | undefined;
}

export interface Edge<T> {
  cursor: number | undefined;
  node: T;
}

export interface PageInfo {
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
  startCursor: number | undefined;
  endCursor: number | undefined;
}

export class ConnectionQuery {
  orderBy: string;
  after: number;
  nodeDesc: string;
  nodeKey: string;

  constructor(
    nodeKey: string,
    nodeDesc: string,
    after: number = 0,
    orderBy: string = "id_ASC",
  ) {
    this.orderBy = orderBy;
    this.after = after;
    this.nodeKey = `${nodeKey}Connection`;
    this.nodeDesc = nodeDesc;
  }

  intoQuery(after: number): string {
    this.after = after;
    return `query {
            ${this.queryHeader()} {
                totalCount
                pageInfo {
                    endCursor
                    hasNextPage
                    hasPreviousPage
                    startCursor
                }
                edges {
                    cursor
                    node {
                        ${this.nodeDesc}
                    }
                }
            }
        }`;
  }

  private queryHeader(): string {
    if (this.after == 0) {
      return `${this.nodeKey}(orderBy: ${this.orderBy})`;
    } else {
      return `${this.nodeKey}(orderBy: ${this.orderBy}, after : "${this.after}")`;
    }
  }
}
