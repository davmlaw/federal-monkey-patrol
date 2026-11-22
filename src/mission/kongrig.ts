// The kong's skeleton and its animations, all procedural. kong2.obj has no
// rig, so the bones are placed here by hand on the model (its own units:
// about 3300 tall, Y up, facing +Z, its left is +X), the skin weights come
// from each vertex's distance to the bones, and the clips are functions of
// a phase that pose the body directly, with two-bone IK for the arms and
// legs so hands and feet can be planted (on the street, on a wall, on the
// chest). The test page kongtest.html shows the clips.

import * as THREE from 'three';

type V3 = [number, number, number];

export interface BoneDef {
  name: string;
  parent: string | null;
  head: V3; // the joint
  tail: V3; // the far end, for the skin weights
  radius: number; // how thick the body is round the bone
  side: -1 | 0 | 1; // left (+X) limbs only take vertices on the left
}

// The model's bind pose: standing, upper arms out to the sides, forearms
// raised (the roar).
const BODY: BoneDef[] = [
  { name: 'hips', parent: null, head: [0, -450, -260], tail: [0, 0, -260], radius: 380, side: 0 },
  { name: 'spine', parent: 'hips', head: [0, 0, -260], tail: [0, 500, -260], radius: 420, side: 0 },
  { name: 'chest', parent: 'spine', head: [0, 500, -260], tail: [0, 920, -230], radius: 430, side: 0 },
  { name: 'neck', parent: 'chest', head: [0, 920, -230], tail: [0, 1080, -150], radius: 250, side: 0 },
  { name: 'head', parent: 'neck', head: [0, 1080, -150], tail: [0, 1400, 50], radius: 260, side: 0 },
];
const LEFT: BoneDef[] = [
  { name: 'clavicle.L', parent: 'chest', head: [150, 820, -300], tail: [560, 830, -380], radius: 200, side: 1 },
  { name: 'upperArm.L', parent: 'clavicle.L', head: [560, 830, -380], tail: [1170, 760, -430], radius: 220, side: 1 },
  { name: 'foreArm.L', parent: 'upperArm.L', head: [1170, 760, -430], tail: [1320, 1380, 250], radius: 200, side: 1 },
  { name: 'hand.L', parent: 'foreArm.L', head: [1320, 1380, 250], tail: [1340, 1640, 380], radius: 130, side: 1 },
  { name: 'thigh.L', parent: 'hips', head: [220, -560, -260], tail: [320, -1100, -320], radius: 230, side: 1 },
  { name: 'shin.L', parent: 'thigh.L', head: [320, -1100, -320], tail: [430, -1450, -330], radius: 190, side: 1 },
  { name: 'foot.L', parent: 'shin.L', head: [430, -1450, -330], tail: [420, -1660, 60], radius: 140, side: 1 },
];
export const mirror = (d: BoneDef): BoneDef => ({
  ...d,
  name: d.name.replace('.L', '.R'),
  parent: d.parent?.replace('.L', '.R') ?? null,
  head: [-d.head[0], d.head[1], d.head[2]],
  tail: [-d.tail[0], d.tail[1], d.tail[2]],
  side: -1,
});
const DEFS: BoneDef[] = [...BODY, ...LEFT, ...LEFT.map(mirror)];

/** The sole of the feet, in model units. */
export const GROUND_Y = -1662;

// ----------------------------------------------------------- skin weights

const WEIGHT_FALLOFF = 70; // model units: how soft the kong's joints are

function segmentDistance(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}

/** Adds skinIndex/skinWeight to a model's geometry for the bones `defs`
 *  (once: it's shared). */
function skin(geom: THREE.BufferGeometry, defs: BoneDef[], falloff: number): void {
  if (geom.getAttribute('skinIndex')) return;
  const pos = geom.getAttribute('position');
  const n = pos.count;
  const index = new Uint16Array(n * 4);
  const weight = new Float32Array(n * 4);
  const segs = defs.map((d) => ({ a: new THREE.Vector3(...d.head), b: new THREE.Vector3(...d.tail), d }));
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    const side = Math.abs(p.x) < 30 ? 0 : Math.sign(p.x);
    const cands = segs.flatMap((s, bi) => (s.d.side === 0 || side === 0 || s.d.side === side)
      ? [{ bi, d: segmentDistance(p, s.a, s.b) - s.d.radius }] : []);
    cands.sort((x, y) => x.d - y.d);
    const best = cands.slice(0, 4).map((c) => ({ bi: c.bi, w: Math.exp(-(c.d - cands[0].d) / falloff) }));
    const sum = best.reduce((s, c) => s + c.w, 0);
    best.forEach((c, k) => {
      index[i * 4 + k] = c.bi;
      weight[i * 4 + k] = c.w / sum;
    });
  }
  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weight, 4));
}

