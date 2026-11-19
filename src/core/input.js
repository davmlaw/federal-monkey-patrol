// Port of input/: InputManager + Keyboard/Joystick devices filling an Input
// struct (axis + buttons), and the InputFilter/MenuFilter that read it.

export const Button = { NONE: -1, FIRE1: 0, FIRE2: 1, QUIT: 2, TUNER: 3 };
const NUM_BUTTONS = 4;

export class Input {
  constructor() { this.clear(); }

  clear() {
    this.state = new Array(NUM_BUTTONS).fill(false);
    this.toggle = new Array(NUM_BUTTONS).fill(false);
    this.axis = { x: 0, y: 0 };
  }

  buttonPressed(b) { return b >= 0 && b < NUM_BUTTONS ? this.state[b] : false; }

  buttonToggled(b) { return b >= 0 && b < NUM_BUTTONS ? this.toggle[b] : false; }

  getAxis() { return { x: this.axis.x, y: this.axis.y }; }

  setButton(b, down) {
    if (b < 0 || b >= NUM_BUTTONS) return;
    this.state[b] = down;
    if (down) this.toggle[b] = !this.toggle[b];
  }
}

// Keyboard map from input/keyboard.cpp. Backquote is an extra tuner key,
// since many laptop keyboards have no Insert key.
const KEYS = {
  Space: Button.FIRE1,
  Enter: Button.FIRE1,
  NumpadEnter: Button.FIRE1,
  ControlLeft: Button.FIRE2,
  ControlRight: Button.FIRE2,
  Escape: Button.QUIT,
  Insert: Button.TUNER,
  Backquote: Button.TUNER,
};

class Keyboard {
  constructor(input) {
    this.axis = { x: 0, y: 0 };
    this.input = input;
    this.onKey = this.onKey.bind(this);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
  }

  onKey(e) {
    if (e.target instanceof HTMLElement && e.target.closest('.lil-gui')) return;
    const pressed = e.type === 'keydown';
    const b = KEYS[e.code];
    if (b !== undefined) {
      e.preventDefault();
      if (!e.repeat) this.input.setButton(b, pressed);
      return;
    }
    const v = pressed ? 1 : 0;
    switch (e.code) {
      case 'ArrowLeft': this.axis.x = -v; break;
      case 'ArrowRight': this.axis.x = v; break;
      case 'ArrowUp': this.axis.y = v; break;
      case 'ArrowDown': this.axis.y = -v; break;
      default: return;
    }
    e.preventDefault();
  }

  getAxis() { return this.axis; }

  update() {}

  dispose() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
  }
}

// input/joystick.cpp: axis 0/1 with a dead zone, buttons 0/1/8.
const TOLERANCE = 0.1;
const PAD_BUTTONS = { 0: Button.FIRE1, 1: Button.FIRE2, 8: Button.TUNER };

class Joystick {
  constructor(input) {
    this.input = input;
    this.axis = { x: 0, y: 0 };
    this.buttons = {};
  }

  update() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && [...pads].find((p) => p);
    if (!pad) { this.axis = { x: 0, y: 0 }; return; }
    const dz = (v) => (v > -TOLERANCE && v < TOLERANCE ? 0 : v);
    this.axis = { x: dz(pad.axes[0] || 0), y: -dz(pad.axes[1] || 0) };
    for (const [i, b] of Object.entries(PAD_BUTTONS)) {
      const down = !!(pad.buttons[i] && pad.buttons[i].pressed);
      if (down !== !!this.buttons[i]) {
        this.buttons[i] = down;
        this.input.setButton(b, down);
      }
    }
  }

  getAxis() { return this.axis; }

  dispose() {}
}

export class InputManager {
  constructor(input) {
    this.input = input;
    this.devices = [new Keyboard(input), new Joystick(input)];
  }

  update() {
    for (const d of this.devices) d.update();
    this.input.axis = { x: 0, y: 0 };
    for (const d of this.devices) {
      const a = d.getAxis();
      this.input.axis.x += a.x;
      this.input.axis.y += a.y;
    }
  }

  dispose() { for (const d of this.devices) d.dispose(); }
}

/** input/inputfilter.h */
export class InputFilter {
  constructor() {
    this.requestTuner = false;
    this.requestQuit = false;
  }

  read(input) {
    this.requestTuner = input.buttonToggled(Button.TUNER);
    this.requestQuit = input.buttonPressed(Button.QUIT);
    this._read(input);
  }

  _read() {}

  tuner() { return this.requestTuner; }

  quit() { return this.requestQuit; }
}

/** input/menufilter.cpp. The skip request was commented out in 2006. */
export class MenuFilter extends InputFilter {
  constructor() {
    super();
    this.requestSkip = false;
    this.okPressed = false;
  }

  _read(input) {
    // this.requestSkip = input.buttonPressed(Button.FIRE1);
    this.okPressed = input.buttonPressed(Button.FIRE1);
  }

  skip() { return this.requestSkip; }
}
