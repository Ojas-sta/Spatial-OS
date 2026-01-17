import { io } from "socket.io-client";
import Peer from "peerjs";

export class ConnectionManager {
    constructor(serverUrl) {
        this.socket = io(serverUrl);
        // Use PeerJS Cloud for easier setup (no port 3001 needed locally)
        this.peer = new Peer(undefined, {
            debug: 2
        });
        // Actually, setting up a local PeerJS server is complex. 
        // Let's us PeerJS Cloud for now by passing no config (connects to 0.peerjs.com).
        // If that fails, we can add a peerjs server to our express app.

        this.role = null;
        this.roomCode = null;
        this.remoteStream = null;

        this.callbacks = {
            onRoomCreated: null,
            onClientConnected: null,
            onStream: null,
            onData: null
        };

        this.setupSocketEvents();
        this.setupPeerEvents();
    }

    setupSocketEvents() {
        this.socket.on("connect", () => {
            console.log("Socket connected:", this.socket.id);
        });

        this.socket.on("room_created", (code) => {
            this.roomCode = code;
            if (this.callbacks.onRoomCreated) this.callbacks.onRoomCreated(code);
        });

        this.socket.on("client_connected", () => {
            console.log("Client joined room via Socket");
        });

        this.socket.on("peer_id_received", ({ peerId, from }) => {
            console.log(`Received Peer ID from ${from}: ${peerId}`);
            if (this.role === 'target' && from === 'client') {
                this.connectToPeer(peerId);
            }
        });
    }

    setupPeerEvents() {
        this.peer.on('open', (id) => {
            console.log('My Peer ID is:', id);
            // We wait to send this until we have a room code
        });

        this.peer.on('call', (call) => {
            // Answer the call, providing our media stream if needed.
            // In this app, Target receives the call, Client calls.
            // Actually, let's have Client Call Target because Client has the camera stream usually ready first?
            // Or Target calls Client. Let's say Target calls Client to request stream.
            // Wait, standard: Client joins, gets Target ID? 
            // We implemented: Target creates room. Client flows in.
            // Let's stick to: Devices exchange IDs.

            call.answer(); // Answer without stream first? Or needed?

            call.on('stream', (remoteStream) => {
                console.log("Received Stream!");
                this.remoteStream = remoteStream;
                if (this.callbacks.onStream) this.callbacks.onStream(remoteStream);
            });
        });
    }

    // --- Actions ---

    createRoom() {
        this.role = 'target';
        this.socket.emit('create_room');
    }

    joinRoom(code) {
        this.role = 'client';
        this.socket.emit('join_room', code);
        this.roomCode = code;
    }

    async sendPeerId() {
        // Wait for peer to be open
        if (!this.peer.id) {
            await new Promise(r => this.peer.on('open', r));
        }
        this.socket.emit('send_peer_id', {
            code: this.roomCode,
            peerId: this.peer.id,
            role: this.role
        });
    }

    // Target connects to Client
    connectToPeer(remotePeerId) {
        const conn = this.peer.connect(remotePeerId);
        conn.on('open', () => {
            console.log("Data connection open");
            // Request Stream?
        });
    }

    // Client calls Target with video
    callPeer(remotePeerId, localStream) {
        console.log("Calling peer:", remotePeerId);
        const call = this.peer.call(remotePeerId, localStream);
        // We don't expect a stream back, but we could handle it
    }

    on(event, callback) {
        if (event === 'stream') this.callbacks.onStream = callback;
        if (event === 'room_created') this.callbacks.onRoomCreated = callback;
        if (event === 'client_connected') this.callbacks.onClientConnected = callback;
    }
}
