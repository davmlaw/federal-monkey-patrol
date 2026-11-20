// Kongs: giant apes (King Kong size) that walk the streets, now and then
// climb a building to roar from its roof, and can be shot down. The model
// has no animation, so they waddle, sway and topple as a whole.
// Tuned in data/etc/kong.properties.

import * as THREE from 'three';
import { loadModel, loadSound, playBang, playSound } from '../core/assets.ts';
import { settings } from '../core/settings.ts';
import { gamestats, Stat } from './stats.ts';
import { BLOCKSIZE, type Hit } from './city.ts';
import { Entity, type World } from './world.ts';

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
  | { kind: 'wall'; wall: Wall | null }; // gets on / off a wall

/** A wall face: outward normal (nx, nz) and the face at nx*x + nz*z = d. */
interface Wall { nx: number; nz: number; d: number }

const TURN_RATE = 2.2; // radians per second
const TURN_IN_PLACE = 0.7; // turns on the spot when facing further off than this
const FLASH_MSECS = 150; // glows when hit
const ROOF_MSECS: [number, number] = [5000, 10000];
const GRAVITY = 400; // units/s^2, for falling off buildings
const TOPPLE_MSECS = 1400; // falling over in the street
const CORPSE_MSECS = 12000; // lies there this long...
const SINK_MSECS = 3000; // ...then sinks into the street
const HEARING = 3500; // roars fade out at this distance from the plane

export class Kong extends Entity {
  private yaw = 0;
  private tasks: Task[] = [];
  private lastDir: [number, number] | null = null;
  private wall: Wall | null = null;
  private health: number;
  private flash = 0;
  private phase = 0; // waddle / sway
  private roared = false;
  // falling (after being shot down)
  private dying = false;
  private fallT = 0;
  private fallTime = 0;
  private fallFrom = new THREE.Vector3();
  private fallTo = new THREE.Vector3();
  private fallSign = 1; // +1 onto its back, -1 on its face
  private landed = false;
  private corpse = 0;
  /** Where the roars are heard from (the plane). */
  ear: THREE.Object3D | null = null;