// ------------------------------------------------------------------ math

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

/** The rotation taking direction d0 (with n0 at right angles to it) to d
 *  (with n). */
function mapFrame(d0: THREE.Vector3, n0: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3): THREE.Quaternion {
  const frame = (dir: THREE.Vector3, nrm: THREE.Vector3): THREE.Matrix4 => {
    const a = dir.clone().normalize();
    const b = nrm.clone().addScaledVector(a, -nrm.dot(a)).normalize();
    return new THREE.Matrix4().makeBasis(a, b, a.clone().cross(b));
  };
  const m = frame(d, n).multiply(frame(d0, n0).transpose());
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

export const euler = (x: number, y: number, z: number): THREE.Quaternion =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));

const frac = (x: number): number => x - Math.floor(x);
export const smooth = (x: number): number => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/** A foot (or hand) going round a step cycle of phase 0..1: on the ground
 *  for the first `stance` of it, sliding back by `stance` strides, then
 *  lifted and swung forward. `along` runs +stance/2 .. -stance/2. */
function stepCycle(phase: number, stance = 0.6): { along: number; lift: number } {
  const f = frac(phase);
  if (f < stance) return { along: stance * (0.5 - f / stance), lift: 0 };
  const s = (f - stance) / (1 - stance);
  return { along: stance * (smooth(s) - 0.5), lift: Math.sin(Math.PI * s) };
}

// ------------------------------------------------------------------- rig

export type KongClip = 'bind' | 'idle' | 'walk' | 'climb' | 'roar' | 'fall' | 'grab';
export const CLIPS: KongClip[] = ['bind', 'idle', 'walk', 'climb', 'roar', 'fall', 'grab'];

/** Model units the body moves in one walk cycle (two steps). */
export const WALK_STRIDE = 1000;
/** Model units it rises in one climb cycle (a reach with each hand). */
export const CLIMB_STRIDE = 900;
/** Seconds of a roar: beating its chest, then arms up and bellowing. */
export const ROAR_SECONDS = 4;
/** Seconds of a grab: on the wall, reaching in at a window with the right
 *  hand and pulling a blonde out. She's in its fist from GRAB_GOT on. */
export const GRAB_SECONDS = 3.5;
export const GRAB_GOT = 0.5;
export const IDLE_SECONDS = 3.2;
/** Fall phases: 0..1 falling (with the whole body toppled by the caller),
 *  then 1..1+FALL_SETTLE settling limp on the ground. */
export const FALL_SETTLE = 1;

interface Limb { upper: string; fore: string; end: string; a: number; b: number; dirU0: THREE.Vector3; dirF0: THREE.Vector3; n0: THREE.Vector3 }

/** Turning a hand or foot on its forearm or shin. */
interface EndTurn { twist?: number; curl?: number }

/**
 * A skeleton of `defs` placed on a model, skinned by distance, posed
 * directly by the clips of a subclass (apply()), with two-bone IK for
 * the arms and legs: bones named hips, upperArm/foreArm/hand.L/R and
 * thigh/shin/foot.L/R.
 */
export abstract class Rig {
  readonly mesh: THREE.SkinnedMesh;
  readonly bones = new Map<string, THREE.Bone>();
  readonly boneNames: string[];
  protected def: Map<string, BoneDef>;
  private offsets = new Map<string, THREE.Vector3>();
  private limbs = new Map<string, Limb>();
  // solved this frame, in the mesh's space
  protected wq = new Map<string, THREE.Quaternion>();
  protected wp = new Map<string, THREE.Vector3>();

