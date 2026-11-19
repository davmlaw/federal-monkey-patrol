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

/** FollowPlaneFilter: up/down pitch, left/right yaw, FIRE1/FIRE2 shoot. */
export class FollowPlaneFilter extends InputFilter {
  constructor() {
    super();
    this.axis = { x: 0, y: 0 };
    this.firing = 0;
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
    ent.setFiring(this.firing);
  }
}

/** game/mission/player.cpp. Only FOLLOW mode was ever used in 2006. */
export class Player {
  static async create(model, skin, startHeight) {
    const p = new Player();
    const mesh = await loadModel(model, skin);
    const object = new THREE.Group();
    object.add(mesh);
    object.position.set(0, startHeight, 0);
    object.scale.setScalar(0.01);
    const bombType = await loadProjectileType('bomb');
    // velocity stays zero: `//entity->velocity.z = -600.0f;` was commented out
    p.entity = new Plane(object, bombType);
    p.controller = new FollowPlaneFilter();
    p.entity.setController(p.controller);
    return p;
  }

  read(input) { this.controller.read(input); }
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

export class CameraMan {
  constructor(camera) {
    this.camera = camera;
    this.positionOffset = new THREE.Vector3(0, 10, 40);
    this.absolutePositionOffset = new THREE.Vector3();
    this.targetOffset = new THREE.Vector3(0, LEAD_ABOVE, -LEAD_AHEAD);
  }

  setFollowAbsoluteHeight(h) { this.absolutePositionOffset.y = h; }

  setFollowHeight(h) { this.positionOffset.y = h; }

  setFollowDistance(d) { this.positionOffset.z = d; }

  lookAt(object) {
    const q = object.quaternion;
    const position = object.position.clone()
      .add(this.absolutePositionOffset)
      .add(this.positionOffset.clone().applyQuaternion(q));
    const target = object.position.clone().add(this.targetOffset.clone().applyQuaternion(q));
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
  constructor(city) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(new THREE.Color(...FOG_COLOR), FOG_START, FOG_END);
    // "Lighting. Try to look like the sun." Fixed-function GL light 0 plus the
    // default 0.2 global ambient. Three's lights are multiplied by PI to give
    // the same result as the legacy lighting model.
    const ambient = new THREE.AmbientLight(new THREE.Color(0.3 + 0.2, 0.3 + 0.2, 0.4 + 0.2), Math.PI);
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 1.0, 0.8), Math.PI);
    sun.position.set(1, 5, 1);
    this.scene.add(ambient, sun, sun.target);
    this.city = city;
    this.scene.add(city);
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
    // (PatchGrid::setPosition scrolled the city with the camera; the plane
    // never moved in 2006, so the grid always stayed centred on the origin.)
    display.render3d(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.isMesh && o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    });
  }
}
