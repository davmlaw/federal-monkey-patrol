// Fade, spin, star wipe and angled wipes between the previous and next
// components. Both are played with msecs=0 (frozen) while the transition
// runs.
//
// Pictures and story scenes are HTML layers (stage.ts), so when either side is one
// the mask is CSS: a clip-path on the next layer, or, when the next is a
// WebGL mission under an HTML layer, a mask with a hole on the previous
// one. Between two WebGL components the next is rendered into an offscreen
// target and the mask shape is drawn with that render as its texture.

import { ORTHO_H, ORTHO_W, type Display } from '../core/display.ts';
import type { Batch2D, Point } from '../core/draw2d.ts';
import { GameComponent, Status } from './component.ts';
import { clipInside, makeLayer, maskOutside, outlineLayer, stage, toPercent } from './stage.ts';

const isDom = (c: GameComponent | null): boolean => !!c?.isDom;

const deg2rad = Math.PI / 180;

export abstract class Transition extends GameComponent {
  override status: Status = Status.PLAYING;
  prev: GameComponent | null = null;
  next: GameComponent | null = null;
  private transitionTime = 0;
  private timeDisplayed = 0;
  private state = 0;

  setTime(ms: number): void { this.transitionTime = ms; }

  setPrev(c: GameComponent | null): void { this.prev = c; }

  setNext(c: GameComponent | null): void { this.next = c; }

  getState(): number { return this.state; }

  protected override async _load(): Promise<void> {
    await Promise.all([this.prev?.load(), this.next?.load()]);
  }

  override drawLoading(display: Display): void {
    // The next component may be a mission generating its city.
    // (an HTML prev would cover a mission's load bar, so leave it out then)
    const coversLoadBar = isDom(this.prev) && this.next && !isDom(this.next);
    if (this.prev?.loaded && !coversLoadBar) this.prev.play(display, 0, null);
    if (this.next && !this.next.loaded) this.next.drawLoading(display);
  }

  protected abstract representation(display: Display): void;

  protected override _play(display: Display, msecs: number): void {
    this.timeDisplayed += msecs;
    const t = this.transitionTime > 0 ? this.timeDisplayed / this.transitionTime : 1;
    this.state = Math.min(1, Math.max(0, t));
    this.representation(display);
    if (this.state >= 1) this.status = Status.NEXT;
  }
}

/** Draw prev, then draw next on top, its alpha going from 0 to 1. */
class TransitionFade extends Transition {
  override getName(): string { return 'TransitionFade'; }

  protected representation(display: Display): void {
    const t = this.getState();
    const prev = this.prev;
    if (prev && isDom(prev) && this.next && !isDom(this.next)) {
      // WebGL next, under the HTML prev: fade the prev out instead
      this.next.play(display, 0, null);
      stage.withEffect({ opacity: 1 - t }, () => prev.play(display, 0, null));
      return;
    }
    this.prev?.play(display, 0, null);
    this.next?.play(display, 0, null, t);
  }
}

/** Draw prev, then next only inside the mask, then the mask's outline. */
abstract class TransitionWipe extends Transition {
  /** The area showing the next component, as triangles (ortho coordinates). */
  protected abstract maskTriangles(): Point[];

  protected representation(display: Display): void {
    const next = this.next;
    if (!next) {
      this.prev?.play(display, 0, null);
      return;
    }
    if (isDom(this.prev) || isDom(this.next)) {
      this.htmlRepresentation(display, next);
      return;
    }
    this.prev?.play(display, 0, null);
    const rt = display.acquireTarget();
    try {
      display.withTarget(rt, () => next.play(display, 0, null));
      display.draw2dWith((g) => {
        g.screenTriangles(this.maskTriangles(), rt.texture);
        this.renderColor(g, display);
      });
    } finally {
      display.releaseTarget(rt);
    }
  }

  protected renderColor(_g: Batch2D, _display: Display): void {}

  /** The mask as one polygon (ortho coordinates) for CSS. */
  protected maskPolygon(): Point[] {
    const t = this.maskTriangles();
    const pts: Point[] = [];
    for (let i = 0; i < t.length; i += 3) pts.push(t[i + 1]);
    return pts;
  }

  private htmlRepresentation(display: Display, next: GameComponent): void {
    const pts = this.maskPolygon().map((p) => toPercent(p, ORTHO_W, ORTHO_H));
    if (isDom(next)) {
      this.prev?.play(display, 0, null);
      stage.withEffect({ clipPath: clipInside(pts) }, () => next.play(display, 0, null));
    } else {
      next.play(display, 0, null);
      stage.withEffect({ mask: maskOutside(pts) }, () => this.prev?.play(display, 0, null));
    }
    this.htmlOutline(pts);
  }

