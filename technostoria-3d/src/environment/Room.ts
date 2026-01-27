import * as THREE from 'three';
import { createFloor } from './Floor';
import { createWalls } from './Walls';

export class Room {
  group: THREE.Group;

  constructor(roomSize: number, wallHeight: number) {
    this.group = new THREE.Group();

    const floor = createFloor(roomSize);
    const walls = createWalls(roomSize, wallHeight);

    this.group.add(floor);
    this.group.add(walls);
  }
}
