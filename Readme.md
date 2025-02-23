# PeerManager: The Backbone of a Decentralized Network

## The Thought Process: Building a Self-Sustaining Web

Imagine a network where **a node needs to know only one other peer**, and from that single connection, it discovers and links to every other node. Eventually, the node will be connected to all other nodes and the other nodes will eventually be connected to this node. This is the foundation of **PeerManager**—a **self-expanding, decentralized WebSocket-based network** that is resilient, autonomous, and infinitely scalable.

At its core, each node in this network **plays a dual role**:

1. **WebSocket Server:** Accepts connections from new peers.
2. **WebSocket Client:** Actively connects to known peers.

This creates a **mesh network** where every node can reach every other node, ensuring **high redundancy, auto-healing connections, and seamless peer discovery**—all without a central authority.

## The Design: A Dynamic and Adaptive System

### **1. Self-Discovery: The Network That Grows Itself**

A node starts with a single known peer, but the moment it joins the network:

- It **broadcasts its presence**.
- It **receives a list of other known peers**.
- It **connects to them dynamically**, further expanding the web.

In essence, a single connection is enough to snowball into a fully connected network.

### **2. Every Node is Both Server and Client**

This **bidirectional connectivity** is what makes the system so powerful. A node doesn’t just wait to be discovered—it actively reaches out, constantly expanding the network without relying on a central registry.

### **3. Event-Based Communication: A Language for Peers**

Nodes communicate using structured events, enabling flexible messaging, peer management, and future extensibility. The system can be adapted for **secure key storage, real-time messaging, decentralized databases**, and more.

### **4. Resilient & Self-Healing**

If a peer disconnects, the network adapts:

- Other nodes attempt to **reconnect**.
- If a connection is lost, peers are **reintroduced dynamically**.
- The system remains functional **even if multiple nodes go offline**.

## Use Cases: The Power Behind the Framework

Some potential applications include:

### **1. Decentralized Key Management Network** (DKMN)

- Nodes store **shards of a cryptographic key**, split using **Shamir’s Secret Sharing (SSS)**.
- A threshold of nodes must cooperate to reconstruct the original key.
- Ideal for **secure password management, cryptocurrency wallets, and sensitive data storage**.

### **2. Peer-to-Peer Messaging & Communication**

- A **serverless chat network** where messages propagate directly between users.
- No single point of failure, ensuring **privacy and resilience**.

### **3. Blockchain Node Discovery & Syncing**

- Quickly connects blockchain nodes without relying on static lists.
- Facilitates **transaction relay, block propagation, and state synchronization**.

### **4. IoT Networks & Distributed Sensor Systems**

- IoT devices automatically discover and communicate **without a central controller**.
- Data is **shared, processed, and stored across the entire network**.

## The Code: Breaking Down the Magic

### **1. Initializing the PeerManager**

```typescript
const peerManager = new PeerManager("ws://localhost:8080");
```

- Starts a WebSocket server that listens for incoming connections.

### **2. Handling New Peer Connections**

```typescript
client.send(
  JSON.stringify({
    event: "KNOWN_PEERS",
    data: {
      value: this.peers.map((p) => p.peerUrl).concat(this.current_node_url),
    },
  })
);
```

- When a node connects, it **shares its list of known peers**, accelerating network expansion.

### **3. Dynamic Peer Discovery**

```typescript
this.broadcast("REQUEST_KNOWN_PEERS", { requester: this.current_node_url });
```

- Periodically asks for known peers, ensuring **constant growth and reconnection**.

### **4. Event-Based Message Handling**

```typescript
if (!isPeerEvent(parsedData)) {
  console.warn("Received invalid peer event:", parsedData);
  return;
}
const handler = this.eventHandlers.get(event);
if (handler) {
  handler(client, data);
} else {
  console.warn(`No handler registered for event: ${event}`);
}
```

- Validates messages and routes them to appropriate handlers.

### **5. Auto-Reconnecting Disconnected Peers**

```typescript
setTimeout(() => this.addPeer(peerUrl), 5000);
```

- If a peer goes offline, a **reconnection attempt is made after 5 seconds**, ensuring **self-healing connections**.

## Why This System is Revolutionary

### **1. Minimal Setup, Maximum Connectivity**

- A node only needs **one known peer** to eventually reach the entire network.
- No manual configuration required.

### **2. Fully Decentralized & Self-Sustaining**

- Peers dynamically discover, connect, and maintain links **without central servers**.
- The network **grows naturally** over time.

### **3. Robust and Fault-Tolerant**

- If nodes drop off, **others fill in the gaps**.
- Automatic reconnections make the system highly **resilient to failures**.

### **4. Scalable and Extensible**

- The event-based architecture makes it easy to **add new functionality**.
- Can be adapted for **various decentralized applications** beyond peer management.

## Improvements & Future Enhancements

### **1. Security Enhancements**

- Implement **end-to-end encryption** for private messaging.
- Introduce **peer authentication** to prevent Sybil attacks.

### **2. Performance & Scalability Upgrades**

- Optimize peer discovery with **Distributed Hash Tables (DHTs)**.
- Introduce a **hierarchical topology** for better large-scale performance.

### **3. Fault Tolerance Enhancements**

- Implement **exponential backoff** for reconnections.
- Store peer data **persistently** to avoid excessive network overhead.