  protected htmlOutline(_pts: Point[]): void {}
}

/** A band sweeping across the screen at `angle` degrees clockwise. */
class TransitionAngleWipe extends TransitionWipe {
  constructor(private angle: number) {
    super();
  }

  override getName(): string { return `TransitionAngleWipe(${this.angle})`; }

  protected maskTriangles(): Point[] {
    const len = Math.hypot(ORTHO_W, ORTHO_H); // screen diagonal (widest point)
    const h = len / 2;
    const pos = this.getState() * len;
    const pts = [[-h, -h + pos], [-h, -h], [h, -h], [h, -h + pos]];
    // rotated clockwise
    const r = -this.angle * deg2rad;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const [a, b, cc, d] = pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
    return [a, b, cc, a, cc, d];
  }

  protected override maskPolygon(): Point[] {
    const t = this.maskTriangles();
    return [t[0], t[1], t[2], t[5]];
  }
}

// "Why eat hamburger when you can eat steak? Star-wipe... and we're out!"
const STAR_POINTS = 10;

class TransitionStarWipe extends TransitionWipe {
  private outline: HTMLDivElement | null = null;

  override getName(): string { return 'TransitionStarWipe'; }

  private starPoints(): Point[] {
    const outDist = ORTHO_W * 1.4 * this.getState();
    const inDist = ORTHO_W * 0.6 * this.getState();
    const rot = 360 / STAR_POINTS;
    const pts: Point[] = [];
    for (let i = 1; i < STAR_POINTS + 1; i++) {
      const r = (i & 1 ? inDist : outDist);
      const a = i * rot * deg2rad;
      // rotate the up vector (0, r) about z
      pts.push([-r * Math.sin(a), r * Math.cos(a)]);
    }
    return pts;
  }

  protected maskTriangles(): Point[] {
    const pts = this.starPoints();
    const tris: Point[] = [];
    for (let i = 0; i < pts.length; i++) tris.push([0, 0], pts[i], pts[(i + 1) % pts.length]);
    return tris;
  }

  protected override renderColor(g: Batch2D, display: Display): void {
    g.polyline(this.starPoints(), display.px(10), [1, 1, 1, 1], true);
  }

  protected override maskPolygon(): Point[] { return this.starPoints(); }

  protected override htmlOutline(pts: Point[]): void {
    this.outline ??= makeLayer('outline');
    stage.show(outlineLayer(this.outline, pts, Math.max(2, (stage.view?.w ?? 640) / 64)));
  }
}

/** A sweep like a clock hand, as on a film leader. */
class TransitionSpin extends TransitionWipe {
  override getName(): string { return 'TransitionSpin'; }

  protected maskTriangles(): Point[] {
    const R = 2.0;
    const end = this.getState() * 360;
    const tris: Point[] = [];
    let prev = [0, R];
    for (let deg = 0; deg < end; deg += 1) {
      const a = Math.min(deg + 1, end) * deg2rad;
      const next = [R * Math.sin(a), R * Math.cos(a)]; // clockwise from 12 o'clock
      tris.push([0, 0], prev, next);
      prev = next;
    }
    return tris;
  }

  protected override maskPolygon(): Point[] {
    const R = 2.0;
    const end = this.getState() * 360;
    const pts: Point[] = [[0, 0], [0, R]];
    for (let deg = 3; deg < end + 3; deg += 3) {
      const a = Math.min(deg, end) * deg2rad;
      pts.push([R * Math.sin(a), R * Math.cos(a)]);
    }
    return pts;
  }
}

/** A transition by name: fade, spin, starwipe, hwipe, vwipe, or <angle>wipe. */
export function makeTransition(name: string): Transition | null {
  let t: Transition | null = null;
  if (name === 'fade') t = new TransitionFade();
  else if (name === 'starwipe') t = new TransitionStarWipe();
  else if (name === 'spin') t = new TransitionSpin();
  else {
    const p = name.indexOf('wipe');
    if (p >= 0) {
      const type = name.slice(0, p);
      let angle: number;
      if (type === 'v') angle = 180; // vertical convenience token
      else if (type === 'h') angle = 90; // horizontal
      else angle = parseFloat(type) || 0;
      t = new TransitionAngleWipe(angle);
    }
  }
  if (!t) console.error(`ERROR: Could not find wipe of type "${name}"`);
  return t;
}
