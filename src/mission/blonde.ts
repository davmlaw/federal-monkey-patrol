// Blondes: the kongs reach in at windows and carry them off up the
// skyscrapers. Shoot the kong down and she falls (slowly: her dress
// catches the air) for the plane to catch. The model is the 2006
// blonde.obj, rigged and animated procedurally like the kong (kongrig.ts);
// kongtest.html shows her clips. Tuned in data/etc/blonde.properties.

import * as THREE from 'three';
import { loadModel, playChime, playScream } from '../core/assets.ts';
import { settings } from '../core/settings.ts';
import { gamestats, Stat } from './stats.ts';
import { Entity, type World } from './world.ts';
import { drawBlondeHead } from './hud.ts';
import { euler, mirror, renderPortrait, Rig, RigAnimator, type BoneDef } from './kongrig.ts';

// ------------------------------------------------------------------ rig

// blonde.obj's bind pose: standing, upper arms out to the sides, forearms
// raised (like the kong's). Its own units: about 3550 tall, Y up, facing
// +Z, her left is +X.
const BODY: BoneDef[] = [
  { name: 'hips', parent: null, head: [0, -1250, 30], tail: [0, -900, 30], radius: 300, side: 0 },
  { name: 'spine', parent: 'hips', head: [0, -900, 30], tail: [0, -300, 30], radius: 300, side: 0 },
  { name: 'chest', parent: 'spine', head: [0, -300, 30], tail: [0, 80, 20], radius: 280, side: 0 },
  { name: 'neck', parent: 'chest', head: [0, 80, 20], tail: [0, 250, 40], radius: 120, side: 0 },
  { name: 'head', parent: 'neck', head: [0, 250, 40], tail: [0, 700, 60], radius: 230, side: 0 },
];
const LEFT: BoneDef[] = [
  { name: 'upperArm.L', parent: 'chest', head: [330, -170, 0], tail: [900, -170, -40], radius: 120, side: 1 },
  { name: 'foreArm.L', parent: 'upperArm.L', head: [900, -170, -40], tail: [700, 410, 170], radius: 110, side: 1 },
  { name: 'hand.L', parent: 'foreArm.L', head: [700, 410, 170], tail: [570, 700, 250], radius: 90, side: 1 },
  { name: 'thigh.L', parent: 'hips', head: [170, -1250, 30], tail: [160, -2050, 40], radius: 190, side: 1 },
  { name: 'shin.L', parent: 'thigh.L', head: [160, -2050, 40], tail: [160, -2690, 20], radius: 150, side: 1 },
  { name: 'foot.L', parent: 'shin.L', head: [160, -2690, 20], tail: [200, -2840, 360], radius: 110, side: 1 },
];
const DEFS: BoneDef[] = [...BODY, ...LEFT, ...LEFT.map(mirror)];

/** Her soles, and where a kong's fist holds her (round her middle, high
 *  enough that her legs hang below it), in model units. */
export const BLONDE_GROUND_Y = -2845;
export const BLONDE_WAIST_Y = -650;
const BLONDE_HEIGHT = 3550;
// her head for the HUD (model units): its middle, and how far round it to show
const PORTRAIT_CENTRE: [number, number, number] = [0, 520, 60];
const PORTRAIT_RADIUS = 230;

export type BlondeClip = 'bind' | 'stand' | 'held' | 'fall' | 'landed';
export const BLONDE_CLIPS: BlondeClip[] = ['bind', 'stand', 'held', 'fall', 'landed'];

/** Her clips' phase is just seconds: they're all loops of wobbles. */
export class BlondeRig extends Rig {
  constructor(geom: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) {
    super(geom, material, DEFS, 60);
  }

  apply(clip: BlondeClip, t: number): void {
    switch (clip) {
      case 'bind': this.bind(); break;
      case 'stand': this.standing(t); break;
      case 'held': this.held(t); break;
      case 'fall': this.falling(t); break;
      case 'landed': this.landed(t); break;
    }
  }

  /** Arm `side` (+1 left) reaching for a point `off` from her shoulder. */
  private arm(s: number, off: THREE.Vector3, pole = new THREE.Vector3(s, -1, -0.6)): void {
    const side = s > 0 ? 'L' : 'R';
    this.reach(`arm.${side}`, this.joint(`upperArm.${side}`).add(off), pole, { curl: -0.2 });
  }

