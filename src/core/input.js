// Port of input/: InputManager + Keyboard/Joystick devices filling an Input
// struct (axis + buttons), and the InputFilter/MenuFilter that read it.

export const Button = { NONE: -1, FIRE1: 0, FIRE2: 1, QUIT: 2, TUNER: 3, MODE: 4 };
const NUM_BUTTONS = 5;

// Throttle starts where the commented-out 2006 code had the plane's speed
// (`velocity.z = -600`, out of the default max_speed of 1000).
export const DEFAULT_THROTTLE = 0.6;
// Keyboard/gamepad throttle change, per second held.
const THROTTLE_RATE = 0.5;

export class Input {
  constructor() { this.clear(); }

  clear() {
    this.state = new Array(NUM_BUTTONS).fill(false);
    this.toggle = new Array(NUM_BUTTONS).fill(false);
    this.axis = { x: 0, y: 0 };
    this.throttle = DEFAULT_THROTTLE; // 0..1, persistent like a real lever
  }

  setThrottle(t) { this.throttle = Math.min(1, Math.max(0, t)); }

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
  KeyM: Button.MODE,
  Tab: Button.MODE,
};

class Keyboard {
  constructor(input) {
    this.axis = { x: 0, y: 0 };
    this.throttleDir = { up: 0, down: 0 };
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
      case 'KeyW': case 'PageUp': case 'Equal': case 'NumpadAdd': this.throttleDir.up = v; break;
      case 'KeyS': case 'PageDown': case 'Minus': case 'NumpadSubtract': this.throttleDir.down = v; break;
      default: return;
    }
    e.preventDefault();
  }

  getAxis() { return this.axis; }

  update(msecs) {
    const d = this.throttleDir.up - this.throttleDir.down;
    if (d) this.input.setThrottle(this.input.throttle + d * THROTTLE_RATE * msecs / 1000);
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
  }
}

// input/joystick.cpp: axis 0/1 with a dead zone, buttons 0/1/8. Added:
// button 3 switches flying mode, triggers (6/7) move the throttle.
const TOLERANCE = 0.1;
const PAD_BUTTONS = { 0: Button.FIRE1, 1: Button.FIRE2, 3: Button.MODE, 8: Button.TUNER };

class Joystick {
  constructor(input) {
    this.input = input;
    this.axis = { x: 0, y: 0 };
    this.buttons = {};
  }

  update(msecs) {
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
    const trig = (i) => (pad.buttons[i] ? pad.buttons[i].value || (pad.buttons[i].pressed ? 1 : 0) : 0);
    const d = trig(7) - trig(6);
    if (Math.abs(d) > TOLERANCE) this.input.setThrottle(this.input.throttle + d * THROTTLE_RATE * msecs / 1000);
  }

  getAxis() { return this.axis; }

  dispose() {}
}

export class InputManager {
  constructor(input) {
    this.input = input;
    this.devices = [new Keyboard(input), new Joystick(input)];
  }

  /** Add another device, e.g. the on-screen touch controls. */
  addDevice(d) { this.devices.push(d); }

  update(msecs = 0) {
    for (const d of this.devices) d.update(msecs);
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
