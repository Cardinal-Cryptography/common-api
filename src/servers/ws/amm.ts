import { Observable } from "rxjs";
import { WebSocketServer } from "ws";
import { Pools, PoolV2 } from "../../models/pool";

export function setupPoolsV2OverWs(
  wssServer: WebSocketServer,
  pools: Observable<PoolV2>,
  knownState: Pools,
) {
  wssServer.on("connection", (ws, request) => {
    ws.send(JSON.stringify(Object.fromEntries(knownState.pools)), (error) => {
      if (error) {
        console.log("error sending known state", error);
      }
    });

    const subscription = pools.subscribe((pool) => {
      ws.send(JSON.stringify(pool), function (err) {
        console.error(`Error when sending data to the client over WS: ${err}`);
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
