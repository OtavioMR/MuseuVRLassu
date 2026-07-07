export class ModelLoader {
  private loader = new GLTFLoader();

  load(path: string): Promise<THREE.Group> {
    return new Promise((resolve) => {
      this.loader.load(path, (gltf) => {
        resolve(gltf.scene);
      });
    });
  }
}