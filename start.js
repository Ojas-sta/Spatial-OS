const { spawn } = require('child_process');
const path = require('path');

console.log('--- Spatial Aura Starter ---');

// Start Signaling Server
const server = spawn('node', ['server/index.js'], { stdio: 'inherit' });
console.log('Starting Signaling Server...');

// Start Vite
const vite = spawn('npx', ['vite', '--host'], { stdio: 'inherit', shell: true });
console.log('Starting Vite Dev Server...');

process.on('SIGINT', () => {
    server.kill();
    vite.kill();
    process.exit();
});
