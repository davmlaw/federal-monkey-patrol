// On-screen flight controls: a stick, a throttle lever (not in top-down
// missions, which have none) and a fire button. (The pause /
// main menu button is in main.ts, since it shows in the story too.) They work
// with touch, pen or mouse, and act as one more InputManager device, so they
// fill the same Input struct as the keyboard and gamepad.

import { Button, type Axis, type Input, type InputDevice } from './input.ts';

const HTML = `
  <div class="tc-stick" aria-label="Flight stick"><div class="tc-knob"></div></div>
  <div class="tc-throttle" aria-label="Throttle">
    <div class="tc-track"><div class="tc-fill"></div><div class="tc-handle"></div></div>
    <span class="tc-label">THR</span>
  </div>
  <button class="tc-fire" type="button">FIRE</button>
`;

/** A querySelector that the HTML above guarantees will find something. */
function find<T extends HTMLElement>(root: HTMLElement, sel: string): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`TouchControls: no ${sel}`);
  return el;
}

export class TouchControls implements InputDevice {
  private axis: Axis = { x: 0, y: 0 };
  private pendingRelease: { button: Button; age: number }[] = []; // taps released before a frame saw them
  private markSeen: (() => void)[] = [];
  readonly el: HTMLDivElement;
  private stick: HTMLElement;
  private knob: HTMLElement;
  private track: HTMLElement;
  private fill: HTMLElement;
  private handle: HTMLElement;
  private throttle: HTMLElement;

  constructor(private input: Input) {
    this.el = document.createElement('div');
    this.el.id = 'touch';
    this.el.hidden = true;
    this.el.innerHTML = HTML;
    document.body.append(this.el);
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());

    this.stick = find(this.el, '.tc-stick');
    this.knob = find(this.el, '.tc-knob');
    this.track = find(this.el, '.tc-track');
    this.fill = find(this.el, '.tc-fill');
    this.handle = find(this.el, '.tc-handle');
    this.throttle = find(this.el, '.tc-throttle');

    this.drag(this.stick, (e) => this.moveStick(e), () => this.centreStick());
    this.drag(this.track, (e) => this.moveThrottle(e));
    this.hold(find(this.el, '.tc-fire'), Button.FIRE1);
  }

  /** Pointer drag on `el`, captured so it keeps tracking outside it. */
  private drag(el: HTMLElement, move: (e: PointerEvent) => void, end: (e: PointerEvent) => void = () => {}): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('active');
      move(e);
    });
    el.addEventListener('pointermove', (e) => { if (el.hasPointerCapture(e.pointerId)) move(e); });
    const up = (e: PointerEvent): void => {
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.classList.remove('active');
      end(e);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /** A button that holds `button` down while pressed. A quick tap is held
   *  until the next frame has read it. */
  private hold(el: HTMLElement, button: Button): void {
    let down = false;
    let seen = false;
    const set = (d: boolean): void => {
      if (d === down) return;
      down = d;
      el.classList.toggle('active', d);
      if (d) {
        seen = false;
        this.input.setButton(button, true);
        this.pendingRelease = this.pendingRelease.filter((p) => p.button !== button);
      } else if (seen) {
        this.input.setButton(button, false);
      } else {
        this.pendingRelease.push({ button, age: 0 });
      }
    };
    this.markSeen.push(() => { seen = true; });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      set(true);
    });
    el.addEventListener('pointerup', () => set(false));
    el.addEventListener('pointercancel', () => set(false));
    el.addEventListener('lostpointercapture', () => set(false));
  }

  private moveStick(e: PointerEvent): void {
    const r = this.stick.getBoundingClientRect();
    const radius = r.width / 2;
    let x = (e.clientX - (r.left + radius)) / radius;
    let y = (e.clientY - (r.top + radius)) / radius;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    // Screen up = axis +y, the same as the up arrow key (nose down).
    this.axis = { x, y: -y };
    this.knob.style.transform = `translate(${x * 50}%, ${y * 50}%)`;
  }

  private centreStick(): void {
    this.axis = { x: 0, y: 0 };
    this.knob.style.transform = '';
  }

  private moveThrottle(e: PointerEvent): void {
    const r = this.track.getBoundingClientRect();
    this.input.setThrottle(1 - (e.clientY - r.top) / r.height);
  }

  // ------------------------------------------------- InputManager device
  getAxis(): Axis { return this.axis; }

  update(): void {
    // releases from taps that happened since the last frame
    // (held for one frame: released at the update after the one that follows the tap)
    this.pendingRelease = this.pendingRelease.filter((p) => {
      if (p.age++ < 1) return true;
      this.input.setButton(p.button, false);
      return false;
    });
    for (const f of this.markSeen) f();
    const t = this.input.throttle;
    this.fill.style.height = `${t * 100}%`;
    this.handle.style.bottom = `${t * 100}%`;
  }

  // ---------------------------------------------------------- display
  setVisible(v: boolean): void {
    if (this.el.hidden === !v) return;
    this.el.hidden = !v;
    if (!v) this.centreStick();
  }

  showThrottle(v: boolean): void {
    if (this.throttle.hidden === !v) return;
    this.throttle.hidden = !v;
  }

  dispose(): void { this.el.remove(); }
}
