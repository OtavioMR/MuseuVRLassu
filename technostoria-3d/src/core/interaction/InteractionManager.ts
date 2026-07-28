export class InteractionManager {
  private raycaster = new THREE.Raycaster();

  constructor(private camera: THREE.Camera) {}

  select(objects: THREE.Object3D[]) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const hits = this.raycaster.intersectObjects(objects, true);

    return hits.length > 0 ? hits[0].object : null;
  }
}