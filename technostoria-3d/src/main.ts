// ==============================
// IMPORTAÇÕES
// ==============================

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';


// ==============================
// CONFIGURAÇÕES
// ==============================

const PLAYER_RADIUS = 0.35;
const SPHERE_RADIUS = 0.5;

const roomSize = 10;
const wallHeight = 4;

const pcSpeed = 5;
const vrSpeed = 0.05;

const THROW_FORCE = 14;
const GRAVITY = -9.8;


// ==============================
// ESTADO DA ESFERA
// ==============================

let isSphereGrabbed = false;
const sphereVelocity = new THREE.Vector3();

const raycaster = new THREE.Raycaster();


// ==============================
// CENA / CÂMERA / RENDERER
// ==============================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x808080);

const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));


// ==============================
// PLAYER RIG
// ==============================

const cameraRig = new THREE.Group();
cameraRig.position.set(0, 1.7, 2);
cameraRig.add(camera);
scene.add(cameraRig);


// ==============================
// CONTROLES PC
// ==============================

const pcControls = new PointerLockControls(camera, document.body);

document.addEventListener('click', () => {
  if (!renderer.xr.isPresenting) pcControls.lock();
});

const keyState = { forward: false, backward: false, left: false, right: false };

document.addEventListener('keydown', e => {
  if (e.code === 'KeyW') keyState.forward = true;
  if (e.code === 'KeyS') keyState.backward = true;
  if (e.code === 'KeyA') keyState.left = true;
  if (e.code === 'KeyD') keyState.right = true;
});

document.addEventListener('keyup', e => {
  if (e.code === 'KeyW') keyState.forward = false;
  if (e.code === 'KeyS') keyState.backward = false;
  if (e.code === 'KeyA') keyState.left = false;
  if (e.code === 'KeyD') keyState.right = false;
});


// ==============================
// PEGAR / ARREMESSAR
// ==============================

document.addEventListener('mousedown', () => {
  if (renderer.xr.isPresenting) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObject(sphere);

  if (hits.length > 0) {
    isSphereGrabbed = true;
    sphereVelocity.set(0, 0, 0);
  }
});

document.addEventListener('mouseup', () => {
  if (!isSphereGrabbed) return;

  isSphereGrabbed = false;
  camera.getWorldDirection(sphereVelocity);
  sphereVelocity.multiplyScalar(THROW_FORCE);
});


// ==============================
// ILUMINAÇÃO
// ==============================

scene.add(new THREE.AmbientLight(0x404040, 1.5));

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7.5);
dirLight.castShadow = true;
scene.add(dirLight);


// ==============================
// AMBIENTE
// ==============================

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(roomSize, roomSize).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 })
);
floor.receiveShadow = true;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
const wallGeo = new THREE.PlaneGeometry(roomSize, wallHeight);

function createWall(x: number, z: number, ry: number) {
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(x, wallHeight / 2, z);
  wall.rotation.y = ry;
  scene.add(wall);
}

createWall(0, -roomSize / 2, 0);
createWall(0, roomSize / 2, 0);
createWall(-roomSize / 2, 0, Math.PI / 2);
createWall(roomSize / 2, 0, -Math.PI / 2);


// ==============================
// ESFERA
// ==============================

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.1, metalness: 0.5 })
);

sphere.position.set(0, SPHERE_RADIUS, 0);
sphere.castShadow = true;
scene.add(sphere);


// ==============================
// MOVIMENTO JOGADOR
// ==============================

const forward = new THREE.Vector3();
const strafe = new THREE.Vector3();

function handlePCMovement(dt: number) {
  if (!pcControls.isLocked) return;

  const move = pcSpeed * dt;

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  strafe.crossVectors(camera.up, forward).normalize();

  if (keyState.forward) cameraRig.position.addScaledVector(forward, move);
  if (keyState.backward) cameraRig.position.addScaledVector(forward, -move);
  if (keyState.left) cameraRig.position.addScaledVector(strafe, move);
  if (keyState.right) cameraRig.position.addScaledVector(strafe, -move);
}


// ==============================
// LOOP
// ==============================

function render() {
  const dt = clock.getDelta();

  handlePCMovement(dt);

  if (isSphereGrabbed) {
    const offset = new THREE.Vector3(0, 1, -0.8);
    offset.applyQuaternion(camera.quaternion);
    sphere.position.copy(camera.position).add(offset);
  } else {
    sphereVelocity.y += GRAVITY * dt;
    sphere.position.addScaledVector(sphereVelocity, dt);

    const damping = Math.exp(-2.5 * dt);
    sphereVelocity.multiplyScalar(damping);

    if (sphere.position.y < SPHERE_RADIUS) {
      sphere.position.y = SPHERE_RADIUS;
      sphereVelocity.y = 0;
    }
  }

  const wallLimit = roomSize / 2 - SPHERE_RADIUS;

// COLISÃO X
if (sphere.position.x < -wallLimit) {
  sphere.position.x = -wallLimit;
  sphereVelocity.x *= -5; // rebate fraco
}

if (sphere.position.x > wallLimit) {
  sphere.position.x = wallLimit;
  sphereVelocity.x *= -5;
}

// COLISÃO Z
if (sphere.position.z < -wallLimit) {
  sphere.position.z = -wallLimit;
  sphereVelocity.z *= -5;
}

if (sphere.position.z > wallLimit) {
  sphere.position.z = wallLimit;
  sphereVelocity.z *= -5;
}


  renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);
