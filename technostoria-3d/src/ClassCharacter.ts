import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Character {
    character: THREE.Group | null = null;
    R_arm: THREE.Mesh | null = null;
    L_arm: THREE.Mesh | null = null;
    L_leg: THREE.Mesh | null = null;
    R_leg: THREE.Mesh | null = null;

    R_arm_rotation_speed = 0.03;
    L_arm_rotation_speed = -0.03;
    R_leg_rotation_speed = -0.03;
    L_leg_rotation_speed = 0.03;

    was_moving = false;
    base_movement_direction = 1;

    constructor(scene: THREE.Scene, position: THREE.Vector3 = new THREE.Vector3(0, 0, 0), scale: number = 1) {
        const loader = new GLTFLoader();
        loader.load(
            '/models/Steve.glb',
            (glb) => {
                this.character = glb.scene;
                glb.scene.traverse((child) => {
                    if (child.name === 'Arm_L') {
                        this.L_arm = child as THREE.Mesh;
                        this.L_arm.castShadow = true;
                        this.L_arm.receiveShadow = true;
                    } else if (child.name === 'Arm_R') {
                        this.R_arm = child as THREE.Mesh;
                        this.R_arm.castShadow = true;
                        this.R_arm.receiveShadow = true;
                    } else if (child.name === 'Leg_L') {
                        this.L_leg = child as THREE.Mesh;
                        this.L_leg.castShadow = true;
                        this.L_leg.receiveShadow = true;
                    } else if (child.name === 'Leg_R') {
                        this.R_leg = child as THREE.Mesh;
                        this.R_leg.castShadow = true;
                        this.R_leg.receiveShadow = true;
                    }
                });

                this.character.scale.setScalar(scale);
                this.character.position.copy(position);
                scene.add(this.character);
            },
            undefined,
            (error) => {
                console.error('An error happened while loading the model:', error);
            }
        );
    }

    animate(is_moving: boolean) {
        if (is_moving) {
            if (this.L_arm) {
                if (this.L_arm.rotation.z > Math.PI / 4 || this.L_arm.rotation.z < -Math.PI / 4) {
                    this.L_arm_rotation_speed *= -1;
                }
                this.L_arm.rotation.z += this.L_arm_rotation_speed;
            }
            if (this.R_arm) {
                if (this.R_arm.rotation.z > Math.PI / 4 || this.R_arm.rotation.z < -Math.PI / 4) {
                    this.R_arm_rotation_speed *= -1;
                }
                this.R_arm.rotation.z += this.R_arm_rotation_speed;
            }
            if (this.L_leg) {
                if (this.L_leg.rotation.z > Math.PI / 4 || this.L_leg.rotation.z < -Math.PI / 4) {
                    this.L_leg_rotation_speed *= -1;
                }
                this.L_leg.rotation.z += this.L_leg_rotation_speed;
            }
            if (this.R_leg) {
                if (this.R_leg.rotation.z > Math.PI / 4 || this.R_leg.rotation.z < -Math.PI / 4) {
                    this.R_leg_rotation_speed *= -1;
                }
                this.R_leg.rotation.z += this.R_leg_rotation_speed;
            }
            this.was_moving = true;
        } else {
            // Smoothly return arms and legs to neutral (0) position when stopped
            const returnSpeed = 0.1;
            if (this.L_arm) this.L_arm.rotation.z = THREE.MathUtils.lerp(this.L_arm.rotation.z, 0, returnSpeed);
            if (this.R_arm) this.R_arm.rotation.z = THREE.MathUtils.lerp(this.R_arm.rotation.z, 0, returnSpeed);
            if (this.L_leg) this.L_leg.rotation.z = THREE.MathUtils.lerp(this.L_leg.rotation.z, 0, returnSpeed);
            if (this.R_leg) this.R_leg.rotation.z = THREE.MathUtils.lerp(this.R_leg.rotation.z, 0, returnSpeed);
            
            // Alternate the starting limb for the next movement cycle
            if (this.was_moving) {
                this.base_movement_direction *= -1;
                this.R_arm_rotation_speed = 0.03 * this.base_movement_direction;
                this.L_arm_rotation_speed = -0.03 * this.base_movement_direction;
                this.R_leg_rotation_speed = -0.03 * this.base_movement_direction;
                this.L_leg_rotation_speed = 0.03 * this.base_movement_direction;
                this.was_moving = false;
            }
        }
    }

    move(direction: number = 1) {
        if (this.character) {
            const y = this.character.rotation.y;
            const x = Math.cos(y);
            const z = -Math.sin(y);
            const directionVector = new THREE.Vector3(x, 0, z);
            this.character.position.addScaledVector(directionVector, 0.1 * direction);
        }
    }

    rotateOnPlace(direction: number) {
        if (this.character) {
            this.character.rotation.y += direction * 0.05;
        }
    }
}

export default Character;