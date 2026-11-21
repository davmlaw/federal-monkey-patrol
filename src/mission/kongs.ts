// Kongs: giant apes (King Kong size) that walk the streets, now and then
// climb a building to roar from its roof, and can be shot down. They're
// rigged and animated procedurally in kongrig.ts (see kongtest.html).
// Tuned in data/etc/kong.properties.

import * as THREE from 'three';
import { loadModel, loadSound, playBang, playSound } from '../core/assets.ts';
import { settings } from '../core/settings.ts';
import { gamestats, Stat } from './stats.ts';
import { BLOCKSIZE, type Box, type Hit } from './city.ts';
import { Entity, type World } from './world.ts';
import { FALL_SETTLE, GRAB_GOT, GRAB_SECONDS, KongAnimator, KongRig, type KongClip } from './kongrig.ts';
import { Blonde, BlondeKit } from './blonde.ts';

interface KongConfig {
  model: string;
  skin: string;
  count: number;
  height: number; // to the top of the raised hands
  walkSpeed: number;
  climbSpeed: number;
  climbChance: number;
  climbMax: number;
  healthMin: number;
  healthMax: number;
  respawnMsecs: number;
}

function loadConfig(): KongConfig {
  const f = (k: string, d: number): number => {
    const v = parseFloat(settings.module('kong').get(k) ?? '');
    return Number.isFinite(v) ? v : d;
  };
  const m = settings.module('kong');
  return {
    model: m.get('model') ?? 'kong2.obj',
    skin: m.get('skin') ?? 'kongcolor.jpg',
    count: f('count', 4),
    height: f('height', 90),
    walkSpeed: f('walk_speed', 35),
    climbSpeed: f('climb_speed', 45),
    climbChance: f('climb_chance', 0.3),
    climbMax: f('climb_max', 900),
    healthMin: f('health_min', 5),
    healthMax: f('health_max', 10),
    respawnMsecs: f('respawn_msecs', 8000),
  };
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** Shortest signed angle from a to b. */
function angleTo(a: number, b: number): number {
  let d = b - a;
  d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
  return d;
}

/** Heading (as in world.ts: forward is -Z at 0) of the direction (dx, dz). */
const headingOf = (dx: number, dz: number): number => Math.atan2(-dx, -dz);

/**
 * Closest points of segments p1-q1 and p2-q2 (Ericson, Real-Time Collision
 * Detection 5.1.9): parameters s, t along them and the squared distance.
 */
function closestSegments(p1: THREE.Vector3, q1: THREE.Vector3, p2: THREE.Vector3, q2: THREE.Vector3): { s: number; t: number; d2: number } {
  const d1 = q1.clone().sub(p1);
  const d2 = q2.clone().sub(p2);
  const r = p1.clone().sub(p2);
  const a = d1.lengthSq();
  const e = d2.lengthSq();
  const f = d2.dot(r);
  const clamp = (v: number): number => Math.max(0, Math.min(1, v));
  let s = 0;
  let t = 0;
  if (a < 1e-9 && e < 1e-9) {
    // both points
  } else if (a < 1e-9) {
    t = clamp(f / e);
  } else {
    const c = d1.dot(r);
    if (e < 1e-9) {
      s = clamp(-c / a);
    } else {
      const b = d1.dot(d2);
      const denom = a * e - b * b;
      s = denom > 1e-9 ? clamp((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a); } else if (t > 1) { t = 1; s = clamp((b - c) / a); }
    }
  }
  const c1 = p1.clone().addScaledVector(d1, s);
  const c2 = p2.clone().addScaledVector(d2, t);
  return { s, t, d2: c1.distanceToSquared(c2) };
}

// ----------------------------------------------------------------- the kong

/** What a kong is doing; it works through a list of these. */
type Task =
  | { kind: 'walk'; x: number; z: number } // turning to face the way it goes
  | { kind: 'step'; x: number; z: number } // keeping its heading (onto and off roofs)
  | { kind: 'turn'; yaw: number }
  | { kind: 'climb'; y: number } // up or down a wall
  | { kind: 'wait'; msecs: number; roar: boolean }
  | { kind: 'wall'; wall: Wall | null } // gets on / off a wall
  | { kind: 'grab'; msecs: number }; // reaches in at a window for a blonde

/** A wall face: outward normal (nx, nz) and the face at nx*x + nz*z = d. */
interface Wall { nx: number; nz: number; d: number }

const TURN_RATE = 2.2; // radians per second
const TURN_IN_PLACE = 0.7; // turns on the spot when facing further off than this
const FLASH_MSECS = 150; // glows when hit
const ROOF_MSECS: [number, number] = [5000, 10000];
const PERCH_MSECS: [number, number] = [1500, 5000]; // a rooftop kong, between turns
const GRAVITY = 400; // units/s^2, for falling off buildings
const TOPPLE_MSECS = 1400; // falling over in the street
// tumbling off a building, in heights: the middle of the body it turns
// about (from the feet), and its radius for hitting things
const TUMBLE_CENTRE = 0.42;
const TUMBLE_RADIUS = 0.18;
const TUMBLE_BOUNCE = 0.3; // of the speed into what it hits
const TUMBLE_GIVE_UP = 10000; // msecs: then drops through anything in the way
const SETTLE_MSECS = 350; // flattening out on the street
const CORPSE_MSECS = 12000; // lies there this long...
const SINK_MSECS = 3000; // ...then sinks into the street
const HEARING = 3500; // roars fade out at this distance from the plane
const CLIMB_OFF = 0.22; // stands this far (in heights) out from a wall to climb it
const TURN_STEP = 0.2; // turning on the spot, the feet step as if walking this far (in heights) per radian

export class Kong extends Entity {
  private yaw = 0;
  private tasks: Task[] = [];
  private lastDir: [number, number] | null = null;
  private wall: Wall | null = null;
  private health: number;
  private flash = 0;
  private roared = false;
  // falling (after being shot down)
  private dying = false;
  private fallT = 0;
  private fallTime = 0;
  private fallSign = 1; // +1 onto its back, -1 on its face
  private landed = false;
  private corpse = 0;
  // tumbling off a building (after being shot down up there)
  private tumbling = false;
  private fallVel = new THREE.Vector3();
  private tumble = 0; // radians about its middle, + onto its back
  private spin = 0; // radians per second
  private streetAxis: 'x' | 'z' = 'x'; // the street it falls into runs along
  private streetAt = 0; // ...the other axis, at this
  private settleT = -1; // >= 0: down on the street, flattening out
  private settleFrom = 0;
  private settleTo = 0;
  private settleY = 0;
  /** Where the roars are heard from (the plane). */
  ear: THREE.Object3D | null = null;
  /** The patrol area: it heads back in when it strays outside. */
  home: Area | null = null;
  /** Lives on a roof: turns about and roars, never walks off. */
  perched = false;
  /** Blondes to carry off (none in the rooftop modes). */
  kit: BlondeKit | null = null;
  /** The one in its fist. */
  blonde: Blonde | null = null;
  private fist = new THREE.Vector3();

  constructor(
    private pose: THREE.Group, // topples, pivoting at the feet
    private anim: KongAnimator,
    private scale: number, // world units per model unit
    private material: THREE.MeshLambertMaterial,
    private cfg: KongConfig,
    private roar: AudioBuffer | null,
  ) {
    const object = new THREE.Group();
    object.add(pose);
    super(object);
    this.shootable = true;
    this.health = Math.round(rand(cfg.healthMin, cfg.healthMax));
  }

  get height(): number { return this.cfg.height; }

  /** Stand at (x, y, z), heading `yaw`, with nothing to do. */
  placeAt(x: number, z: number, yaw = Math.floor(Math.random() * 4) * Math.PI / 2, y = 0): void {
    this.object.position.set(x, y, z);
    this.yaw = yaw;
    this.object.rotation.set(0, yaw, 0);
    this.tasks = [];
    this.wall = null;
    this.lastDir = null;
  }

  isDying(): boolean { return this.dying; }

  // ------------------------------------------------------------- shooting

  /** The hit capsule, in world space: an axis from below the hips to the
   *  neck (following the body as it climbs and falls), and a radius that
   *  takes in most of the arms. */
  private capsule(): { a: THREE.Vector3; b: THREE.Vector3; r: number } {
    const h = this.cfg.height;
    this.object.updateMatrixWorld(true);
    const bones = this.anim.rig.bones;
    const a = bones.get('hips')!.getWorldPosition(new THREE.Vector3());
    const b = bones.get('neck')!.getWorldPosition(new THREE.Vector3());
    a.add(a.clone().sub(b).setLength(0.15 * h));
    return { a, b, r: 0.2 * h };
  }

  override intersect(p0: THREE.Vector3, p1: THREE.Vector3, radius: number): Hit | null {
    const { a, b, r } = this.capsule();
    const reach = r + radius;
    const { s, d2 } = closestSegments(p0, p1, a, b);
    if (d2 > reach * reach) return null;
    const len = p0.distanceTo(p1);
    const t = len > 1e-6 ? Math.max(0, s - Math.sqrt(reach * reach - d2) / len) : 0;
    const at = p0.clone().lerp(p1, t);
    const axis = new THREE.Line3(a, b).closestPointToPoint(at, true, new THREE.Vector3());
    const normal = at.clone().sub(axis);
    if (normal.lengthSq() < 1e-9) normal.copy(p0).sub(p1);
    normal.normalize();
    return { t, point: axis.addScaledVector(normal, r), normal };
  }

  override aim(): { point: THREE.Vector3; radius: number } | null {
    if (this.dying) return null;
    const { a, b, r } = this.capsule();
    return { point: a.lerp(b, 0.5), radius: r };
  }

  override distanceTo(point: THREE.Vector3): number {
    const { a, b, r } = this.capsule();
    return new THREE.Line3(a, b).closestPointToPoint(point, true, new THREE.Vector3()).distanceTo(point) - r;
  }

  override struck(world: World, hit: Hit, velocity: THREE.Vector3, damage: number): void {
    world.effects.furHit(hit.point, hit.normal, velocity);
    if (this.dying) return;
    this.flash = FLASH_MSECS;
    this.health -= damage;
    if (this.health <= 0) this.die(world, velocity);
  }

  private volume(): number {
    if (!this.ear) return 0;
    const d = this.ear.position.distanceTo(this.object.position);
    return 0.9 * Math.max(0, 1 - d / HEARING) ** 2;
  }

  private bellow(): void {
    const v = this.volume();
    if (v > 0.03) playSound(this.roar, { volume: v });
  }

  /** Shot down: lets go and falls. In the street it topples over, away
   *  from the shot (going at `shot`); up on a building it tumbles off,
   *  bouncing down any ledges and setbacks in the way, out over the street
   *  and down to it (see updateTumble). */
  private die(world: World, shot: THREE.Vector3): void {
    this.dying = true;
    this.tasks = [];
    gamestats.inc(Stat.MONKEY_DEATHS);
    this.anim.rig.carry = false;
    let thrown: THREE.Vector3 | null = null; // which way she's thrown
    this.bellow();
    const pos = this.object.position;
    const h = this.cfg.height;
    const back = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); // behind it
    this.fallSign = 1;
    this.pose.rotation.set(0, 0, 0);
    if (pos.y > 0.5) {
      // the street to fall into: the one the wall it's on faces, or off a
      // roof, the nearest
      const near = (v: number): number => Math.round(v / BLOCKSIZE) * BLOCKSIZE;
      let axis: 'x' | 'z';
      if (this.wall) axis = Math.abs(this.wall.nx) > Math.abs(this.wall.nz) ? 'x' : 'z';
      else axis = Math.abs(pos.x - near(pos.x)) < Math.abs(pos.z - near(pos.z)) ? 'x' : 'z';
      this.streetAxis = axis;
      this.streetAt = near(pos[axis]);
      const out = new THREE.Vector3();
      out[axis] = Math.sign(this.streetAt - pos[axis]) || 1;
      thrown = out;
      if (out.dot(back) < 0) this.fallSign = -1; // facing out: falls forward
      // tumbles about its middle: object.position is that from now on
      this.tumbling = true;
      pos.y += TUMBLE_CENTRE * h;
      this.tumble = 0;
      this.spin = this.fallSign * rand(1.5, 2.6);
      this.fallVel.copy(out).multiplyScalar(rand(0.6, 0.9) * h).setY(rand(0.2, 0.5) * h);
      this.placeTumble();
    } else {
      this.fallTime = TOPPLE_MSECS;
      if (shot.x * back.x + shot.z * back.z < 0) this.fallSign = -1; // shot from behind
    }
    this.anim.rig.fallSign = this.fallSign;
    // she's let go (and up high, thrown clear of the roof)
    this.blonde?.drop(thrown);
    this.blonde = null;
  }

  /** Turns the body `tumble` about its middle (object.position). */
  private placeTumble(): void {
    const c = TUMBLE_CENTRE * this.cfg.height;
    this.pose.rotation.x = this.tumble;
    this.pose.position.set(0, -c * Math.cos(this.tumble), -c * Math.sin(this.tumble));
  }

  /** Down onto the street (or the corpse lies wherever, after too long). */
  private touchDown(world: World): void {
    // onto its back or its face, whichever is nearer
    const lie = Math.sin(this.tumble) >= 0 ? Math.PI / 2 : -Math.PI / 2;
    this.fallSign = lie > 0 ? 1 : -1;
    this.anim.rig.fallSign = this.fallSign;
    this.settleFrom = this.tumble;
    this.settleTo = lie + 2 * Math.PI * Math.round((this.tumble - lie) / (2 * Math.PI));
    this.settleY = this.object.position.y;
    this.settleT = 0;
    this.fallVel.set(0, 0, 0);
    const at = this.object.position.clone().setY(0);
    world.effects.dust(at, 1.5);
    playBang(1.4, 220, 0.8 * this.volume());
  }

  /** Falling off a building: a ballistic tumble that bounces off what it
   *  hits, steered out over the middle of the street (so it never ends up
   *  lying on a ledge or across a roof's edge). */
  private updateTumble(world: World, msecs: number): void {
    const pos = this.object.position;
    const h = this.cfg.height;
    const r = TUMBLE_RADIUS * h;
    if (this.settleT >= 0) {
      // down: flattening out on the street
      this.settleT = Math.min(SETTLE_MSECS, this.settleT + msecs);
      const k = this.settleT / SETTLE_MSECS;
      const e = k * (2 - k);
      this.tumble = THREE.MathUtils.lerp(this.settleFrom, this.settleTo, e);
      pos.y = THREE.MathUtils.lerp(this.settleY, 0, e);
      this.placeTumble();
      this.anim.update(msecs / 1000, 'fall', 0, 1);
      if (k >= 1) this.landed = true;
      return;
    }
    this.fallT += msecs;
    this.anim.update(msecs / 1000, 'fall', 0, Math.min(1, this.fallT / 700));
    const lost = this.fallT > TUMBLE_GIVE_UP; // (stuck somewhere: just drop)
    const v = this.fallVel;
    const axis = this.streetAxis;
    const other = axis === 'x' ? 'z' : 'x';
    for (let left = msecs; left > 0;) {
      const ms = Math.min(20, left);
      left -= ms;
      const dt = ms / 1000;
      v.y -= GRAVITY * dt;
      // out over the street and along it to the middle
      const want = THREE.MathUtils.clamp(4 * (this.streetAt - pos[axis]), -1.5 * h, 1.5 * h);
      v[axis] += (want - v[axis]) * Math.min(1, 3 * dt);
      v[other] *= Math.max(0, 1 - 0.8 * dt);
      this.tumble += this.spin * dt;
      const next = pos.clone().addScaledVector(v, dt);
      const hit = lost ? null : world.grid.sweep(pos, next, r);
      if (lost && next.y <= r) {
        pos.copy(next).setY(r);
        this.touchDown(world);
        break;
      }
      if (!hit || hit.t <= 1e-6) {
        // (t 0: it starts inside a box, as it can on leaving a roof)
        pos.copy(next);
        continue;
      }
      pos.lerp(next, hit.t).addScaledVector(hit.normal, 0.01);
      const n = hit.normal;
      if (n.y > 0.5 && hit.point.y < 1) {
        this.touchDown(world);
        break;
      }
      // a wall, a ledge or a setback: bounce off it, limply, and roll on
      const into = v.dot(n);
      if (into < 0) v.addScaledVector(n, -(1 + TUMBLE_BOUNCE) * into);
      if (n.y > 0.5) {
        v[axis] += Math.sign(this.streetAt - pos[axis]) * 0.4 * h;
        this.spin = -0.4 * this.spin + rand(-3, 3);
        if (-into > 0.6 * h) {
          world.effects.dust(hit.point, 0.6);
          playBang(0.6, 300, 0.4 * this.volume());
        }
      } else {
        this.spin += rand(-1.5, 1.5);
      }
      break;
    }
    this.placeTumble();
  }

  private updateFall(world: World, msecs: number): void {
    const pos = this.object.position;
    if (!this.landed) {
      if (this.tumbling) {
        this.updateTumble(world, msecs);
        return;
      }
      // toppling over in the street
      this.fallT = Math.min(this.fallTime, this.fallT + msecs);
      const k = this.fallT / this.fallTime;
      this.pose.rotation.x = this.fallSign * (Math.PI / 2) * k * k;
      this.anim.update(msecs / 1000, 'fall', 0, k);
      if (k >= 1) {
        this.landed = true;
        // where its back (or front) hits the street
        const mid = this.pose.localToWorld(new THREE.Vector3(0, 0.4 * this.cfg.height, 0));
        world.effects.dust(mid.setY(pos.y), 1.5);
        playBang(1.4, 220, 0.8 * this.volume());
      }
      return;
    }
    this.corpse += msecs;
    if (this.corpse < FALL_SETTLE * 1000 + 100) this.anim.update(msecs / 1000, 'fall', 0, 1 + Math.min(FALL_SETTLE, this.corpse / 1000));
    if (this.corpse > CORPSE_MSECS) {
      pos.y -= (0.3 * this.cfg.height) * msecs / SINK_MSECS;
      if (this.corpse > CORPSE_MSECS + SINK_MSECS) {
        this.dead = true;
        this.material.dispose();
      }
    }
  }

  // ------------------------------------------------------------ behaviour

  protected override _update(world: World, msecs: number): void {
    this.flash = Math.max(0, this.flash - msecs);
    const k = this.flash / FLASH_MSECS;
    this.material.emissive.setRGB(0.7 * k, 0.25 * k, 0.15 * k);
    if (this.dying) {
      this.updateFall(world, msecs);
      return;
    }
    if (!this.tasks.length) this.plan(world);
    const dt = msecs / 1000;
    const pos = this.object.position;
    const task = this.tasks[0];
    const yaw0 = this.yaw;
    const y0 = pos.y;
    let clip: KongClip = 'idle';
    let travel = 0; // in world units, forward or up
    let done = false;
    switch (task.kind) {
      case 'walk':
      case 'step': {
        const dx = task.x - pos.x;
        const dz = task.z - pos.z;
        const dist = Math.hypot(dx, dz);
        let go = true;
        if (task.kind === 'walk' && dist > 1e-3) {
          const diff = angleTo(this.yaw, headingOf(dx, dz));
          this.turn(diff, dt);
          go = Math.abs(diff) < TURN_IN_PLACE;
        }
        if (go) {
          const step = this.cfg.walkSpeed * dt;
          if (step >= dist) {
            pos.x = task.x;
            pos.z = task.z;
            done = true;
          } else {
            pos.x += dx / dist * step;
            pos.z += dz / dist * step;
          }
          clip = 'walk';
          travel = Math.min(step, dist);
        }
        break;
      }
      case 'turn': {
        const diff = angleTo(this.yaw, task.yaw);
        this.turn(diff, dt);
        done = Math.abs(diff) < 1e-3;
        break;
      }
      case 'climb': {
        const dy = task.y - pos.y;
        const step = (this.blonde && this.kit ? this.kit.cfg.climbSpeed : this.cfg.climbSpeed) * dt;
        pos.y = Math.abs(dy) <= step ? task.y : pos.y + Math.sign(dy) * step;
        done = pos.y === task.y;
        clip = 'climb';
        travel = pos.y - y0;
        break;
      }
      case 'wait':
        if (task.roar && !this.roared) {
          this.roared = true;
          this.bellow();
        }
        task.msecs -= msecs;
        done = task.msecs <= 0;
        if (task.roar) clip = 'roar';
        break;
      case 'wall':
        this.wall = task.wall;
        done = true;
        break;
      case 'grab': {
        const got = GRAB_GOT * GRAB_SECONDS * 1000;
        const before = task.msecs;
        task.msecs += msecs;
        if (before < got && task.msecs >= got && this.kit && !this.blonde) {
          this.blonde = this.kit.make(world);
          this.anim.rig.carry = true;
          this.blonde.scream();
        }
        clip = 'grab';
        done = task.msecs >= GRAB_SECONDS * 1000;
        break;
      }
    }
    if (done) {
      this.tasks.shift();
      this.roared = false;
    }
    this.object.rotation.set(0, this.yaw, 0);
    // turning on the spot: stepping round
    const turned = Math.abs(angleTo(yaw0, this.yaw));
    if (clip === 'idle' && turned > 1e-4) {
      clip = 'walk';
      travel = turned * TURN_STEP * this.cfg.height;
    }
    this.anim.update(dt, clip, travel / this.scale);
    if (this.blonde) this.carry(clip);
  }

  /** Her waist in its right fist; facing the way it does, or away from the
   *  wall while it climbs. */
  private carry(clip: KongClip): void {
    this.object.updateMatrixWorld(true);
    this.anim.rig.tip('hand.R', 0.45, this.fist);
    const onWall = clip === 'climb' || clip === 'grab';
    this.blonde!.holdAt(this.fist, this.yaw + (onWall ? Math.PI * 0.75 : 0));
  }

  /** Gone (left behind), and the blonde it has with it. */
  remove(): void {
    this.dead = true;
    this.blonde?.remove();
    this.blonde = null;
  }

  private turn(diff: number, dt: number): void {
    const step = TURN_RATE * dt;
    this.yaw += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
  }

  /** At a crossing with nothing to do: maybe climb a building on one of
   *  its corners, otherwise walk on along one of the streets. */
  private plan(world: World): void {
    if (this.perched) {
      this.tasks.push(
        { kind: 'turn', yaw: this.yaw + rand(-2, 2) },
        { kind: 'wait', msecs: rand(...PERCH_MSECS), roar: Math.random() < 0.3 },
      );
      return;
    }
    const pos = this.object.position;
    const x = Math.round(pos.x / BLOCKSIZE) * BLOCKSIZE;
    const z = Math.round(pos.z / BLOCKSIZE) * BLOCKSIZE;
    if (Math.hypot(x - pos.x, z - pos.z) > 1) {
      this.tasks.push({ kind: 'walk', x, z }); // (to the crossing first)
      return;
    }
    if (this.blonde && this.kit) {
      // carrying one: up another tall one with her
      if (Math.random() < this.kit.cfg.climbChance && this.planClimb(world, x, z, false)) return;
    } else if (Math.random() < this.cfg.climbChance) {
      const kidnap = !!this.kit && Math.random() < this.kit.cfg.grabChance && this.kit.canKidnap();
      if (kidnap && this.planClimb(world, x, z, true)) return;
      if (this.planClimb(world, x, z, false)) return;
    }
    const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let options = dirs.filter(([dx, dz]) => !this.lastDir || dx !== -this.lastDir[0] || dz !== -this.lastDir[1] || Math.random() < 0.05);
    const home = this.home;
    if (home && Math.hypot(x - home.x, z - home.z) > home.r * 0.8) {
      // near the edge of the patrol area: only ways back in
      options = dirs.filter(([dx, dz]) => dx * (home.x - x) + dz * (home.z - z) > 0);
    }
    const [dx, dz] = options[Math.floor(Math.random() * options.length)];
    const blocks = Math.random() < 0.3 ? 2 : 1;
    this.lastDir = [dx, dz];
    this.tasks.push({ kind: 'walk', x: x + dx * blocks * BLOCKSIZE, z: z + dz * blocks * BLOCKSIZE });
  }

  /** Find a building on a corner of the crossing (x, z) with a face on the
   *  street that is clear all the way up and not too tall, and plan the
   *  climb: along the street to it, up, onto the roof to roar for a while,
   *  then back down to the crossing.
   *
   *  With a blonde, or to `grab` one, it wants a tall one instead, and
   *  climbs on up any setbacks above it to the top of the tower: grabbing
   *  her at a window a few storeys up on the way, staying longer on the
   *  roof, then climbing back down with her. */
  private planClimb(world: World, x: number, z: number, grab: boolean): boolean {
    const h = this.cfg.height;
    const half = BLOCKSIZE / 2;
    const tall = grab || !!this.blonde;
    const minTop = tall && this.kit ? this.kit.cfg.minTop : 0;
    const climbs: Climb[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const bi = Math.floor((x + sx * half) / BLOCKSIZE);
        const bj = Math.floor((z + sz * half) / BLOCKSIZE);
        const boxes = world.grid.blockBoxes(bi, bj);
        for (const b of boxes) {
          if (b.y0 > 1 || b.y1 < 1.5 * h || (!tall && b.y1 > this.cfg.climbMax)) continue;
          // the face towards the street along x = x (axis 0), or z = z (axis 2)
          for (const axis of [0, 2] as const) {
            const s = axis === 0 ? sx : sz;
            const street = axis === 0 ? x : z;
            const face = faceOf(b, axis, s);
            if (s * (face - street) > 95) continue; // set back from the street
            const [lo, hi] = lateralOf(b, axis);
            if (hi - lo < 0.6 * h) continue;
            const lateral = (lo + hi) / 2;
            const at = (f: number, l: number, out: number, y: number): THREE.Vector3 => axis === 0
              ? new THREE.Vector3(f - s * out, y, l)
              : new THREE.Vector3(l, y, f - s * out);
            // clear all the way up the face?
            if (world.grid.sweep(at(face, lateral, 3, 2), at(face, lateral, 3, b.y1 - 1), 0)) continue;
            const stage = (f: number, l: number, y0: number, y1: number): Stage => {
              const foot = at(f, l, CLIMB_OFF * h, 0);
              const nx = axis === 0 ? -s : 0;
              const nz = axis === 0 ? 0 : -s;
              return { foot: [foot.x, foot.z], y0, y1, wall: { nx, nz, d: nx * foot.x + nz * foot.z - CLIMB_OFF * h } };
            };
            const stages = [stage(face, lateral, 0, b.y1)];
            // on up the setbacks: a box standing on this one's roof, its
            // face on the same side and clear
            let cur = b;
            let f = face;
            let l = lateral;
            while (tall) {
              const next = boxes.find((n) => {
                if (Math.abs(n.y0 - cur.y1) > 2 || n.y1 - n.y0 < 0.8 * h) return false;
                const [nlo, nhi] = lateralOf(n, axis);
                if (nhi - nlo < 0.6 * h || s * (faceOf(n, axis, s) - f) < 0) return false;
                const nl = THREE.MathUtils.clamp(l, nlo + 0.3 * h, nhi - 0.3 * h);
                return !world.grid.sweep(at(faceOf(n, axis, s), nl, 3, n.y0 + 2), at(faceOf(n, axis, s), nl, 3, n.y1 - 1), 0);
              });
              if (!next) break;
              const [nlo, nhi] = lateralOf(next, axis);
              l = THREE.MathUtils.clamp(l, nlo + 0.3 * h, nhi - 0.3 * h);
              f = faceOf(next, axis, s);
              stages.push(stage(f, l, next.y0, next.y1));
              cur = next;
            }
            const top = cur.y1;
            if (top < minTop) continue;
            // somewhere to stand on the roof
            const depth = [0.25 * h, 0.12 * h, 0].find((d) => !world.grid.sweep(at(f, l, -d, top + 1), at(f, l, -d, top + 0.8 * h), 0));
            if (depth === undefined) continue;
            const roof = at(f, l, -depth, 0);
            climbs.push({
              street: axis === 0 ? [street, lateral] : [lateral, street],
              stages,
              roof: [roof.x, roof.z],
              top,
            });
          }
        }
      }
    }
    if (!climbs.length) return false;
    // taller buildings are likelier (much likelier, carrying a blonde)
    const weight = (c: Climb): number => tall ? c.top * c.top : c.top;
    let pick = Math.random() * climbs.reduce((sum, c) => sum + weight(c), 0);
    const c = climbs.find((cl) => (pick -= weight(cl)) <= 0) ?? climbs[climbs.length - 1];
    const first = c.stages[0];
    const last = c.stages[c.stages.length - 1];
    const toWall = headingOf(-first.wall.nx, -first.wall.nz);
    this.tasks.push(
      { kind: 'walk', x: c.street[0], z: c.street[1] },
      { kind: 'walk', x: first.foot[0], z: first.foot[1] },
      { kind: 'turn', yaw: toWall },
    );
    // up, stage by stage
    c.stages.forEach((st, i) => {
      if (i > 0) this.tasks.push({ kind: 'step', x: st.foot[0], z: st.foot[1] });
      this.tasks.push({ kind: 'wall', wall: st.wall });
      if (i === 0 && grab) {
        // a window a few storeys up, at about chest height
        const y = rand(10, Math.min(60, st.y1 - 0.9 * h));
        if (y > 5) this.tasks.push({ kind: 'climb', y }, { kind: 'grab', msecs: 0 });
      }
      this.tasks.push({ kind: 'climb', y: st.y1 });
    });
    this.tasks.push(
      { kind: 'step', x: c.roof[0], z: c.roof[1] },
      { kind: 'turn', yaw: toWall + Math.PI },
    );
    if (tall && this.kit) {
      // a good long while up there, roaring and looking about
      let stay = rand(...this.kit.cfg.roofMsecs);
      while (stay > 0) {
        const look = rand(1500, 4000);
        this.tasks.push(
          { kind: 'wait', msecs: 4500, roar: true },
          { kind: 'turn', yaw: toWall + Math.PI + rand(-1.2, 1.2) },
          { kind: 'wait', msecs: look, roar: false },
        );
        stay -= 4500 + look + 1000;
      }
    } else {
      this.tasks.push({ kind: 'wait', msecs: rand(...ROOF_MSECS), roar: true });
    }
    this.tasks.push(
      { kind: 'turn', yaw: toWall },
      { kind: 'step', x: last.foot[0], z: last.foot[1] },
    );
    // and down again
    for (let i = c.stages.length - 1; i >= 0; i--) {
      const st = c.stages[i];
      this.tasks.push({ kind: 'wall', wall: st.wall }, { kind: 'climb', y: st.y0 });
      if (i > 0) this.tasks.push({ kind: 'step', x: c.stages[i - 1].foot[0], z: c.stages[i - 1].foot[1] });
    }
    this.tasks.push(
      { kind: 'wall', wall: null },
      { kind: 'walk', x: c.street[0], z: c.street[1] },
      { kind: 'walk', x, z },
    );
    this.lastDir = null;
    return true;
  }
}