  /** Leg `side` reaching with the ankle for a point `off` from her hip. */
  private leg(s: number, off: THREE.Vector3, pole = new THREE.Vector3(s * 0.15, 0, 1), point = 0): void {
    const side = s > 0 ? 'L' : 'R';
    this.reach(`leg.${side}`, this.joint(`thigh.${side}`).add(off), pole, { curl: point });
  }

  private standing(t: number): void {
    const b = Math.sin(t * 1.8);
    this.root([0, 6 * b, 0], new THREE.Quaternion());
    this.torso([0, 0, 0], [-0.03 * b, 0, 0], [0, 0.2 * Math.sin(t * 0.7), 0], [0.05, 0.3 * Math.sin(t * 0.5), 0]);
    // hands clasped under her chin
    for (const s of [1, -1]) this.arm(s, new THREE.Vector3(-s * 260, -420 + 20 * b, 380), new THREE.Vector3(s, -1, -0.3));
    this.stand(0);
  }

  /** In a kong's fist (round her waist): kicking, beating at its fingers,
   *  screaming up at it. */
  private held(t: number): void {
    this.root([0, 0, 0], euler(0.1 * Math.sin(t * 3.1), 0.25 * Math.sin(t * 1.7), 0.08 * Math.sin(t * 2.3)));
    this.torso(
      [0.05 * Math.sin(t * 4), 0.2 * Math.sin(t * 2.1), 0],
      [-0.12, 0.15 * Math.sin(t * 2.6), 0.05 * Math.sin(t * 3)],
      [-0.15, 0.3 * Math.sin(t * 1.9), 0],
      [-0.3 + 0.1 * Math.sin(t * 5), 0.4 * Math.sin(t * 1.3), 0.1 * Math.sin(t * 2)],
    );
    for (const s of [1, -1]) {
      const a = t * 7 + (s > 0 ? 0 : 2.4);
      this.arm(s, new THREE.Vector3(s * (420 + 220 * Math.sin(a)), 350 + 400 * Math.sin(a * 0.9), 250 + 250 * Math.cos(a * 0.7)));
      const k = t * 8.5 + (s > 0 ? 0 : Math.PI);
      this.leg(s, new THREE.Vector3(s * 60, -1330 + 220 * Math.max(0, Math.sin(k + 1)), 120 + 480 * Math.sin(k)), undefined, -0.5);
    }
  }

  /** Floating down: arms up and waving, legs pedalling. */
  private falling(t: number): void {
    this.root([0, 0, 0], euler(0.08 * Math.sin(t * 1.3), 0, 0.1 * Math.sin(t * 1.1)));
    this.torso([-0.05, 0.1 * Math.sin(t * 1.5), 0], [-0.1, 0, 0.05 * Math.sin(t * 2)], [-0.1, 0.2 * Math.sin(t), 0], [-0.25, 0.3 * Math.sin(t * 0.8), 0]);
    for (const s of [1, -1]) {
      const a = t * 9 + (s > 0 ? 0 : 1.7);
      this.arm(s, new THREE.Vector3(s * (480 + 160 * Math.sin(a)), 850 + 200 * Math.sin(a * 0.8), 150 * Math.sin(a * 0.6)), new THREE.Vector3(s, -0.3, -1));
      const k = t * 5 + (s > 0 ? 0 : Math.PI);
      this.leg(s, new THREE.Vector3(s * 90, -1150 + 260 * (0.5 + 0.5 * Math.sin(k)), 330 * Math.cos(k)), undefined, -0.6);
    }
  }

  /** Down with a bump: sitting, leaning back on one hand, the other to her
   *  head, shaking it. */
  private landed(t: number): void {
    const seat = BLONDE_GROUND_Y + 200 - this.def.get('hips')!.head[1];
    this.root([0, seat, -150], euler(-0.35, 0, 0));
    this.torso([0.25, 0, 0], [0.1, 0, 0], [0.1, 0.35 * Math.sin(t * 2.5), 0], [0.15, 0.3 * Math.sin(t * 2.5 + 0.5), 0.1]);
    const ground = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, BLONDE_GROUND_Y + 90, z);
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      this.reach(`leg.${side}`, ground(s * 260, 1150 + (s > 0 ? 0 : -250)), new THREE.Vector3(s * 0.2, 1, 0.2), { curl: -0.4 });
    }
    // left hand to her forehead, right one propping her up behind
    const brow = this.wp.get('head')!.clone().add(new THREE.Vector3(60, 300, 330));
    this.reach('arm.L', brow, new THREE.Vector3(1, -0.5, 0.3), { curl: 0.3 });
    this.reach('arm.R', ground(-650, -650), new THREE.Vector3(-1, 0.3, -0.5), { curl: -0.6 });
  }
}

