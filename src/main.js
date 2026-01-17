import { ConnectionManager } from './networking/ConnectionManager.js';
// We will import modes dynamically or usually just here
import { startClientMode } from './modes/ClientMode.js';
import { startTargetMode } from './modes/TargetMode.js';

// DOM Elements
const landing = document.getElementById('landing');
const btnTarget = document.getElementById('btn-target');
const btnClient = document.getElementById('btn-client');

const targetUI = document.getElementById('target-ui');
const roomCodeDisplay = document.getElementById('room-code');

const clientUI = document.getElementById('client-ui');
const codeInput = document.getElementById('code-input');
const btnConnect = document.getElementById('btn-connect');

// State
const serverUrl = 'http://localhost:3000'; // Assume local for dev, configurable for prod
const conn = new ConnectionManager(serverUrl);

// Event Listeners
btnTarget.addEventListener('click', () => {
    landing.classList.add('hidden');
    targetUI.classList.remove('hidden');
    initTarget();
});

btnClient.addEventListener('click', () => {
    landing.classList.add('hidden');
    clientUI.classList.remove('hidden');
});

btnConnect.addEventListener('click', () => {
    const code = codeInput.value;
    if (code.length === 4) {
        initClient(code);
    } else {
        alert("Please enter a 4-digit code");
    }
});

// Mode Initialization
function initTarget() {
    console.log("Target Mode selected. Creating room...");
    conn.createRoom();

    conn.on('room_created', (code) => {
        console.log("Room Created:", code);
        roomCodeDisplay.innerText = code;
        // Start the background tracking logic but wait for client to show video
        startTargetMode(conn);
    });
}

function initClient(code) {
    console.log("Joining room:", code);
    conn.joinRoom(code);

    // UI Update
    clientUI.classList.add('hidden');
    document.getElementById('client-active').classList.remove('hidden');

    startClientMode(conn);
}