/** One wall of a climb: stand at `foot` (out from the face) at y0, climb
 *  to y1. */
interface Stage { foot: [number, number]; wall: Wall; y0: number; y1: number }
interface Climb { street: [number, number]; stages: Stage[]; roof: [number, number]; top: number }

/** A box's face towards a street on its -side (s = 1: the street is at
 *  lower x or z) along axis 0 (x) or 2 (z). */
const faceOf = (b: Box, axis: 0 | 2, s: number): number =>
  axis === 0 ? (s > 0 ? b.x0 : b.x1) : (s > 0 ? b.z0 : b.z1);
/** A box's extent along that face. */
const lateralOf = (b: Box, axis: 0 | 2): [number, number] => axis === 0 ? [b.z0, b.z1] : [b.x0, b.x1];

// ---------------------------------------------------------------- the troop

/** A circle on the ground: the patrol area. */
export interface Area { x: number; z: number; r: number }

// Kongs come at crossings in the patrol area at least this far from the
// plane, and apart from each other.
const SPAWN_NEAR = 700;
const SPAWN_APART = 600;
// Rooftop kongs go up on the tall skyscrapers, near the top where they're
// easy to see: on flat spots within the top TOWER_TOP of the tower's
// highest place to stand, on towers whose top is at least TOWER_MIN (the
// tallest reach about 2000; a quarter of blocks have one over about 1400).
// With no such spot free, a kong waits to come.
const TOWER_MIN = 1200;
const TOWER_TOP = 0.1;
const PERCH_APART = 0.65; // kongs sharing a tower top stand this many heights apart