// --------------------------------------------------------------- config

interface BlondeConfig {
  model: string;
  skin: string;
  height: number;
  grabChance: number;
  maxBlondes: number;
  minTop: number;
  climbSpeed: number;
  spawnClimbing: number;
  spawnClimbingTop: number;
  roofMsecs: [number, number];
  fallSpeed: number;
  catchRadius: number;
  landedMsecs: number;
}

function loadConfig(): BlondeConfig {
  const m = settings.module('blonde');
  const f = (k: string, d: number): number => {
    const v = parseFloat(m.get(k) ?? '');
    return Number.isFinite(v) ? v : d;
  };
  return {
    model: m.get('model') ?? 'blonde.obj',
    skin: m.get('skin') ?? 'blondecolor2.jpg',
    height: f('height', 15),
    grabChance: f('grab_chance', 0.6),
    maxBlondes: f('max_blondes', 3),
    minTop: f('min_top', 300),
    climbSpeed: f('carry_climb_speed', 28),
    spawnClimbing: f('spawn_climbing', 0.3),
    spawnClimbingTop: f('spawn_climbing_top', 700),
    roofMsecs: [f('roof_seconds_min', 20) * 1000, f('roof_seconds_max', 40) * 1000],
    fallSpeed: f('fall_speed', 22),
    catchRadius: f('catch_radius', 30),
    landedMsecs: f('landed_seconds', 10) * 1000,
  };
}

// ---------------------------------------------------------------- blonde

const GRAVITY = 200; // until her dress catches the air (fall_speed)
const CATCH_MSECS = 350; // whisked into the plane
const HEARING = 2500;
const THROW_SPEED = 45; // thrown clear of a roof by a kong shot up there
// ...and steered out to the middle of the street, at up to this speed
// across it, so she comes down where the plane can catch her
const STREET_SPEED = 45;
const STREET_PULL = 1.2; // 1/s: towards the middle
const STREET_EASE = 1.5; // 1/s: how fast her speed across it changes
const LEDGE_HOP = 10; // landing on a ledge on the way down, she's bounced off it this fast
const MAX_HOPS = 30;

/** A street to come down in: running along `axis`... at `at` on the other
 *  axis. (Streets run along multiples of BLOCKSIZE.) */
export interface Street { axis: 'x' | 'z'; at: number }

type State = 'held' | 'falling' | 'caught' | 'landed';

/** A marker over a blonde, so she's easy to find while she's carried off
 *  (once she's falling, the mission's BlondeFinder points her out): a
 *  chevron pointing down at her and her head (the same icon as on the
 *  radar), the same size on screen at any distance. */
function markerTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 80;
  const g = c.getContext('2d')!;
  drawBlondeHead(g, 32, 26, 15);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(18, 58);
  g.lineTo(32, 72);
  g.lineTo(46, 58);
  g.strokeStyle = '#2a1d08';
  g.lineWidth = 9;
  g.stroke();
  g.strokeStyle = '#fff';
  g.lineWidth = 5;
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Blonde extends Entity {
  state: State = 'held';
  private clock = Math.random() * 10;
  private stateMsecs = 0;
  private caughtFrom = new THREE.Vector3();
  private drift = new THREE.Vector3();
  private marker: THREE.Sprite;
  private spin = 0;
  /** Thrown off a building: the street she comes down in, and her speed
   *  across it. */
  private street: Street | null = null;
  private streetVel = 0;
  private hops = 0;

  constructor(
    pose: THREE.Group, // turned to face -Z (as the kongs do)
    private mesh: THREE.Object3D,
    private anim: RigAnimator<BlondeClip>,
    private kit: BlondeKit,
  ) {
    const object = new THREE.Group();
    object.add(pose);
    super(object);
    this.marker = new THREE.Sprite(kit.markerMaterial);
    this.marker.scale.set(0.06, 0.075, 1);
    this.marker.position.y = kit.cfg.height * 1.1;
    this.marker.renderOrder = 10;
    this.marker.visible = false;
    object.add(this.marker);
    this.setOrigin('waist');
  }

  /** Where `object` is on her: her waist (held, falling) or her feet. */
  private setOrigin(at: 'waist' | 'feet'): void {
    const k = this.kit.cfg.height / BLONDE_HEIGHT;
    this.mesh.position.y = -(at === 'waist' ? BLONDE_WAIST_Y : BLONDE_GROUND_Y) * k;
  }

  /** In a kong's fist at `at`, facing `yaw`. */
  holdAt(at: THREE.Vector3, yaw: number): void {
    this.object.position.copy(at);
    this.object.rotation.set(0, yaw, 0);
  }

  private volume(): number {
    const ear = this.kit.plane;
    if (!ear) return 0;
    return 0.6 * Math.max(0, 1 - ear.object.position.distanceTo(this.object.position) / HEARING) ** 2;
  }

  scream(): void {
    const v = this.volume();
    if (v > 0.03) playScream(v);
  }

  /** Let go of: she floats down; up on a building, thrown out to the
   *  middle of `street`, bouncing off any ledges in the way. */
  drop(street: Street | null = null): void {
    if (this.state !== 'held') return;
    this.state = 'falling';
    this.stateMsecs = 0;
    this.velocity.set(0, 0, 0);
    this.street = street;
    if (street) this.streetVel = Math.sign(street.at - this.object.position[street.axis]) * THROW_SPEED;
    this.spin = this.object.rotation.y;
    const a = Math.random() * Math.PI * 2;
    this.drift.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(3 + Math.random() * 4);
    this.scream();
  }

  /** Taken away with its kong (left behind). */
  remove(): void {
    this.dead = true;
  }

  // (velocity here is in world space, not the entity's frame)
  override update(world: World, msecs: number): void {
    this._update(world, msecs);
  }

  protected override _update(world: World, msecs: number): void {
    const dt = msecs / 1000;
    this.clock += dt;
    this.stateMsecs += msecs;
    const pos = this.object.position;
    const cfg = this.kit.cfg;
    switch (this.state) {
      case 'held':
        this.anim.play(dt, 'held', 0, this.clock);
        this.marker.visible = true;
        break;
      case 'falling': {
        this.anim.play(dt, 'fall', 0, this.clock);
        this.velocity.y = Math.max(-cfg.fallSpeed, this.velocity.y - GRAVITY * dt);
        const from = pos.clone();
        const sway = Math.sin(this.clock * 0.9);
        const st = this.street;
        if (st) {
          // out over the street and along it to the middle; drifting only along it
          const want = THREE.MathUtils.clamp(STREET_PULL * (st.at - pos[st.axis]), -STREET_SPEED, STREET_SPEED);
          this.streetVel += (want - this.streetVel) * Math.min(1, STREET_EASE * dt);
          pos[st.axis] += this.streetVel * dt;
          const along = st.axis === 'x' ? 'z' : 'x';
          pos[along] += (this.drift[along] + 3 * sway) * dt;
        } else {
          pos.x += (this.drift.x + 4 * sway * this.drift.z / (this.drift.length() || 1)) * dt;
          pos.z += (this.drift.z - 4 * sway * this.drift.x / (this.drift.length() || 1)) * dt;
        }
        pos.y += this.velocity.y * dt;
        this.spin += 0.5 * dt;
        this.object.rotation.set(0.12 * Math.sin(this.clock * 1.2), this.spin, 0.12 * Math.sin(this.clock * 0.9));
        this.marker.visible = false;
        // caught?
        const plane = this.kit.plane;
        // (anywhere along the plane's path this frame: it's fast)
        const near = (p: Entity): number => new THREE.Line3(p.lastPosition, p.object.position).closestPointToPoint(pos, true, new THREE.Vector3()).distanceTo(pos);
        if (plane && !plane.crashed && near(plane) < cfg.catchRadius) {
          this.state = 'caught';
          this.stateMsecs = 0;
          this.caughtFrom.copy(pos);
          this.marker.visible = false;
          gamestats.inc(Stat.BLONDE_RESCUES);
          this.kit.events.push('caught');
          playChime();
          break;
        }
        // down on a roof or the street? (her feet)
        const feet = (BLONDE_WAIST_Y - BLONDE_GROUND_Y) * cfg.height / BLONDE_HEIGHT;
        const hit = world.grid.sweep(from.clone().setY(from.y - feet), pos.clone().setY(pos.y - feet), 0);
        if (hit && hit.normal.y > 0.5 && st && hit.point.y > 1 && this.hops < MAX_HOPS) {
          // a ledge on the way down to the street: bounced off it, on out
          this.hops++;
          pos.y = hit.point.y + feet + 0.5;
          this.velocity.y = LEDGE_HOP;
          this.streetVel += Math.sign(st.at - pos[st.axis]) * THROW_SPEED * 0.5;
        } else if (hit && hit.normal.y > 0.5) {
          pos.set(hit.point.x, hit.point.y, hit.point.z);
          this.land(world);
        } else if (hit) {
          // drifted into a wall: straight down from here (or on out)
          pos.x = from.x;
          pos.z = from.z;
          this.drift.set(0, 0, 0);
        }
        break;
      }
      case 'caught': {
        const k = Math.min(1, this.stateMsecs / CATCH_MSECS);
        const plane = this.kit.plane;
        if (plane) pos.lerpVectors(this.caughtFrom, plane.object.position, k * k);
        this.object.scale.setScalar(1 - 0.8 * k);
        this.anim.play(dt, 'fall', 0, this.clock);
        if (k >= 1) this.dead = true;
        break;
      }
      case 'landed':
        this.anim.play(dt, 'landed', 0, this.clock);
        if (this.stateMsecs > cfg.landedMsecs) this.dead = true;
        break;
    }
  }

  private land(world: World): void {
    this.state = 'landed';
    this.stateMsecs = 0;
    this.marker.visible = false;
    this.object.rotation.set(0, this.spin, 0);
    this.setOrigin('feet');
    world.effects.dust(this.object.position.clone(), 0.3);
    gamestats.inc(Stat.BLONDE_CASUALTIES);
    this.kit.events.push('landed');
  }

  isFalling(): boolean { return this.state === 'falling'; }
}