  constructor(geom: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], private defs: BoneDef[], falloff: number) {
    this.boneNames = defs.map((d) => d.name);
    this.def = new Map(defs.map((d) => [d.name, d]));
    skin(geom, defs, falloff);
    this.mesh = new THREE.SkinnedMesh(geom, material);
    for (const d of defs) {
      const bone = new THREE.Bone();
      bone.name = d.name;
      const off = new THREE.Vector3(...d.head);
      if (d.parent) off.sub(new THREE.Vector3(...this.def.get(d.parent)!.head));
      this.offsets.set(d.name, off);
      bone.position.copy(off);
      this.bones.set(d.name, bone);
      (d.parent ? this.bones.get(d.parent)! : this.mesh).add(bone);
    }
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(defs.map((d) => this.bones.get(d.name)!)));
    // (the arms swing well out of the bind pose's bounds)
    geom.computeBoundingSphere();
    this.mesh.boundingSphere = geom.boundingSphere!.clone();
    this.mesh.boundingSphere.radius *= 1.3;
    for (const s of ['L', 'R']) {
      this.limbs.set(`arm.${s}`, this.limb(`upperArm.${s}`, `foreArm.${s}`, `hand.${s}`, null));
      this.limbs.set(`leg.${s}`, this.limb(`thigh.${s}`, `shin.${s}`, `foot.${s}`, Z));
    }
  }

  private limb(upper: string, fore: string, end: string, pole: THREE.Vector3 | null): Limb {
    const S = new THREE.Vector3(...this.def.get(upper)!.head);
    const E = new THREE.Vector3(...this.def.get(fore)!.head);
    const W = new THREE.Vector3(...this.def.get(end)!.head);
    const u = W.clone().sub(S).normalize();
    // which way the joint bends: given (the knees), or as modelled (the elbows)
    const p = (pole ?? E.clone().sub(S)).clone();
    p.addScaledVector(u, -p.dot(u)).normalize();
    return {
      upper, fore, end,
      a: E.distanceTo(S), b: W.distanceTo(E),
      dirU0: E.clone().sub(S).normalize(),
      dirF0: W.clone().sub(E).normalize(),
      n0: p.cross(u).normalize(),
    };
  }

  // --------------------------------------------------------- the solver

  private parentQ(name: string): THREE.Quaternion {
    const p = this.def.get(name)!.parent;
    return p ? this.wq.get(p)! : new THREE.Quaternion();
  }

  /** Where a joint is, once its parent has been posed. */
  joint(name: string): THREE.Vector3 {
    const p = this.def.get(name)!.parent!;
    return this.offsets.get(name)!.clone().applyQuaternion(this.wq.get(p)!).add(this.wp.get(p)!);
  }

  protected setWorld(name: string, q: THREE.Quaternion): void {
    const pos = this.joint(name);
    this.bones.get(name)!.quaternion.copy(this.parentQ(name).clone().invert().multiply(q));
    this.wq.set(name, q.clone());
    this.wp.set(name, pos);
  }

  protected setLocal(name: string, q: THREE.Quaternion): void {
    this.setWorld(name, this.parentQ(name).clone().multiply(q));
  }

  /** Mirror a left-side rotation for the right. */
  protected sided(side: number, x: number, y: number, z: number): THREE.Quaternion {
    return euler(x, side * y, side * z);
  }

  protected root(offset: V3, rot: THREE.Quaternion): void {
    const bone = this.bones.get('hips')!;
    const pos = new THREE.Vector3(...this.def.get('hips')!.head).add(new THREE.Vector3(...offset));
    bone.position.copy(pos);
    bone.quaternion.copy(rot);
    this.wq.set('hips', rot.clone());
    this.wp.set('hips', pos);
  }

  /** Two-bone IK: reach `target` with the end of the limb, bending towards
   *  `pole`; then the hand or foot turned to `endQ` (in the mesh's space),
   *  or turned on the forearm or shin: twisted about it (+ turns the palm
   *  or sole out) and curled (+ bends it towards the inside of the joint). */
  protected reach(limbName: string, target: THREE.Vector3, pole: THREE.Vector3, endQ: THREE.Quaternion | EndTurn | null = null): void {
    const L = this.limbs.get(limbName)!;
    const S = this.joint(L.upper);
    const to = target.clone().sub(S);
    const u = to.lengthSq() > 1e-6 ? to.clone().normalize() : new THREE.Vector3(0, -1, 0);
    const d = THREE.MathUtils.clamp(to.length(), Math.abs(L.a - L.b) + 1, L.a + L.b - 1);
    const cosA = THREE.MathUtils.clamp((L.a * L.a + d * d - L.b * L.b) / (2 * L.a * d), -1, 1);
    const sinA = Math.sqrt(1 - cosA * cosA);
    const p = pole.clone().addScaledVector(u, -pole.dot(u));
    if (p.lengthSq() < 1e-6) p.copy(Math.abs(u.x) < 0.9 ? X : Z).addScaledVector(u, -u.dot(Math.abs(u.x) < 0.9 ? X : Z));
    p.normalize();
    const E = S.clone().addScaledVector(u, L.a * cosA).addScaledVector(p, L.a * sinA);
    const W = S.clone().addScaledVector(u, d);
    const n = p.clone().cross(u).normalize();
    this.setWorld(L.upper, mapFrame(L.dirU0, L.n0, E.clone().sub(S), n));
    this.setWorld(L.fore, mapFrame(L.dirF0, L.n0, W.clone().sub(E), n));
    if (endQ instanceof THREE.Quaternion) this.setWorld(L.end, endQ);
    else {
      const side = L.end.endsWith('.L') ? 1 : -1;
      const q = new THREE.Quaternion().setFromAxisAngle(L.dirF0, side * (endQ?.twist ?? 0));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(L.n0, endQ?.curl ?? 0));
      this.setLocal(L.end, q);
    }
  }

  /** The rest of the torso: spine, chest, neck and head, each turned
   *  (pitch forward +, yaw to its left +, roll) on the one below. */
  protected torso(spine: V3, chest: V3, neck: V3, head: V3): void {
    this.setLocal('spine', euler(...spine));
    this.setLocal('chest', euler(...chest));
    this.setLocal('neck', euler(...neck));
    this.setLocal('head', euler(...head));
  }

  protected clavicles(lift: number, forward = 0): void {
    for (const s of [1, -1]) this.setLocal(`clavicle.${s > 0 ? 'L' : 'R'}`, this.sided(s, 0, -forward, -lift));
  }

  /** A point in the chest's frame (as if it were in the bind pose). */
  protected onChest(x: number, y: number, z: number): THREE.Vector3 {
    const c = new THREE.Vector3(...this.def.get('chest')!.head);
    return new THREE.Vector3(x, y, z).sub(c).applyQuaternion(this.wq.get('chest')!).add(this.wp.get('chest')!);
  }

  protected bind(): void {
    this.root([0, 0, 0], new THREE.Quaternion());
    for (const d of this.defs) if (d.parent) this.setLocal(d.name, new THREE.Quaternion());
  }
  /** Feet planted where they are in the bind pose, flat. */
  protected stand(spread = 0): void {
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const a = new THREE.Vector3(...this.def.get(`foot.${side}`)!.head);
      a.x += s * spread;
      this.reach(`leg.${side}`, a, new THREE.Vector3(s * 0.25, 0, 1), new THREE.Quaternion());
    }
  }
  /** Where `bone`'s far end, `k` of the way along (e.g. a fist), is in the
   *  world. */
  tip(bone: string, k: number, target = new THREE.Vector3()): THREE.Vector3 {
    const d = this.def.get(bone)!;
    const v = new THREE.Vector3(...d.tail).sub(new THREE.Vector3(...d.head)).multiplyScalar(k);
    return this.bones.get(bone)!.localToWorld(target.copy(v));
  }

  /** Pose the bones for `clip` at `phase`. */
  abstract apply(clip: string, phase: number): void;
}

