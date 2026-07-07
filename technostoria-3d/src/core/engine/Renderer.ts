import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.Camera;

  public clock = new THREE.Clock();

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    window.addEventListener("resize", this.onResize);
  }

  setScene(scene: THREE.Scene) {
    this.scene = scene;
  }

  setCamera(camera: THREE.Camera) {
    this.camera = camera;
  }

  render() {
    if (!this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  private onResize = () => {
    if (!(this.camera instanceof THREE.PerspectiveCamera)) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}