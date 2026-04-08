import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { shiftLeft, shiftRight } from 'three/tsl';
import Character from './ClassCharacter';

// ==============================
// CONFIG
// ==============================
const PLAYER_HEIGHT = 4;
var PLAYER_SPEED = 15;
const GRAVITY = 0;

let is_moving = false;


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
  upArrow: false,
  rightArrow: false,
  downArrow: false,
  leftArrow: false,
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
  if (e.code === 'ArrowUp') keys.upArrow = true;
  if (e.code === 'ArrowDown') keys.downArrow = true;
  if (e.code === 'ArrowLeft') keys.leftArrow = true;
  if (e.code === 'ArrowRight') keys.rightArrow = true;
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
  if (e.code === 'ArrowUp') keys.upArrow = false;
  if (e.code === 'ArrowDown') keys.downArrow = false;
  if (e.code === 'ArrowLeft') keys.leftArrow = false;
  if (e.code === 'ArrowRight') keys.rightArrow = false;
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

const luz2 = new THREE.DirectionalLight(0xffffff, 2);
luz2.position.set(-10, -20, -10);
luz2.castShadow = true;
scene.add(luz2);

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
    museum.position.set(-170, 0, 0);
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

// Instancia o personagem passando a cena, a posição inicial e a escala
const steve = new Character(scene, new THREE.Vector3(1, 10, -10), 5);

// ==============================
// COLISÃO COM CHÃO
// ==============================
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
let velocityY = 0;

// ==============================
// CHAT UI
// ==============================
const chatContainer = document.createElement('div');
chatContainer.style.position = 'absolute';
chatContainer.style.bottom = '20px';
chatContainer.style.left = '20px';
chatContainer.style.zIndex = '1000';
chatContainer.style.display = 'flex';
chatContainer.style.flexDirection = 'column';
chatContainer.style.alignItems = 'flex-start';
chatContainer.style.gap = '10px';
chatContainer.style.fontFamily = 'sans-serif';

const chatBox = document.createElement('div');
chatBox.style.display = 'none';
chatBox.style.flexDirection = 'column';
chatBox.style.width = '300px';
chatBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
chatBox.style.padding = '10px';
chatBox.style.borderRadius = '8px';
chatBox.style.backdropFilter = 'blur(5px)';

const messageDisplay = document.createElement('div');
messageDisplay.style.color = 'white';
messageDisplay.style.marginBottom = '10px';
messageDisplay.style.maxHeight = '150px';
messageDisplay.style.overflowY = 'auto';
messageDisplay.style.display = 'flex';
messageDisplay.style.flexDirection = 'column';
messageDisplay.style.gap = '5px';
messageDisplay.style.fontSize = '14px';

const chatInput = document.createElement('input');
chatInput.type = 'text';
chatInput.placeholder = 'Type your message...';
chatInput.style.width = '100%';
chatInput.style.padding = '8px';
chatInput.style.border = 'none';
chatInput.style.borderRadius = '4px';
chatInput.style.outline = 'none';
chatInput.style.boxSizing = 'border-box';

chatBox.appendChild(messageDisplay);
chatBox.appendChild(chatInput);

const toggleButton = document.createElement('button');
toggleButton.innerText = '💬 Chat';
toggleButton.style.padding = '10px 15px';
toggleButton.style.cursor = 'pointer';
toggleButton.style.borderRadius = '8px';
toggleButton.style.border = 'none';
toggleButton.style.backgroundColor = '#007bff';
toggleButton.style.color = 'white';
toggleButton.style.fontWeight = 'bold';
toggleButton.style.transition = 'background-color 0.2s';

toggleButton.onmouseover = () => toggleButton.style.backgroundColor = '#0056b3';
toggleButton.onmouseout = () => toggleButton.style.backgroundColor = '#007bff';

chatContainer.appendChild(chatBox);
chatContainer.appendChild(toggleButton);
document.body.appendChild(chatContainer);

// Prevent interactions with the chat from triggering in-game controls
chatContainer.addEventListener('click', (e) => e.stopPropagation());
chatContainer.addEventListener('mousedown', (e) => e.stopPropagation());
chatContainer.addEventListener('keydown', (e) => e.stopPropagation());
chatContainer.addEventListener('keyup', (e) => e.stopPropagation());

toggleButton.addEventListener('click', () => {
  if (chatBox.style.display === 'none') {
    chatBox.style.display = 'flex';
    chatInput.focus();
  } else {
    chatBox.style.display = 'none';
  }
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim() !== '') {
    const msg = document.createElement('div');
    msg.innerText = chatInput.value;
    msg.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    msg.style.padding = '6px';
    msg.style.borderRadius = '4px';
    msg.style.wordWrap = 'break-word';
    messageDisplay.appendChild(msg);
    messageDisplay.scrollTop = messageDisplay.scrollHeight;
    chatInput.value = '';
  }
});

// ==============================
// LOOP
// ==============================
const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();
  console.log(player.position)

  if(keys.upArrow){
    steve.move(1);
    is_moving = true;
  }
  else if(keys.downArrow){
    steve.move(-1);
    is_moving = true;
  }
  else{
    is_moving = false;
  }
  if(keys.leftArrow){
    steve.rotateOnPlace(-1);  
  }
  else if(keys.rightArrow){
    steve.rotateOnPlace(1);  
  }

  steve.animate(is_moving);

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