export class KongRig extends Rig {
  /** Where the wall is while climbing: this far in front (+Z) of the origin. */
  wallZ = 730;
  /** Falling onto its back (+1) or its face (-1). */
  fallSign = 1;
  /** Holding a blonde in its right hand (posed over the clips). */
  carry = false;

  constructor(geom: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) {
    super(geom, material, DEFS, WEIGHT_FALLOFF);
  }

  // ----------------------------------------------------------- the clips

  /** Pose the bones for `clip` at `phase` (cycles for the looping clips). */
  apply(clip: KongClip, phase: number): void {
    switch (clip) {
      case 'bind': this.bind(); break;
      case 'idle': this.idle(phase); break;
      case 'walk': this.walk(phase); break;
      case 'climb': this.climb(phase); break;
      case 'roar': this.roar(phase); break;
      case 'fall': this.fall(phase); break;
      case 'grab': this.grab(phase); break;
    }
    if (this.carry && clip !== 'grab' && clip !== 'fall' && clip !== 'bind') this.hold(clip, phase);
  }

  /** Where the right fist holds a blonde, for each clip: out to the side
   *  and away from the wall while climbing (one-handed), held up high to
   *  roar, otherwise in front of its chest. */
  private holdAt(clip: KongClip, phase: number): THREE.Vector3 {
    const t = 2 * Math.PI * frac(phase);
    switch (clip) {
      case 'climb': return new THREE.Vector3(-1250 + 40 * Math.sin(t), 250 + 60 * Math.sin(t), this.wallZ - 750);
      case 'roar': {
        const secs = frac(phase) * ROAR_SECONDS;
        return new THREE.Vector3(-950, 1750 + 30 * Math.sin(secs * 9), 350);
      }
      case 'walk': return new THREE.Vector3(-520 + 30 * Math.cos(t), 620 + 40 * Math.cos(2 * t), 720);
      default: return new THREE.Vector3(-520, 640 + 15 * Math.sin(t), 700);
    }
  }

