import { Observable } from "rxjs";
import { WebSocketServer } from "ws";
import { NativeTransfer } from "../../tokens/native";

export function setupNativeTransfersOverWss(
  wssServer: WebSocketServer,
  nativeTransfers: Observable<NativeTransfer>,
) {
  wssServer.on("connection", (ws, request) => {
    const subscription = nativeTransfers.subscribe((transfer) => {
      ws.send(JSON.stringify(transfer), function () {
        //
        // Ignore errors.
        //
      });
    });
    console.log("started feeding new client the nativeTransfers events");

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
