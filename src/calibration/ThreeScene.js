import * as THREE from 'three';

let scene, camera, renderer;
let headMesh;
let dotsGroup;

export function initThreeScene(container) {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 10; // 10 units away

    // Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(light);
    const dirLight = new THREE.DirectionalLight(0x00aaff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // 1. Placement Box (Representing the User's Head)
    const geometry = new THREE.BoxGeometry(2, 2.5, 2); // Head approximation
    const material = new THREE.MeshPhongMaterial({
        color: 0x222222,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });
    headMesh = new THREE.Mesh(geometry, material);
    scene.add(headMesh);

    // 2. Calibration Dots Group
    dotsGroup = new THREE.Group();
    scene.add(dotsGroup);

    // 3. Hand Representation (Spheres for joints)
    window.handJoints = [];
    for (let i = 0; i < 21; i++) {
        const geo = new THREE.SphereGeometry(0.1, 8, 8);
        const mat = new THREE.MeshPhongMaterial({ color: 0x00aaff, transparent: true, opacity: 0.8 });
        const sphere = new THREE.Mesh(geo, mat);
        scene.add(sphere);
        window.handJoints.push(sphere);
    }

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

export function updateHeadPose(pose) {
    // pose: { rotation: {x,y,z}, translation: {x,y,z} }
    if (!headMesh) return;

    // Smooth Lerp
    headMesh.rotation.x = pose.rotation.x;
    headMesh.rotation.y = pose.rotation.y;
    headMesh.rotation.z = pose.rotation.z;

    // Visualization of "Lock"
    // If head is straight forward, turn green
    const isAligned = Math.abs(pose.rotation.y) < 0.2; // Example threshold
    headMesh.material.color.setHex(isAligned ? 0x00ff00 : 0xff0000);
}

export function showCalibrationDots() {
    // Generate 9 dots in a grid
    dotsGroup.clear();
    const positions = [
        [-4, 3, 0], [0, 3, 0], [4, 3, 0],
        [-4, 0, 0], [0, 0, 0], [4, 0, 0],
        [-4, -3, 0], [0, -3, 0], [4, -3, 0]
    ];

    positions.forEach(pos => {
        const geo = new THREE.SphereGeometry(0.2, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.set(...pos);
        dotsGroup.add(sphere);
    });
}

export function animateDot(index, active = true) {
    const dots = dotsGroup.children;
    if (dots[index]) {
        dots[index].scale.set(active ? 2 : 1, active ? 2 : 1, active ? 2 : 1);
        dots[index].material.color.setHex(active ? 0x0A84FF : 0xffffff);
    }
}
