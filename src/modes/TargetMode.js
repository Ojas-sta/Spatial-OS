import { initThreeScene, updateHeadPose, showCalibrationDots } from '../calibration/ThreeScene.js';
import { EyeTracker } from '../tracking/EyeTracker.js';

export async function startTargetMode(conn) {
    console.log("Initializing Target Mode...");

    // DON'T HIDE TARGET-UI YET. We need to see the code.
    const videoLocal = document.getElementById('local-video');
    const videoClient = document.getElementById('client-video');
    const statusPill = document.getElementById('statusPill');

    // 1. Get Local Camera
    try {
        const localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
            audio: false
        });
        videoLocal.srcObject = localStream;
        console.log("Local Stream Active");
    } catch (e) {
        console.error("Local Camera Error:", e);
        alert("Camera Error: " + e.message);
    }

    // 2. Initialize Three.js Scene
    initThreeScene(document.getElementById('canvas-layer'));

    // 3. Wait for Remote Stream via ConnectionManager
    conn.on('stream', (remoteStream) => {
        console.log("Remote Stream Received! Transitioning to Workspace...");

        // Hide Code, Show App
        document.getElementById('target-ui').classList.add('hidden');
        document.getElementById('workspace').classList.remove('hidden');

        videoClient.srcObject = remoteStream;
        videoClient.classList.remove('hidden');

        if (statusPill) statusPill.innerText = "Dual-Camera Linked";

        // 4. Start Tracking (now that we have both)
        startTracking(videoLocal, videoClient);
    });

    conn.sendPeerId(); // Send our ID so Client knows who to call
}

let calibrationState = {
    active: false,
    handDetected: false,
    wasPinching: false,
    pinchTriggered: false,
    currentDotIndex: 0,
    data: []
};

async function startTracking(vid1, vid2) {
    const tracker = new EyeTracker();
    await tracker.init();

    const bgCanvas = document.getElementById('bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');

    function resizeBg() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeBg);
    resizeBg();

    // Start calibration sequence
    startCalibrationFlow();

    console.log("Tracker Initialized. Starting loop...");

    const cursor = document.getElementById('cursor');
    const statusPill = document.getElementById('statusPill');

    async function startCalibrationFlow() {
        console.log("Step 1: Hand Placement...");
        statusPill.innerText = "Show your hands to begin";

        // Wait for hand detection
        while (!calibrationState.handDetected) {
            await new Promise(r => setTimeout(r, 100));
        }

        console.log("Step 2: Gaze Calibration...");
        statusPill.innerText = "Look at the dots and pinch";
        calibrationState.active = true;
        showCalibrationDots();

        for (let i = 0; i < 9; i++) {
            calibrationState.currentDotIndex = i;
            animateDot(i, true);
            statusPill.innerText = `Calibrating Dot ${i + 1}/9`;

            // Wait for pinch
            let pinched = false;
            while (!pinched) {
                if (calibrationState.pinchTriggered) {
                    pinched = true;
                    calibrationState.pinchTriggered = false; // Reset
                }
                await new Promise(r => setTimeout(r, 50));
            }

            animateDot(i, false); // Hide dot after pinch
            await new Promise(r => setTimeout(r, 500)); // Brief pause
        }

        calibrationState.active = false;
        statusPill.innerText = "Calibration Complete";
        console.log("Collected Calibration Data:", calibrationState.data);
    }

    // Main Loop
    function loop() {
        // Draw background blur
        bgCtx.drawImage(vid1, 0, 0, bgCanvas.width, bgCanvas.height);

        tracker.process(vid1, vid2); // Process both frames

        // Get Results
        const res = tracker.getResults(); // { headPose, gazeVector, hand }

        if (res.headPose) {
            updateHeadPose(res.headPose);
        }

        // Update Hand Mesh
        if (res.hand) {
            calibrationState.handDetected = true;
            res.hand.forEach((lm, i) => {
                if (window.handJoints && window.handJoints[i]) {
                    // Map landmarks (0-1) to Three.js space (-5 to 5)
                    window.handJoints[i].position.x = (0.5 - lm.x) * 10;
                    window.handJoints[i].position.y = (0.5 - lm.y) * 10;
                    window.handJoints[i].position.z = -lm.z * 10;
                }
            });

            // Pinch detection
            const dist = Math.hypot(res.hand[8].x - res.hand[4].x, res.hand[8].y - res.hand[4].y);
            const isPinching = dist < 0.04;

            if (isPinching && !calibrationState.wasPinching) {
                calibrationState.pinchTriggered = true;
                if (cursor) {
                    cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
                    cursor.style.background = '#0A84FF';
                }
            } else if (!isPinching) {
                if (cursor) {
                    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                    cursor.style.background = 'rgba(255, 255, 255, 0.95)';
                }
            }
            calibrationState.wasPinching = isPinching;

            // Move Cursor
            if (cursor) {
                cursor.style.left = `${(1 - res.hand[8].x) * window.innerWidth}px`;
                cursor.style.top = `${res.hand[8].y * window.innerHeight}px`;
            }
        }

        requestAnimationFrame(loop);
    }
    loop();
}
