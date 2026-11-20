// The 3D world: World, Entity, Plane, Projectile, the two flying-mode
// controllers (FollowPlaneFilter, TopDownPlaneFilter), Player, and the
// CameraMan with its chase camera.

import * as THREE from 'three';
import { loadModel, loadTextureVariant, clampTexture } from '../core/assets.ts';
import { loadProperties } from '../core/settings.ts';
import { Button, InputFilter, type Axis, type Input } from '../core/input.ts';
import type { Display } from '../core/display.ts';
import { gamestats, Stat } from './stats.ts';
import type { CityGrid } from './city.ts';

const deg2rad = Math.PI / 180;

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

export class Projectile extends Entity {
  lifetime: number;

  constructor(ptype: ProjectileType) {
    // (a type with no drawable throws here, as it always has)
    const mesh = ptype.make!();
    const holder = new THREE.Group();
    holder.add(mesh);
    super(holder);
    this.lifetime = ptype.lifetime;
  }

  setLifetime(ms: number): void { this.lifetime = ms; }

  protected override _update(_world: World, msecs: number): void {
    if (this.lifetime) {
      this.lifetime -= msecs;
      if (this.lifetime <= 0) this.dead = true;
    }
  }
}

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

export class Plane extends Entity {
  reloadTime = 0;
  /** The spinning propeller, split off the model (see splitPropeller). */
  propeller: THREE.Object3D | null = null;

  constructor(object: THREE.Object3D, private bombType: ProjectileType) {
    super(object);
  }

