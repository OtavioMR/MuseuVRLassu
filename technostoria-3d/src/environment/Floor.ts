import * as THREE from "three";

export function createFloor(size:number): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.8
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.receiveShadow = true;

    return floor;
}