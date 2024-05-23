import { Observable } from "rxjs";
import { WebSocketServer } from "ws";
import { Pools, PoolV2 } from "../../models/pool";
import { log } from "../../index";

export function setupPoolsV2OverWs(
  wssServer: WebSocketServer,
  pools: Observable<PoolV2>,
  knownState: Pools,
) {
  wssServer.on("connection", (ws, request) => {
    ws.send(JSON.stringify(Object.fromEntries(knownState.pools)), (error) => {
      log.error("error sending known state", error);
    });

    const subscription = pools.subscribe((pool) => {
      ws.send(JSON.stringify(pool), (error) => {
        log.error("error when sending data to the client over WS", error);
      });
    });

    log.trace("started feeding new client the pools events");

    ws.on("error", (error) => {
      log.error("error on the websocket connection", error);
    });

    ws.on("message", (message) => {
      log.trace(
        `received message ${message} from user ${JSON.stringify(request)}`,
      );
    });

    ws.on("close", function () {
      log.info("stopping client subscription");
      subscription.unsubscribe();
    });
  });
}