  private fistTurn: EndTurn = { twist: 0.3, curl: 0.9 };

  private hold(clip: KongClip, phase: number): void {
    this.reach('arm.R', this.holdAt(clip, phase), new THREE.Vector3(-1, -0.6, -0.5), this.fistTurn);
  }

  /** On the wall (feet and left hand planted), the right hand reaches in
   *  at a window, rummages, and comes back out to hold her (holdAt). */
  private grab(phase: number): void {
    const f = THREE.MathUtils.clamp(phase, 0, 1);
    this.climb(0.1);
    const start = this.wp.get('hand.R')!.clone();
    const wall = this.wallZ;
    const inside = new THREE.Vector3(-480 + 70 * Math.sin(f * 40), 950 + 50 * Math.sin(f * 31), wall + 260);
    const held = this.holdAt('climb', 0);
    const T = f < 0.3 ? start.lerp(inside, smooth(f / 0.3))
      : f < GRAB_GOT ? inside
      : inside.lerp(held, smooth((f - GRAB_GOT) / (1 - GRAB_GOT - 0.1)));
    this.reach('arm.R', T, new THREE.Vector3(-1, -0.6, -0.3), this.fistTurn);
    // looking at what it's doing: in at the window, then at her
    const look = smooth(f / 0.2) * (1 - smooth((f - 0.85) / 0.15));
    this.setLocal('neck', euler(-0.15, -0.35 * look, 0));
    this.setLocal('head', euler(-0.1 + 0.3 * look * (f > GRAB_GOT ? 1 : 0), -0.4 * look, 0));
  }