  protected override _update(world: World, msecs: number): void {
    if (this.propeller) {
      const speed = this.controller?.speed ?? 0;
      this.propeller.rotation.z += (PROP_IDLE + speed * PROP_PER_SPEED) * msecs * 0.001;
      this.propeller.rotation.z %= Math.PI * 2;
    }
    this.reloadTime = Math.min(1000, Math.max(0, this.reloadTime - msecs));
    if (!(this.firing && this.reloadTime <= 0)) return;
    let movement: THREE.Vector3;
    if (this.firing === 1) {
      movement = new THREE.Vector3(0, 0, -150); // "bullet"
      gamestats.inc(Stat.BULLETS_FIRED);
    } else {
      movement = new THREE.Vector3(0, -100, 0); // "bomb"
      gamestats.inc(Stat.BOMBS_DROPPED);
    }
    // Every shot uses the bomb model (a hack from 2006), though FIRE1 still
    // sends it forward like a bullet.
    const offset = new THREE.Vector3(5, 0, 0).applyQuaternion(this.object.quaternion);
    for (const sign of [-1, 1]) {
      const bomb = new Projectile(this.bombType);
      bomb.object.scale.setScalar(0.005);
      bomb.object.position.copy(this.object.position).addScaledVector(offset, sign);
      bomb.object.quaternion.copy(this.object.quaternion);
      bomb.velocity.copy(this.velocity).add(movement);
      bomb.setLifetime(1000);
      world.addEntity(bomb);
    }
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
  yawRate = 0; // degrees per second
  pitchRate = 0;

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
// Switching to top-down pulls the plane up above the rooftops: it climbs
// (never dives) towards `safeHeight`, easing in, nose up while it climbs.
const CLIMB_RATE = 450; // units per second, at most
const CLIMB_EASE = 1.5; // 1/s: climb speed per unit of height still to go
const CLIMB_NOSE_UP = 0.04; // degrees of visual pitch per unit/s of climb
const LEVEL_RATE = 6; // how quickly the plane levels out, per second
const BANK_DEGREES = 25;

/**
 * TopDownPlaneFilter ("above the skyscrapers", like 1942 in game.txt): the
 * plane levels out and keeps its heading; the stick moves it left/right and
 * speeds it up or slows it down. The 2006 filter only accumulated velocity
 * and was never switched on, so this is a new take on it.
 */
export class TopDownPlaneFilter extends FollowPlaneFilter {
  strafe: Axis = { x: 0, y: 0 };
  safeHeight = 0; // set each frame by the mission

  override control(ent: Entity, msecs: number): void {
    const q = ent.object.quaternion;
    const { yaw } = yawPitch(q);
    q.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ')), damp(LEVEL_RATE, msecs));
    const k = damp(STRAFE_RESPONSE, msecs);
    this.strafe.x += (this.axis.x - this.strafe.x) * k;
    this.strafe.y += (this.axis.y - this.strafe.y) * k;
    this.yawRate = 0;
    this.pitchRate = 0;
    this.bank(ent, -this.strafe.x * BANK_DEGREES, msecs);
    // velocity is in the plane's own frame; use the level frame so any
    // leftover pitch doesn't push it up or down
    const climb = Math.min(CLIMB_RATE, Math.max(0, (this.safeHeight - ent.object.position.y) * CLIMB_EASE));
    if (ent.bank) {
      const x = ent.bank.rotation.x;
      ent.bank.rotation.x = x + (climb * CLIMB_NOSE_UP * deg2rad - x) * damp(BANK_RESPONSE, msecs);
    }
    const v = new THREE.Vector3(this.strafe.x * STRAFE_SPEED, 0, -(this.speed + this.strafe.y * STRAFE_SPEED / 2));
    v.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    v.y = climb;
    v.applyQuaternion(q.clone().invert());
    ent.velocity.copy(v);
    ent.setFiring(this.firing);
  }
}

export const FlyMode = { FOLLOW: 0, TOPDOWN: 1 } as const;
export type FlyMode = (typeof FlyMode)[keyof typeof FlyMode];
const MODE_NAMES = ['FOLLOW', 'TOP-DOWN'];

/** Owns the plane and its two controllers. */
export class Player {
  readonly controllers: [FollowPlaneFilter, TopDownPlaneFilter] = [new FollowPlaneFilter(), new TopDownPlaneFilter()];
  mode: FlyMode = FlyMode.FOLLOW;
  private lastModeToggle: boolean | null = null;

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
  }

  modeName(): string { return MODE_NAMES[this.mode]; }

  /** speed: the throttle, already mapped to the mission's speed range;
   *  safeHeight: the height top-down mode climbs to (clear of the roofs). */
  read(input: Input, speed: number, safeHeight = 0): void {
    const t = input.buttonToggled(Button.MODE);
    if (this.lastModeToggle !== null && t !== this.lastModeToggle) {
      this.setMode(this.mode === FlyMode.FOLLOW ? FlyMode.TOPDOWN : FlyMode.FOLLOW);
    }
    this.lastModeToggle = t;
    for (const c of this.controllers) c.speed = speed;
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
// Top-down camera: straight down from this height, the plane's heading up.
const TOPDOWN_HEIGHT = 160.0;
const CAMERA_BLEND_RATE = 2.5; // mode changes take ~0.4 s

export class CameraMan {
  private yaw: number | null = null; // camera frame, radians; null until the first frame
  private pitch = 0;
  private topdown = 0; // 0 = follow camera, 1 = top-down; blended in between

  constructor(private camera: ChaseCamera) {}

  lookAt(object: THREE.Object3D, mode: FlyMode = FlyMode.FOLLOW, msecs = 0): void {
    const goal = mode === FlyMode.TOPDOWN ? 1 : 0;
    const step = CAMERA_BLEND_RATE * msecs / 1000;
    this.topdown += Math.max(-step, Math.min(step, goal - this.topdown));
    const b = this.topdown * this.topdown * (3 - 2 * this.topdown); // smoothstep

    const { yaw, pitch } = yawPitch(object.quaternion);
    if (this.yaw === null) {
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
      position.lerp(object.position.clone().add(new THREE.Vector3(0, TOPDOWN_HEIGHT, 0)), b);
      target.lerp(object.position.clone().addScaledVector(fwd, 0.01), b);
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

export class World {
  scene = new THREE.Scene();
  entities: Entity[] = [];
  camera: THREE.PerspectiveCamera;

  constructor(public grid: CityGrid) {
    this.scene.fog = new THREE.Fog(new THREE.Color(...FOG_COLOR), FOG_START, FOG_END);
    // "Lighting. Try to look like the sun." A sun plus ambient (0.2 of it
    // the old GL global ambient). The intensities are multiplied by PI to
    // match the old fixed-function lighting.
    const ambient = new THREE.AmbientLight(new THREE.Color(0.3 + 0.2, 0.3 + 0.2, 0.4 + 0.2), Math.PI);
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 1.0, 0.8), Math.PI);
    sun.position.set(1, 5, 1);
    this.scene.add(ambient, sun, sun.target);
    this.scene.add(grid.group);
    this.camera = new THREE.PerspectiveCamera(FOV / 2, 4 / 3, NEAR_DIST, FAR_DIST);
  }

  addEntity(ent: Entity): void {
    this.entities.push(ent);
    this.scene.add(ent.object);
  }

  update(msecs: number): void {
    if (!msecs) return;
    for (const e of this.entities.slice()) e.update(this, msecs);
    this.entities = this.entities.filter((e) => {
      if (e.isDead()) this.scene.remove(e.object);
      return !e.isDead();
    });
  }

  draw(display: Display, smoothCamera: ChaseCamera): void {
    const pos = smoothCamera.getPosition();
    this.camera.position.copy(pos);
    this.camera.up.copy(smoothCamera.up);
    this.camera.lookAt(smoothCamera.getTarget());
    this.grid.update(pos, FOG_END); // scroll the city with the camera
    display.render3d(this.scene, this.camera);
  }

  dispose(): void {
    this.grid.dispose();
  }
}
