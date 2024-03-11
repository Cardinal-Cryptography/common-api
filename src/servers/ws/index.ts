import { WebSocketServer } from "ws";

export function setup(wssServer: WebSocketServer) {
  wssServer.on("connection", (ws, request) => {
    const id = setInterval(function () {
      ws.send(JSON.stringify(process.memoryUsage()), function () {
        //
        // Ignore errors.
        //
      });
    }, 100);
    console.log("started client interval");

    ws.on("error", console.error);

    ws.on("message", function (message) {
      console.log(`Received message ${message} from user ${ws}`);
    });

    ws.on("close", function () {
      console.log("stopping client interval");
      clearInterval(id);
    });
  });
}
