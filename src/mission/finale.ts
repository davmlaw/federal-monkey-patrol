// Game over: the last plane has crashed, and the camera leaves the wreck
// and flies across the city to a kong up on a skyscraper, closing in on it
// while it beats its chest and roars; then the picture fades to black and
// a title card says GAME OVER.
//
// The kong is one already standing on a roof nearby, or, with none, a new
// one put on a tall building behind the plane. The close-up is taken from
// a side clear of other buildings, and on the way there a hole is cut
// through anything between the camera and the kong (seethrough.ts).

import * as THREE from 'three';
import { display } from '../core/display.ts';
import { cardLayer } from '../game/simple.ts';
import { FilmGrain } from '../game/film.ts';
import { stage } from '../game/stage.ts';
import type { Kong, KongTroop } from './kongs.ts';
import { clearSeeThrough, patchSeeThrough, setSeeThrough } from './seethrough.ts';
import { ChaseCamera, type World } from './world.ts';

const HOLD_MSECS = 4500; // on the kong, closing in
const FADE_MSECS = 1500; // to the card
const CARD_MSECS = 3000; // GAME OVER
// The close-up: this many kong heights away, closing in to CLOSE_END,
// looking at its chest.
const CLOSE_START = 2.1;
const CLOSE_END = 1.7;
const LOOK_AT = 0.55;
const DRIFT = 0.12; // radians the camera drifts round it while closing in

const smooth = (t: number): number => t * t * (3 - 2 * t);
const smoother = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

export class Finale {
  readonly camera = new ChaseCamera();
  /** Where the kong's roars are heard (the camera). */
  private ear = new THREE.Object3D();
  private t = 0;
  private flyMsecs: number;
  private from: { pos: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3 };
  private control: THREE.Vector3;
  private kong: Kong;
  private look: THREE.Vector3;
  /** The close-up's side (radians about the vertical) and height. */
  private side = 0;
  private rise = 0;
  private film = new FilmGrain({ strength: 0.55, flicker: 0.08 });
  private card = cardLayer('Game Over');
  done = false;

  /** `from`: the camera as it is now. `behind`: the way behind the plane
   *  (a unit vector on the ground), where a kong goes if there's none. */
  constructor(private world: World, troop: KongTroop, from: ChaseCamera, behind: THREE.Vector3) {
    this.from = { pos: from.getPosition(), target: from.getTarget(), up: from.up.clone() };
    this.kong = troop.finaleKong(world, this.from.pos, behind);
    const h = this.kong.height;
    const feet = this.kong.object.position;
    this.look = feet.clone().add(new THREE.Vector3(0, LOOK_AT * h, 0));
    this.pickSide();
    const end = this.closeUp(0);
    // it turns to face the camera
    this.kong.showOff(Math.atan2(-(end.x - feet.x), -(end.z - feet.z)), this.ear);
    // up and over the roofs on the way
    const start = this.from.pos;
    const mid = start.clone().lerp(end, 0.5);
    mid.y = Math.max(start.y, end.y, world.grid.maxHeightNear(mid.x, mid.z, 400) + 60);
    this.control = mid.multiplyScalar(2).sub(start.clone().add(end).multiplyScalar(0.5)); // so the curve passes through mid
    this.flyMsecs = THREE.MathUtils.clamp(1800 + start.distanceTo(end) * 1.1, 2500, 5000);
    patchSeeThrough(world.grid.group);
    this.camera.set(this.from.pos, this.from.target, this.from.up);
  }

  /** A side to film the kong from with nothing in the way, as near the
   *  way the camera is coming from as can be. */
  private pickSide(): void {
    const h = this.kong.height;
    const p = this.look;
    const base = Math.atan2(this.from.pos.x - p.x, this.from.pos.z - p.z);
    const dist = CLOSE_START * h;
    for (let i = 0; i < 24; i++) {
      const a = base + Math.ceil(i / 2) * (i % 2 ? 1 : -1) * Math.PI / 12;
      for (const rise of [0.25, 0.1, 0.45]) {
        const dir = new THREE.Vector3(Math.sin(a), rise, Math.cos(a)).normalize();
        // (from just out of the kong; and a bit past the camera, for the drift)
        const clear = !this.world.grid.sweep(p.clone().addScaledVector(dir, 0.6 * h), p.clone().addScaledVector(dir, dist + 0.3 * h), 6);
        const drifted = new THREE.Vector3(Math.sin(a + DRIFT), rise, Math.cos(a + DRIFT)).normalize();
        if (clear && !this.world.grid.sweep(p.clone().addScaledVector(drifted, 0.6 * h), p.clone().addScaledVector(drifted, dist), 6)) {
          this.side = a;
          this.rise = rise;
          return;
        }
      }
    }
    this.side = base; // nowhere clear: the hole will do
    this.rise = 0.25;
  }

  /** The camera on the close-up, `s` (0..1) of the way through it. */
  private closeUp(s: number): THREE.Vector3 {
    const h = this.kong.height;
    const a = this.side + DRIFT * s;
    const d = THREE.MathUtils.lerp(CLOSE_START, CLOSE_END, s) * h;
    return this.look.clone().add(new THREE.Vector3(Math.sin(a), this.rise, Math.cos(a)).setLength(d));
  }

  get msecs(): number { return this.t; }

  update(msecs: number): void {
    this.t += msecs;
    const fly = Math.min(1, this.t / this.flyMsecs);
    const hold = THREE.MathUtils.clamp((this.t - this.flyMsecs) / HOLD_MSECS, 0, 1);
    const end = this.closeUp(smooth(hold));
    let pos: THREE.Vector3;
    if (fly < 1) {
      const u = smoother(fly);
      const a = this.from.pos.clone().lerp(this.control, u);
      const b = this.control.clone().lerp(end, u);
      pos = a.lerp(b, u);
    } else {
      pos = end;
    }
    // looks round at the kong ahead of getting there
    const target = this.from.target.clone().lerp(this.look, smooth(Math.min(1, fly * 1.6)));
    const up = this.from.up.clone().lerp(new THREE.Vector3(0, 1, 0), smooth(fly)).normalize();
    this.camera.set(pos, target, up);
    this.ear.position.copy(pos);
    if (this.t >= this.flyMsecs + HOLD_MSECS + FADE_MSECS + CARD_MSECS) this.done = true;
  }

  /** Called by World.draw with the camera placed, before rendering: the
   *  hole through what's in the way. */
  beforeRender = (camera: THREE.PerspectiveCamera): void => {
    const h = this.kong.height;
    const r = display.renderer;
    setSeeThrough(camera, this.look, 0.8 * h, 0.9 * h, display.view, r.getPixelRatio(), r.domElement.height);
  };

  /** The film over it all, then the card fading in. */
  drawOverlay(): void {
    this.film.update();
    stage.show(this.film.el);
    const fade = (this.t - this.flyMsecs - HOLD_MSECS) / FADE_MSECS;
    if (fade > 0) {
      this.card.update();
      stage.show(this.card.layer, Math.min(1, fade));
    }
  }

  dispose(): void {
    clearSeeThrough();
  }
}
