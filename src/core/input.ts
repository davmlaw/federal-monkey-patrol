// InputManager + keyboard/gamepad devices filling an Input struct (axis +
// buttons + throttle), and the InputFilter/MenuFilter that read it.

// NEXT: a tap or click on the game screen (moves story dialogue on).
// QUIT (Esc) now opens the pause menu rather than quitting straight away.
export const Button = { NONE: -1, FIRE1: 0, FIRE2: 1, QUIT: 2, TUNER: 3, NEXT: 4 } as const;
export type Button = (typeof Button)[keyof typeof Button];
const NUM_BUTTONS = 5;

// Starting throttle: halfway between game.properties' min and max speeds
// (which go by altitude).
export const DEFAULT_THROTTLE = 0.5;
// Keyboard/gamepad throttle change, per second held.
const THROTTLE_RATE = 0.5;

export interface Axis { x: number; y: number }

/** Something that contributes to the Input each frame (keyboard, gamepad, touch). */
export interface InputDevice {
  update(msecs: number): void;
  getAxis(): Axis;
  dispose(): void;
}

export class Input {
  state: boolean[] = [];
  toggle: boolean[] = [];
  axis: Axis = { x: 0, y: 0 };
  throttle = DEFAULT_THROTTLE;

  constructor() { this.clear(); }

  clear(): void {
    this.state = new Array(NUM_BUTTONS).fill(false);
    this.toggle = new Array(NUM_BUTTONS).fill(false);
    this.axis = { x: 0, y: 0 };
    this.throttle = DEFAULT_THROTTLE; // 0..1, persistent like a real lever
  }

  setThrottle(t: number): void { this.throttle = Math.min(1, Math.max(0, t)); }

  buttonPressed(b: Button): boolean { return b >= 0 && b < NUM_BUTTONS ? this.state[b] : false; }

  buttonToggled(b: Button): boolean { return b >= 0 && b < NUM_BUTTONS ? this.toggle[b] : false; }

  getAxis(): Axis { return { x: this.axis.x, y: this.axis.y }; }

  setButton(b: Button, down: boolean): void {
    if (b < 0 || b >= NUM_BUTTONS) return;
    this.state[b] = down;
    if (down) this.toggle[b] = !this.toggle[b];
  }
}

// Backquote is an extra tuner key,
// since many laptop keyboards have no Insert key.
const KEYS: Partial<Record<string, Button>> = {
  Space: Button.FIRE1,
  Enter: Button.FIRE1,
  NumpadEnter: Button.FIRE1,
  ControlLeft: Button.FIRE2,
  ControlRight: Button.FIRE2,
  Escape: Button.QUIT,
  Insert: Button.TUNER,
  Backquote: Button.TUNER,
};

class Keyboard implements InputDevice {
  private axis: Axis = { x: 0, y: 0 };
  private throttleDir = { up: 0, down: 0 };

  constructor(private input: Input) {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
  }

  private onKey = (e: KeyboardEvent): void => {
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
  };

  getAxis(): Axis { return this.axis; }

  update(msecs: number): void {
    const d = this.throttleDir.up - this.throttleDir.down;
    if (d) this.input.setThrottle(this.input.throttle + d * THROTTLE_RATE * msecs / 1000);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
  }
}

// Gamepad: axis 0/1 with a dead zone, buttons 0/1 fire, 8 the tuner; the
// triggers (6/7) move the throttle.
const TOLERANCE = 0.1;
const PAD_BUTTONS: Record<number, Button> = { 0: Button.FIRE1, 1: Button.FIRE2, 8: Button.TUNER };

class Joystick implements InputDevice {
  private axis: Axis = { x: 0, y: 0 };
  private buttons: Record<number, boolean> = {};

  constructor(private input: Input) {}

  update(msecs: number): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p);
    if (!pad) { this.axis = { x: 0, y: 0 }; return; }
    const dz = (v: number): number => (v > -TOLERANCE && v < TOLERANCE ? 0 : v);
    this.axis = { x: dz(pad.axes[0] || 0), y: -dz(pad.axes[1] || 0) };
    for (const [i, b] of Object.entries(PAD_BUTTONS)) {
      const n = Number(i);
      const down = !!(pad.buttons[n] && pad.buttons[n].pressed);
      if (down !== !!this.buttons[n]) {
        this.buttons[n] = down;
        this.input.setButton(b, down);
      }
    }
    const trig = (i: number): number => (pad.buttons[i] ? pad.buttons[i].value || (pad.buttons[i].pressed ? 1 : 0) : 0);
    const d = trig(7) - trig(6);
    if (Math.abs(d) > TOLERANCE) this.input.setThrottle(this.input.throttle + d * THROTTLE_RATE * msecs / 1000);
  }

  getAxis(): Axis { return this.axis; }

  dispose(): void {}
}

/** Watches for a new press of Space/Enter (FIRE1) or a tap/click (NEXT)
 *  since the last frame: call tapped() once a frame. */
export class TapWatch {
  private last: [boolean, boolean] | null = null;

  tapped(input: Input | null): boolean {
    if (!input) return false;
    const taps: [boolean, boolean] = [input.buttonToggled(Button.FIRE1), input.buttonToggled(Button.NEXT)];
    const last = this.last;
    this.last = taps;
    return !!last && (taps[0] !== last[0] || taps[1] !== last[1]);
  }
}

/** Taps and clicks on the game canvas, as Button.NEXT. */
export class PointerTap implements InputDevice {
  private pending = false;

  constructor(private input: Input, private el: HTMLElement) {
    el.addEventListener('pointerdown', this.onDown);
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button > 0) return;
    this.input.setButton(Button.NEXT, true);
    this.pending = true;
  };

  getAxis(): Axis { return { x: 0, y: 0 }; }

  update(): void {
    // a tap is a press for one frame
    if (this.pending) this.pending = false;
    else if (this.input.buttonPressed(Button.NEXT)) this.input.setButton(Button.NEXT, false);
  }

  dispose(): void { this.el.removeEventListener('pointerdown', this.onDown); }
}

export class InputManager {
  private devices: InputDevice[];

  constructor(private input: Input) {
    this.devices = [new Keyboard(input), new Joystick(input)];
  }

  /** Add another device, e.g. the on-screen touch controls. */
  addDevice(d: InputDevice): void { this.devices.push(d); }

  update(msecs = 0): void {
    for (const d of this.devices) d.update(msecs);
    this.input.axis = { x: 0, y: 0 };
    for (const d of this.devices) {
      const a = d.getAxis();
      this.input.axis.x += a.x;
      this.input.axis.y += a.y;
    }
  }

  dispose(): void { for (const d of this.devices) d.dispose(); }
}

/** Reads the requests common to every component (tuner, quit) from the Input. */
export class InputFilter {
  requestTuner = false;
  requestQuit = false;

  read(input: Input): void {
    this.requestTuner = input.buttonToggled(Button.TUNER);
    this.requestQuit = input.buttonPressed(Button.QUIT);
    this._read(input);
  }

  protected _read(_input: Input): void {}

  tuner(): boolean { return this.requestTuner; }

  quit(): boolean { return this.requestQuit; }
}

/** Input for menus and non-interactive components. Skipping is off for now. */
export class MenuFilter extends InputFilter {
  requestSkip = false;
  okPressed = false;

  protected override _read(input: Input): void {
    this.okPressed = input.buttonPressed(Button.FIRE1);
  }

  skip(): boolean { return this.requestSkip; }
}
