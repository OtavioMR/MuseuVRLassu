import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Game {
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: PointerLockControls;
  private player: THREE.Group = new THREE.Group();
  
  private interactionRaycaster = new THREE.Raycaster();
  private rayOrigin = new THREE.Vector2(0, 0); 

  private keys = { w: false, a: false, s: false, d: false, shift: false };
  private interactiveObjects: THREE.Object3D[] = [];
  
  private selectedObject: THREE.Mesh | null = null;
  private isGrabbed = false;
  private isReturning = false;
  private objectVelocity = new THREE.Vector3();
  
  // Variáveis auxiliares para evitar criar objetos no loop (causa travamento/lag)
  private vTemp = new THREE.Vector3();
  private targetPos = new THREE.Vector3();

  private readonly GRAVITY = -15.0; 
  private readonly THROW_FORCE = 30;
  private readonly GROUND_LEVEL = -15.2; 

  private clock = new THREE.Clock();

  constructor() {
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita pixel ratio para performance
    this.renderer.xr.enabled = true;
    
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.player.position.set(0, 4, 10); 
    this.player.add(this.camera);
    this.scene.add(this.player);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);

    this.initLights();
    this.initEvents();
    this.loadModel();

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(10, 20, 10);
    this.scene.add(dir);
  }

  private loadModel() {
    const loader = new GLTFLoader();
    loader.load('/models/EstruturaLassu.glb', (gltf) => {
      const model = gltf.scene;
      model.position.set(-170, -15, 0);
      this.scene.add(model);

      model.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          if (obj.name.toLowerCase().includes("calculadora")) {
            obj.updateMatrixWorld(true);
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            obj.getWorldPosition(worldPos);
            obj.getWorldQuaternion(worldQuat);

            obj.userData.homePosition = worldPos.clone();
            obj.userData.homeRotation = worldQuat.clone();
            this.interactiveObjects.push(obj);
          }
        }
      });
    });
  }

  private initEvents() {
    // CORREÇÃO DE TRAVAMENTO: Só tenta lock se não estiver segurando nada
    this.renderer.domElement.addEventListener('mousedown', () => {
        if (!this.controls.isLocked && !this.isGrabbed) {
            this.controls.lock();
        } else if (this.controls.isLocked) {
            this.grabObject();
        }
    });

    document.addEventListener('mouseup', () => {
        if (this.isGrabbed) this.throwObject();
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') this.keys.w = true;
      if (e.code === 'KeyA') this.keys.a = true;
      if (e.code === 'KeyS') this.keys.s = true;
      if (e.code === 'KeyD') this.keys.d = true;
      if (e.code === 'KeyE') this.grabObject();
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this.keys.w = false;
      if (e.code === 'KeyA') this.keys.a = false;
      if (e.code === 'KeyS') this.keys.s = false;
      if (e.code === 'KeyD') this.keys.d = false;
      if (e.code === 'KeyE') this.throwObject();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private grabObject() {
    if (this.isGrabbed) return;

    this.interactionRaycaster.setFromCamera(this.rayOrigin, this.camera);
    const hits = this.interactionRaycaster.intersectObjects(this.interactiveObjects, true);

    if (hits.length > 0) {
      this.selectedObject = hits[0].object as THREE.Mesh;
      this.isGrabbed = true;
      this.isReturning = false;
      this.objectVelocity.set(0, 0, 0);
      
      // Essencial para estabilidade: muda o pai para a cena
      this.scene.attach(this.selectedObject);
    }
  }

  private throwObject() {
    if (!this.selectedObject || !this.isGrabbed) return;
    this.isGrabbed = false;
    this.camera.getWorldDirection(this.objectVelocity);
    this.objectVelocity.multiplyScalar(this.THROW_FORCE);
  }

  private updatePhysics(dt: number) {
    if (!this.selectedObject) return;

    if (this.isGrabbed) {
      // Calcula posição alvo (1.5m à frente da câmera)
      this.targetPos.set(0, 0, -1.5); 
      this.targetPos.applyMatrix4(this.camera.matrixWorld);
      
      // Interpolação (Lerp) - suaviza o movimento para não travar
      this.selectedObject.position.lerp(this.targetPos, 0.15);
      this.selectedObject.quaternion.slerp(this.camera.quaternion, 0.1);

    } else if (this.isReturning) {
      const home = this.selectedObject.userData.homePosition as THREE.Vector3;
      const homeRot = this.selectedObject.userData.homeRotation as THREE.Quaternion;

      this.selectedObject.position.lerp(home, 0.08);
      this.selectedObject.quaternion.slerp(homeRot, 0.08);

      if (this.selectedObject.position.distanceTo(home) < 0.02) {
        this.selectedObject.position.copy(home);
        this.selectedObject.quaternion.copy(homeRot);
        this.isReturning = false;
        this.selectedObject = null;
      }
    } else {
      // Gravidade com trava de velocidade máxima para evitar bugs
      this.objectVelocity.y += this.GRAVITY * dt;
      this.selectedObject.position.addScaledVector(this.objectVelocity, dt);

      if (this.selectedObject.position.y < this.GROUND_LEVEL) {
        this.selectedObject.position.y = this.GROUND_LEVEL;
        this.objectVelocity.set(0, 0, 0);
        
        // Timer de retorno seguro
        setTimeout(() => {
            if (!this.isGrabbed && this.selectedObject && !this.isReturning) {
                this.isReturning = true;
            }
        }, 2000);
      }
    }
  }

  private animate() {
    // SEGURANÇA MÁXIMA: Limita o dt para nunca ser zero ou gigante
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05); 

    if (this.controls.isLocked) {
        const speed = 15 * dt;
        if (this.keys.w) this.controls.moveForward(speed);
        if (this.keys.s) this.controls.moveForward(-speed);
        if (this.keys.a) this.controls.moveRight(-speed);
        if (this.keys.d) this.controls.moveRight(speed);
    }

    this.updatePhysics(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

new Game();