### **4. Data Integrity & Validation**

- Use **cryptographic signatures** to authenticate messages.
- Implement **checksum validation** to detect tampered data.

This system isn’t just a **WebSocket peer manager**—it’s the blueprint for **next-generation decentralized applications**. Whether for **secure key management, real-time messaging, IoT networking, or blockchain node discovery**, **PeerManager** unlocks the **true potential of decentralized networking**.

By refining its **security, scalability, and efficiency**, this framework can power **unstoppable, self-healing, and infinitely scalable** networks—shaping the future of **decentralized computing**. 🚀

## How to build networks with custom business logics using this library

### **1. Node Discovery**

- Nodes automatically **discover and connect to each other** without needing a central server.
- Uses a **gossip protocol** to share peer lists and expand the network dynamically.

### **2. Message Exchange**

- Nodes can **send and receive arbitrary JSON-encoded messages**.
- You define the **events** (e.g., `FILE_UPLOAD`, `CHAT_MESSAGE`) and the **payloads** (e.g., file data, text).

### **3. Extensibility**

- You write the **business logic** for your specific use case (e.g., file storage, AI training).
- The library handles the **networking layer**, so you can focus on what makes your app unique.

---

## **How Does It Work?**

### **1. Define Your Events**

- **Events** are the actions your nodes can perform (e.g., `FILE_UPLOAD`, `FILE_DOWNLOAD`).
- Each event has a **JSON payload** that contains the necessary data (e.g., file name, file content).

Example:

```typescript
{
  event: "FILE_UPLOAD",
  data: {
    fileName: "example.txt",
    fileContent: "Hello, world!"
  }
}
```

### **2. Register Event Handlers**

Use `registerEvent` to define how your nodes should respond to specific events.

Example:

```typescript
manager.registerEvent("FILE_UPLOAD", (peer, data) => {
  console.log(`Received file: ${data.fileName}`);
  saveFileToDisk(data.fileName, data.fileContent);
});
```

### **3. Broadcast Events**

Use `broadcast` to send events to all connected peers.

Example:

```typescript
manager.broadcast("FILE_UPLOAD", {
  fileName: "example.txt",
  fileContent: "Hello, world!",
});
```

### **4. Discover Peers**

Nodes automatically discover and connect to each other using the `KNOWN_PEERS` and `REQUEST_KNOWN_PEERS` events.

---

## **Example: Building a Decentralized File Storage System**

Let’s say you want to build a P2P file storage system where users can upload and download files. Here’s how you’d use the Mesh Protocol library:

### **1. Define Your Events**

- `FILE_UPLOAD`: Upload a file to the network.
- `FILE_DOWNLOAD`: Request a file from the network.
- `FILE_RESPONSE`: Send the requested file back to the requester.

### **2. Register Event Handlers**

```typescript
// Handle file uploads
manager.registerEvent("FILE_UPLOAD", (peer, data) => {
  saveFileToDisk(data.fileName, data.fileContent);
  console.log(`File saved: ${data.fileName}`);
});

// Handle file download requests
manager.registerEvent("FILE_DOWNLOAD", (peer, data) => {
  const fileContent = readFileFromDisk(data.fileName);
  peer.send(
    JSON.stringify({
      event: "FILE_RESPONSE",
      data: { fileName: data.fileName, fileContent },
    })
  );
});
```

### **3. Broadcast Events**

```typescript
// Upload a file
manager.broadcast("FILE_UPLOAD", {
  fileName: "example.txt",
  fileContent: "Hello, world!",
});

// Download a file
manager.broadcast("FILE_DOWNLOAD", {
  fileName: "example.txt",
});
```

### **4. Run Your Network**

Start multiple nodes and watch them discover each other and exchange files.

Use the `examples` folder in the repository as a starting point.

---

## **Why Use This Library?**

### **1. Decentralized by Design**

- No central servers – nodes connect directly to each other.
- Resilient to failures – the network heals itself if nodes go offline.

### **2. Easy to Extend**

- Add new events and business logic without modifying the core library.
- Perfect for building custom P2P applications.

### **3. Lightweight and Fast**

- Built on WebSocket for low-latency communication.
- Minimal overhead – ideal for resource-constrained devices.

---

## **Getting Started**

### **1. Install the Library**

```bash
npm install mesh-protocol
```

### **2. Check Out the Examples**

The `examples` folder contains template code to help you get started.

Use it as a foundation for your own project.

### **3. Define Your Business Logic**

- Decide on the events your nodes will use.
- Write the handlers for those events.

### **4. Run Your Network**

Start multiple nodes and watch them discover each other and exchange messages.

---

## **What Can You Build?**

- **Decentralized File Storage**: Share files across a P2P network.
- **P2P Messaging**: Send messages directly between users.
- **Distributed AI**: Train models across multiple devices.
- **IoT Networks**: Connect and manage smart devices.
- **Blockchain Node Discovery**: Sync blockchain data without central servers.

---

## **Next Steps**

- **Explore the Examples**: Dive into the `examples` folder to see the library in action.
- **Define Your Events**: Decide what actions your nodes will perform.
- **Build Your App**: Write the business logic and start your network.

The **Mesh Protocol** library is your gateway to building decentralized, scalable, and resilient networks. **What will you create? 🚀**
