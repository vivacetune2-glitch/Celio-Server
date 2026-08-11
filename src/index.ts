// @ts-ignore
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { SessionManager } from "./sessionManager.js";
import {Client} from "./client.js";

const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, {
            "Content-Type": "text/plain"
        });

        res.end("Celio Server OK");
        return;
    }

    res.writeHead(404);
    res.end();
});
const port = Number(process.env.PORT) || 10000;

httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Celio Server listening on 0.0.0.0:${port}`);
});

const io = new Server(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket"], // 🚀 only WebSocket
    pingInterval: 500,
    pingTimeout: 2000
});

const sessionManager: SessionManager = new SessionManager();
let clients: Map<string, Client> = new Map();


function removeClient(clientId: string) {
    clients.delete(clientId);
}

console.log("Celio Server starting...");
io.on("connection", (socket: Socket) => {
    console.log("SOCKET.IO CONNECTION RECEIVED");
    let clientId: string = socket.handshake.auth.clientId;
    console.log("auth received:", clientId);
    if (clients.has(clientId)) clients.get(clientId)!.reconnect(socket);
    else clients.set(clientId, new Client(clientId, socket, sessionManager, removeClient));
})

httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
});