import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


//INITIAL ANGULAR_VELOCITY
let R_arm_rotation_speed = 0.03;
let L_arm_rotation_speed = -0.03;
let R_leg_rotation_speed = -0.03;
let L_leg_rotation_speed = 0.03;

let is_moving = false;

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
let R_arm: THREE.Mesh | null = null;
let L_arm: THREE.Mesh | null = null;
let L_leg: THREE.Mesh | null = null;
let R_leg: THREE.Mesh | null = null;

loader.load(
    '/models/Steve.glb',
    (glb) => {
        character = glb.scene;
        glb.scene.traverse((child) => {
            if (child.name === 'Arm_L') {
                console.log(child);
                L_arm = child as THREE.Mesh;
                L_arm.castShadow = true;
                L_arm.receiveShadow = true;
            } else if (child.name === 'Arm_R') {
                console.log(child);
                R_arm = child as THREE.Mesh;
                R_arm.castShadow = true;
                R_arm.receiveShadow = true;
            } else if (child.name === 'Leg_L') {
                console.log(child);
                L_leg = child as THREE.Mesh;
                L_leg.castShadow = true;
                L_leg.receiveShadow = true;
            } else if (child.name === 'Leg_R') {
                console.log(child);
                R_leg = child as THREE.Mesh;
                R_leg.castShadow = true;
                R_leg.receiveShadow = true;
            }
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

function rotateLArm() {
    if (L_arm) {
        if (L_arm?.rotation.z > Math.PI / 4 || L_arm?.rotation.z < -Math.PI / 4) {
            L_arm_rotation_speed *= -1;
        }
        L_arm.rotation.z += L_arm_rotation_speed;
    }
}

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w':
        case 'W':
        case 'a':
        case 'A':
        case 's':
        case 'S':
        case 'd':
        case 'D':
            is_moving = true;
            break;
        default:
            is_moving = false;    
            break;
    }      
});

function rotateRArm() {
    if (R_arm) {
        if (R_arm?.rotation.z > Math.PI / 4 || R_arm?.rotation.z < -Math.PI / 4) {
            R_arm_rotation_speed *= -1;
        }
        R_arm.rotation.z += R_arm_rotation_speed;
    }
}

function rotateLLeg() {
    if (L_leg) {
        if (L_leg?.rotation.z > Math.PI / 4 || L_leg?.rotation.z < -Math.PI / 4) {
            L_leg_rotation_speed *= -1;
        }
        L_leg.rotation.z += L_leg_rotation_speed;
    }
}

function rotateRLeg() {
    if (R_leg) {
        if (R_leg?.rotation.z > Math.PI / 4 || R_leg?.rotation.z < -Math.PI / 4) {
            R_leg_rotation_speed *= -1;
        }
        R_leg.rotation.z += R_leg_rotation_speed;
    }
}

function moveCharacter(){
    if (L_arm && is_moving){
        rotateLArm();
    } 
    if (R_arm && is_moving){
        rotateRArm();
    }
    if (L_leg && is_moving){
        rotateLLeg();
    }
    if (R_leg && is_moving){
        rotateRLeg();   
    }
    if (is_moving && R_arm && (Math.abs(R_arm.rotation.z) < 0.001)) {
        is_moving = false;
    }
}

function animate() {
    moveCharacter();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();