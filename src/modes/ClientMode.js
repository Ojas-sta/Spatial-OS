export async function startClientMode(conn) {
    console.log("Initializing Client Mode...");

    try {
        // 1. Get Camera
        // Use environment facing if available
        const constraints = {
            video: {
                facingMode: 'environment', // Rear camera preferred
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 60 }
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Client Camera Stream Acquired", stream);

        // Optional: Show local preview if we want, but usually we just send it.
        // We might want to see it for alignment
        // const video = document.createElement('video');
        // video.srcObject = stream;
        // document.body.appendChild(video);

        // 2. Wait for Socket Handshake to finish joining (usually instant after join_room)
        // Then send Peer ID
        conn.sendPeerId();

        // 3. Listen for requests or just wait
        // The Target will receive our Peer ID and we might need to "Answer" or "Call".
        // Current logic in ConnectionManager:
        // - Target receives Peer ID -> Target Connects (Data Channel)
        // - We need to CALL with media stream.

        // Let's modify logic: 
        // We need to wait for the Target's Peer ID? 
        // Or simpler: Client calls Target? 
        // Target creates room -> Target is "Host".
        // Client joins -> Client is "Guest".

        // Let's have the Client initiate the CALL once it gets the Target's Peer ID via socket.
        conn.socket.on('peer_id_received', ({ peerId, from }) => {
            if (from === 'target') {
                console.log("Target ID received, calling with stream...");
                conn.callPeer(peerId, stream);
            }
        });

    } catch (e) {
        console.error("Camera Error:", e);
        alert("Could not access camera: " + e.message);
    }
}
