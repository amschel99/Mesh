import WebSocket, { WebSocketServer } from "ws";

interface Peer extends WebSocket {
  peerUrl: string;
}

type PeerEvent<T = any> = { event: string; data: T };

function isPeerEvent(obj: any): obj is PeerEvent {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.event === "string" &&
    "data" in obj
  );
}

type EventHandler<T = any> = (peer: Peer, data: T) => void;

class PeerManager {
  private peers: Peer[] = [];
  private eventHandlers: Map<string, EventHandler> = new Map();

  current_node_url = "";
  server: null | WebSocket.Server = null;

  constructor(current_node_url: string) {
    this.current_node_url = current_node_url;
    this.server = new WebSocketServer({ noServer: true });

    this.server.on("connection", (client: Peer) => {
      client.send(
        JSON.stringify({
          event: "KNOWN_PEERS",
          data: {
            value: this.peers
              .map((p) => p.peerUrl)
              .concat(this.current_node_url),
          },
        })
      );

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
          } else {
            console.warn(`No handler registered for event: ${event}`);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      });
    });

    this.registerEvent("KNOWN_PEERS", (peer, data: { value: string[] }) => {
      data.value.forEach((url) => {
        if (url !== this.current_node_url) this.addPeer(url);
      });
    });

    this.registerEvent(
      "REQUEST_KNOWN_PEERS",
      (peer, data: { requester: string }) => {
        if (data?.requester) {
          this.addPeer(data.requester);
        }

        peer.send(
          JSON.stringify({
            event: "KNOWN_PEERS",
            data: {
              value: this.peers
                .map((p) => p.peerUrl)
                .concat(this.current_node_url),
            },
          })
        );
      }
    );
  }

  registerEvent<T>(event: string, handler: EventHandler<T>) {
    this.eventHandlers.set(event, handler as EventHandler);
  }

  broadcast<T>(event: string, data: T) {
    const message = JSON.stringify({ event, data });
    this.peers.forEach((peer) => {
      if (peer.readyState === WebSocket.OPEN) {
        peer.send(message);
      }
    });
  }

  listenForPeers(interval: number) {
    setInterval(() => {
      this.broadcast("REQUEST_KNOWN_PEERS", {
        requester: this.current_node_url,
      });
    }, interval);
  }

  addPeer(peerUrl: string) {
    if (
      peerUrl === this.current_node_url ||
      this.peers.some((p) => p.peerUrl === peerUrl)
    )
      return;

    const peerClient = new WebSocket(peerUrl) as Peer;
    peerClient.peerUrl = peerUrl;

    peerClient.on("open", () => {
      console.log("Connected to peer:", peerUrl);
      peerClient.send(
        JSON.stringify({
          event: "REQUEST_KNOWN_PEERS",
          data: { requester: this.current_node_url },
        })
      );
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
        } else {
          console.warn(`No handler registered for event: ${event}`);
        }
      } catch (err) {
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
