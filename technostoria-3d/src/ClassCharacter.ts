import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Character {
    character: THREE.Group | null = null;
    R_arm: THREE.Mesh | null = null;
    L_arm: THREE.Mesh | null = null;
    L_leg: THREE.Mesh | null = null;
    R_leg: THREE.Mesh | null = null;

    constructor() {
        const loader = new GLTFLoader();
        loader.load(
            '/models/Steve.glb',
            
            (glb) => {
                this.character = glb.scene;
                glb.scene.traverse((child) => {
                    if (child.name === 'Arm_L') {
                        console.log(child);
                        this.L_arm = child as THREE.Mesh;
                        this.L_arm.castShadow = true;
                        this.L_arm.receiveShadow = true;
                    } else if (child.name === 'Arm_R') {
                        console.log(child);
                        this.R_arm = child as THREE.Mesh;
                        this.R_arm.castShadow = true;
                        this.R_arm.receiveShadow = true;
                    } else if (child.name === 'Leg_L') {
                        console.log(child);
                        this.L_leg = child as THREE.Mesh;
                        this.L_leg.castShadow = true;
                        this.L_leg.receiveShadow = true;
                    } else if (child.name === 'Leg_R') {
                        console.log(child);
                        this.R_leg = child as THREE.Mesh;
                        this.R_leg.castShadow = true;
                        this.R_leg.receiveShadow = true;
                    }
                });
            },
            undefined,
            (error) => {
                console.error('An error happened while loading the model:', error);
            }
        );
    }
}

export default Character;