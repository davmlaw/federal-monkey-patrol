// The 3D world: World, Entity, Plane, Projectile, the two flying-mode
// controllers (FollowPlaneFilter, TopDownPlaneFilter), Player, and the
// CameraMan with its chase camera.

import * as THREE from 'three';
import { loadModel, loadTextureVariant, clampTexture, playBang, playGunshot, playRicochet, playThud } from '../core/assets.ts';
import { loadProperties } from '../core/settings.ts';
import { Button, InputFilter, type Axis, type Input } from '../core/input.ts';
import type { Display } from '../core/display.ts';
import { gamestats, Stat } from './stats.ts';
import type { CityGrid, Hit } from './city.ts';
import { Effects } from './effects.ts';

const deg2rad = Math.PI / 180;

// Top-down camera: straight down from this far above the plane, its
// heading up (2006: 160). Close, so the plane shows big; the plane flies
// high (see TOPDOWN_CLEARANCE in mission.ts) so the city still does.
const TOPDOWN_CAMERA = 170;

// Flight handling. The stick sets a turn rate that the plane reaches in a
// few hundredths of a second; yaw is about the world's up so the horizon stays level, and the
// plane banks into turns (visually only).
const YAW_RATE = 110; // degrees per second at full stick
const PITCH_RATE = 90;
const MAX_PITCH = 80; // degrees: no loops, so the camera never flips
const STICK_RESPONSE = 14; // 1/s: how fast the turn rate follows the stick
const BANK_PER_YAW = 0.35; // degrees of bank per degree/s of yaw rate
const BANK_RESPONSE = 6;

/** 1 - e^(-rate * t): frame-rate independent exponential smoothing factor. */
const damp = (rate: number, msecs: number): number => 1 - Math.exp(-rate * msecs / 1000);

/** Heading and climb angle (radians) of a quaternion's -Z axis. */
function yawPitch(q: THREE.Quaternion): { yaw: number; pitch: number } {
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  return { yaw: Math.atan2(-fwd.x, -fwd.z), pitch: Math.asin(Math.max(-1, Math.min(1, fwd.y))) };
}

// ================================================================== entities

/** Steers an entity each frame (the flying-mode filters). */
export interface Controller {
  speed: number;
  control(ent: Entity, msecs: number): void;
}

export class Entity {
  velocity = new THREE.Vector3();
  /** 0: not firing, 1: FIRE1, 2: FIRE2. */
  firing = 0;
  dead = false;
  controller: Controller | null = null;
  /** A group inside `object` that rolls the model into turns (visual only). */
  bank: THREE.Object3D | null = null;
  /** Collides with the city as a sphere of this radius (null: doesn't). */
  radius: number | null = null;
  /** Where it was before this frame's update (set by World.update). */
  readonly lastPosition = new THREE.Vector3();
  /** Can be shot (and flown into): see intersect() and struck(). */
  shootable = false;

  /** `object`: position, rotation (quaternion) and scale. */
  constructor(public object: THREE.Object3D) {}

  setController(c: Controller | null): void { this.controller = c; }

  setFiring(f: number): void { this.firing = f; }

  isDead(): boolean { return this.dead; }

  update(world: World, msecs: number): void {
    this.controller?.control(this, msecs);
    // physics: move along velocity in the entity's own frame
    const move = this.velocity.clone().applyQuaternion(this.object.quaternion).multiplyScalar(msecs * 0.001);
    this.object.position.add(move);
    this._update(world, msecs);
  }

  /** Degrees, about the entity's own axes. */
  rotate(x: number, y: number, z: number): void {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x * deg2rad, y * deg2rad, z * deg2rad, 'XYZ'));
    this.object.quaternion.multiply(q);
  }

  protected _update(_world: World, _msecs: number): void {}

  /** Ran into the city, or into `target` (a shootable entity), at
   *  `velocity` (world units/s); see World.update. */
  hit(_world: World, _hit: Hit, _velocity: THREE.Vector3, _target: Entity | null = null): void {}

  /** Shootable entities: where a sphere of `radius` going from p0 to p1
   *  first touches this one, or null if it misses. */
  intersect(_p0: THREE.Vector3, _p1: THREE.Vector3, _radius: number): Hit | null { return null; }

  /** Shootable entities: distance from `point` to the surface (negative
   *  inside), for blasts. */
  distanceTo(_point: THREE.Vector3): number { return Infinity; }

  /** Shootable entities: hit for `damage` at `hit`, by something going at
   *  `velocity`. */
  struck(_world: World, _hit: Hit, _velocity: THREE.Vector3, _damage: number): void {}

  /** Shootable entities still standing: the point top-down bullets curve
   *  down to, and how close (across the ground) they must pass to hit. */
  aim(): { point: THREE.Vector3; radius: number } | null { return null; }
}

