// Port of game/mission/world/ (World, Entity, Plane, Projectile,
// FollowPlaneFilter), game/mission/player.cpp and graphics/camera/
// (CameraMan + SmoothCamera).

import * as THREE from 'three';
import { loadModel, loadTextureVariant, clampTexture } from '../core/assets.js';
import { loadProperties } from '../core/settings.js';
import { Button, InputFilter } from '../core/input.js';
import { gamestats, Stat } from './stats.js';

const deg2rad = Math.PI / 180;
// The C++ turned the plane by `axis` degrees per frame. That is made
// frame-rate independent here, at the rate it had at 60 fps.
const DEGREES_PER_SECOND = 60;

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
 * pitches (inverted, like a plane), left/right yaws, and the plane flies
 * forward at the throttle speed. In 2006 the speed was always zero.
 */
export class FollowPlaneFilter extends InputFilter {
  constructor() {
    super();
    this.axis = { x: 0, y: 0 };
    this.firing = 0;
    this.speed = 0;
  }

  _read(input) {
    this.axis = input.getAxis();
    if (input.buttonPressed(Button.FIRE1)) this.firing = 1;
    else if (input.buttonPressed(Button.FIRE2)) this.firing = 2;
    else this.firing = 0;
  }

  control(ent, msecs) {
    const k = DEGREES_PER_SECOND * msecs / 1000;
    ent.rotate(-1.0 * this.axis.y * k, -this.axis.x * k, 0);
    ent.velocity.set(0, 0, -this.speed);
    ent.setFiring(this.firing);
  }
}

// Top-down mode: how fast the stick moves the plane across the screen.
const STRAFE_SPEED = 400;
const LEVEL_RATE = 4; // how quickly the plane levels out, per second
const BANK_DEGREES = 25;

/**
 * TopDownPlaneFilter ("above the skyscrapers", like 1942 in game.txt): the
 * plane levels out and keeps its heading; the stick moves it left/right and
 * speeds it up or slows it down. The 2006 filter only accumulated velocity
 * and was never switched on, so this is a new take on it.
 */
export class TopDownPlaneFilter extends FollowPlaneFilter {
  control(ent, msecs) {
    const q = ent.object.quaternion;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const yaw = Math.atan2(-fwd.x, -fwd.z);
    const level = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, yaw, -this.axis.x * BANK_DEGREES * deg2rad, 'YXZ'),
    );
    q.slerp(level, Math.min(1, LEVEL_RATE * msecs / 1000));
    // velocity is in the plane's own frame; use the level frame so pitch
    // and bank don't push it up or down
    const v = new THREE.Vector3(this.axis.x * STRAFE_SPEED, 0, -(this.speed + this.axis.y * STRAFE_SPEED / 2));
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
    const object = new THREE.Group();
    object.add(mesh);
    object.position.set(0, startHeight, 0);
    object.scale.setScalar(0.01);
    const bombType = await loadProjectileType('bomb');
    p.entity = new Plane(object, bombType);
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

/** Averager: mean of the last `n` samples. */
class Averager {
  constructor(n) { this.n = n; this.samples = []; }

  add(v) { this.samples.push(v.clone()); while (this.samples.length > this.n) this.samples.shift(); }

  mean() {
    const sum = new THREE.Vector3();
    for (const s of this.samples) sum.add(s);
    return this.samples.length ? sum.divideScalar(this.samples.length) : sum;
  }
}

/** SmoothCamera(posSamples, targSamples) */
class SmoothCamera {
  constructor(posSamples, targSamples) {
    this.position = new Averager(posSamples);
    this.targetFromPos = new Averager(targSamples);
    this.up = new THREE.Vector3(0, 1, 0);
  }

  setPosTarg(p, t) {
    this.position.add(p);
    this.targetFromPos.add(t.clone().sub(p));
  }

  getPosition() { return this.position.mean(); }

  getTarget() { return this.getPosition().add(this.targetFromPos.mean()); }
}

const LEAD_AHEAD = 20.0;
const LEAD_ABOVE = 10.0;
// Top-down camera: straight down from this height, the plane's heading up.
const TOPDOWN_HEIGHT = 160.0;
const CAMERA_BLEND_RATE = 2.5; // mode changes take ~0.4 s

export class CameraMan {
  constructor(camera) {
    this.camera = camera;
    this.positionOffset = new THREE.Vector3(0, 10, 40);
    this.absolutePositionOffset = new THREE.Vector3();
    this.targetOffset = new THREE.Vector3(0, LEAD_ABOVE, -LEAD_AHEAD);
    this.topdown = 0; // 0 = follow camera, 1 = top-down; blended in between
  }

  setFollowAbsoluteHeight(h) { this.absolutePositionOffset.y = h; }

  setFollowHeight(h) { this.positionOffset.y = h; }

  setFollowDistance(d) { this.positionOffset.z = d; }

  lookAt(object, mode = FlyMode.FOLLOW, msecs = 0) {
    const goal = mode === FlyMode.TOPDOWN ? 1 : 0;
    const step = CAMERA_BLEND_RATE * msecs / 1000;
    this.topdown += Math.max(-step, Math.min(step, goal - this.topdown));
    const b = this.topdown * this.topdown * (3 - 2 * this.topdown); // smoothstep

    const q = object.quaternion;
    const position = object.position.clone()
      .add(this.absolutePositionOffset)
      .add(this.positionOffset.clone().applyQuaternion(q));
    const target = object.position.clone().add(this.targetOffset.clone().applyQuaternion(q));
    if (b > 0) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).setY(0).normalize();
      const tdPos = object.position.clone().add(new THREE.Vector3(0, TOPDOWN_HEIGHT, 0));
      const tdTarget = object.position.clone().addScaledVector(fwd, 0.01);
      position.lerp(tdPos, b);
      target.lerp(tdTarget, b);
      this.camera.up.set(0, 1, 0).lerp(fwd, b).normalize();
    } else {
      this.camera.up.set(0, 1, 0);
    }
    this.camera.setPosTarg(position, target);
  }

  getCamera() { return this.camera; }
}

export function makeCameraMan() {
  // Mission::_load(): high above the plane, looking down just ahead of it.
  const cm = new CameraMan(new SmoothCamera(1, 10));
  cm.setFollowAbsoluteHeight(90.0);
  cm.setFollowHeight(0.0);
  cm.setFollowDistance(0.0);
  return cm;
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
    this.grid.update(pos); // PatchGrid::setPosition: scroll the city with the camera
    display.render3d(this.scene, this.camera);
  }

  dispose() {
    this.grid.dispose();
  }
}