/** What a troop of kongs needs for blondes: the model, the settings, the
 *  plane that catches them, and the ones about. */
export class BlondeKit {
  readonly markerMaterial = new THREE.SpriteMaterial({ map: markerTexture(), sizeAttenuation: false, depthTest: false, transparent: true });
  /** Catches them (set by the mission). */
  plane: (Entity & { crashed: boolean }) | null = null;
  private blondes: Blonde[] = [];
  /** 'caught' and 'landed', as they happen, for the mission's messages. */
  events: ('caught' | 'landed')[] = [];

  private constructor(private proto: THREE.Mesh, readonly cfg: BlondeConfig) {}

  static async create(): Promise<BlondeKit> {
    const cfg = loadConfig();
    return new BlondeKit(await loadModel(cfg.model, cfg.skin), cfg);
  }

  /** Room for another to be carried off? */
  canKidnap(): boolean {
    this.blondes = this.blondes.filter((b) => !b.isDead());
    return this.blondes.filter((b) => b.state === 'held' || b.state === 'falling').length < this.cfg.maxBlondes;
  }

  make(world: World): Blonde {
    const geom = this.proto.geometry;
    const rig = new BlondeRig(geom, this.proto.material);
    const scale = this.cfg.height / BLONDE_HEIGHT;
    rig.mesh.scale.setScalar(scale);
    const pose = new THREE.Group();
    pose.rotation.y = Math.PI; // the model faces +Z; forward is -Z
    pose.add(rig.mesh);
    const b = new Blonde(pose, rig.mesh, new RigAnimator<BlondeClip>(rig, 'held'), this);
    this.blondes.push(b);
    world.addEntity(b);
    return b;
  }

  /** Her head, rendered once with `renderer` (for the HUD's tally), as
   *  KongTroop.portrait() does the kong's. */
  portrait(renderer: THREE.WebGLRenderer, size = 128): THREE.Texture {
    const rig = new BlondeRig(this.proto.geometry, this.proto.material);
    const scale = 1 / BLONDE_HEIGHT;
    rig.mesh.scale.setScalar(scale);
    rig.apply('stand', 0);
    rig.mesh.updateMatrixWorld(true);
    // (the model faces +Z) her face and hair, round the middle of her head
    const centre = new THREE.Vector3(...PORTRAIT_CENTRE).multiplyScalar(scale);
    return renderPortrait(renderer, rig.mesh, centre, PORTRAIT_RADIUS * scale, new THREE.Vector3(0.3, 0.1, 1), size);
  }

  /** Falling now (for the radar). */
  falling(): Blonde[] { return this.blondes.filter((b) => !b.isDead() && b.isFalling()); }
}
