import express from "express";
import { PeerManager, Peer, EventHandler } from "mesh-protocol";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
// Import a Shamir Secret Sharing library
import * as shamirSecretSharing from "shamirs-secret-sharing";

dotenv.config();
const app = express();
const PORT = 5500;

const my_addrr = `ws://localhost:${PORT}`;
let manager = new PeerManager(my_addrr);
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
const httpServer = http.createServer(app);
const wss = manager.getServer();

const SHARDS_DIR = path.join(__dirname, "shards");
if (!fs.existsSync(SHARDS_DIR)) {
  fs.mkdirSync(SHARDS_DIR);
}

// Status reporting
setInterval(() => {
  console.log(
    `Currently we are connected to ${
      manager.getPeers().length
    } peers which are:`
  );
  manager.getPeers().forEach((peer: Peer) => {
    console.log(`${peer.url}`);
  });
}, 3000);

// Event to store a key shard
manager.registerEvent(
  "STORE_KEY_SHARD",
  (peer, data: { shardKey: string; shard: string }) => {
    console.log(
      `Received shard with key ${data.shardKey} from ${peer.peerUrl}`
    );
    const shardPath = path.join(SHARDS_DIR, `${data.shardKey}.json`);
    fs.writeFileSync(
      shardPath,
      JSON.stringify({
        shard: data.shard,
        source: peer.peerUrl,
        timestamp: new Date().toISOString(),
      })
    );

    // Acknowledge receipt
    peer.send(
      JSON.stringify({
        event: "SHARD_STORED",
        data: { shardKey: data.shardKey, status: "success" },
      })
    );
  }
);

// Event to retrieve a key shard
manager.registerEvent(
  "REQUEST_KEY_SHARD",
  (peer, data: { shardKey: string; requester: string }) => {
    const shardPath = path.join(SHARDS_DIR, `${data.shardKey}.json`);

    if (fs.existsSync(shardPath)) {
      try {
        const shardData = JSON.parse(fs.readFileSync(shardPath, "utf8"));
        peer.send(
          JSON.stringify({
            event: "KEY_SHARD_RESPONSE",
            data: {
              shardKey: data.shardKey,
              shard: shardData.shard,
              requester: data.requester,
            },
          })
        );
        console.log(`Sent shard ${data.shardKey} to ${peer.peerUrl}`);
      } catch (err) {
        console.error(`Error reading shard ${data.shardKey}:`, err);
      }
    } else {
      console.log(`Shard ${data.shardKey} not found`);
      peer.send(
        JSON.stringify({
          event: "KEY_SHARD_RESPONSE",
          data: {
            shardKey: data.shardKey,
            error: "Shard not found",
            requester: data.requester,
          },
        })
      );
    }
  }
);

// Handle key upload and distribution
app.post("/handle-key", (req, res) => {
  const { key, keyId } = req.body;

  if (!key) {
    res.status(400).json({ error: "Key is required" });
    return;
  }

  const peers = manager.getPeers();
  if (peers.length === 0) {
    res.status(400).json({ error: "No peers available for distribution" });
    return;
  }

  // Generate unique key identifier if not provided
  const uniqueKeyId = keyId || crypto.randomUUID();

  // Calculate threshold (2/3 of peers)
  const numPeers = peers.length;
  const threshold = Math.ceil((2 * numPeers) / 3);

  try {
    // Convert key to Buffer if it's not already
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key);

    // Generate shares using Shamir's Secret Sharing
    const shares = shamirSecretSharing.split(keyBuffer, {
      shares: numPeers,
      threshold: threshold,
    });

    // Distribute shards to peers
    peers.forEach((peer: Peer, index) => {
      const shardKey = `${uniqueKeyId}-${index}`;
      peer.send(
        JSON.stringify({
          event: "STORE_KEY_SHARD",
          data: {
            shardKey: shardKey,
            shard: shares[index].toString("base64"),
          },
        })
      );
    });

    // Store metadata about this key for reconstruction
    const metadataPath = path.join(SHARDS_DIR, `${uniqueKeyId}-meta.json`);
    fs.writeFileSync(
      metadataPath,
      JSON.stringify({
        keyId: uniqueKeyId,
        totalShards: numPeers,
        threshold: threshold,
        timestamp: new Date().toISOString(),
        peerUrls: peers.map((p) => p.peerUrl),
      })
    );

    res.json({
      success: true,
      keyId: uniqueKeyId,
      threshold,
      totalShards: numPeers,
    });
  } catch (error) {
    console.error("Error splitting and distributing key:", error);
    res.status(500).json({ error: "Failed to process key" });
  }
});

// Handle key reconstruction
app.post("/reconstruct-key", async (req, res) => {
  const { keyId } = req.body;

  if (!keyId) {
    res.status(400).json({ error: "Key ID is required" });
    return;
  }

  // Check if we have metadata for this key
  const metadataPath = path.join(SHARDS_DIR, `${keyId}-meta.json`);
  if (!fs.existsSync(metadataPath)) {
    res.status(404).json({ error: "Key metadata not found" });
    return;
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    const receivedShards = new Map();

    // Request shards from all peers
    const peers = manager.getPeers();
    const requestPromises = [];

    // Setup promise for collecting responses
    const shardCollectionPromise = new Promise((resolve, reject) => {
      // Register event handler for shard responses
      const responseHandler: EventHandler = (
        peer,
        data: {
          shardKey: string;
          shard: string;
          requester: string;
          error?: string;
        }
      ) => {
        if (data.requester !== my_addrr || !data.shardKey.startsWith(keyId)) {
          return; // Not our request
        }

        if (!data.error && data.shard) {
          receivedShards.set(data.shardKey, data.shard);
        }

        // Check if we have enough shards
        if (receivedShards.size >= metadata.threshold) {
          // We have enough shards, resolve the promise
          resolve(Array.from(receivedShards.entries()));
        }
      };

      manager.registerEvent("KEY_SHARD_RESPONSE", responseHandler);

      // Set a timeout in case we don't get enough responses
      setTimeout(() => {
        if (receivedShards.size < metadata.threshold) {
          reject(
            new Error(
              `Only received ${receivedShards.size} shards, need ${metadata.threshold}`
            )
          );
        }
      }, 10000); // 10 second timeout
    });

    // Request shards from all peers
    for (let i = 0; i < metadata.totalShards; i++) {
      const shardKey = `${keyId}-${i}`;
      manager.broadcast("REQUEST_KEY_SHARD", {
        shardKey: shardKey,
        requester: my_addrr,
      });
    }

    // Wait for enough shards
    const shards = await shardCollectionPromise;

    // Reconstruct the key
    const sharesForReconstruction = Array.from(receivedShards.values()).map(
      (shard) => Buffer.from(shard, "base64")
    );

    const reconstructedKey = shamirSecretSharing.combine(
      sharesForReconstruction
    );

    res.json({
      success: true,
      key: reconstructedKey.toString(),
      shardsUsed: receivedShards.size,
    });
  } catch (error) {
    console.error("Error reconstructing key:", error);
    res.status(500).json({
      error: "Failed to reconstruct key",
      message: error.message,
    });
  }
});

httpServer.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Key management node running on port ${PORT}`);
  if (process.env.BOOTSTRAP_PEERS) {
    process.env.BOOTSTRAP_PEERS.split(",").forEach(manager.addPeer);
  }

  // Start peer discovery
  manager.listenForPeers(5000);
});
