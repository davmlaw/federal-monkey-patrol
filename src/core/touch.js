// On-screen flight controls (not in the 2006 version): a stick, a throttle
// lever, a fire button and a button to switch flying mode. (The pause /
// main menu button is in main.js, since it shows in the story too.) They work
// with touch, pen or mouse, and act as one more InputManager device, so they
// fill the same Input struct as the keyboard and gamepad.

import { Button } from './input.js';

const HTML = `
  <div class="tc-stick" aria-label="Flight stick"><div class="tc-knob"></div></div>
  <div class="tc-throttle" aria-label="Throttle">
    <div class="tc-track"><div class="tc-fill"></div><div class="tc-handle"></div></div>
    <span class="tc-label">THR</span>
  </div>
  <button class="tc-mode" type="button">FOLLOW</button>
  <button class="tc-fire" type="button">FIRE</button>
`;

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.axis = { x: 0, y: 0 };
    this.pendingRelease = []; // taps released before a frame saw them
    this.el = document.createElement('div');
    this.el.id = 'touch';
    this.el.hidden = true;
    this.el.innerHTML = HTML;
    document.body.append(this.el);
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());

    this.stick = this.el.querySelector('.tc-stick');
    this.knob = this.el.querySelector('.tc-knob');
    this.track = this.el.querySelector('.tc-track');
    this.fill = this.el.querySelector('.tc-fill');
    this.handle = this.el.querySelector('.tc-handle');
    this.modeBtn = this.el.querySelector('.tc-mode');

    this.drag(this.stick, (e) => this.moveStick(e), () => this.centreStick());
    this.drag(this.track, (e) => this.moveThrottle(e));
    this.hold(this.el.querySelector('.tc-fire'), Button.FIRE1);
    this.hold(this.modeBtn, Button.MODE);
  }

  /** Pointer drag on `el`, captured so it keeps tracking outside it. */
  drag(el, move, end = () => {}) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('active');
      move(e);
    });
    el.addEventListener('pointermove', (e) => { if (el.hasPointerCapture(e.pointerId)) move(e); });
    const up = (e) => {
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.classList.remove('active');
      end(e);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /** A button that holds `button` down while pressed. A quick tap is held
   *  until the next frame has read it. */
  hold(el, button) {
    let down = false;
    let seen = false;
    const set = (d) => {
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
    this.markSeen = [...(this.markSeen || []), () => { seen = true; }];
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      set(true);
    });
    el.addEventListener('pointerup', () => set(false));
    el.addEventListener('pointercancel', () => set(false));
    el.addEventListener('lostpointercapture', () => set(false));
  }

  moveStick(e) {
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

  centreStick() {
    this.axis = { x: 0, y: 0 };
    this.knob.style.transform = '';
  }

  moveThrottle(e) {
    const r = this.track.getBoundingClientRect();
    this.input.setThrottle(1 - (e.clientY - r.top) / r.height);
  }

  // ------------------------------------------------- InputManager device
  getAxis() { return this.axis; }

  update() {
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
  setVisible(v) {
    if (this.el.hidden === !v) return;
    this.el.hidden = !v;
    if (!v) this.centreStick();
  }

  setMode(label) {
    if (this.modeBtn.textContent !== label) this.modeBtn.textContent = label;
  }

  dispose() { this.el.remove(); }
}
