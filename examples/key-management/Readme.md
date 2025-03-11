# The mesh library

A robust, extensible WebSocket-based networking layer for building decentralized applications. This library provides peer-to-peer communication, event handling, and network management out of the box, allowing you to focus on implementing your custom business logic.

---

## Features

- **Peer-to-Peer Communication**: Connect nodes in a decentralized network.
- **Event-Driven Architecture**: Register custom event handlers for business logic.
- **Automatic Peer Discovery**: Discover and connect to new peers dynamically.
- **Broadcast Messaging**: Send messages to all connected peers.
- **Extensible**: Easily add new message types and workflows.

---

## Installation

```bash
npm install mesh-protocol
```

## Quick start

### 1. Create a node

```typescript
import { PeerManager } from "peer-manager-library";

const nodeUrl = "ws://localhost:3000";
const peerManager = new PeerManager(nodeUrl);

peerManager.listenForPeers(10000);
```

### 2. Add Custom Business Logic

```typescript
// Register a custom event handler
peerManager.registerEvent("CUSTOM_EVENT", (peer, data) => {
  console.log("Received custom event:", data);
  // Add your business logic here
});

// Broadcast a custom event
peerManager.broadcast("CUSTOM_EVENT", { message: "Hello, network!" });
```

### 3. Connect to peers

Each node (or participant) in the network only needs to know the address of one other peer to get started. Once connected, the nodes share their lists of known peers with each other. Over time, this sharing ensures that every node discovers and connects to all the other peers in the network.

In simpler terms:

Every node acts like both a server (accepting connections) and a client (connecting to others).

You only need one peer's address to begin, and the network will help you find the rest automatically.

```typescript
// Manually add a peer
peerManager.addPeer("ws://other-node:3001");

// Automatically discover peers
peerManager.listenForPeers(10000); // Check for new peers every 10 seconds
```

### 4. Build your app

Create interfaces for your custom messages. For example:

```typescript
interface ShardMessage {
  secretHash: string;
  shard: string;
}

interface SignRequest {
  transaction: string;
  requester: string;
}
```

### 5. Add event handlers

Handle custom events in your app:

```typescript
// Store a shard when requested
peerManager.registerEvent("STORE_SHARD", (peer, data: ShardMessage) => {
  console.log(`Storing shard for secret: ${data.secretHash}`);
  // Add your storage logic here
});

// Handle signing requests
peerManager.registerEvent("SIGN", (peer, data: SignRequest) => {
  console.log(`Signing request from: ${data.requester}`);
  // Add your signing logic here
});
```

### 6. Send messages

Send messages to other nodes:

```typescript
// Store a shard
peerManager.broadcast("STORE_SHARD", {
  secretHash: "0x123...",
  shard: "encrypted-data-here",
});
```