/** A mission's say over its kongs (<kongs> in <startconditions>); anything
 *  left out comes from kong.properties. */
export interface TroopOptions {
  /** How many at once. */
  count?: number;
  /** Milliseconds after one falls before another comes; null: never (the
   *  first `count` are all there are). */
  respawnMsecs?: number | null;
  healthMin?: number;
  healthMax?: number;
  /** Their height (kong.properties' height otherwise). */
  height?: number;
  /** All of them up on the skyscrapers, staying there. */
  rooftops?: boolean;
}

// A kong this far from the middle of the area (in radii) has been left
// behind (the area moves with the plane in Monkey Mayhem): it goes, and
// another comes at once.
const LEFT_BEHIND = 1.6;

/** Keeps a few kongs roaming the patrol area. */
export class KongTroop {
  private kongs: Kong[] = [];
  private respawn = 0;
  private started = false;
  /** No more come once these are down. */
  readonly respawns: boolean;
  readonly rooftops: boolean;
  /** towerSpots(), by block. */
  private spots = new Map<string, [number, number, number][]>();
  public count: number;

  private constructor(
    private proto: THREE.Mesh,
    private roar: AudioBuffer | null,
    private cfg: KongConfig,
    opts: TroopOptions,
    readonly area: Area,
    /** Blondes for them to carry off (null in the rooftop modes). */
    readonly blondes: BlondeKit | null,
  ) {
    this.count = opts.count ?? cfg.count;
    this.respawns = opts.respawnMsecs !== null;
    this.rooftops = !!opts.rooftops;
    if (opts.height) cfg.height = opts.height;
    if (opts.respawnMsecs != null) cfg.respawnMsecs = opts.respawnMsecs;
    if (opts.healthMin != null) cfg.healthMin = opts.healthMin;
    if (opts.healthMax != null) cfg.healthMax = Math.max(cfg.healthMin, opts.healthMax);
  }

