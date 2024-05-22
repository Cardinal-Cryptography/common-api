import { Observable } from "rxjs";
import { WebSocketServer } from "ws";
import { NativeTransfer } from "../../models/nativeTransfer";
import { log } from "../../index";

export function setupNativeTransfersOverWss(
  wssServer: WebSocketServer,
  nativeTransfers: Observable<NativeTransfer>,
) {
  wssServer.on("connection", (ws, request) => {
    const subscription = nativeTransfers.subscribe((transfer) => {
      ws.send(JSON.stringify(transfer), (error) => {
        log.error("error sending known state", error);
      });
    });
    log.trace("started feeding new client the nativeTransfers events");

    ws.on("error", (error) => {
      log.error("error on the websocket connection", error);
    });

    ws.on("message", (message) => {
      log.trace(
        `Received message ${message} from user ${JSON.stringify(request)}`,
      );
    });

    ws.on("close", function () {
      log.info("stopping client subscription");
      subscription.unsubscribe();
    });
  });
}
