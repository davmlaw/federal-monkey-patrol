// Port of game/transition/: fade, spin, star wipe and angled wipes between the
// previous and next components. Both are played with msecs=0 (frozen) while
// the transition runs.
//
// The C++ masked the next component using the depth buffer. Here the next
// component is rendered into an offscreen target and the mask shape is drawn
// with that render as its texture.

import { ORTHO_H, ORTHO_W } from '../core/display.js';
import { GameComponent, Status } from './component.js';

const deg2rad = Math.PI / 180;

export class Transition extends GameComponent {
  constructor() {
    super();
    this.status = Status.PLAYING;
    this.prev = null;
    this.next = null;
    this.transitionTime = 0;
    this.timeDisplayed = 0;
    this.state = 0;
  }

  setTime(ms) { this.transitionTime = ms; }

  setPrev(c) { this.prev = c; }

  setNext(c) { this.next = c; }

  getState() { return this.state; }

  async _load() {
    await Promise.all([this.prev?.load(), this.next?.load()]);
  }

  drawLoading(display) {
    // The next component may be a mission generating its city.
    if (this.prev?.loaded) this.prev.play(display, 0, null);
    if (this.next && !this.next.loaded) this.next.drawLoading(display);
  }

  _play(display, msecs) {
    this.timeDisplayed += msecs;
    const t = this.transitionTime > 0 ? this.timeDisplayed / this.transitionTime : 1;
    this.state = Math.min(1, Math.max(0, t));
    this.representation(display);
    if (this.state >= 1) this.status = Status.NEXT;
  }
}

/** Draw prev, then draw next on top, its alpha going from 0 to 1. */
class TransitionFade extends Transition {
  getName() { return 'TransitionFade'; }

  representation(display) {
    this.prev?.play(display, 0, null);
    this.next?.play(display, 0, null, this.getState());
  }
}

/** Draw prev, then next only inside the mask, then the mask's outline. */
class TransitionWipe extends Transition {
  representation(display) {
    this.prev?.play(display, 0, null);
    if (!this.next) return;
    const rt = display.acquireTarget();
    try {
      display.withTarget(rt, () => this.next.play(display, 0, null));
      display.draw2dWith((g) => {
        g.screenTriangles(this.maskTriangles(), rt.texture);
        this.renderColor(g, display);
      });
    } finally {
      display.releaseTarget(rt);
    }
  }

  renderColor() {}
}

/** A band sweeping across the screen at `angle` degrees clockwise. */
class TransitionAngleWipe extends TransitionWipe {
  constructor(angle) {
    super();
    this.angle = angle;
  }

  getName() { return `TransitionAngleWipe(${this.angle})`; }

  maskTriangles() {
    const len = Math.hypot(ORTHO_W, ORTHO_H); // screen diagonal (widest point)
    const h = len / 2;
    const pos = this.getState() * len;
    const pts = [[-h, -h + pos], [-h, -h], [h, -h], [h, -h + pos]];
    // glRotatef(angle, 0, 0, -1): clockwise
    const r = -this.angle * deg2rad;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const [a, b, cc, d] = pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
    return [a, b, cc, a, cc, d];
  }
}

// "Why eat hamburger when you can eat steak? Star-wipe... and we're out!"
const STAR_POINTS = 10;

class TransitionStarWipe extends TransitionWipe {
  getName() { return 'TransitionStarWipe'; }

  starPoints() {
    const outDist = ORTHO_W * 1.4 * this.getState();
    const inDist = ORTHO_W * 0.6 * this.getState();
    const rot = 360 / STAR_POINTS;
    const pts = [];
    for (let i = 1; i < STAR_POINTS + 1; i++) {
      const r = (i & 1 ? inDist : outDist);
      const a = i * rot * deg2rad;
      // rotate the up vector (0, r) about z
      pts.push([-r * Math.sin(a), r * Math.cos(a)]);
    }
    return pts;
  }

  maskTriangles() {
    const pts = this.starPoints();
    const tris = [];
    for (let i = 0; i < pts.length; i++) tris.push([0, 0], pts[i], pts[(i + 1) % pts.length]);
    return tris;
  }

  renderColor(g, display) {
    g.polyline(this.starPoints(), display.px(10), [1, 1, 1, 1], true);
  }
}

/** A sweep like a clock hand, as on a film leader. */
class TransitionSpin extends TransitionWipe {
  getName() { return 'TransitionSpin'; }

  maskTriangles() {
    const R = 2.0;
    const end = this.getState() * 360;
    const tris = [];
    let prev = [0, R];
    for (let deg = 0; deg < end; deg += 1) {
      const a = Math.min(deg + 1, end) * deg2rad;
      const next = [R * Math.sin(a), R * Math.cos(a)]; // clockwise from 12 o'clock
      tris.push([0, 0], prev, next);
      prev = next;
    }
    return tris;
  }
}

/** Transition_Factory: fade, spin, starwipe, hwipe, vwipe, or <angle>wipe. */
export function makeTransition(name) {
  let t = null;
  if (name === 'fade') t = new TransitionFade();
  else if (name === 'starwipe') t = new TransitionStarWipe();
  else if (name === 'spin') t = new TransitionSpin();
  else {
    const p = name.indexOf('wipe');
    if (p >= 0) {
      const type = name.slice(0, p);
      let angle;
      if (type === 'v') angle = 180; // vertical convenience token
      else if (type === 'h') angle = 90; // horizontal
      else angle = parseFloat(type) || 0;
      t = new TransitionAngleWipe(angle);
    }
  }
  if (!t) console.error(`ERROR: Could not find wipe of type "${name}"`);
  return t;
}