  /** Arms hanging, hands by the knees, swung forward by `swing` (L, R). */
  private hangArms(swingL: number, swingR: number, out = 180, drop = 1250): void {
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const S = this.joint(`upperArm.${side}`);
      const swing = s > 0 ? swingL : swingR;
      const T = S.clone().add(new THREE.Vector3(s * out, -drop + Math.abs(swing) * 0.25, swing));
      this.reach(`arm.${side}`, T, new THREE.Vector3(s * 0.5, 0, -1), this.handTurn);
    }
  }

  /** How hanging hands are held (tried out on the test page). */
  handTurn: EndTurn = { twist: 1.2, curl: 0.6 };

  private idle(phase: number): void {
    const t = 2 * Math.PI * frac(phase);
    const breath = Math.sin(t);
    this.root([0, -70 + 12 * breath, 0], euler(0.06, 0, 0));
    this.torso([0.08 + 0.02 * breath, 0, 0], [0.05 - 0.03 * breath, 0.08 * Math.sin(t / 2), 0], [-0.08, 0, 0], [-0.06, 0.25 * Math.sin(t / 2 + 1), 0.05 * breath]);
    this.clavicles(0.3 - 0.04 * breath);
    this.hangArms(80, 80, 200, 1220 - 20 * breath);
    this.stand(40);
  }

  private walk(phase: number): void {
    const f = frac(phase);
    const t = 2 * Math.PI * f;
    const L = WALK_STRIDE;
    // body: lowest as the feet change over, swaying over the foot it's on
    this.root(
      [55 * Math.sin(t - 2 * Math.PI * 0.05), -130 + 35 * Math.cos(2 * t - 2 * Math.PI * 0.6), 0],
      euler(0.12, -0.14 * Math.cos(t), -0.05 * Math.sin(t - 0.3)),
    );
    this.torso(
      [0.12, 0.08 * Math.cos(t), 0.03 * Math.sin(t)],
      [0.1 + 0.02 * Math.cos(2 * t), 0.14 * Math.cos(t), 0.03 * Math.sin(t)],
      [-0.12, -0.08 * Math.cos(t), 0],
      [-0.14 + 0.03 * Math.cos(2 * t), -0.06 * Math.cos(t), -0.03 * Math.sin(t)],
    );
    this.clavicles(0.32, 0.08 * Math.cos(t));
    // arms swing against the legs
    this.hangArms(-330 * Math.cos(t), 330 * Math.cos(t), 220, 1200);
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const { along, lift } = stepCycle(f + (s > 0 ? 0 : 0.5));
      const T = new THREE.Vector3(s * 380, GROUND_Y + 210 + 230 * lift, -300 + along * L);
      // toes down as it lifts, level again to land
      this.reach(`leg.${side}`, T, new THREE.Vector3(s * 0.3, 0, 1), euler(-0.5 * lift, 0, 0));
    }
  }

  private climb(phase: number): void {
    const f = frac(phase);
    const t = 2 * Math.PI * f;
    const C = CLIMB_STRIDE;
    const wall = this.wallZ;
    // pulled in to the wall, rising and swaying with each pull
    this.root([45 * Math.sin(t), -60 + 60 * Math.cos(2 * t), wall - 520 + 30 * Math.cos(2 * t)], euler(-0.05, 0.08 * Math.sin(t), 0.06 * Math.sin(t)));
    this.torso([0.02, -0.1 * Math.sin(t), -0.04 * Math.sin(t)], [0, -0.12 * Math.sin(t), 0], [-0.25, 0.1 * Math.sin(t), 0], [-0.3, 0.15 * Math.sin(t), 0]);
    this.clavicles(0.05);
    // hands reach up the wall in turn, the feet push off it diagonally
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const hand = stepCycle(f + (s > 0 ? 0 : 0.5), 0.55);
      const H = new THREE.Vector3(s * 820, 1100 + hand.along * C, wall - 130 - 220 * hand.lift);
      this.reach(`arm.${side}`, H, new THREE.Vector3(s, -1, 0), euler(-0.4, 0, 0));
      const foot = stepCycle(f + (s > 0 ? 0.5 : 0), 0.55);
      const F = new THREE.Vector3(s * 470, -1150 + foot.along * C, wall - 210 - 160 * foot.lift);
      this.reach(`leg.${side}`, F, new THREE.Vector3(s * 1, 0, 0.6), euler(-0.9, 0, 0));
    }
  }

  private roar(phase: number): void {
    const f = frac(phase);
    const secs = f * ROAR_SECONDS;
    // first half beating its chest, then arms up to bellow
    const up = smooth((f - 0.45) / 0.1) * (1 - smooth((f - 0.92) / 0.08));
    const shake = Math.sin(secs * 40) * up;
    this.root([0, -60 - 20 * up, -30 * up], euler(-0.04 - 0.08 * up, 0, 0));
    this.torso(
      [-0.05 - 0.05 * up, 0, 0],
      [-0.08 - 0.08 * up + 0.02 * Math.sin(secs * 25) * (1 - up), 0, 0.01 * shake],
      [-0.1 - 0.15 * up, 0, 0],
      [-0.1 - 0.3 * up + 0.03 * shake, 0, 0.02 * shake],
    );
    this.clavicles(0.25 * (1 - up) - 0.15 * up);
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      // beats: each hand hits four times a second, the two in turn
      const beat = 0.5 + 0.5 * Math.cos(2 * Math.PI * (secs * 4 + (s > 0 ? 0 : 0.5)));
      const hit = beat ** 3;
      const onChest = this.onChest(s * 240, 180, 120);
      const away = this.onChest(s * 560, 300, 600);
      const beatAt = away.lerp(onChest, hit);
      // arms up: about where the bind pose has them
      const raised = this.onChest(s * 1320, 1380 + 40 * shake, 250);
      const T = beatAt.lerp(raised, up);
      const pole = new THREE.Vector3(s, -0.6 * (1 - up), -0.6);
      this.reach(`arm.${side}`, T, pole, { twist: 0.8 * (1 - up), curl: -0.3 * (1 - up) });
    }
    this.stand(60);
  }

  private fall(phase: number): void {
    const k = Math.min(1, phase);
    const settle = smooth((phase - 1) / Math.max(1e-3, FALL_SETTLE));
    const g = this.fallSign > 0 ? -1 : 1; // which way the ground is (behind or in front)
    const flail = (1 - settle) * Math.sin(k * 14);
    // (toppled about the feet, the back or belly would sink into the street)
    this.root([0, -40 * k, -g * (g < 0 ? 620 : 380) * k * k], euler(-0.15 * g * k * (1 - settle), 0, 0));
    this.torso([-0.1 * g * k, 0, 0], [-0.1 * g * k, 0, 0.1 * flail], [-0.2 * g * (1 - settle), 0.6 * settle, 0], [0.3 * g * settle - 0.2 * g * (1 - settle), 0.4 * settle, 0.2 * settle]);
    this.clavicles(0.1 * (1 - settle));
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const S = this.joint(`upperArm.${side}`);
      // flung up and out as it goes, flat out on the ground once down
      const flung = new THREE.Vector3(s * (900 + 200 * flail * s), 700 + 200 * Math.sin(k * 11 + s), g * -300 + 300 * Math.cos(k * 9 + s));
      const flat = new THREE.Vector3(s * 1300, 250 + s * 150, g * 550);
      this.reach(`arm.${side}`, S.clone().add(flung.lerp(flat, settle)), new THREE.Vector3(0, -1, -g), null);
      const H = this.joint(`thigh.${side}`);
      const kick = new THREE.Vector3(s * 200, -780 + 150 * Math.sin(k * 12 + s * 2), 150 * Math.cos(k * 12 + s * 2) - 100 * g);
      const sprawl = new THREE.Vector3(s * (320 + (s > 0 ? 120 : 260)), -760, g * (s > 0 ? 250 : 450));
      this.reach(`leg.${side}`, H.clone().add(kick.lerp(sprawl, settle)), new THREE.Vector3(s * 0.6, 0, 1), null);
    }
  }
}

