import { InputManager } from "../input/inputManager";

export class PlayerController {
  private speed = 15;

  constructor(private input: InputManager) {}

  update(dt: number) {
    if (this.input.keys.shift) {
      this.speed = 30;
    } else {
      this.speed = 15;
    }

    // lógica de movimento aqui
  }
}