  constructor(
    private pose: THREE.Group, // waddles and topples, pivoting at the feet
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

  /** Stand at (x, z), heading `yaw`, with nothing to do. */
  placeAt(x: number, z: number, yaw = Math.floor(Math.random() * 4) * Math.PI / 2): void {
    this.object.position.set(x, 0, z);
    this.yaw = yaw;
    this.object.rotation.set(0, yaw, 0);
    this.tasks = [];
    this.wall = null;
    this.lastDir = null;
  }

  isDying(): boolean { return this.dying; }

  isOnWall(): boolean { return this.wall !== null || this.object.position.y > 0.5; }

  // ------------------------------------------------------------- shooting

  /** The hit capsule, in world space: an axis from hips to head, and a
   *  radius that takes in most of the arms. */
  private capsule(): { a: THREE.Vector3; b: THREE.Vector3; r: number } {
    const h = this.cfg.height;
    this.object.updateMatrixWorld();
    return {
      a: this.pose.localToWorld(new THREE.Vector3(0, 0.2 * h, 0)),
      b: this.pose.localToWorld(new THREE.Vector3(0, 0.75 * h, 0)),
      r: 0.2 * h,
    };
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

  /** Shot down: lets go and falls (off the building, if it's on one) and
   *  topples over; in the street, away from the shot (going at `shot`). */
  private die(world: World, shot: THREE.Vector3): void {
    this.dying = true;
    this.tasks = [];
    gamestats.inc(Stat.MONKEY_DEATHS);
    this.bellow();
    const pos = this.object.position;
    const h = this.cfg.height;
    const back = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); // behind it
    this.fallFrom.copy(pos);
    this.fallTo.copy(pos);
    this.fallSign = 1;
    if (pos.y > 0.5) {
      // away from the wall (or backwards), far enough to clear it
      let out = back;
      let clear = 0.35 * h;
      if (this.wall) {
        const w = this.wall;
        out = new THREE.Vector3(w.nx, 0, w.nz);
        clear -= pos.x * w.nx + pos.z * w.nz - w.d; // (it may be inside, on the roof)
      }
      this.fallTo.addScaledVector(out, Math.max(0, clear));
      if (out.dot(back) < 0) this.fallSign = -1; // facing out: falls forward
      // land on whatever is below: the street or a lower roof
      const top = this.fallTo.clone().setY(pos.y - 0.5);
      const hit = world.grid.sweep(top, this.fallTo.clone().setY(-10), 0);
      this.fallTo.y = hit && hit.t > 0 ? hit.point.y : 0;
      this.fallTime = Math.max(0.8, Math.sqrt(2 * Math.max(0, pos.y - this.fallTo.y) / GRAVITY)) * 1000;
    } else {
      this.fallTime = TOPPLE_MSECS;
      if (shot.x * back.x + shot.z * back.z < 0) this.fallSign = -1; // shot from behind
    }
    this.pose.rotation.set(0, 0, 0);
    this.pose.position.set(0, 0, 0);
  }

  private updateFall(world: World, msecs: number): void {
    const pos = this.object.position;
    if (!this.landed) {
      this.fallT = Math.min(this.fallTime, this.fallT + msecs);
      const k = this.fallT / this.fallTime;
      const fromAir = this.fallFrom.y - this.fallTo.y > 1;
      pos.x = THREE.MathUtils.lerp(this.fallFrom.x, this.fallTo.x, Math.min(1, k * 1.5));
      pos.z = THREE.MathUtils.lerp(this.fallFrom.z, this.fallTo.z, Math.min(1, k * 1.5));
      pos.y = THREE.MathUtils.lerp(this.fallFrom.y, this.fallTo.y, k * k); // (falling under gravity)
      this.pose.rotation.x = this.fallSign * (Math.PI / 2) * (fromAir ? k : k * k);
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
    let moving: 'walk' | 'climb' | 'roar' | null = null;
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
          moving = 'walk';
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
        const step = this.cfg.climbSpeed * dt;
        pos.y = Math.abs(dy) <= step ? task.y : pos.y + Math.sign(dy) * step;
        done = pos.y === task.y;
        moving = 'climb';
        break;
      }
      case 'wait':
        if (task.roar && !this.roared) {
          this.roared = true;
          this.bellow();
        }
        task.msecs -= msecs;
        done = task.msecs <= 0;
        if (task.roar) moving = 'roar';
        break;
      case 'wall':
        this.wall = task.wall;
        done = true;
        break;
    }
    if (done) {
      this.tasks.shift();
      this.roared = false;
    }
    this.object.rotation.set(0, this.yaw, 0);
    this.animate(moving, dt);
  }

  private turn(diff: number, dt: number): void {
    const step = TURN_RATE * dt;
    this.yaw += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
  }

  /** No animation in the model, so the whole of it waddles as it walks,
   *  sways as it climbs and bounces as it beats its chest. */
  private animate(moving: 'walk' | 'climb' | 'roar' | null, dt: number): void {
    const h = this.cfg.height;
    const p = this.pose;
    if (moving === 'walk') {
      this.phase += dt * Math.PI * this.cfg.walkSpeed / (0.3 * h);
      p.rotation.z = Math.sin(this.phase) * 0.08;
      p.position.y = Math.abs(Math.sin(this.phase)) * 0.03 * h;
    } else if (moving === 'climb') {
      this.phase += dt * Math.PI * this.cfg.climbSpeed / (0.25 * h);
      p.rotation.z = Math.sin(this.phase) * 0.06;
      p.position.y = 0;
    } else if (moving === 'roar') {
      this.phase += dt * 14;
      p.rotation.z = Math.sin(this.phase) * 0.04;
      p.position.y = Math.abs(Math.sin(this.phase)) * 0.015 * h;
    } else {
      p.rotation.z *= 1 - Math.min(1, dt * 8);
      p.position.y *= 1 - Math.min(1, dt * 8);
    }
  }

