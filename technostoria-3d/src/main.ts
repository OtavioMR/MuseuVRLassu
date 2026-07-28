import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { shiftLeft, shiftRight } from 'three/tsl';
import Character from './ClassCharacter';
import { io } from 'socket.io-client';

// ==============================
// CONFIG
// ==============================
const PLAYER_HEIGHT = 2;
const FLOOR_HEIGHT = 15;
var PLAYER_SPEED = 15;
const GRAVITY = 0;

let is_moving = false;


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x777777);


const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const player = new THREE.Group();
player.position.set(0, PLAYER_HEIGHT, 0);
player.add(camera);
scene.add(player);


const controls = new PointerLockControls(camera, document.body);

document.addEventListener('click', (e) => {
  if (
    !renderer.xr.isPresenting &&
    document.getElementById('login-container')?.style.display === 'none' &&
    (e.target as HTMLElement).tagName !== 'INPUT' &&
    (e.target as HTMLElement).tagName !== 'BUTTON'
  ) {
    controls.lock();
  }
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
  if (keys.shiftLeft || keys.shiftRight) {
    PLAYER_SPEED = 30;
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
  PLAYER_SPEED = 15;
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

// ==============================
// INTERACTION
// ==============================
const interactionRaycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector2(0, 0); // Center of the screen
const interactiveObjects: THREE.Object3D[] = [];

let isRotatingObject = false;
let rotatingObject: THREE.Object3D | null = null;
const savedCameraQuaternion = new THREE.Quaternion();

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
    museum.position.set(-170, 0, 0);
    scene.add(museum);


    player.position.y = PLAYER_HEIGHT+FLOOR_HEIGHT;

    console.log('Museu carregado. Chãos detectados:', floorMeshes.length);
    loader.load(
      '/models/Calculator.glb',
      (gltfCalc) => {
        const calculator = gltfCalc.scene;
        calculator.scale.setScalar(0.1);
        calculator.position.set(160, 16.5, -38);

        calculator.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;

            obj.userData.originalPosition = obj.position.clone();
            obj.userData.originalParent = museum;
            interactiveObjects.push(obj);
          }
        });

        // Adiciona a calculadora como filha do museu
        museum?.add(calculator);
      }
    );
  },
  undefined,
  (error) => {
    console.error('Erro ao carregar GLB:', error);
  }
);

// ==============================
// MULTIPLAYER (SOCKET.IO)
// ==============================
const socket = io('http://localhost:3000');
const otherPlayers: { [id: string]: Character } = {};

socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach((id) => {
    if (id !== socket.id) {
      otherPlayers[id] = new Character(scene, new THREE.Vector3(players[id].x, players[id].y, players[id].z), 5, players[id].name, players[id].color, players[id].legColor);
    }
  });
});

socket.on('newPlayer', (playerInfo) => {
  otherPlayers[playerInfo.id] = new Character(scene, new THREE.Vector3(playerInfo.player.x, playerInfo.player.y, playerInfo.player.z), 5, playerInfo.player.name, playerInfo.player.color, playerInfo.player.legColor);
});

socket.on('playerDisconnected', (id) => {
  if (otherPlayers[id]) {
    const characterToRemove = otherPlayers[id].character;
    if (characterToRemove) {
      scene.remove(characterToRemove);
    }
    delete otherPlayers[id];
  }
});

socket.on('playerMoved', (playerInfo) => {
  const p = otherPlayers[playerInfo.id];
  if (p) {
    if (p.character) {
      p.character.position.set(playerInfo.player.x, playerInfo.player.y, playerInfo.player.z);
      p.character.rotation.y = playerInfo.player.rotationY;
    }
    p.is_moving = playerInfo.player.isMoving;
  }
});

// ==============================
// COLISÃO COM CHÃO
// ==============================
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
let velocityY = 0;

// ==============================
// CROSSHAIR UI
// ==============================
const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
crosshair.innerText = '+';
crosshair.style.position = 'absolute';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.color = 'white';
crosshair.style.fontSize = '24px';
crosshair.style.textShadow = '0 0 4px black';
crosshair.style.pointerEvents = 'none'; // Make it non-interactive
crosshair.style.zIndex = '1001';
crosshair.style.display = 'none'; // Hidden by default
document.body.appendChild(crosshair);
// ==============================
// LOGIN UI
// ==============================
const loginContainer = document.createElement('div');
loginContainer.id = 'login-container';
loginContainer.style.position = 'absolute';
loginContainer.style.top = '0';
loginContainer.style.left = '0';
loginContainer.style.width = '100vw';
loginContainer.style.height = '100vh';
loginContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
loginContainer.style.display = 'flex';
loginContainer.style.flexDirection = 'column';
loginContainer.style.justifyContent = 'center';
loginContainer.style.alignItems = 'center';
loginContainer.style.zIndex = '2000';

