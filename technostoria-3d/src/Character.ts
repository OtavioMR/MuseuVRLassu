import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x808080);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(2, 0, 0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const controls = new OrbitControls( camera, renderer.domElement );
document.body.appendChild(renderer.domElement);

const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

const loader = new GLTFLoader();

let character: THREE.Group;
let arm: THREE.Mesh | null = null;

loader.load(
    '/models/Steve.glb',
    (glb) => {
        character = glb.scene;
        glb.scene.traverse((child) => {
            if (child.name === 'Leg_L') {
                    console.log(child);
            }   
            arm = child as THREE.Mesh;
            arm.castShadow = true;
            arm.receiveShadow = true;
        });
        character.scale.setScalar(.4);
        character.position.set(0, 0, 0);
        scene.add(character);
    },
    undefined,
    (error) => {
        console.error('Error loading model:', error);
    }
);

window.addEventListener('resize' , () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    if (arm){
        arm.rotation.z += 0.01;
    } 
    renderer.render(scene, camera);
}

animate();