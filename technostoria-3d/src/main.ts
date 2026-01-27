// ==============================
// IMPORTAÇÕES
// ==============================

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';


// ==============================
// CONFIGURAÇÕES GERAIS
// ==============================

// Raio físico do jogador (capsule simplificada)
const PLAYER_RADIUS = 0.35;

// Raio físico da esfera
const SPHERE_RADIUS = 0.5;

// Dimensões da sala
const ROOM_SIZE = 10;
const WALL_HEIGHT = 4;

// Movimento
const PC_SPEED = 5;

// Física da esfera
const THROW_FORCE = 14;
const GRAVITY = -9.8;
const SPHERE_DAMPING = 0.98;


// ==============================
// ESTADOS DE JOGO
// ==============================

// Indica se o jogador está interagindo com algo
let isInteracting = false;

// Estado da esfera
let isSphereGrabbed = false;
const sphereVelocity = new THREE.Vector3();

// Raycaster para interação (mouse / centro da tela)
const raycaster = new THREE.Raycaster();


// ==============================
// CENA, CÂMERA E RENDERER
// ==============================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x808080);

const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));


// ==============================
// PLAYER RIG (O "CORPO" DO JOGADOR)
// ==============================

// O jogador NÃO é a câmera
// O jogador é este Group
const cameraRig = new THREE.Group();
cameraRig.position.set(0, 1.7, 2);
cameraRig.add(camera);
scene.add(cameraRig);


// ==============================
// CONTROLES DE PC (FPS)
// ==============================

// Apenas controla rotação da câmera
const pcControls = new PointerLockControls(camera, document.body);

// Clique ativa o mouse
document.addEventListener('click', () => {
  if (!renderer.xr.isPresenting && !isInteracting) {
    pcControls.lock();
  }
});

// Estado do teclado
const keyState = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

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
// ILUMINAÇÃO
// ==============================

scene.add(new THREE.AmbientLight(0x404040, 1.5));

const dirLight = new THREE.DirectionalLight(0xffffff, 10);
dirLight.position.set(5, 10, 7.5);
dirLight.castShadow = true;
scene.add(dirLight);


// ==============================
// AMBIENTE (SALA)
// ==============================

// Piso
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 })
);
floor.receiveShadow = true;
scene.add(floor);

// Paredes
const wallMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  side: THREE.DoubleSide
});

const wallGeo = new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT);

function createWall(x: number, z: number, ry: number) {
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(x, WALL_HEIGHT / 2, z);
  wall.rotation.y = ry;
  scene.add(wall);
}

createWall(0, -ROOM_SIZE / 2, 0);
createWall(0, ROOM_SIZE / 2, 0);
createWall(-ROOM_SIZE / 2, 0, Math.PI / 2);
createWall(ROOM_SIZE / 2, 0, -Math.PI / 2);


// ==============================
// ESFERA INTERATIVA
// ==============================

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 0.1,
    metalness: 0.5
  })
);

sphere.position.set(0, SPHERE_RADIUS, 0);
sphere.castShadow = true;
scene.add(sphere);


// ==============================
// INTERAÇÃO: PEGAR / SOLTAR
// ==============================

document.addEventListener('mousedown', () => {
  if (renderer.xr.isPresenting) return;

  // Raycast no centro da tela
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObject(sphere);

  if (hits.length > 0) {
    isSphereGrabbed = true;
    isInteracting = true;

    // Para movimento e rotação
    pcControls.unlock();
    sphereVelocity.set(0, 0, 0);
  }
});

document.addEventListener('mouseup', () => {
  if (!isSphereGrabbed) return;

  isSphereGrabbed = false;
  isInteracting = false;

  // Arremesso baseado na direção da câmera
  camera.getWorldDirection(sphereVelocity);
  sphereVelocity.multiplyScalar(THROW_FORCE);

  pcControls.lock();
});


// ==============================
// MOVIMENTO DO JOGADOR + COLISÃO
// ==============================

const forward = new THREE.Vector3();
const strafe = new THREE.Vector3();

function collidesWithSphere(nextPos: THREE.Vector3): boolean {
  const dx = nextPos.x - sphere.position.x;
  const dz = nextPos.z - sphere.position.z;

  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist < PLAYER_RADIUS + SPHERE_RADIUS;
}

function handlePCMovement(dt: number) {
  if (!pcControls.isLocked || isInteracting) return;

  const move = PC_SPEED * dt;

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  strafe.crossVectors(camera.up, forward).normalize();

  const nextPos = cameraRig.position.clone();

  if (keyState.forward) nextPos.addScaledVector(forward, move);
  if (keyState.backward) nextPos.addScaledVector(forward, -move);
  if (keyState.left) nextPos.addScaledVector(strafe, move);
  if (keyState.right) nextPos.addScaledVector(strafe, -move);

  // Colisão jogador ↔ esfera
  if (!collidesWithSphere(nextPos)) {
    cameraRig.position.copy(nextPos);
  }
}


// ==============================
// LOOP PRINCIPAL
// ==============================

function render() {
  const dt = clock.getDelta();

  handlePCMovement(dt);

  // ==========================
  // ESFERA: SEGURAR / FÍSICA
  // ==========================

  if (isSphereGrabbed) {
    // Esfera "presa" à frente da câmera
    const offset = new THREE.Vector3(0, 1, -0.8);
    offset.applyQuaternion(camera.quaternion);
    sphere.position.copy(camera.position).add(offset);
  } else {
    // Gravidade
    sphereVelocity.y += GRAVITY * dt;

    // Movimento
    sphere.position.addScaledVector(sphereVelocity, dt);

    // Atrito
    sphereVelocity.multiplyScalar(SPHERE_DAMPING);

    // Colisão com chão
    if (sphere.position.y < SPHERE_RADIUS) {
      sphere.position.y = SPHERE_RADIUS;
      sphereVelocity.y = 0;
    }

    // Colisão com paredes
    const limit = ROOM_SIZE / 2 - SPHERE_RADIUS;

    if (Math.abs(sphere.position.x) > limit) {
      sphere.position.x = Math.sign(sphere.position.x) * limit;
      sphereVelocity.x *= -0.6;
    }

    if (Math.abs(sphere.position.z) > limit) {
      sphere.position.z = Math.sign(sphere.position.z) * limit;
      sphereVelocity.z *= -0.6;
    }
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);