// --------------------------------------------------------------- animator

/**
 * Plays a rig's clips: advances the phase and blends from the old pose
 * when the clip changes. play() poses the bones there and then; advance()
 * only moves the clip on and leaves the posing (the costly part) to
 * pose(), so something that's animated but not drawn needn't be posed at
 * all (see poseForRender()).
 */
export class RigAnimator<C extends string> {
  phase = 0;
  private from: { q: THREE.Quaternion[]; hips: THREE.Vector3 } | null = null;
  private blend = 1;
  /** advance() has moved on from what the bones show. */
  private dirty = true;
  private readonly bones: THREE.Bone[];
  private readonly scratch = new THREE.Quaternion();
  static BLEND_SECS = 0.35;

  constructor(readonly rig: Rig, public clip: C) {
    this.bones = rig.boneNames.map((n) => rig.bones.get(n)!);
  }

  /** Move `clip`'s phase on by `advance` (or set it to `phase`), without
   *  posing; `restart`: a new clip starts at phase 0. */
  advance(dt: number, clip: C, advance: number, phase?: number, restart = false): void {
    if (clip !== this.clip) {
      if (this.dirty) {
        // (never shown in the old pose: nothing to blend from)
        this.from = null;
        this.blend = 1;
      } else {
        this.from = { q: this.bones.map((b) => b.quaternion.clone()), hips: this.bones[0].position.clone() };
        this.blend = 0;
      }
      this.clip = clip;
      if (restart) this.phase = 0;
    }
    this.phase += advance;
    if (phase !== undefined) this.phase = phase;
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt / RigAnimator.BLEND_SECS);
    this.dirty = true;
  }

  /** Pose the bones as advance() left things (if they aren't already). */
  pose(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.rig.apply(this.clip, this.phase);
    const from = this.from;
    if (!from) return;
    const w = smooth(this.blend);
    this.bones.forEach((b, i) => b.quaternion.slerpQuaternions(from.q[i], this.scratch.copy(b.quaternion), w));
    const hips = this.bones[0].position;
    hips.set(
      from.hips.x + (hips.x - from.hips.x) * w,
      from.hips.y + (hips.y - from.hips.y) * w,
      from.hips.z + (hips.z - from.hips.z) * w,
    );
    if (this.blend >= 1) this.from = null;
  }

  /** advance(), then pose(). */
  play(dt: number, clip: C, advance: number, phase?: number, restart = false): void {
    this.advance(dt, clip, advance, phase, restart);
    this.pose();
  }

  /** Call from the mesh's onBeforeRender: poses it if advance() has left
   *  it unposed, in time for this frame's draw (three has already worked
   *  out the bones' matrices by then, so those are redone). So only
   *  meshes that are actually drawn get posed. */
  poseForRender(): void {
    if (!this.dirty) return;
    this.pose();
    const mesh = this.rig.mesh;
    mesh.updateMatrixWorld(true);
    mesh.skeleton.update();
  }
}

