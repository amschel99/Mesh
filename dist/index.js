"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerManager = void 0;
exports.isPeerEvent = isPeerEvent;
const ws_1 = __importStar(require("ws"));
function isPeerEvent(obj) {
    return (obj &&
        typeof obj === "object" &&
        typeof obj.event === "string" &&
        "data" in obj);
}
class PeerManager {
    peers = [];
    eventHandlers = new Map();
    current_node_url = "";
    server = null;
    constructor(current_node_url) {
        this.current_node_url = current_node_url;
        this.server = new ws_1.WebSocketServer({ noServer: true });
        this.addPeer = this.addPeer.bind(this);
        this.server.on("connection", (client) => {
            client.send(JSON.stringify({
                event: "KNOWN_PEERS",
                data: {
                    value: this.peers
                        .map((p) => p.peerUrl)
                        .concat(this.current_node_url),
                },
            }));
            client.on("message", (rawData) => {
                try {
                    const parsedData = JSON.parse(rawData.toString());
                    if (!isPeerEvent(parsedData)) {
                        console.warn("Received invalid peer event:", parsedData);
                        return;
                    }
                    const { event, data } = parsedData;
                    const handler = this.eventHandlers.get(event);
                    if (handler) {
                        handler(client, data);
                    }
                    else {
                        console.warn(`No handler registered for event: ${event}`);
                    }
                }
                catch (error) {
                    console.error("Error processing message:", error);
                }
            });
        });
        this.registerEvent("KNOWN_PEERS", (peer, data) => {
            data.value.forEach((url) => {
                if (url !== this.current_node_url)
                    this.addPeer(url);
            });
        });
        this.registerEvent("REQUEST_KNOWN_PEERS", (peer, data) => {
            if (data?.requester) {
                this.addPeer(data.requester);
            }
            peer.send(JSON.stringify({
                event: "KNOWN_PEERS",
                data: {
                    value: this.peers
                        .map((p) => p.peerUrl)
                        .concat(this.current_node_url),
                },
            }));
        });
    }
    registerEvent(event, handler) {
        this.eventHandlers.set(event, handler);
    }
    getServer() {
        return this.server;
    }
    getPeers() {
        return this.peers;
    }
    broadcast(event, data) {
        const message = JSON.stringify({ event, data });
        this.peers.forEach((peer) => {
            if (peer.readyState === ws_1.default.OPEN) {
                peer.send(message);
            }
        });
    }
    listenForPeers(interval) {
        setInterval(() => {
            this.broadcast("REQUEST_KNOWN_PEERS", {
                requester: this.current_node_url,
            });
        }, interval);
    }
    addPeer(peerUrl) {
        if (peerUrl === this.current_node_url ||
            this.peers.some((p) => p.peerUrl === peerUrl))
            return;
        const peerClient = new ws_1.default(peerUrl);
        peerClient.peerUrl = peerUrl;
        peerClient.on("open", () => {
            console.log("Connected to peer:", peerUrl);
            peerClient.send(JSON.stringify({
                event: "REQUEST_KNOWN_PEERS",
                data: { requester: this.current_node_url },
            }));
        });
        peerClient.on("message", (rawData) => {
            try {
                const parsedData = JSON.parse(rawData.toString());
                if (!isPeerEvent(parsedData)) {
                    console.warn("Received invalid peer event:", parsedData);
                    return;
                }
                const { event, data } = parsedData;
                const handler = this.eventHandlers.get(event);
                if (handler) {
                    handler(peerClient, data);
                }
                else {
                    console.warn(`No handler registered for event: ${event}`);
                }
            }
            catch (err) {
                console.error("Peer message error:", err);
            }
        });
        peerClient.on("close", () => {
            console.log("Peer disconnected:", peerUrl);
            this.peers = this.peers.filter((p) => p.peerUrl !== peerUrl);
            setTimeout(() => this.addPeer(peerUrl), 5000);
        });
        peerClient.on("error", (err) => {
            console.error("Peer connection error:", peerUrl, err);
            peerClient.terminate();
        });
        this.peers.push(peerClient);
    }
}
exports.PeerManager = PeerManager;