// data/etc/projectiles/<type>.properties -> projectile type
interface ProjectileType {
  make: (() => THREE.Object3D) | null;
  lifetime: number;
  gravity: number;
  airResistance: number;
}

const projectileTypes = new Map<string, Promise<ProjectileType>>();

async function loadProjectileType(type: string): Promise<ProjectileType> {
  if (!projectileTypes.has(type)) {
    projectileTypes.set(type, (async () => {
      console.log(`trying to load '${type}' from disk`);
      const prop = await loadProperties(`data/etc/projectiles/${type}.properties`);
      const words = (prop.get('drawable') || '').split(' ');
      let make: (() => THREE.Object3D) | null = null;
      if (words.length >= 3 && words[0] === 'MDL') {
        const proto = await loadModel(words[1], words[2]);
        make = () => proto.clone();
      } else if (words.length >= 2 && words[0] === 'BB') {
        const map = await loadTextureVariant(`data/images/billboards/${words[1]}`, clampTexture);
        const mat = new THREE.SpriteMaterial({ map, depthWrite: false });
        make = () => { const s = new THREE.Sprite(mat); s.scale.set(10, 10, 1); return s; };
      }
      return {
        make,
        lifetime: parseFloat(prop.get('lifetime') ?? '') || 0,
        gravity: parseFloat(prop.get('gravity') ?? '') || 0,
        airResistance: parseFloat(prop.get('air_resistance') ?? '') || 0,
      };
    })());
  }
  return projectileTypes.get(type)!;
}

// Damage to shootable things (a kong takes kong.properties' health_min to
// health_max of it).
const BULLET_DAMAGE = 1;
const BOMB_DAMAGE = 4; // to everything within the blast
const BOMB_BLAST_RADIUS = 25;

// Top-down bullets: how much the curve steepens towards the end (0..1;
// lower stays flatter for longer, 1 is a straight line to the target).
const FLAT_CURVE = 0.5;

export class Projectile extends Entity {
  lifetime: number;
  /** Bombs explode where they land; bullets throw up sparks. */
  bomb = false;
  /**
   * A top-down bullet: the game is 2D from up there, so it flies level
   * through (over) the city with `velocity` in world space, hits whatever
   * shootable thing its path crosses on the map, at any height, and curves
   * down onto the first one ahead of it so it looks that way too.
   */
  flat = false;
  /** A flat bullet goes this far over the map (world units) and is gone. */
  range = Infinity;

  constructor(ptype: ProjectileType) {
    // (a type with no drawable throws here, as it always has)
    const mesh = ptype.make!();
    const holder = new THREE.Group();
    holder.add(mesh);
    super(holder);
    this.lifetime = ptype.lifetime;
    this.radius = 0;
  }

  override hit(world: World, hit: Hit, velocity: THREE.Vector3, target: Entity | null = null): void {
    this.dead = true;
    const volume = world.loudness(hit.point);
    if (this.bomb) {
      const at = hit.point.clone().addScaledVector(hit.normal, 2);
      world.effects.explosion(at, 0.5);
      world.blast(at, BOMB_BLAST_RADIUS, BOMB_DAMAGE, velocity);
      if (volume > 0.01) playBang(1.2, 900, 0.7 * volume);
    } else if (target) {
      target.struck(world, hit, velocity, BULLET_DAMAGE);
      playThud(0.45 * volume);
    } else {
      world.effects.sparks(hit.point, hit.normal, velocity);
      playRicochet(0.3 * volume);
    }
  }

  setLifetime(ms: number): void { this.lifetime = ms; }

