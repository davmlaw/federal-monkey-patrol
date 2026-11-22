// Fade and spin between the previous and next components. Both are played
// with msecs=0 (frozen) while the transition runs.
//
// Pictures, cards and story scenes are HTML layers (stage.ts), so a fade is
// CSS opacity (a WebGL mission fades by its alpha, or shows through an HTML
// layer fading out over it) and the spin is a CSS clip-path on the next
// layer.

import { ORTHO_H, ORTHO_W, type Display } from '../core/display.ts';
import { GameComponent, Status } from './component.ts';
import { clipInside, stage, toPercent, type Point2 } from './stage.ts';

const isDom = (c: GameComponent | null): boolean => !!c?.isDom;

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

/** A sweep like a clock hand, as on a film leader: the next component (an
 *  HTML layer) shows inside the swept part. */
class TransitionSpin extends Transition {
  override getName(): string { return 'TransitionSpin'; }

  /** The swept part, as a polygon (ortho coordinates). */
  private swept(): Point2[] {
    const R = 2.0;
    const end = this.getState() * 360;
    const pts: Point2[] = [[0, 0], [0, R]];
    for (let deg = 3; deg < end + 3; deg += 3) {
      const a = Math.min(deg, end) * Math.PI / 180;
      pts.push([R * Math.sin(a), R * Math.cos(a)]); // clockwise from 12 o'clock
    }
    return pts;
  }

  protected representation(display: Display): void {
    this.prev?.play(display, 0, null);
    const next = this.next;
    if (!next) return;
    const pts = this.swept().map((p) => toPercent(p, ORTHO_W, ORTHO_H));
    stage.withEffect({ clipPath: clipInside(pts) }, () => next.play(display, 0, null));
  }
}

/** A transition by name: fade or spin. */
export function makeTransition(name: string): Transition | null {
  if (name === 'fade') return new TransitionFade();
  if (name === 'spin') return new TransitionSpin();
  console.error(`ERROR: no transition called "${name}"`);
  return null;
}
