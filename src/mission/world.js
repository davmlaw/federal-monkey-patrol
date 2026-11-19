// Port of game/mission/world/ (World, Entity, Plane, Projectile,
// FollowPlaneFilter), game/mission/player.cpp and graphics/camera/
// (CameraMan; SmoothCamera is replaced by a chase camera).

import * as THREE from 'three';
import { loadModel, loadTextureVariant, clampTexture } from '../core/assets.js';
import { loadProperties } from '../core/settings.js';
import { Button, InputFilter } from '../core/input.js';
import { gamestats, Stat } from './stats.js';

const deg2rad = Math.PI / 180;

// Flight handling. The C++ turned the plane by `axis` degrees per frame
// (60 degrees/s at 60 fps) about its own axes, with no smoothing. Now the
// stick sets a turn rate that the plane reaches in a few hundredths of a
// second; yaw is about the world's up so the horizon stays level, and the
// plane banks into turns (visually only).
const YAW_RATE = 110; // degrees per second at full stick
const PITCH_RATE = 90;
const MAX_PITCH = 80; // degrees: no loops, so the camera never flips
const STICK_RESPONSE = 14; // 1/s: how fast the turn rate follows the stick
const BANK_PER_YAW = 0.35; // degrees of bank per degree/s of yaw rate
const BANK_RESPONSE = 6;

/** 1 - e^(-rate * t): frame-rate independent exponential smoothing factor. */
const damp = (rate, msecs) => 1 - Math.exp(-rate * msecs / 1000);

/** Heading and climb angle (radians) of a quaternion's -Z axis. */
function yawPitch(q) {
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  return { yaw: Math.atan2(-fwd.x, -fwd.z), pitch: Math.asin(Math.max(-1, Math.min(1, fwd.y))) };
}

// ================================================================== entities

export class Entity {
  constructor(object) {
    this.object = object; // the Drawable: position, rotation (quaternion), scale
    this.velocity = new THREE.Vector3();
    this.firing = 0;
    this.dead = false;
    this.controller = null;
  }

  setController(c) { this.controller = c; }

  setFiring(f) { this.firing = f; }

  isDead() { return this.dead; }

  update(world, msecs) {
    this.controller?.control(this, msecs);
    // physics: move along velocity in the entity's own frame
    const move = this.velocity.clone().applyQuaternion(this.object.quaternion).multiplyScalar(msecs * 0.001);
    this.object.position.add(move);
    this._update(world, msecs);
  }

  /** Drawable::rotate(x, y, z): degrees, about the entity's own axes. */
  rotate(x, y, z) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x * deg2rad, y * deg2rad, z * deg2rad, 'XYZ'));
    this.object.quaternion.multiply(q);
  }

  _update() {}
}

// data/etc/projectiles/<type>.properties -> projectile type
const projectileTypes = new Map();

async function loadProjectileType(type) {
  if (!projectileTypes.has(type)) {
    projectileTypes.set(type, (async () => {
      console.log(`trying to load '${type}' from disk`);
      const prop = await loadProperties(`data/etc/projectiles/${type}.properties`);
      const words = (prop.get('drawable') || '').split(' ');
      let make = null;
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
        lifetime: parseFloat(prop.get('lifetime')) || 0,
        gravity: parseFloat(prop.get('gravity')) || 0,
        airResistance: parseFloat(prop.get('air_resistance')) || 0,
      };
    })());
  }
  return projectileTypes.get(type);
}

export class Projectile extends Entity {
  constructor(ptype) {
    const mesh = ptype.make();
    const holder = new THREE.Group();
    holder.add(mesh);
    super(holder);
    this.lifetime = ptype.lifetime;
  }

  setLifetime(ms) { this.lifetime = ms; }

  _update(world, msecs) {
    if (this.lifetime) {
      this.lifetime -= msecs;
      if (this.lifetime <= 0) this.dead = true;
    }
  }
}

export class Plane extends Entity {
  constructor(object, bombType) {
    super(object);
    this.reloadTime = 0;
    this.bombType = bombType;
  }

