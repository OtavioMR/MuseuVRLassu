import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
// [NEW] Import PointerLockControls for mouse rotation
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// --- Initialization ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x808080);

// Use a Clock to ensure movement speed is consistent regardless of FPS
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

document.body.appendChild(VRButton.createButton(renderer));

// --- The "Character" Rig ---
const cameraRig = new THREE.Group();
cameraRig.position.set(0, 0, 2);
cameraRig.add(camera);
scene.add(cameraRig);

// --- [NEW] PC Controls Setup ---
// 1. Setup PointerLock for mouse rotation
const pcControls = new PointerLockControls(camera, document.body);

// 2. Click to enable controls (lock cursor)
document.addEventListener('click', () => {
    // Only lock if we are NOT in VR (simple check: is XR session active?)
    if (!renderer.xr.isPresenting) {
        pcControls.lock();
    }
});

// 3. Track Keyboard Inputs
const keyState = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': keyState.forward = true; break;
        case 'KeyS': keyState.backward = true; break;
        case 'KeyA': keyState.left = true; break;
        case 'KeyD': keyState.right = true; break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': keyState.forward = false; break;
        case 'KeyS': keyState.backward = false; break;
        case 'KeyA': keyState.left = false; break;
        case 'KeyD': keyState.right = false; break;
    }
});


// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// --- Environment ---
const roomSize = 10;
const wallHeight = 4;

// Floor
const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
floorGeometry.rotateX(-Math.PI / 2);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.receiveShadow = true;
scene.add(floor);

// Walls
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
const wallGeoStr = new THREE.PlaneGeometry(roomSize, wallHeight);

const backWall = new THREE.Mesh(wallGeoStr, wallMaterial);
backWall.position.set(0, wallHeight / 2, -roomSize / 2);
scene.add(backWall);

const frontWall = new THREE.Mesh(wallGeoStr, wallMaterial);
frontWall.position.set(0, wallHeight / 2, roomSize / 2);
scene.add(frontWall);

const leftWall = new THREE.Mesh(wallGeoStr, wallMaterial);
leftWall.rotateY(Math.PI / 2);
leftWall.position.set(-roomSize / 2, wallHeight / 2, 0);
scene.add(leftWall);

const rightWall = new THREE.Mesh(wallGeoStr, wallMaterial);
rightWall.rotateY(-Math.PI / 2);
rightWall.position.set(roomSize / 2, wallHeight / 2, 0);
scene.add(rightWall);

// Sphere
const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.1, metalness: 0.5 });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 0.5, 0);
sphere.castShadow = true;
scene.add(sphere);

// --- VR Controller Integration ---
const controllerModelFactory = new XRControllerModelFactory();
const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
cameraRig.add(controllerGrip1);

const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
cameraRig.add(controllerGrip2);

// --- Window Resize ---
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Animation Loop ---

const vrSpeed = 0.05; // Fixed speed per frame for VR (simple)
const pcSpeed = 5.0;  // Units per second for PC (uses delta time)
const workingVector = new THREE.Vector3();
const dummyCam = new THREE.Camera();

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    // Calculate how much time passed since last frame (for smooth PC movement)
    const dt = clock.getDelta();

    if (renderer.xr.isPresenting) {
        // --- VR MODE ---
        handleVRMovement();
    } else {
        // --- PC MODE ---
        handlePCMovement(dt);
    }
    
    // Keep user inside room (Simple Boundary)
    const limit = roomSize / 2 - 0.5;
    cameraRig.position.x = THREE.MathUtils.clamp(cameraRig.position.x, -limit, limit);
    cameraRig.position.z = THREE.MathUtils.clamp(cameraRig.position.z, -limit, limit);

    renderer.render(scene, camera);
}

// [NEW] PC Movement Logic
function handlePCMovement(dt: number) {
    // Only move if mouse is locked (controls active)
    if (!pcControls.isLocked) return;

    const moveDistance = pcSpeed * dt;
    
    // Get the direction the camera is facing
    camera.getWorldDirection(workingVector);
    workingVector.y = 0; // Flatten to floor
    workingVector.normalize();

    // Calculate "Right" vector (perpendicular to forward)
    const strafeVector = new THREE.Vector3();
    strafeVector.crossVectors(camera.up, workingVector).normalize();

    // Forward/Back
    if (keyState.forward) cameraRig.position.addScaledVector(workingVector, moveDistance);
    if (keyState.backward) cameraRig.position.addScaledVector(workingVector, -moveDistance);

    // Left/Right
    // Note: strafeVector points Left by default in this cross product order (Up x Forward) ??
    // Actually typically Up x Forward = Left, but let's test.
    // Standard Right Hand Rule: Thumb(Y), Index(Z-Forward), Middle(X-Right). 
    // Three.js: Forward is -Z. Cross(Y, -Z) = -X (Left).
    if (keyState.left) cameraRig.position.addScaledVector(strafeVector, moveDistance);
    if (keyState.right) cameraRig.position.addScaledVector(strafeVector, -moveDistance);
}

// VR Movement Logic
function handleVRMovement() {
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (source.handedness === 'left' && source.gamepad) {
            const x = source.gamepad.axes[2]; 
            const z = source.gamepad.axes[3]; 

            if (Math.abs(x) > 0.1 || Math.abs(z) > 0.1) {
                dummyCam.getWorldDirection(workingVector);
                workingVector.y = 0;
                workingVector.normalize();

                const strafeVector = new THREE.Vector3();
                strafeVector.crossVectors(camera.up, workingVector).normalize();

                workingVector.multiplyScalar(-z * vrSpeed);
                strafeVector.multiplyScalar(x * vrSpeed);

                cameraRig.position.add(workingVector);
                cameraRig.position.add(strafeVector);
            }
        }
    }
}

animate();