/**
 * Plays the kong's clips: the phase goes by distance for walking and
 * climbing, so the feet and hands don't slide, by time otherwise.
 */
export class KongAnimator extends RigAnimator<KongClip> {
  constructor(override readonly rig: KongRig) {
    super(rig, 'idle');
  }

  /** `travel`: model units moved forward (walking) or up (climbing) since
   *  the last update. `phase`, if given, sets it outright (falling).
   *  `lazy`: don't pose now (see RigAnimator.poseForRender). */
  update(dt: number, clip: KongClip, travel = 0, phase?: number, lazy = false): void {
    const advance = {
      walk: travel / WALK_STRIDE,
      climb: travel / CLIMB_STRIDE,
      roar: dt / ROAR_SECONDS,
      idle: dt / IDLE_SECONDS,
      grab: dt / GRAB_SECONDS,
      bind: 0,
      fall: 0,
    }[clip];
    const restart = clip === 'roar' || clip === 'fall' || clip === 'grab';
    if (lazy) this.advance(dt, clip, advance, phase, restart);
    else this.play(dt, clip, advance, phase, restart);
  }
}

/** A head for the HUD, rendered once with `renderer`: `model` (posed) lit
 *  from the front, seen from `from` (a direction, from `centre`) framing a
 *  ball of radius `r` round `centre`, on a clear background with a soft
 *  shadow round it. A square canvas texture, flipY false. */
export function renderPortrait(renderer: THREE.WebGLRenderer, model: THREE.Object3D, centre: THREE.Vector3, r: number, from: THREE.Vector3, size = 128): THREE.Texture {
  const scene = new THREE.Scene();
  const parent = model.parent;
  scene.add(model);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffee, 2.6);
  sun.position.copy(centre).add(new THREE.Vector3(-0.5, 1, 0).add(from.clone().normalize().multiplyScalar(1.5)));
  sun.target.position.copy(centre);
  scene.add(sun, sun.target);
  scene.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(30, 1, r * 0.05, r * 50);
  camera.position.copy(centre).add(from.clone().setLength(1.6 * r / Math.tan(THREE.MathUtils.degToRad(15))));
  camera.lookAt(centre);
  // render it, read it back
  const px = size * 2;
  const rt = new THREE.WebGLRenderTarget(px, px);
  const prevTarget = renderer.getRenderTarget();
  const prevColor = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  const pixels = new Uint8Array(px * px * 4);
  try {
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(rt, 0, 0, px, px, pixels);
  } finally {
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevColor, prevAlpha);
    rt.dispose();
    if (parent) parent.add(model);
    else scene.remove(model);
  }
  // (rows come back bottom up)
  const raw = document.createElement('canvas');
  raw.width = raw.height = px;
  const img = raw.getContext('2d')!.createImageData(px, px);
  for (let y = 0; y < px; y++) img.data.set(pixels.subarray((px - 1 - y) * px * 4, (px - y) * px * 4), y * px * 4);
  raw.getContext('2d')!.putImageData(img, 0, 0);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.shadowColor = 'rgba(0, 0, 0, 0.85)';
  g.shadowBlur = size * 0.06;
  g.drawImage(raw, size * 0.06, size * 0.06, size * 0.88, size * 0.88);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  return t;
}