  _update(world, msecs) {
    this.reloadTime = Math.min(1000, Math.max(0, this.reloadTime - msecs));
    if (!(this.firing && this.reloadTime <= 0)) return;
    let movement;
    if (this.firing === 1) {
      movement = new THREE.Vector3(0, 0, -150); // "bullet"
      gamestats.inc(Stat.BULLETS_FIRED);
    } else {
      movement = new THREE.Vector3(0, -100, 0); // "bomb"
      gamestats.inc(Stat.BOMBS_DROPPED);
    }
    // `ptype = "bomb"; // REMOVE: hack` - in 2006 every shot used the bomb
    // model, though FIRE1 still sent it forward like a bullet.
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
export class FollowPlaneFilter extends InputFilter {
  constructor() {
    super();
    this.axis = { x: 0, y: 0 };
    this.firing = 0;
    this.speed = 0;
    this.yawRate = 0; // degrees per second
    this.pitchRate = 0;
  }

  _read(input) {
    this.axis = input.getAxis();
    if (input.buttonPressed(Button.FIRE1)) this.firing = 1;
    else if (input.buttonPressed(Button.FIRE2)) this.firing = 2;
    else this.firing = 0;
  }

  /** Set the visual bank of the plane's model (not its flight path). */
  bank(ent, degrees, msecs) {
    if (!ent.bank) return;
    const z = ent.bank.rotation.z;
    ent.bank.rotation.z = z + (degrees * deg2rad - z) * damp(BANK_RESPONSE, msecs);
  }

  control(ent, msecs) {
    const k = damp(STICK_RESPONSE, msecs);
    const stick = (v) => Math.max(-1, Math.min(1, v));
    this.yawRate += (-stick(this.axis.x) * YAW_RATE - this.yawRate) * k;
    this.pitchRate += (-stick(this.axis.y) * PITCH_RATE - this.pitchRate) * k;
    const dt = msecs / 1000;
    let { yaw, pitch } = yawPitch(ent.object.quaternion);
    yaw += this.yawRate * dt * deg2rad;
    pitch = Math.max(-MAX_PITCH * deg2rad, Math.min(MAX_PITCH * deg2rad, pitch + this.pitchRate * dt * deg2rad));
    ent.object.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    this.bank(ent, this.yawRate * BANK_PER_YAW, msecs);
    ent.velocity.set(0, 0, -this.speed);
    ent.setFiring(this.firing);
  }
}

// Top-down mode: how fast the stick moves the plane across the screen.
const STRAFE_SPEED = 400;
const STRAFE_RESPONSE = 10; // 1/s
const LEVEL_RATE = 6; // how quickly the plane levels out, per second
const BANK_DEGREES = 25;

/**
 * TopDownPlaneFilter ("above the skyscrapers", like 1942 in game.txt): the
 * plane levels out and keeps its heading; the stick moves it left/right and
 * speeds it up or slows it down. The 2006 filter only accumulated velocity
 * and was never switched on, so this is a new take on it.
 */
export class TopDownPlaneFilter extends FollowPlaneFilter {
  constructor() {
    super();
    this.strafe = { x: 0, y: 0 };
  }

  control(ent, msecs) {
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
    const v = new THREE.Vector3(this.strafe.x * STRAFE_SPEED, 0, -(this.speed + this.strafe.y * STRAFE_SPEED / 2));
    v.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    v.applyQuaternion(q.clone().invert());
    ent.velocity.copy(v);
    ent.setFiring(this.firing);
  }
}

export const FlyMode = { FOLLOW: 0, TOPDOWN: 1 };
const MODE_NAMES = ['FOLLOW', 'TOP-DOWN'];

/** game/mission/player.cpp: owns the plane and its two controllers. */
export class Player {
  static async create(model, skin, startHeight) {
    const p = new Player();
    const mesh = await loadModel(model, skin);
    mesh.rotation.y = Math.PI; // the model's nose points +Z; forward is -Z
    const bank = new THREE.Group(); // rolls the model into turns
    bank.add(mesh);
    const object = new THREE.Group();
    object.add(bank);
    object.position.set(0, startHeight, 0);
    object.scale.setScalar(0.01);
    const bombType = await loadProjectileType('bomb');
    p.entity = new Plane(object, bombType);
    p.entity.bank = bank;
    p.controllers = [new FollowPlaneFilter(), new TopDownPlaneFilter()];
    p.lastModeToggle = null;
    p.setMode(FlyMode.FOLLOW);
    return p;
  }

  setMode(m) {
    this.mode = m;
    this.entity.setController(this.controllers[m]);
  }

  modeName() { return MODE_NAMES[this.mode]; }

  /** speed: the throttle, already mapped to the mission's speed range. */
  read(input, speed) {
    const t = input.buttonToggled(Button.MODE);
    if (this.lastModeToggle !== null && t !== this.lastModeToggle) {
      this.setMode(this.mode === FlyMode.FOLLOW ? FlyMode.TOPDOWN : FlyMode.FOLLOW);
    }
    this.lastModeToggle = t;
    for (const c of this.controllers) c.speed = speed;
    this.controllers[this.mode].read(input);
  }
}

// ==================================================================== camera

/**
 * Replaces graphics/camera/SmoothCamera. The C++ averaged the last N camera
 * positions/targets (N frames, so its lag depended on the frame rate) and
 * sat 90 units straight above the plane. This is a chase camera instead:
 * it hangs behind and above the plane in a frame that swings round after
 * the plane's heading and climb, so it never trails behind at speed but
 * still eases through turns.
 */
class ChaseCamera {
  constructor() {
    this.position = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }

  set(p, t, up) {
    this.position.copy(p);
    this.target.copy(t);
    this.up.copy(up);
  }

  getPosition() { return this.position.clone(); }

  getTarget() { return this.target.clone(); }
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
  constructor(camera) {
    this.camera = camera;
    this.yaw = null; // camera frame, radians; null until the first frame
    this.pitch = 0;
    this.topdown = 0; // 0 = follow camera, 1 = top-down; blended in between
  }

  lookAt(object, mode = FlyMode.FOLLOW, msecs = 0) {
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

  getCamera() { return this.camera; }
}

export function makeCameraMan() {
  return new CameraMan(new ChaseCamera());
}

// ===================================================================== world

// display.cpp
const FOV = 90; // passed as FOV/2 to PerspectiveMatrix44, i.e. 45 degrees vertical
const NEAR_DIST = 20.0;
const FAR_DIST = 25000.0;
const FOG_START = 50.0;
const FOG_END = 11000.0;
export const FOG_COLOR = [0.8, 0.8, 0.8];

export class World {
  constructor(grid) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(new THREE.Color(...FOG_COLOR), FOG_START, FOG_END);
    // "Lighting. Try to look like the sun." Fixed-function GL light 0 plus the
    // default 0.2 global ambient. Three's lights are multiplied by PI to give
    // the same result as the legacy lighting model.
    const ambient = new THREE.AmbientLight(new THREE.Color(0.3 + 0.2, 0.3 + 0.2, 0.4 + 0.2), Math.PI);
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 1.0, 0.8), Math.PI);
    sun.position.set(1, 5, 1);
    this.scene.add(ambient, sun, sun.target);
    this.grid = grid;
    this.scene.add(grid.group);
    this.entities = [];
    this.camera = new THREE.PerspectiveCamera(FOV / 2, 4 / 3, NEAR_DIST, FAR_DIST);
  }

  addEntity(ent) {
    this.entities.push(ent);
    this.scene.add(ent.object);
  }

  update(msecs) {
    if (!msecs) return;
    for (const e of this.entities.slice()) e.update(this, msecs);
    this.entities = this.entities.filter((e) => {
      if (e.isDead()) this.scene.remove(e.object);
      return !e.isDead();
    });
  }

  draw(display, smoothCamera) {
    const pos = smoothCamera.getPosition();
    this.camera.position.copy(pos);
    this.camera.up.copy(smoothCamera.up);
    this.camera.lookAt(smoothCamera.getTarget());
    this.grid.update(pos, FOG_END); // PatchGrid::setPosition: scroll the city with the camera
    display.render3d(this.scene, this.camera);
  }

  dispose() {
    this.grid.dispose();
  }
}