  /** They keep to `area`. */
  static async create(opts: TroopOptions, area: Area): Promise<KongTroop> {
    const cfg = loadConfig();
    const [proto, roar, blondes] = await Promise.all([
      loadModel(cfg.model, cfg.skin),
      loadSound('data/sound/sfx/kong_roar.wav'),
      opts.rooftops ? null : BlondeKit.create(),
    ]);
    return new KongTroop(proto, roar, cfg, opts, area, blondes);
  }

  private make(): Kong {
    const geom = this.proto.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();
    const box = geom.boundingBox!;
    const material = (this.proto.material as THREE.MeshLambertMaterial).clone();
    const rig = new KongRig(geom, material);
    const mesh = rig.mesh;
    const scale = this.cfg.height / (box.max.y - box.min.y);
    rig.wallZ = CLIMB_OFF * (box.max.y - box.min.y);
    mesh.scale.setScalar(scale);
    mesh.rotation.y = Math.PI; // the model faces +Z; forward is -Z
    mesh.position.y = -box.min.y * scale; // feet on the ground
    const pose = new THREE.Group();
    pose.add(mesh);
    return new Kong(pose, new KongAnimator(rig), scale, material, this.cfg, this.roar);
  }

  /** A crossing in the patrol area, not too near the plane and away from
   *  other kongs. */
  private spawnPoint(player: THREE.Object3D): [number, number] {
    const { x: ax, z: az, r } = this.area;
    let best: [number, number] = [ax, az];
    let bestScore = -1;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * r * 0.8;
      const x = Math.round((ax + Math.sin(a) * d) / BLOCKSIZE) * BLOCKSIZE;
      const z = Math.round((az + Math.cos(a) * d) / BLOCKSIZE) * BLOCKSIZE;
      let apart = Infinity;
      for (const k of this.kongs) apart = Math.min(apart, Math.hypot(k.object.position.x - x, k.object.position.z - z));
      const score = Math.min(apart / SPAWN_APART, Math.hypot(player.position.x - x, player.position.z - z) / SPAWN_NEAR);
      if (score > bestScore) {
        best = [x, z];
        bestScore = score;
      }
      if (score >= 1) break;
    }
    return best;
  }

  /** Flat spots on the skyscraper tops of block (i, j) (cached; undefined
   *  until the block's patch has been generated). */
  private towerSpots(world: World, i: number, j: number): [number, number, number][] | undefined {
    const key = `${i},${j}`;
    const cached = this.spots.get(key);
    if (cached) return cached;
    const boxes = world.grid.blockBoxes(i, j);
    if (!boxes.length) return undefined;
    const e = 0.15 * this.cfg.height;
    const roofAt = (x: number, z: number): number | null => {
      const hit = world.grid.sweep(new THREE.Vector3(x, 5000, z), new THREE.Vector3(x, -10, z), 0);
      return hit && hit.normal.y > 0.9 ? hit.point.y : null;
    };
    const spots: [number, number, number][] = [];
    for (const b of boxes) {
      if (b.y1 < TOWER_MIN * (1 - TOWER_TOP)) continue;
      // the middle of its top and halfway out to the corners
      for (const [fx, fz] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const x = b.x0 + (b.x1 - b.x0) * fx;
        const z = b.z0 + (b.z1 - b.z0) * fz;
        const y = roofAt(x, z);
        if (y === null || Math.abs(y - b.y1) > 0.5) continue; // something on top of it
        if (![[e, 0], [-e, 0], [0, e], [0, -e]].every(([ox, oz]) => roofAt(x + ox, z + oz) === y)) continue;
        if (spots.some(([sx, , sz]) => Math.hypot(sx - x, sz - z) < PERCH_APART * this.cfg.height)) continue;
        spots.push([x, y, z]);
      }
    }
    // only near the top: the highest spot's level and a little below it
    const top = Math.max(0, ...spots.map((p) => p[1]));
    const high = top >= TOWER_MIN ? spots.filter((p) => p[1] >= top * (1 - TOWER_TOP)) : [];
    this.spots.set(key, high);
    return high;
  }

  /** A free spot on a skyscraper top in the patrol area, not too near the
   *  plane: (x, roof height, z), or null. */
  private towerPoint(world: World, player: THREE.Object3D): [number, number, number] | null {
    const { x: ax, z: az, r } = this.area;
    const reach = r;
    const ci = Math.floor(ax / BLOCKSIZE);
    const cj = Math.floor(az / BLOCKSIZE);
    const n = Math.ceil(reach / BLOCKSIZE);
    const free: [number, number, number][] = [];
    for (let i = ci - n; i <= ci + n; i++) {
      for (let j = cj - n; j <= cj + n; j++) {
        if (Math.hypot((i + 0.5) * BLOCKSIZE - ax, (j + 0.5) * BLOCKSIZE - az) > reach) continue;
        for (const p of this.towerSpots(world, i, j) ?? []) {
          if (Math.hypot(player.position.x - p[0], player.position.z - p[2]) < SPAWN_NEAR) continue;
          if (this.kongs.some((k) => Math.hypot(k.object.position.x - p[0], k.object.position.z - p[2]) < PERCH_APART * this.cfg.height)) continue;
          free.push(p);
        }
      }
    }
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  private spawn(world: World, player: THREE.Object3D): void {
    const roof = this.rooftops ? this.towerPoint(world, player) : null;
    if (this.rooftops && !roof) return; // none free: try again later
    const kong = this.make();
    kong.ear = player;
    kong.home = this.area;
    kong.kit = this.blondes;
    if (roof) {
      kong.placeAt(roof[0], roof[2], Math.random() * Math.PI * 2, roof[1]);
      kong.perched = true;
    } else {
      kong.placeAt(...this.spawnPoint(player));
    }
    this.kongs.push(kong);
    world.addEntity(kong);
  }

  update(world: World, msecs: number, player: THREE.Object3D): void {
    if (!this.started) {
      this.started = true;
      for (let i = 0; i < this.count; i++) this.spawn(world, player);
    }
    // left far behind: gone, and replaced straight away
    const { x: ax, z: az, r } = this.area;
    let replace = 0;
    for (const k of this.kongs) {
      const p = k.object.position;
      if (!k.isDying() && Math.hypot(p.x - ax, p.z - az) > r * LEFT_BEHIND) {
        k.remove();
        replace++;
      }
    }
    this.kongs = this.kongs.filter((k) => !k.isDead());
    for (let i = 0; i < replace; i++) this.spawn(world, player);
    const alive = this.living().length;
    if (!this.respawns) return;
    if (alive >= this.count) {
      this.respawn = this.cfg.respawnMsecs;
    } else {
      this.respawn -= msecs;
      if (this.respawn <= 0) {
        this.spawn(world, player);
        this.respawn = this.cfg.respawnMsecs;
      }
    }
  }

  /** How tall they are. */
  get height(): number { return this.cfg.height; }

  /** Kongs still to shoot down: all of them, before they've arrived. */
  remaining(): number { return this.started ? this.living().length : this.count; }

  /** Kongs that are still up (for the HUD and tests). */
  living(): Kong[] { return this.kongs.filter((k) => !k.isDying()); }

  all(): readonly Kong[] { return this.kongs; }
}
