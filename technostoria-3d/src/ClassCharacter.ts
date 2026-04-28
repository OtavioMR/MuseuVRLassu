import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function createTextSprite(message: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Sprite();

    context.font = 'Bold 40px Arial';
    const textWidth = context.measureText(message).width;

    // Add padding to the width/height
    canvas.width = textWidth + 40;
    canvas.height = 60;

    // Draw background label
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    context.fillStyle = 'white';
    context.font = 'Bold 40px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    // Scale sprite relative to canvas proportions (decreased by 50%)
    sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
    
    return sprite;
}

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
    is_moving = false;

    constructor(scene: THREE.Scene, position: THREE.Vector3 = new THREE.Vector3(0, 0, 0), scale: number = 1, name: string = "", color: number = 0xffffff) {
        const loader = new GLTFLoader();
        loader.load(
            '/models/Steve.glb',
            (glb) => {
                this.character = glb.scene;
                glb.scene.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Clone material so changing one player doesn't affect all other players
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material = child.material.map(m => m.clone());
                                child.material.forEach((m: any) => {
                                    if (m.color) m.color.setHex(color);
                                });
                            } else {
                                child.material = child.material.clone();
                                if ((child.material as any).color) {
                                    (child.material as any).color.setHex(color); // Apply unique color tint
                                }
                                
                                // ---------------------------------------------------------
                                // OPTION: If you want to load a completely different image file
                                // for the skin texture, you can use the code below instead:
                                // ---------------------------------------------------------
                                // const textureLoader = new THREE.TextureLoader();
                                // textureLoader.load(`/textures/skins/skin_${color % 5}.png`, (texture) => {
                                //     texture.flipY = false; // GLTF models usually require flipped UVs
                                //     (child.material as any).map = texture;
                                //     child.material.needsUpdate = true;
                                // });
                            }
                        }

                        if (child.name === 'Arm_L') {
                            this.L_arm = child;
                        } else if (child.name === 'Arm_R') {
                            this.R_arm = child;
                        } else if (child.name === 'Leg_L') {
                            this.L_leg = child;
                        } else if (child.name === 'Leg_R') {
                            this.R_leg = child;
                        }
                    }
                });

                if (name) {
                    const nametag = createTextSprite(name);
                    nametag.position.set(0, 2.5, 0); // Position safely above the character's head
                    this.character.add(nametag);
                }

                this.character.scale.setScalar(scale);
                this.character.position.copy(position);
                this.character.rotation.y = -Math.PI / 2; // Rotate 90 degrees clockwise
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
            const returnSpeed = 0.1;
            if (this.L_arm) {
                this.L_arm.rotation.z = THREE.MathUtils.lerp(this.L_arm.rotation.z, 0, returnSpeed);
                if (Math.abs(this.L_arm.rotation.z) < 0.01) this.L_arm.rotation.z = 0;
            }
            if (this.R_arm) {
                this.R_arm.rotation.z = THREE.MathUtils.lerp(this.R_arm.rotation.z, 0, returnSpeed);
                if (Math.abs(this.R_arm.rotation.z) < 0.01) this.R_arm.rotation.z = 0;
            }
            if (this.L_leg) {
                this.L_leg.rotation.z = THREE.MathUtils.lerp(this.L_leg.rotation.z, 0, returnSpeed);
                if (Math.abs(this.L_leg.rotation.z) < 0.01) this.L_leg.rotation.z = 0;
            }
            if (this.R_leg) {
                this.R_leg.rotation.z = THREE.MathUtils.lerp(this.R_leg.rotation.z, 0, returnSpeed);
                if (Math.abs(this.R_leg.rotation.z) < 0.01) this.R_leg.rotation.z = 0;
            }
            
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