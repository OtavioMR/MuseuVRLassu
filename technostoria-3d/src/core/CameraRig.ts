import * as THREE from "three";

export class CameraRig{
    group: THREE.Group;
    camera: THREE.PerspectiveCamera;

    constructor(){
        this.group = new THREE.Group();

        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );

        this.camera.position.set(0, 1.7, 0);
        this.group.add(this.camera);
    }
}