const title = document.createElement('h1');
title.innerText = 'Welcome to the Museum';
title.style.color = 'white';
title.style.fontFamily = 'sans-serif';

const nameInput = document.createElement('input');
nameInput.type = 'text';
nameInput.placeholder = 'Enter your username';
nameInput.style.padding = '10px';
nameInput.style.fontSize = '16px';
nameInput.style.marginBottom = '20px';
nameInput.style.borderRadius = '4px';
nameInput.style.border = 'none';

const joinBtn = document.createElement('button');
joinBtn.innerText = 'Join Game';
joinBtn.style.padding = '10px 20px';
joinBtn.style.fontSize = '16px';
joinBtn.style.cursor = 'pointer';

loginContainer.appendChild(title);
loginContainer.appendChild(nameInput);
loginContainer.appendChild(joinBtn);
document.body.appendChild(loginContainer);

joinBtn.addEventListener('click', () => {
  const username = nameInput.value.trim() || 'Player';
  loginContainer.style.display = 'none';
  crosshair.style.display = 'block';
  socket.emit('join', username);
  if (!renderer.xr.isPresenting) controls.lock();
});

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
    socket.emit('chatMessage', chatInput.value.trim());
    chatInput.value = '';
  }
});

socket.on('chatMessage', (formattedMsg: string) => {
  const msg = document.createElement('div');
  msg.innerText = formattedMsg;
  msg.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  msg.style.padding = '6px';
  msg.style.borderRadius = '4px';
  msg.style.wordWrap = 'break-word';
  messageDisplay.appendChild(msg);
  messageDisplay.scrollTop = messageDisplay.scrollHeight;
});

// ==============================
// LOOP
// ==============================
const clock = new THREE.Clock();

let oldPosition = new THREE.Vector3();
let oldRotation = 0;
let oldIsMoving = false;
const rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');

function animate() {
  const dt = clock.getDelta();

  rotationEuler.setFromQuaternion(camera.quaternion);
  const currentRotationY = rotationEuler.y;

  is_moving = controls.isLocked && (keys.w || keys.a || keys.s || keys.d);

  if (loginContainer.style.display === 'none' && (
    oldPosition.distanceTo(player.position) > 0.01 ||
    oldRotation !== currentRotationY ||
    oldIsMoving !== is_moving
  )) {
    socket.emit('playerMovement', {
      x: player.position.x,
      y: player.position.y-7,
      z: player.position.z,
      rotationY: currentRotationY + Math.PI/2,
      isMoving: is_moving
    });
    oldPosition.copy(player.position);
    oldRotation = currentRotationY;
    oldIsMoving = is_moving;
  }

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

  velocityY += GRAVITY * dt;
  player.position.y += velocityY * dt;

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

  if (isRotatingObject) {
    camera.quaternion.copy(savedCameraQuaternion);
  }

  Object.values(otherPlayers).forEach(p => p.animate(p.is_moving));

  renderer.render(scene, camera);
  console.log(player.position);
}

document.addEventListener('mousedown', (e) => {
  if (controls.isLocked && e.button === 0) {
    interactionRaycaster.setFromCamera(rayOrigin, camera);
    const hits = interactionRaycaster.intersectObjects(interactiveObjects);

    if (hits.length > 0) {
      isRotatingObject = true;
      rotatingObject = hits[0].object;
      
      savedCameraQuaternion.copy(camera.quaternion);
    }
  }
});

document.addEventListener('mousemove', (e) => {
  if (isRotatingObject && rotatingObject && controls.isLocked) {
    const deltaX = e.movementX || 0;
    const deltaY = e.movementY || 0;
    
    const rotationSpeed = 0.005;

    rotatingObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaX * rotationSpeed);
    rotatingObject.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), deltaY * rotationSpeed);
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    isRotatingObject = false;
    rotatingObject = null;
  }
});

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});