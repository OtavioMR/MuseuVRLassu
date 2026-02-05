import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { shiftLeft, shiftRight } from 'three/tsl';

// ==============================
// CONFIG
// ==============================
const PLAYER_HEIGHT = 1.7;
var PLAYER_SPEED = 15;
const GRAVITY = 0;

// ==============================
// GETTERS E SETTERS
// ==============================


// ==============================
// CENA
// ==============================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x777777);

// ==============================
// CÂMERA
// ==============================
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

// ==============================
// RENDERER
// ==============================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ==============================
// PLAYER
// ==============================
const player = new THREE.Group();
player.position.set(0, PLAYER_HEIGHT, 0);
player.add(camera);
scene.add(player);

// ==============================
// CONTROLES FPS
// ==============================
const controls = new PointerLockControls(camera, document.body);

document.addEventListener('click', () => {
  if (!renderer.xr.isPresenting) controls.lock();
});

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shiftLeft: false,
  shiftRight: false
};

document.addEventListener('keydown', e => {
  if (e.code === 'KeyW') keys.w = true;
  if (e.code === 'KeyA') keys.a = true;
  if (e.code === 'KeyS') keys.s = true;
  if (e.code === 'KeyD') keys.d = true;
  if (e.code === 'ShiftLeft') keys.shiftLeft = true;
  if (e.code === 'ShiftRight') keys.shiftRight = true;
  // uso correto
  if (keys.shiftLeft || keys.shiftRight) {
    console.log('Correndo');
    PLAYER_SPEED = 30;
    console.log(PLAYER_SPEED);
  }

});

document.addEventListener('keyup', e => {
  if (e.code === 'KeyW') keys.w = false;
  if (e.code === 'KeyA') keys.a = false;
  if (e.code === 'KeyS') keys.s = false;
  if (e.code === 'KeyD') keys.d = false;
  if (e.code === 'ShiftLeft') keys.shiftLeft = false;
  if (e.code === 'ShiftRight') keys.shiftRight = false;
   console.log('Andando');
    PLAYER_SPEED = 15;
    console.log(PLAYER_SPEED);
});


// ==============================
// LUZ
// ==============================
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// ==============================
// LOAD GLB
// ==============================
const loader = new GLTFLoader();
let museum: THREE.Group | null = null;
const floorMeshes: THREE.Mesh[] = [];

loader.load(
  '/models/EstruturaLassu.glb',
  (gltf) => {
    museum = gltf.scene;
    museum.scale.setScalar(1);

    museum.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        if (obj.name.toLowerCase().includes('floor')) {
          floorMeshes.push(obj);
        }
      }
    });


    // garante que o museu fique no chão do mundo
    museum.position.set(0, 0, 0);
    scene.add(museum);


    // spawn do player acima do chão
    player.position.y = PLAYER_HEIGHT + 15;

    console.log('Museu carregado. Chãos detectados:', floorMeshes.length);
  },
  undefined,
  (error) => {
    console.error('Erro ao carregar GLB:', error);
  }
);

// ==============================
// COLISÃO COM CHÃO
// ==============================
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
let velocityY = 0;

// ==============================
// LOOP
// ==============================
const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();

  // Movimento
  if (controls.isLocked) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).normalize(); // <<< CORREÇÃO DO INVERTIDO

    if (keys.w) player.position.addScaledVector(forward, PLAYER_SPEED * dt);
    if (keys.s) player.position.addScaledVector(forward, -PLAYER_SPEED * dt);
    if (keys.a) player.position.addScaledVector(right, PLAYER_SPEED * dt);
    if (keys.d) player.position.addScaledVector(right, -PLAYER_SPEED * dt);
  }

  // Gravidade
  velocityY += GRAVITY * dt;
  player.position.y += velocityY * dt;

  // Raycast chão
  if (floorMeshes.length > 0) {
    raycaster.set(
      new THREE.Vector3(player.position.x, player.position.y + 0.1, player.position.z),
      down
    );

    const hits = raycaster.intersectObjects(floorMeshes, true);

    if (hits.length && hits[0].distance <= PLAYER_HEIGHT) {
      player.position.y = hits[0].point.y + PLAYER_HEIGHT;
      velocityY = 0;
    }
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// ==============================
// RESIZE
// ==============================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
