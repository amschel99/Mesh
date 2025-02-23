import express from "express";
import { PeerManager, Peer, EventHandler } from "mesh-protocol";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = 5500;
//Replace this with an ngrok url for other peers to be able to connect to this
const my_addrr = `ws://localhost:${PORT}`;
let manager = new PeerManager(my_addrr);
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
const httpServer = http.createServer(app);
const wss = manager.getServer();

setInterval(() => {
  console.log(
    `Currently we are connected to ${
      manager.getPeers().length
    } peers which are:`
  );
  manager.getPeers().map((peer: Peer) => {
    console.log(`${peer.url}`);
  });
}, 3000);

//listen for events from other peers
manager.registerEvent("HELLO_WORLD", (peer, data) => {
  console.log(`Received some data :${JSON.stringify(data)} from ${peer.url}`);
});
//broadcast events to other peers
manager.broadcast(
  "HELLO_WORLD",
  JSON.stringify({ message: "Hello peers, it's nice to connect" })
);
httpServer.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Node running on port ${PORT}`);
  if (process.env.BOOTSTRAP_PEERS) {
    process.env.BOOTSTRAP_PEERS.split(",").forEach(manager.addPeer);
  }
});
