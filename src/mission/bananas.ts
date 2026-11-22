// Bananas: kongs throw them at the plane, a shoot 'em up's enemy bullets
// (<bananas> in a mission's <startconditions>; the Survive missions).
//
// Every kong in range and on screen throws one every `everyMsecs`, from
// over its head, in an arc whose top is at the plane's height where the
// plane will be after `riseSecs` (it leads the plane). So a banana rises,
// hangs about the plane's height across the top of its arc, where it can
// hit, and falls away: from above, in the top-down modes, it comes out from
// the kong towards the plane like a bullet on the screen. They never run
// out; downing kongs is the only way to have fewer coming.

import * as THREE from 'three';
import { playThud } from '../core/assets.ts';
import type { Kong } from './kongs.ts';
import type { Plane, World } from './world.ts';

export interface BananaOptions {
  /** Each kong throws one this often. */
  everyMsecs: number;
  /** Seconds to the top of the arc. */
  riseSecs: number;
  /** Kongs further off (on the ground) than this don't throw. */
  range: number;
  /** A banana this close (on the ground) at about the plane's height hits it. */
  hitRadius: number;
  /** Top-down: the game is 2D, so a banana hits whatever its ground track
   *  crosses near the top of its arc, whatever the plane's height. */
  flat?: boolean;
}

export const DEFAULT_BANANAS: BananaOptions = { everyMsecs: 2500, riseSecs: 1.8, range: 1400, hitRadius: 16 };

// Within this of the plane's height (up or down) a banana can hit it; or,
// flat, within this fraction of the rise time of the top of its arc.
const HIT_HEIGHT = 40;
const FLAT_WINDOW = 0.3;
// A kong coming on screen throws its first within this.
const FIRST_MSECS = 500;
// A banana thrown at a plane below the kong goes in this gravity.
const GRAVITY = 300;
const SIZE = 14; // the banana's radius of curve, world units
const SPIN = 9; // radians a second

interface Banana {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  /** Ground velocity, x and z. */
  vx: number;
  vz: number;
  vy: number;
  g: number;
  t: number;
  axis: THREE.Vector3;
}

export class Bananas {
  private flying: Banana[] = [];
  private timers = new WeakMap<Kong, number>();
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshLambertMaterial;
  private group = new THREE.Group();
  private lastPlane: THREE.Vector3 | null = null;
  private planeVel = new THREE.Vector3();

  constructor(readonly opts: BananaOptions, world: World) {
    // a fat curved tube, tapering is too fine to see
    this.geometry = new THREE.TorusGeometry(SIZE, SIZE * 0.28, 6, 12, Math.PI * 0.75);
    this.material = new THREE.MeshLambertMaterial({ color: 0xf4d63c, emissive: 0x3a2c00 });
    world.scene.add(this.group);
  }

  /** How many have been thrown (for tests). */
  thrown = 0;

  /** How many are in the air (for tests). */
  get count(): number { return this.flying.length; }

  update(world: World, msecs: number, kongs: readonly Kong[], plane: Plane): void {
    if (!msecs) return;
    const dt = msecs / 1000;
    const p = plane.object.position;
    if (this.lastPlane) this.planeVel.copy(p).sub(this.lastPlane).divideScalar(dt);
    this.lastPlane = p.clone();
    if (!plane.crashed && !plane.charmed) {
      for (const k of kongs) {
        if (k.isDying()) continue;
        // its clock runs while it can throw; the first soon after it can
        if (!this.canThrow(world, k, p)) continue;
        let left = this.timers.get(k) ?? Math.random() * FIRST_MSECS;
        left -= msecs;
        if (left <= 0) {
          this.throw(k, p);
          this.thrown++;
          left = this.opts.everyMsecs;
        }
        this.timers.set(k, left);
      }
    }
    const pos = new THREE.Vector3();
    this.flying = this.flying.filter((b) => {
      b.t += dt;
      pos.set(b.from.x + b.vx * b.t, b.from.y + b.vy * b.t - 0.5 * b.g * b.t * b.t, b.from.z + b.vz * b.t);
      b.mesh.position.copy(pos);
      b.mesh.rotateOnAxis(b.axis, SPIN * dt);
      const level = this.opts.flat ? Math.abs(b.t - this.opts.riseSecs) < FLAT_WINDOW * this.opts.riseSecs : Math.abs(pos.y - p.y) < HIT_HEIGHT;
      if (level && !plane.crashed && plane.invulnerable <= 0 && !plane.charmed
        && Math.hypot(pos.x - p.x, pos.z - p.z) < this.opts.hitRadius) {
        plane.hit(world, { t: 0, point: p.clone(), normal: new THREE.Vector3(0, 1, 0) }, new THREE.Vector3(b.vx, 0, b.vz));
        playThud(world.loudness(pos));
        this.group.remove(b.mesh);
        return false;
      }
      const gone = pos.y < 0 || b.t > 4 * this.opts.riseSecs + 2;
      if (gone) this.group.remove(b.mesh);
      return !gone;
    });
  }

  /** In range, and on screen (the camera as last drawn). */
  private canThrow(world: World, k: Kong, p: THREE.Vector3): boolean {
    const kp = k.object.position;
    if (Math.hypot(kp.x - p.x, kp.z - p.z) > this.opts.range) return false;
    const s = kp.clone().setY(kp.y + k.height).project(world.camera);
    return s.z < 1 && Math.abs(s.x) < 1 && Math.abs(s.y) < 1;
  }

  private throw(k: Kong, p: THREE.Vector3): void {
    const T = this.opts.riseSecs;
    const from = k.object.position.clone().setY(k.object.position.y + k.height);
    const to = p.clone().addScaledVector(this.planeVel, T);
    const dy = p.y - from.y;
    let g: number;
    let vy: number;
    if (dy > 20) {
      // the top of the arc at the plane's height, after T
      g = 2 * dy / (T * T);
      vy = g * T;
    } else {
      // (a plane down below: an arc that comes down onto it)
      g = GRAVITY;
      vy = (dy + 0.5 * g * T * T) / T;
    }
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.copy(from);
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    this.group.add(mesh);
    this.flying.push({
      mesh, from, g, vy, t: 0,
      vx: (to.x - from.x) / T,
      vz: (to.z - from.z) / T,
      axis: new THREE.Vector3(Math.random() - 0.5, 1, Math.random() - 0.5).normalize(),
    });
  }

  dispose(): void {
    this.group.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
