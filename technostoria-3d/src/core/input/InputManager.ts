export class InputManager {
  public keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    e: false
  };

  constructor() {
    this.init();
  }

  private init() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') this.keys.w = true;
      if (e.code === 'KeyA') this.keys.a = true;
      if (e.code === 'KeyS') this.keys.s = true;
      if (e.code === 'KeyD') this.keys.d = true;
      if (e.code === 'ShiftLeft') this.keys.shift = true;
      if (e.code === 'KeyE') this.keys.e = true;
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this.keys.w = false;
      if (e.code === 'KeyA') this.keys.a = false;
      if (e.code === 'KeyS') this.keys.s = false;
      if (e.code === 'KeyD') this.keys.d = false;
      if (e.code === 'ShiftLeft') this.keys.shift = false;
      if (e.code === 'KeyE') this.keys.e = false;
    });
  }
}