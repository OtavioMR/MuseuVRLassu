import * as THREE from "three";
import { Room } from "./environment/room";
import { CameraRig } from "./core/CameraRig";

const scene = new THREE.Scene();

// SALA
const room = new Room(10,4);
scene.add(room.group);

// CÂMERA
const cameraRig = new CameraRig();
scene.add(cameraRig.group);

// RENDERER
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Luz
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(5,10,5);
scene.add(directional);

// Loop básico
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, cameraRig.camera); // precisa passar a câmera de verdade
}
animate();