  override update(world: World, msecs: number): void {
    if (!this.flat) {
      super.update(world, msecs);
      return;
    }
    const p = this.object.position;
    const v = this.velocity;
    const speed = Math.hypot(v.x, v.z);
    if (speed < 1e-6) return;
    const dx = v.x / speed;
    const dz = v.z / speed;
    const step = speed * msecs / 1000;
    // the first target whose circle the path crosses: this frame's hit, or
    // further on, the one to curve down to
    let best: { point: THREE.Vector3; radius: number; target: Entity } | null = null;
    let bestAlong = Infinity;
    for (const e of world.entities) {
      if (!e.shootable || e.isDead()) continue;
      const a = e.aim();
      if (!a) continue;
      const ndc = a.point.clone().project(world.camera);
      if (ndc.z > 1 || Math.abs(ndc.x) > VIEW_MARGIN || Math.abs(ndc.y) > VIEW_MARGIN) continue;
      const rx = a.point.x - p.x;
      const rz = a.point.z - p.z;
      const side = Math.abs(rx * dz - rz * dx);
      if (side > a.radius) continue;
      // where the path enters the circle
      const along = rx * dx + rz * dz - Math.sqrt(a.radius * a.radius - side * side);
      if (along + 2 * a.radius < 0 || along >= bestAlong) continue;
      best = { ...a, target: e };
      bestAlong = along;
    }
    if (best && bestAlong <= step) {
      const at = Math.max(0, bestAlong);
      const point = new THREE.Vector3(p.x + dx * at, best.point.y, p.z + dz * at);
      const hit: Hit = { t: at / step, point, normal: new THREE.Vector3(-dx, 0, -dz) };
      this.object.position.copy(point);
      this.hit(world, hit, new THREE.Vector3(v.x, (best.point.y - p.y) * 1000 / msecs, v.z), best.target);
      return;
    }
    if (best) {
      // still `bestAlong` to go: drop part of the way, so the error shrinks
      // like distance^FLAT_CURVE and is gone on arrival
      p.y += (best.point.y - p.y) * Math.min(1, FLAT_CURVE * step / bestAlong);
    }
    p.x += dx * step;
    p.z += dz * step;
    this.range -= step;
    if (this.range <= 0) this.dead = true;
    this._update(world, msecs);
  }

  protected override _update(_world: World, msecs: number): void {
    if (this.lifetime) {
      this.lifetime -= msecs;
      if (this.lifetime <= 0) this.dead = true;
    }
  }
}

// Bullets leave the plane this fast (on top of its own speed) and last this
// long: a range of a few blocks. (2006: 150 units/s for a second, which the
// plane outran at any speed, so they never reached the buildings.)
const BULLET_SPEED = 1500;
const BULLET_MSECS = 1000;
// Top-down bullets only hit what's on screen or a little past its edge
// (VIEW_MARGIN: 1 is the edge, in half-screens from the middle), so they
// can't clear kongs before they're seen, and go out of sight after
// FLAT_BULLET_RANGE (the screen's top edge is some 300-500 ahead, by how
// far below the plane the roofs are).
const VIEW_MARGIN = 1.15;
const FLAT_BULLET_RANGE = 650;

// The guns: this far either side of the plane's middle, and ahead of it
// (its wings span about 8).
const GUN_SPREAD = 1.2;
const GUN_AHEAD = 3;

// Propeller spin, radians per second: idling plus some per unit of speed.
const PROP_IDLE = 14;
const PROP_PER_SPEED = 0.12;

/**
 * Split the propeller (and spinner) off a plane model: the parts of the
 * mesh that lie wholly ahead of `noseZ` (model space, nose towards +Z).
 * Returns a Group pivoting about the propeller shaft, holding a mesh of
 * just those parts, and leaves the rest on `mesh`; null if there are none.
 * The geometry is shared with other copies of the model, so this makes new
 * index buffers rather than editing it.
 */
