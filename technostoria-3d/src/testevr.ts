import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: PointerLockControls;
  private player: THREE.Group;
  
  private interactionRaycaster = new THREE.Raycaster();
  // Corrigindo o erro do TS: Instanciamos o Vector2 uma vez aqui
  private rayOrigin = new THREE.Vector2(0, 0); 

  private keys = { w: false, a: false, s: false, d: false, shift: false };
  private interactiveObjects: THREE.Object3D[] = [];
  
  private selectedObject: THREE.Mesh | null = null;
  private isGrabbed = false;
  private isReturning = false;
  private objectVelocity = new THREE.Vector3();
  
  // CONFIGURAÇÕES DE FÍSICA (Ajuste GROUND_LEVEL se necessário)
  private readonly GRAVITY = -18.0; 
  private readonly THROW_FORCE = 12;
  private readonly GROUND_LEVEL = -15.2; 
  private readonly ABYSS_LEVEL = -60;    

  private clock = new THREE.Clock();

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.player = new THREE.Group();
    this.player.position.set(0, 4, 10); 
    this.player.add(this.camera);
    this.scene.add(this.player);

    this.controls = new PointerLockControls(this.camera, document.body);

    this.initLights();
    this.initEvents();
    this.loadModel();

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(20, 50, 20);
    dir.castShadow = true;
    this.scene.add(dir);
  }

  private loadModel() {
    const loader = new GLTFLoader();
    loader.load('/models/EstruturaLassu.glb', (gltf) => {
      const model = gltf.scene;
      
      // Posiciona o cenário
      model.position.set(-170, -15, 0);
      this.scene.add(model);

      model.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;

          // Filtra pela calculadora
          if (obj.name.toLowerCase().includes("calculadora")) {
            obj.updateMatrixWorld(true);
            
            // Salva posição GLOBAL para o reset funcionar perfeitamente
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
    // Interação de Clique
    document.addEventListener('mousedown', () => {
        if (this.controls.isLocked) this.grabObject();
    });

    document.addEventListener('mouseup', () => this.throwObject());

    // Teclado
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') this.keys.w = true;
      if (e.code === 'KeyA') this.keys.a = true;
      if (e.code === 'KeyS') this.keys.s = true;
      if (e.code === 'KeyD') this.keys.d = true;
      if (e.code === 'KeyE') this.grabObject();
      if (e.code === 'ShiftLeft') this.keys.shift = true;
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this.keys.w = false;
      if (e.code === 'KeyA') this.keys.a = false;
      if (e.code === 'KeyS') this.keys.s = false;
      if (e.code === 'KeyD') this.keys.d = false;
      if (e.code === 'KeyE') this.throwObject();
      if (e.code === 'ShiftLeft') this.keys.shift = false;
    });

    document.addEventListener('click', () => {
        if (!this.isGrabbed) this.controls.lock();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private grabObject() {
    // RESOLUÇÃO DO ERRO: Usando a instância de Vector2 da classe
    this.interactionRaycaster.setFromCamera(this.rayOrigin, this.camera);
    const hits = this.interactionRaycaster.intersectObjects(this.interactiveObjects, true);

    if (hits.length > 0) {
      this.selectedObject = hits[0].object as THREE.Mesh;
      this.isGrabbed = true;
      this.isReturning = false;
      this.objectVelocity.set(0, 0, 0);
      
      // Remove do grupo do cenário e coloca na raiz da cena para não "sumir" com o cenário
      this.scene.attach(this.selectedObject);
    }
  }

  private throwObject() {
    if (!this.selectedObject || !this.isGrabbed) return;
    this.isGrabbed = false;
    
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.objectVelocity.copy(dir).multiplyScalar(this.THROW_FORCE);
  }

  private updatePhysics(dt: number) {
    if (!this.selectedObject) return;

    if (this.isGrabbed) {
      // Posição alvo: 2 metros à frente
      const targetPos = new THREE.Vector3(0, 0, -2);
      targetPos.applyMatrix4(this.camera.matrixWorld);
      
      // Movimento suave (Lerp)
      this.selectedObject.position.lerp(targetPos, 0.2);
      this.selectedObject.quaternion.slerp(this.camera.quaternion, 0.1);

    } else if (this.isReturning) {
      const home = this.selectedObject.userData.homePosition as THREE.Vector3;
      const homeRot = this.selectedObject.userData.homeRotation as THREE.Quaternion;

      this.selectedObject.position.lerp(home, 0.1);
      this.selectedObject.quaternion.slerp(homeRot, 0.1);

      // Trava no lugar final
      if (this.selectedObject.position.distanceTo(home) < 0.01) {
        this.selectedObject.position.copy(home);
        this.selectedObject.quaternion.copy(homeRot);
        this.isReturning = false;
        this.selectedObject = null;
      }
    } else {
      // Gravidade
      this.objectVelocity.y += this.GRAVITY * dt;
      this.selectedObject.position.addScaledVector(this.objectVelocity, dt);

      // SEGURANÇA 1: Colisão com o chão
      if (this.selectedObject.position.y < this.GROUND_LEVEL) {
        this.selectedObject.position.y = this.GROUND_LEVEL;
        this.objectVelocity.set(0,0,0);
        
        // Retorno automático após 1.5 segundos parado
        setTimeout(() => { 
          if(!this.isGrabbed && this.selectedObject) this.isReturning = true; 
        }, 1500);
      }

      // SEGURANÇA 2: Se cair no vazio (limbo), reseta imediatamente
      if (this.selectedObject.position.y < this.ABYSS_LEVEL) {
        this.isReturning = true;
        this.objectVelocity.set(0,0,0);
      }
    }
  }

  private animate() {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.controls.isLocked) {
        const speed = (this.keys.shift ? 30 : 15) * dt;
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