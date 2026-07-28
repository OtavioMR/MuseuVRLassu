import {Renderer} from "./Renderer"
import { SceneManager } from "./SceneManager";
import { PlayerController } from "../player/PlayerController";
import { InputManager } from "../input/InputManager";

export class Game {
  private renderer: Renderer;
  private sceneManager: SceneManager;
  private playerController: PlayerController;
  private input: InputManager;

  constructor() {
    this.renderer = new Renderer();
    this.sceneManager = new SceneManager();
    this.input = new InputManager();
    this.playerController = new PlayerController(this.input);

    this.init();
  }

  private init() {
    this.sceneManager.init();
    this.renderer.setScene(this.sceneManager.scene);
    this.renderer.setCamera(this.sceneManager.camera);

    this.animate();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const dt = this.renderer.clock.getDelta();

    this.playerController.update(dt);
    this.sceneManager.update(dt);

    this.renderer.render();
  };
}