function splitPropeller(mesh: THREE.Mesh, noseZ: number, shaftY: number): THREE.Group | null {
  const g = mesh.geometry;
  const index = g.index;
  const z = g.getAttribute('position');
  if (!index) return null;
  // connected parts (union-find over the triangles)
  const parent = new Int32Array(z.count).map((_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  for (let i = 0; i < index.count; i += 3) {
    const a = find(index.getX(i));
    parent[find(index.getX(i + 1))] = a;
    parent[find(index.getX(i + 2))] = find(a);
  }
  const minZ = new Map<number, number>();
  for (let v = 0; v < z.count; v++) {
    const r = find(v);
    minZ.set(r, Math.min(minZ.get(r) ?? Infinity, z.getZ(v)));
  }
  const body: number[] = [];
  const prop: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    (minZ.get(find(tri[0]))! > noseZ ? prop : body).push(...tri);
  }
  if (!prop.length) return null;
  const share = (idx: number[]): THREE.BufferGeometry => {
    const out = new THREE.BufferGeometry();
    for (const [k, attr] of Object.entries(g.attributes)) out.setAttribute(k, attr);
    out.setIndex(idx);
    out.computeBoundingSphere();
    return out;
  };
  mesh.geometry = share(body);
  const blades = new THREE.Mesh(share(prop), mesh.material);
  blades.position.y = -shaftY;
  const pivot = new THREE.Group();
  pivot.position.y = shaftY;
  pivot.add(blades);
  return pivot;
}

// The plane collides as a sphere this big (its wings span about 8).
const PLANE_RADIUS = 2.5;
const BLINK_MSECS = 120; // flashing while invulnerable

export class Plane extends Entity {
  reloadTime = 0;
  /** The spinning propeller, split off the model (see splitPropeller). */
  propeller: THREE.Object3D | null = null;
  /** Hit something: a wreck until respawned (see Player.respawn). */
  crashed = false;
  /** Milliseconds left without collisions, after a respawn. */
  invulnerable = 0;
  /** Top-down mode: bullets are flat (see Projectile.flat). */
  flatShots = false;
  /** Can't crash (the mission is over). */
  charmed = false;

  constructor(object: THREE.Object3D, private bombType: ProjectileType) {
    super(object);
    this.radius = PLANE_RADIUS;
  }

  override hit(world: World, hit: Hit, velocity: THREE.Vector3): void {
    if (this.crashed || this.invulnerable > 0 || this.charmed) return;
    // (flying into a kong crashes the plane just the same)
    this.crashed = true;
    const f = (v: THREE.Vector3): string => v.toArray().map((n) => n.toFixed(1)).join(', ');
    console.log(`Plane crashed at (${f(hit.point)}), surface normal (${f(hit.normal)})`);
    this.object.position.copy(hit.point).addScaledVector(hit.normal, PLANE_RADIUS);
    this.object.visible = false;
    world.effects.explosion(this.object.position, 1, velocity);
    this.setController(null);
    this.velocity.set(0, 0, 0);
    this.firing = 0;
    gamestats.inc(Stat.PLAYER_DEATHS);
  }

  protected override _update(world: World, msecs: number): void {
    if (this.crashed) return;
    if (this.invulnerable > 0) {
      this.invulnerable = Math.max(0, this.invulnerable - msecs);
      this.object.visible = this.invulnerable <= 0 || Math.floor(this.invulnerable / BLINK_MSECS) % 2 === 0;
    }
    if (this.propeller) {
      const speed = this.controller?.speed ?? 0;
      this.propeller.rotation.z += (PROP_IDLE + speed * PROP_PER_SPEED) * msecs * 0.001;
      this.propeller.rotation.z %= Math.PI * 2;
    }
    this.reloadTime = Math.min(1000, Math.max(0, this.reloadTime - msecs));
    if (!(this.firing && this.reloadTime <= 0)) return;
    const flat = this.firing === 1 && this.flatShots;
    let movement: THREE.Vector3;
    if (this.firing === 1) {
      movement = new THREE.Vector3(0, 0, -BULLET_SPEED); // "bullet"
      gamestats.inc(Stat.BULLETS_FIRED);
    } else {
      movement = new THREE.Vector3(0, -100, 0); // "bomb"
      gamestats.inc(Stat.BOMBS_DROPPED);
    }
    // Every shot uses the bomb model (a hack from 2006), though FIRE1 still
    // sends it forward like a bullet.
    // bullets from guns either side of the nose, bombs from under the wings
    const q = this.object.quaternion;
    const offset = new THREE.Vector3(this.firing === 1 ? GUN_SPREAD : 5, 0, 0).applyQuaternion(q);
    const ahead = new THREE.Vector3(0, 0, this.firing === 1 ? -GUN_AHEAD : 0).applyQuaternion(q);
    for (const sign of [-1, 1]) {
      const bomb = new Projectile(this.bombType);
      bomb.object.scale.setScalar(0.005);
      bomb.object.position.copy(this.object.position).add(ahead).addScaledVector(offset, sign);
      bomb.object.quaternion.copy(this.object.quaternion);
      bomb.velocity.copy(this.velocity).add(movement);
      if (flat) {
        // into world space, level
        bomb.velocity.applyQuaternion(this.object.quaternion).setY(0);
        bomb.flat = true;
        bomb.radius = null; // over the buildings, not into them
        bomb.range = FLAT_BULLET_RANGE;
      }
      bomb.setLifetime(this.firing === 1 ? BULLET_MSECS : 5000);
      bomb.bomb = this.firing === 2;
      world.addEntity(bomb);
    }
    if (this.firing === 1) playGunshot();
    this.reloadTime = 75;
  }
}

/**
 * FollowPlaneFilter ("below the skyscrapers" mode in game.txt): up/down
 * pitches (inverted, like a plane), left/right turns, and the plane flies
 * forward at the throttle speed. In 2006 the speed was always zero.
 */
export class FollowPlaneFilter extends InputFilter implements Controller {
  axis: Axis = { x: 0, y: 0 };
  firing = 0;
  speed = 0;
  /** The plane never goes slower than this (game.properties min_speed). */
  minSpeed = 0;
  yawRate = 0; // degrees per second
  pitchRate = 0;

  /** Forget the stick (after a respawn). */
  reset(): void {
    this.axis = { x: 0, y: 0 };
    this.firing = 0;
    this.yawRate = 0;
    this.pitchRate = 0;
  }

  protected override _read(input: Input): void {
    this.axis = input.getAxis();
    if (input.buttonPressed(Button.FIRE1)) this.firing = 1;
    else if (input.buttonPressed(Button.FIRE2)) this.firing = 2;
    else this.firing = 0;
  }

  /** Set the visual bank of the plane's model (not its flight path). */
  protected bank(ent: Entity, degrees: number, msecs: number): void {
    if (!ent.bank) return;
    const z = ent.bank.rotation.z;
    ent.bank.rotation.z = z + (degrees * deg2rad - z) * damp(BANK_RESPONSE, msecs);
  }

  control(ent: Entity, msecs: number): void {
    const k = damp(STICK_RESPONSE, msecs);
    const stick = (v: number): number => Math.max(-1, Math.min(1, v));
    this.yawRate += (-stick(this.axis.x) * YAW_RATE - this.yawRate) * k;
    this.pitchRate += (-stick(this.axis.y) * PITCH_RATE - this.pitchRate) * k;
    const dt = msecs / 1000;
    let { yaw, pitch } = yawPitch(ent.object.quaternion);
    yaw += this.yawRate * dt * deg2rad;
    pitch = Math.max(-MAX_PITCH * deg2rad, Math.min(MAX_PITCH * deg2rad, pitch + this.pitchRate * dt * deg2rad));
    ent.object.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    this.bank(ent, this.yawRate * BANK_PER_YAW, msecs);
    if (ent.bank) ent.bank.rotation.x *= 1 - damp(BANK_RESPONSE, msecs);
    ent.velocity.set(0, 0, -this.speed);
    ent.setFiring(this.firing);
  }
}

// Top-down mode: how fast the stick moves the plane across the screen.
const STRAFE_SPEED = 400;
const STRAFE_RESPONSE = 10; // 1/s
// 1942 controls: how far the plane leans off the middle of the screen while
// the stick is held (world units at the plane's height, right and ahead;
// the camera is TOPDOWN_CAMERA above it).
const SCREEN_X = 0.28 * TOPDOWN_CAMERA;
const SCREEN_Y = 0.19 * TOPDOWN_CAMERA;
// 1942 controls fly this much slower than the mission's speed (forwards
// and sideways).
const SCROLL_FACTOR = 0.8;
// Steering controls: at full stick the plane turns in a circle this big
// (radius, world units: round a city block), however fast it's going.
const STEER_RADIUS = 250;
const MAX_BANK = 60; // degrees
// Top-down mode keeps the plane up above the rooftops: it climbs
// (never dives) towards `safeHeight`, easing in, nose up while it climbs.
const CLIMB_RATE = 450; // units per second, at most
const CLIMB_EASE = 1.5; // 1/s: climb speed per unit of height still to go
const CLIMB_NOSE_UP = 0.04; // degrees of visual pitch per unit/s of climb
const LEVEL_RATE = 6; // how quickly the plane levels out, per second
const BANK_DEGREES = 25;

/**
 * TopDownPlaneFilter ("above the skyscrapers", like 1942 in game.txt): the
 * plane flies level over the roofs at `speed` (no throttle: up/down on the
 * stick speeds it up to twice as far above the minimum, or slows it to the
 * minimum). With 1942 controls it keeps its heading and left/right moves
 * it sideways, the plane leaning off the middle of the screen the way the
 * stick is held (`screen`); with `steer`, left/right turns it. The 2006
 * filter only accumulated velocity and was never switched on, so this is a
 * new take on it.
 */
export class TopDownPlaneFilter extends FollowPlaneFilter {
  strafe: Axis = { x: 0, y: 0 };
  safeHeight = 0; // set each frame by the mission
  /** Left/right turns the plane, rather than moving it sideways. */
  steer = false;
  /** 1942 controls: where the plane sits on screen (world units right of
   *  and ahead of the camera's centre, at the plane's height). */
  screen: Axis = { x: 0, y: 0 };

  override reset(): void {
    super.reset();
    this.strafe = { x: 0, y: 0 };
    this.screen = { x: 0, y: 0 };
  }

  override control(ent: Entity, msecs: number): void {
    const q = ent.object.quaternion;
    let { yaw, pitch } = yawPitch(q);
    const stick = (v: number): number => Math.max(-1, Math.min(1, v));
    if (this.steer) {
      const rate = Math.max(this.speed, this.minSpeed) / STEER_RADIUS / deg2rad; // degrees per second
      this.yawRate += (-stick(this.axis.x) * rate - this.yawRate) * damp(STICK_RESPONSE, msecs);
      yaw += this.yawRate * msecs / 1000 * deg2rad;
    } else {
      this.yawRate = 0;
    }
    this.pitchRate = 0;
    // level out (the heading turns exactly as steered: smoothing it here
    // would make the turn rate depend on the frame rate)
    pitch *= 1 - damp(LEVEL_RATE, msecs);
    q.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    const k = damp(STRAFE_RESPONSE, msecs);
    this.strafe.x += (stick(this.axis.x) - this.strafe.x) * k;
    this.strafe.y += (stick(this.axis.y) - this.strafe.y) * k;
    const side = this.steer ? 0 : this.strafe.x;
    this.screen = { x: side * SCREEN_X, y: this.steer ? 0 : this.strafe.y * SCREEN_Y };
    const steerBank = Math.max(-MAX_BANK, Math.min(MAX_BANK, this.yawRate * BANK_PER_YAW));
    this.bank(ent, this.steer ? steerBank : -side * BANK_DEGREES, msecs);
    // velocity is in the plane's own frame; use the level frame so any
    // leftover pitch doesn't push it up or down
    const climb = Math.min(CLIMB_RATE, Math.max(0, (this.safeHeight - ent.object.position.y) * CLIMB_EASE));
    if (ent.bank) {
      const x = ent.bank.rotation.x;
      ent.bank.rotation.x = x + (climb * CLIMB_NOSE_UP * deg2rad - x) * damp(BANK_RESPONSE, msecs);
    }
    const slow = this.steer ? 1 : SCROLL_FACTOR;
    const forward = slow * Math.max(this.minSpeed, this.speed + this.strafe.y * Math.max(0, this.speed - this.minSpeed));
    const v = new THREE.Vector3(slow * side * STRAFE_SPEED, 0, -forward);
    v.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    v.y = climb;
    v.applyQuaternion(q.clone().invert());
    ent.velocity.copy(v);
    ent.setFiring(this.firing);
  }
}

/** How a mission flies: chasing the plane, or looking down on it (a game
 *  mode of its own; there's no switching between them). */
export const FlyMode = { FOLLOW: 0, TOPDOWN: 1 } as const;
export type FlyMode = (typeof FlyMode)[keyof typeof FlyMode];

/** Owns the plane and its two controllers. */
export class Player {
  readonly controllers: [FollowPlaneFilter, TopDownPlaneFilter] = [new FollowPlaneFilter(), new TopDownPlaneFilter()];
  mode: FlyMode = FlyMode.FOLLOW;

  private constructor(public entity: Plane) {}

  static async create(model: string, skin: string, startHeight: number): Promise<Player> {
    const mesh = await loadModel(model, skin);
    mesh.rotation.y = Math.PI; // the model's nose points +Z; forward is -Z
    // biplane.obj: the propeller and spinner start 240 units ahead of the
    // origin, on a shaft at y = -8.25
    const propeller = splitPropeller(mesh, 240, -8.25);
    if (propeller) mesh.add(propeller);
    const bank = new THREE.Group(); // rolls the model into turns
    bank.add(mesh);
    const object = new THREE.Group();
    object.add(bank);
    object.position.set(0, startHeight, 0);
    object.scale.setScalar(0.01);
    const bombType = await loadProjectileType('bomb');
    const p = new Player(new Plane(object, bombType));
    p.entity.bank = bank;
    p.entity.propeller = propeller;
    p.setMode(FlyMode.FOLLOW);
    return p;
  }

  setMode(m: FlyMode): void {
    this.mode = m;
    this.entity.setController(this.controllers[m]);
    this.entity.flatShots = m === FlyMode.TOPDOWN;
  }

  /** Where the plane sits on screen, off the camera's centre (top-down
   *  mode's 1942 controls; see TopDownPlaneFilter.screen). */
  screenOffset(): Axis {
    return this.mode === FlyMode.TOPDOWN ? this.controllers[FlyMode.TOPDOWN].screen : { x: 0, y: 0 };
  }

  /** Put the wreck back together at `height`, level, on its old heading,
   *  and safe from collisions for `invulnerable` milliseconds. */
  respawn(height: number, invulnerable: number): void {
    const p = this.entity;
    const { yaw } = yawPitch(p.object.quaternion);
    p.object.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
    p.object.position.y = height;
    if (p.bank) p.bank.rotation.set(0, 0, 0);
    for (const c of this.controllers) c.reset();
    p.crashed = false;
    p.invulnerable = invulnerable;
    p.object.visible = true;
    this.setMode(this.mode);
  }

  /** Turn the plane round to `yaw` (radians, as yawPitch() measures it),
   *  level, and safe from collisions for `invulnerable` milliseconds. */
  turnTo(yaw: number, invulnerable: number): void {
    const p = this.entity;
    p.object.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
    if (p.bank) p.bank.rotation.set(0, 0, 0);
    for (const c of this.controllers) c.reset();
    p.invulnerable = invulnerable;
  }

  /** speed: the throttle, already mapped to the mission's speed range,
   *  whose bottom is minSpeed; safeHeight: the height top-down mode climbs
   *  to (clear of the roofs). */
  read(input: Input, speed: number, minSpeed: number, safeHeight = 0): void {
    for (const c of this.controllers) {
      c.speed = speed;
      c.minSpeed = minSpeed;
    }
    this.controllers[FlyMode.TOPDOWN].safeHeight = safeHeight;
    this.controllers[this.mode].read(input);
  }
}

// ==================================================================== camera

/**
 * A chase camera: it hangs behind and above the plane in a frame that swings round after
 * the plane's heading and climb, so it never trails behind at speed but
 * still eases through turns.
 */
export class ChaseCamera {
  position = new THREE.Vector3();
  target = new THREE.Vector3();
  up = new THREE.Vector3(0, 1, 0);

  set(p: THREE.Vector3, t: THREE.Vector3, up: THREE.Vector3): void {
    this.position.copy(p);
    this.target.copy(t);
    this.up.copy(up);
  }

  getPosition(): THREE.Vector3 { return this.position.clone(); }

  getTarget(): THREE.Vector3 { return this.target.clone(); }
}

// Follow camera, in the camera frame (which follows the plane's yaw and
// part of its pitch).
const FOLLOW_OFFSET = new THREE.Vector3(0, 12, 30);
const FOLLOW_LOOK = new THREE.Vector3(0, -6, -45); // keeps the plane low on screen
const FOLLOW_PITCH = 0.6; // how much of the plane's climb/dive the camera takes
const YAW_FOLLOW_RATE = 7; // 1/s
const PITCH_FOLLOW_RATE = 5;
const CAMERA_BLEND_RATE = 2.5; // mode changes take ~0.4 s

export class CameraMan {
  private yaw: number | null = null; // camera frame, radians; null until the first frame
  private pitch = 0;
  private topdown = 0; // 0 = follow camera, 1 = top-down; blended in between

  constructor(private camera: ChaseCamera) {}

  /** `offset`: where the plane sits on screen in top-down mode (world units
   *  right of and ahead of the middle). */
  lookAt(object: THREE.Object3D, mode: FlyMode = FlyMode.FOLLOW, msecs = 0, offset: Axis = { x: 0, y: 0 }): void {
    const goal = mode === FlyMode.TOPDOWN ? 1 : 0;
    const step = CAMERA_BLEND_RATE * msecs / 1000;
    this.topdown += Math.max(-step, Math.min(step, goal - this.topdown));
    const b = this.topdown * this.topdown * (3 - 2 * this.topdown); // smoothstep

    const { yaw, pitch } = yawPitch(object.quaternion);
    if (this.yaw === null) {
      this.topdown = goal; // (no blend into the first frame)
      this.yaw = yaw;
      this.pitch = pitch * FOLLOW_PITCH;
    } else {
      let dy = yaw - this.yaw;
      dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI; // the short way round
      this.yaw += dy * damp(YAW_FOLLOW_RATE, msecs);
      this.pitch += (pitch * FOLLOW_PITCH - this.pitch) * damp(PITCH_FOLLOW_RATE, msecs);
    }
    const frame = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    const position = object.position.clone().add(FOLLOW_OFFSET.clone().applyQuaternion(frame));
    const target = object.position.clone().add(FOLLOW_LOOK.clone().applyQuaternion(frame));
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(frame);
    if (b > 0) {
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const centre = object.position.clone().addScaledVector(right, -offset.x).addScaledVector(fwd, -offset.y);
      position.lerp(centre.clone().add(new THREE.Vector3(0, TOPDOWN_CAMERA, 0)), b);
      target.lerp(centre.addScaledVector(fwd, 0.01), b);
      up.lerp(fwd, b).normalize();
    }
    this.camera.set(position, target, up);
  }

  getCamera(): ChaseCamera { return this.camera; }
}

export function makeCameraMan(): CameraMan {
  return new CameraMan(new ChaseCamera());
}

// ===================================================================== world

const FOV = 90; // halved: 45 degrees vertical
const NEAR_DIST = 20.0;
const FAR_DIST = 25000.0;
const FOG_START = 50.0;
const FOG_END = 11000.0;
export const FOG_COLOR: readonly [number, number, number] = [0.8, 0.8, 0.8];

// sounds (bullet hits, bombs) fade out at this distance from the camera
const HEARING_RANGE = 1800;

export class World {
  scene = new THREE.Scene();
  entities: Entity[] = [];
  camera: THREE.PerspectiveCamera;
  effects = new Effects();

  constructor(public grid: CityGrid) {
    this.scene.fog = new THREE.Fog(new THREE.Color(...FOG_COLOR), FOG_START, FOG_END);
    // "Lighting. Try to look like the sun." A sun plus ambient (0.2 of it
    // the old GL global ambient). The intensities are multiplied by PI to
    // match the old fixed-function lighting.
    const ambient = new THREE.AmbientLight(new THREE.Color(0.3 + 0.2, 0.3 + 0.2, 0.4 + 0.2), Math.PI);
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 1.0, 0.8), Math.PI);
    sun.position.set(1, 5, 1);
    this.scene.add(ambient, sun, sun.target);
    this.scene.add(grid.group, this.effects.group);
    this.camera = new THREE.PerspectiveCamera(FOV / 2, 4 / 3, NEAR_DIST, FAR_DIST);
  }

  /** How loud a sound at `point` is where the camera is (1 close by, 0
   *  at HEARING_RANGE). */
  loudness(point: THREE.Vector3): number {
    return Math.max(0, 1 - this.camera.position.distanceTo(point) / HEARING_RANGE) ** 2;
  }

  addEntity(ent: Entity): void {
    this.entities.push(ent);
    this.scene.add(ent.object);
  }

  update(msecs: number): void {
    if (!msecs) return;
    const from = new THREE.Vector3();
    for (const e of this.entities.slice()) {
      from.copy(e.object.position);
      e.lastPosition.copy(from);
      e.update(this, msecs);
      if (e.radius === null || e.isDead()) continue;
      let hit = this.grid.sweep(from, e.object.position, e.radius);
      let target: Entity | null = null;
      for (const s of this.entities) {
        if (!s.shootable || s === e || s.isDead()) continue;
        const h = s.intersect(from, e.object.position, e.radius);
        if (h && (!hit || h.t < hit.t)) {
          hit = h;
          target = s;
        }
      }
      if (hit) e.hit(this, hit, e.object.position.clone().sub(from).multiplyScalar(1000 / msecs), target);
    }
    this.effects.update(msecs);
    this.entities = this.entities.filter((e) => {
      if (e.isDead()) this.scene.remove(e.object);
      return !e.isDead();
    });
  }

  /** A blast at `point`: everything shootable within `radius` takes `damage`. */
  blast(point: THREE.Vector3, radius: number, damage: number, velocity: THREE.Vector3): void {
    for (const s of this.entities) {
      if (!s.shootable || s.isDead() || s.distanceTo(point) > radius) continue;
      s.struck(this, { t: 0, point: point.clone(), normal: new THREE.Vector3(0, 1, 0) }, velocity, damage);
    }
  }

  /** `beforeRender` sees the camera once it's placed. */
  draw(display: Display, smoothCamera: ChaseCamera, beforeRender?: (camera: THREE.PerspectiveCamera) => void): void {
    const pos = smoothCamera.getPosition();
    this.camera.position.copy(pos);
    this.camera.up.copy(smoothCamera.up);
    this.camera.lookAt(smoothCamera.getTarget());
    this.grid.update(pos, FOG_END); // scroll the city with the camera
    beforeRender?.(this.camera);
    display.render3d(this.scene, this.camera);
  }

  dispose(): void {
    this.grid.dispose();
    this.effects.dispose();
  }
}
