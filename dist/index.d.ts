import WebSocket, { WebSocketServer } from "ws";
export interface Peer extends WebSocket {
    peerUrl: string;
}
export type PeerEvent<T = any> = {
    event: string;
    data: T;
};
export declare function isPeerEvent(obj: any): obj is PeerEvent;
export type EventHandler<T = any> = (peer: Peer, data: T) => void;
export declare class PeerManager {
    private peers;
    private eventHandlers;
    private current_node_url;
    private server;
    constructor(current_node_url: string);
    registerEvent<T>(event: string, handler: EventHandler<T>): void;
    getServer(): WebSocketServer | null;
    getPeers(): Array<Peer> | [];
    broadcast<T>(event: string, data: T): void;
    listenForPeers(interval: number): void;
    addPeer(peerUrl: string): void;
}