  /** At a crossing with nothing to do: maybe climb a building on one of
   *  its corners, otherwise walk on along one of the streets. */
  private plan(world: World): void {
    const pos = this.object.position;
    const x = Math.round(pos.x / BLOCKSIZE) * BLOCKSIZE;
    const z = Math.round(pos.z / BLOCKSIZE) * BLOCKSIZE;
    if (Math.hypot(x - pos.x, z - pos.z) > 1) {
      this.tasks.push({ kind: 'walk', x, z }); // (to the crossing first)
      return;
    }
    if (Math.random() < this.cfg.climbChance && this.planClimb(world, x, z)) return;
    const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const options = dirs.filter(([dx, dz]) => !this.lastDir || dx !== -this.lastDir[0] || dz !== -this.lastDir[1] || Math.random() < 0.05);
    const [dx, dz] = options[Math.floor(Math.random() * options.length)];
    const blocks = Math.random() < 0.3 ? 2 : 1;
    this.lastDir = [dx, dz];
    this.tasks.push({ kind: 'walk', x: x + dx * blocks * BLOCKSIZE, z: z + dz * blocks * BLOCKSIZE });
  }

  /** Find a building on a corner of the crossing (x, z) with a face on the
   *  street that is clear all the way up and not too tall, and plan the
   *  climb: along the street to it, up, onto the roof to roar for a while,
   *  then back down to the crossing. */
  private planClimb(world: World, x: number, z: number): boolean {
    const h = this.cfg.height;
    const half = BLOCKSIZE / 2;
    interface Climb { street: [number, number]; foot: [number, number]; roof: [number, number]; top: number; wall: Wall }
    const climbs: Climb[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const bi = Math.floor((x + sx * half) / BLOCKSIZE);
        const bj = Math.floor((z + sz * half) / BLOCKSIZE);
        for (const b of world.grid.blockBoxes(bi, bj)) {
          if (b.y0 > 1 || b.y1 < 1.5 * h || b.y1 > this.cfg.climbMax) continue;
          // the face towards the street along x = x (axis 0), or z = z (axis 2)
          for (const axis of [0, 2]) {
            const s = axis === 0 ? sx : sz;
            const face = axis === 0 ? (s > 0 ? b.x0 : b.x1) : (s > 0 ? b.z0 : b.z1);
            const street = axis === 0 ? x : z;
            if (s * (face - street) > 95) continue; // set back from the street
            const lo = axis === 0 ? b.z0 : b.x0;
            const hi = axis === 0 ? b.z1 : b.x1;
            if (hi - lo < 0.6 * h) continue;
            const lateral = (lo + hi) / 2;
            const nx = axis === 0 ? -s : 0;
            const nz = axis === 0 ? 0 : -s;
            const at = (out: number, y: number): THREE.Vector3 => axis === 0
              ? new THREE.Vector3(face - s * out, y, lateral)
              : new THREE.Vector3(lateral, y, face - s * out);
            // clear all the way up the face?
            if (world.grid.sweep(at(3, 2), at(3, b.y1 - 1), 0)) continue;
            // somewhere to stand on the roof
            const depth = [0.25 * h, 0.12 * h, 0].find((d) => !world.grid.sweep(at(-d, b.y1 + 1), at(-d, b.y1 + 0.8 * h), 0));
            if (depth === undefined) continue;
            const foot = at(0.22 * h, 0);
            const roof = at(-depth, 0);
            climbs.push({
              street: axis === 0 ? [street, lateral] : [lateral, street],
              foot: [foot.x, foot.z],
              roof: [roof.x, roof.z],
              top: b.y1,
              wall: { nx, nz, d: nx * foot.x + nz * foot.z - 0.22 * h },
            });
          }
        }
      }
    }
    if (!climbs.length) return false;
    // taller buildings are likelier
    let pick = Math.random() * climbs.reduce((sum, c) => sum + c.top, 0);
    const c = climbs.find((cl) => (pick -= cl.top) <= 0) ?? climbs[climbs.length - 1];
    const toWall = headingOf(-c.wall.nx, -c.wall.nz);
    this.tasks.push(
      { kind: 'walk', x: c.street[0], z: c.street[1] },
      { kind: 'walk', x: c.foot[0], z: c.foot[1] },
      { kind: 'turn', yaw: toWall },
      { kind: 'wall', wall: c.wall },
      { kind: 'climb', y: c.top },
      { kind: 'step', x: c.roof[0], z: c.roof[1] },
      { kind: 'turn', yaw: toWall + Math.PI },
      { kind: 'wait', msecs: rand(...ROOF_MSECS), roar: true },
      { kind: 'turn', yaw: toWall },
      { kind: 'step', x: c.foot[0], z: c.foot[1] },
      { kind: 'climb', y: 0 },
      { kind: 'wall', wall: null },
      { kind: 'walk', x: c.street[0], z: c.street[1] },
      { kind: 'walk', x, z },
    );
    this.lastDir = null;
    return true;
  }
}

