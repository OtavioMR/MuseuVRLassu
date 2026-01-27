import * as THREE from 'three';

export function createWalls(roomSize: number, wallHeight: number): THREE.Group {
  const group = new THREE.Group();

  const geometry = new THREE.PlaneGeometry(roomSize, wallHeight);
  const material = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    side: THREE.DoubleSide
  });

  function addWall(x: number, z: number, rotationY: number) {
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, wallHeight / 2, z);
    wall.rotation.y = rotationY;
    wall.receiveShadow = true;
    group.add(wall);
  }

  const half = roomSize / 2;

  addWall(0, -half, 0);
  addWall(0, half, Math.PI);
  addWall(-half, 0, Math.PI / 2);
  addWall(half, 0, -Math.PI / 2);

  return group;
}
