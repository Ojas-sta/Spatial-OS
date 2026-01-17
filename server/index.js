const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Room State: { roomCode: { target: socketId, client: socketId, targetPeerId: string, clientPeerId: string } }
const rooms = {};

function generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Target creates a room
    socket.on('create_room', () => {
        const code = generateCode();
        rooms[code] = { target: socket.id, client: null };
        socket.join(code);
        socket.emit('room_created', code);
        console.log(`Room created: ${code} by Target ${socket.id}`);
    });

    // Client joins a room
    socket.on('join_room', (code) => {
        if (rooms[code]) {
            if (rooms[code].client) {
                socket.emit('error', 'Room full');
                return;
            }
            rooms[code].client = socket.id;
            socket.join(code);
            // Notify Target that client joined
            io.to(rooms[code].target).emit('client_connected');
            socket.emit('room_joined', code); // Confirm join to client
            console.log(`Client ${socket.id} joined Room ${code}`);
        } else {
            socket.emit('error', 'Invalid code');
        }
    });

    // Exchange PeerJS IDs (Signaling for WebRTC)
    socket.on('send_peer_id', ({ code, peerId, role }) => {
        if (!rooms[code]) return;

        if (role === 'target') {
            rooms[code].targetPeerId = peerId;
        } else if (role === 'client') {
            rooms[code].clientPeerId = peerId;
            // If client sends ID, send it to target
            if (rooms[code].target) {
                io.to(rooms[code].target).emit('peer_id_received', { peerId, from: 'client' });
            }
        }

        // Bi-directional exchange check
        if (role === 'target' && rooms[code].client) {
            io.to(rooms[code].client).emit('peer_id_received', { peerId, from: 'target' });
        }
    });

    // Generic signal relay (if needed beyond PeerJS)
    socket.on('signal', ({ code, data }) => {
        socket.to(code).emit('signal', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Cleanup logic could go here (remove room if target leaves, etc.)
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