// ---------------------------------------------------------------- the troop

// Kongs come (and go back to) this far from the plane.
const SPAWN_NEAR = 700;
const SPAWN_FAR = 2600;
const SPAWN_SPREAD = 1.0; // radians either side of the plane's heading
const SPAWN_APART = 350; // from other kongs
const RELOCATE_DISTANCE = 8000; // left this far behind: brought back

/** Keeps a few kongs roaming the city round the plane. */
export class KongTroop {
  private kongs: Kong[] = [];
  private respawn = 0;
  private started = false;

  private constructor(
    private proto: THREE.Mesh,
    private roar: AudioBuffer | null,
    private cfg: KongConfig,
    public count: number,
  ) {}

  /** `count`: how many at once (null: kong.properties' count). */
  static async create(count: number | null): Promise<KongTroop> {
    const cfg = loadConfig();
    const [proto, roar] = await Promise.all([
      loadModel(cfg.model, cfg.skin),
      loadSound('data/sound/sfx/kong_roar.wav'),
    ]);
    return new KongTroop(proto, roar, cfg, count ?? cfg.count);
  }

  private make(): Kong {
    const geom = this.proto.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();
    const box = geom.boundingBox!;
    const material = (this.proto.material as THREE.MeshLambertMaterial).clone();
    const mesh = new THREE.Mesh(geom, material);
    const scale = this.cfg.height / (box.max.y - box.min.y);
    mesh.scale.setScalar(scale);
    mesh.rotation.y = Math.PI; // the model faces +Z; forward is -Z
    mesh.position.y = -box.min.y * scale; // feet on the ground
    const pose = new THREE.Group();
    pose.add(mesh);
    return new Kong(pose, material, this.cfg, this.roar);
  }

  /** A crossing at a random spot ahead of the plane, away from other kongs. */
  private spawnPoint(player: THREE.Object3D): [number, number] {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    const heading = Math.atan2(fwd.x, -fwd.z);
    let best: [number, number] = [0, 0];
    let bestApart = -1;
    for (let i = 0; i < 12; i++) {
      const a = heading + rand(-SPAWN_SPREAD, SPAWN_SPREAD);
      const d = rand(SPAWN_NEAR, SPAWN_FAR);
      const x = Math.round((player.position.x + Math.sin(a) * d) / BLOCKSIZE) * BLOCKSIZE;
      const z = Math.round((player.position.z - Math.cos(a) * d) / BLOCKSIZE) * BLOCKSIZE;
      let apart = Infinity;
      for (const k of this.kongs) apart = Math.min(apart, Math.hypot(k.object.position.x - x, k.object.position.z - z));
      if (apart > bestApart) {
        best = [x, z];
        bestApart = apart;
      }
      if (apart >= SPAWN_APART) break;
    }
    return best;
  }

  private spawn(world: World, player: THREE.Object3D): void {
    const kong = this.make();
    kong.ear = player;
    kong.placeAt(...this.spawnPoint(player));
    this.kongs.push(kong);
    world.addEntity(kong);
  }

  update(world: World, msecs: number, player: THREE.Object3D): void {
    if (!this.started) {
      this.started = true;
      for (let i = 0; i < this.count; i++) this.spawn(world, player);
    }
    this.kongs = this.kongs.filter((k) => !k.isDead());
    let alive = 0;
    for (const k of this.kongs) {
      if (k.isDying()) continue;
      alive++;
      const p = k.object.position;
      if (!k.isOnWall() && Math.hypot(p.x - player.position.x, p.z - player.position.z) > RELOCATE_DISTANCE) {
        k.placeAt(...this.spawnPoint(player));
      }
    }
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

  /** Kongs that are still up (for the HUD and tests). */
  living(): Kong[] { return this.kongs.filter((k) => !k.isDying()); }

  all(): readonly Kong[] { return this.kongs; }
}
