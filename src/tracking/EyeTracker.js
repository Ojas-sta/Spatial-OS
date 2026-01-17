import { FaceMesh } from '@mediapipe/face_mesh';
// We might need to handle Hands for the pinch too
import { Hands } from '@mediapipe/hands';

export class EyeTracker {
    constructor() {
        this.faceMesh = null;
        this.hands = null;

        this.lastResultLocal = null;
        this.lastResultRemote = null;
        this.lastHandResult = null;
    }

    async init() {
        // Initialize Face Mesh
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true, // Crucial for Iris tracking
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults(this.onFaceResults.bind(this));

        // Initialize Hands (for Pinch)
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1
        });
        this.hands.onResults(this.onHandResults.bind(this));

        console.log("MediaPipe Loaded");
    }

    // We need to process TWO streams.
    // MediaPipe usually expects one `.send()`.
    // Multi-stream support in one instance isn't standard.
    // We usually need TWO instances or alternate frames.
    // Given JS single thread, alternating might be better to save perf, 
    // BUT we want simultaneous 3D triangulation.
    // Let's create a SECOND FaceMesh instance for the Client stream?
    // Actually, for "Triangulation" we need both landmarks at roughly same time.
    // Let's create two instances.

    async process(localVideo, remoteVideo) {
        if (localVideo && localVideo.readyState >= 2) {
            await this.faceMesh.send({ image: localVideo });
            await this.hands.send({ image: localVideo }); // Hands only on local?
        }

        // Remote
        // For now, let's just create a second instance if we were serious, 
        // but for this boilerplate, let's just log that we would process the second stream.
        // OR we can alternate sends if we use `videoClient` as input.
        // But `onResults` is global. This is tricky.
        // Solution: Dual instances.
    }

    onFaceResults(results) {
        // This only handles one stream's results right now unless we tag them
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.lastResultLocal = results.multiFaceLandmarks[0];
        }
    }

    onHandResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.lastHandResult = results.multiHandLandmarks[0];
        }
    }

    getResults() {
        // Mocking Head Pose calculation from landmarks
        // In reality, we'd use PnP solver (opencv) or simple geometry
        let headPose = null;
        if (this.lastResultLocal) {
            const mesh = this.lastResultLocal;
            // Simple yaw estimate (nose vs cheeks)
            const nose = mesh[1];
            const leftCheek = mesh[234];
            const rightCheek = mesh[454];

            const midX = (leftCheek.x + rightCheek.x) / 2;
            const yaw = (nose.x - midX) * 5; // Scaling factor

            headPose = {
                rotation: { x: 0, y: yaw, z: 0 }, // Simplified
                translation: { x: 0, y: 0, z: 0 }
            };
        }

        return {
            headPose,
            hand: this.lastHandResult
        };
    }
}
