import { Observable } from "rxjs";
import { WebSocketServer } from "ws";
import { PoolV2 } from "../../models/pool";

export function setupPoolsV2OverWs(
  wssServer: WebSocketServer,
  pools: Observable<PoolV2>,
) {
  wssServer.on("connection", (ws, request) => {
    const subscription = pools.subscribe((pool) => {
      ws.send(JSON.stringify(pool), function () {
        //
        // Ignore errors.
        //
      });
    });
    console.log("started feeding new client the pools events");

    ws.on("error", console.error);

    ws.on("message", function (message) {
      console.log(
        `Received message ${message} from user ${JSON.stringify(request)}`,
      );
    });

    ws.on("close", function () {
      console.log("stopping client subscription");
      subscription.unsubscribe();
    });
  });
}
