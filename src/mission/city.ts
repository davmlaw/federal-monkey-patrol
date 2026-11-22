// The city: a grid of patches of blocks kept centred on the camera, each
// block a park or a lot subdivided into buildings and skyscrapers.
//
// Layout comes from one MTRand seeded with 42, shared by every city
// generated in a session, so the city is always the same. Generation
// produces plain data per patch, then each patch becomes a handful of
// merged meshes.

import * as THREE from 'three';
import { MTRand } from '../core/mtrand.ts';
import { clampTexture, loadTexture, loadTextureVariant } from '../core/assets.ts';
import { BAYS, Facade, GROUND_BLOCK, facadeMaterial, groundTexture } from './facades.ts';

// Street and sidewalk widths, as fractions of a block
const SIDEWALK_WIDTH_RATIO = 20.0 / 512.0;
const STREET_WIDTH_RATIO = 0.235;

export const BLOCKSIZE = 400.0;
const BLOCKSPERPATCH = 8;
const PATCHES = 8;
const CHILD_LENGTH = BLOCKSIZE * BLOCKSPERPATCH; // one patch
const CITY_LENGTH = CHILD_LENGTH * PATCHES;

const NORTH_BIT = 1 << 0;
const EAST_BIT = 1 << 1;
const SOUTH_BIT = 1 << 2;
const WEST_BIT = 1 << 3;

// One generator for every patch, in the order they are generated (so a
// patch's contents depend on what was generated before it).
const mt = new MTRand(42);

// ------------------------------------------------------------ patch data

/** Something placed on the ground at (x, z). */
interface Spot { x: number; z: number }

/** A lot from the generator: centre (x, z), size w (x) by l (z), height h. */
interface LotData extends Spot { w: number; h: number; l: number; floors: number; invWin: number }

interface SkyscraperData extends Spot {
  w: number;
  windowSize: number;
  /** Alternating vertical (floors) and horizontal (inset) steps. */
  step: number[];
  spire: number;
  /** Forces a crown style (otherwise picked by styleRandom()). */
  crown?: Crown;
}

interface ParkData extends Spot { w: number; l: number }
interface BlockData extends Spot { park: boolean }

/** A cross tree: centre (x, y, z), size w x h, turned rot degrees, texture
 *  index tex, tinted by g (optional). */
interface TreeData extends Spot { y: number; w: number; h: number; rot?: number; tex: number; g?: number }

interface PatchData {
  buildings: LotData[];
  skyscrapers: SkyscraperData[];
  parks: ParkData[];
  trees: TreeData[];
  blocks: BlockData[];
}

// =============================================================== generation

/** A quadtree of city blocks / parks, as a flat list. */
function cityGenerator(out: PatchData, width: number, minSideLength: number, x: number, z: number): void {
  if (width > minSideLength) {
    // Quadtree children: 0 = (-x,+z), 1 = (+x,+z), 2 = (-x,-z), 3 = (+x,-z)
    const d = width / 4;
    const w = width / 2;
    cityGenerator(out, w, minSideLength, x - d, z + d);
    cityGenerator(out, w, minSideLength, x + d, z + d);
    cityGenerator(out, w, minSideLength, x - d, z - d);
    cityGenerator(out, w, minSideLength, x + d, z - d);
  } else {
    const len = width * (1.0 - (STREET_WIDTH_RATIO + SIDEWALK_WIDTH_RATIO));
    const park = mt.rand() < 0.1;
    out.blocks.push({ x, z, park }); // (for the street furniture)
    if (park) parkland(out, len, len, x, z);
    else cityBlock(out, len, x, z);
  }
}

// blocks
const UPPER_BOUNDS = 500;
const LOWER_BOUNDS = 100;
const MIN_HEIGHT = 150.0;
const BUILDING_HEIGHT_VAR = 300;
const SKYSCRAPER_CHANCE = 25; // percent
const HEIGHT_VARIATION = 20;
const MIN_BUILDING_WIDTH = 80.0;
const SPACING = 5.0;

function cityBlock(out: PatchData, length: number, x: number, z: number): void {
  const height = MIN_HEIGHT + mt.rand() * BUILDING_HEIGHT_VAR;
  subdivideBlock(out, { x, z }, length, length, height, NORTH_BIT | EAST_BIT | SOUTH_BIT | WEST_BIT);
}

/** Use curb to make sure that the subdivision isn't landlocked. */
function subdivideBlock(out: PatchData, pos: Spot, xSpan: number, zSpan: number, height: number, curb: number): void {
  if (height > LOWER_BOUNDS && height < UPPER_BOUNDS) {
    height += mt.rand() * HEIGHT_VARIATION - 2 * HEIGHT_VARIATION;
  }
  const shortest = Math.min(xSpan, zSpan);
  // stop subdividing if not enough space
  if (shortest < 2 * MIN_BUILDING_WIDTH) {
    building(out, xSpan, height, zSpan, pos);
    return;
  }
  if (mt.rand() * 100.0 < SKYSCRAPER_CHANCE) {
    height += shortest * 5.0;
    skyscraper(out, shortest, height, pos);
    return;
  }
  if ((xSpan >= zSpan || !(curb & (WEST_BIT | EAST_BIT))) && curb & (NORTH_BIT | SOUTH_BIT)) {
    // HORIZONTAL (X) SPLIT
    xSpan -= SPACING;
    let len = MIN_BUILDING_WIDTH;
    const extra = Math.trunc(xSpan - 2 * MIN_BUILDING_WIDTH);
    if (extra > 0) len += mt.rand() * extra;
    const ox = xSpan / 2 + SPACING * 0.5;
    subdivideBlock(out, { x: pos.x - ox + len / 2, z: pos.z }, len, zSpan, height, curb & ~EAST_BIT);
    subdivideBlock(out, { x: pos.x + ox - (xSpan - len) / 2, z: pos.z }, xSpan - len, zSpan, height, curb & ~WEST_BIT);
  } else {
    // VERTICAL (Z) SPLIT
    zSpan -= SPACING;
    let len = MIN_BUILDING_WIDTH;
    const extra = Math.trunc(zSpan - 2 * MIN_BUILDING_WIDTH);
    if (extra > 0) len += mt.rand() * extra;
    const oz = zSpan / 2 + SPACING * 0.5;
    subdivideBlock(out, { x: pos.x, z: pos.z + oz - len / 2 }, xSpan, len, height, curb & ~SOUTH_BIT);
    subdivideBlock(out, { x: pos.x, z: pos.z - oz + (zSpan - len) / 2 }, xSpan, zSpan - len, height, curb & ~NORTH_BIT);
  }
}

// buildings and skyscrapers
const APPROX_WINDOW_SIZE = 18;

function building(out: PatchData, xSize: number, ySize: number, zSize: number, pos: Spot): void {
  const floors = Math.trunc(ySize / APPROX_WINDOW_SIZE);
  if (floors < 1) throw new Error('building has <1 floors');
  // Two numbers no longer used (a texture choice and a grey level), still
  // drawn so the sequence for everything after them stays the same.
  mt.randInt(0);
  mt.rand();
  out.buildings.push({ x: pos.x, z: pos.z, w: xSize, h: ySize, l: zSize, floors, invWin: 1.0 / (ySize / floors) });
}

const SPIRE_MIN_SKYSCRAPER_HEIGHT = 1000.0;
const SPIRE_CHANCE_RATIO = 0.3;
const STRETCHY_BELLY_RATIO = 0.4;

function skyscraper(out: PatchData, w: number, h: number, pos: Spot): void {
  let spire = 0;
  if (h >= SPIRE_MIN_SKYSCRAPER_HEIGHT && mt.rand() < SPIRE_CHANCE_RATIO) {
    spire = h * 0.2;
    h -= spire;
  }
  let floors = Math.trunc(h / APPROX_WINDOW_SIZE);
  if (floors < 1) throw new Error('Skyscraper has <1 floors');
  const windowSize = h / floors;
  const stretchyBellyFloors = Math.trunc(floors * STRETCHY_BELLY_RATIO * 0.01);
  floors -= stretchyBellyFloors;

  // STEPS (even count: alternating vertical, horizontal)
  let numSteps = Math.trunc(floors / (mt.randInt(4) + 10)) * 2;
  numSteps = Math.max(2, numSteps);
  const step = new Array<number>(numSteps).fill(0);

  // VERTICAL STEPS. Knuth's selection sampling: pick m out of n floors.
  let m = numSteps / 2;
  const n = floors;
  let s = 0;
  let last = 0;
  for (let i = 0; i < n; i++) {
    if (mt.randInt(n - i - 1) < m) {
      step[s] = i - last;
      s += 2;
      last = i;
      m--;
    }
  }
  // Adjust for rounding errors to get it up to requested height
  if (last !== floors) step[0] += floors - last;
  // stretch the middle...
  step[Math.trunc(numSteps / 4) * 2] += stretchyBellyFloors;
  // HORIZONTAL STEPS
  for (let j = 1; j < numSteps; j += 2) step[j] = (w / 2.0) / (numSteps / 2.0);

  mt.randInt(0); // unused (see building())
  mt.rand();
  out.skyscrapers.push({ x: pos.x, z: pos.z, w, windowSize, step, spire });
}

// parks
const TREE_SIZE = 100.0;
const TREE_VARIANCE = 10;
const TREE_DENSITY = 0.12;
const NUM_TREES = 4; // TREE_TEXTURES

function parkland(out: PatchData, xLength: number, zLength: number, px: number, pz: number): void {
  out.parks.push({ x: px, z: pz, w: xLength, l: zLength });
  const hx = xLength / 2;
  const xi = 20.0 * xLength / (TREE_SIZE + TREE_VARIANCE);
  const hz = zLength / 2;
  const zi = 20.0 * zLength / (TREE_SIZE + TREE_VARIANCE);
  for (let x = -hx; x < hx; x += xi) {
    for (let z = -hz; z < hz; z += zi) {
      if (mt.rand() < TREE_DENSITY) {
        const height = TREE_SIZE + mt.rand() * TREE_VARIANCE;
        const rot = mt.rand() * 90.0;
        const tex = mt.randInt(NUM_TREES - 1);
        out.trees.push({ x: px + x, y: height * 0.5, z: pz + z, w: height / 3, h: height, rot, tex });
      }
    }
  }
}

/** Generate one patch's contents, centred on (cx, cz). */
function generatePatch(cx: number, cz: number): PatchData {
  const out: PatchData = { buildings: [], skyscrapers: [], parks: [], trees: [], blocks: [] };
  cityGenerator(out, CHILD_LENGTH, BLOCKSIZE, cx, cz);
  return out;
}

// ================================================================= geometry

/** [x, z] */
type Corner = readonly number[];
/** [x, y, z, u, v] */
type Vertex = readonly number[];
type RGB = readonly number[];

/** Collects triangles; `color` and `layer` apply to what is added next. */
interface Builder {
  color: RGB | null;
  layer: number;
  tri(a: Vertex, b: Vertex, c: Vertex): void;
  quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex): void;
  /** Notes a solid: the bounding box of `ring` (shrunk about its centre by
   *  k) from y0 to y1, for collisions. */
  solid(ring: Corner[], y0: number, y1: number, k?: number): void;
}

/** An axis-aligned box, for collisions. */
export interface Box { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }

/** Where a sweep hit something (see CityGrid.sweep). */
export interface Hit { t: number; point: THREE.Vector3; normal: THREE.Vector3 }

class GeomBuilder implements Builder {
  private pos: number[] = [];
  private uv: number[] = [];
  private col: number[] = [];
  private lay: number[] = [];
  color: RGB | null = [1, 1, 1]; // vertex colour for what's added next
  layer = 0; // facade texture layer for what's added next
  /** Where solid() notes collision boxes (only the lite builders do). */
  boxes: Box[] | null = null;

  solid(ring: Corner[], y0: number, y1: number, k = 1): void {
    if (!this.boxes || y1 <= y0) return;
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const [x, z] of ring) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const hx = (x1 - x0) / 2 * k;
    const hz = (z1 - z0) / 2 * k;
    this.boxes.push({ x0: cx - hx, y0, z0: cz - hz, x1: cx + hx, y1, z1: cz + hz });
  }

  tri(a: Vertex, b: Vertex, c: Vertex): void {
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.uv.push(a[3], a[4], b[3], b[4], c[3], c[4]);
    const [r, g, bl] = this.color ?? [1, 1, 1];
    this.col.push(r, g, bl, r, g, bl, r, g, bl);
    this.lay.push(this.layer, this.layer, this.layer);
  }

  /** quad a-b-c-d anticlockwise seen from the front */
  quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex): void {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  build({ normals = true, colors = false, layers = false } = {}): THREE.BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (layers) g.setAttribute('layer', new THREE.Float32BufferAttribute(this.lay, 1));
    if (normals) g.computeVertexNormals(); // non-indexed: flat face normals
    g.computeBoundingSphere();
    return g;
  }
}

/** A GeomBuilder that throws its geometry away: the far (lite) versions of
 *  buildings run the same code, so they use the same random numbers, but
 *  send the detail they leave out here. */
const NULL: Builder = { tri() {}, quad() {}, solid() {}, color: null, layer: 0 };

// ======================================================= buildings: styling
//
// Wall textures, cornices, rooftop water towers, and skyscrapers in the
// style of 1910s-30s New York. The generator above decides where every
// building goes and how tall and wide it is; the styling below uses its own
// random numbers, hashed from the building's position, so it leaves the
// layout sequence alone and a given building always looks the same.

/** mulberry32, seeded from a position: deterministic per building. */
interface StyleRandom {
  next(): number;
  range(lo: number, hi: number): number;
  pick<T>(arr: readonly T[]): T;
  chance(p: number): boolean;
}

function styleRandom(x: number, z: number, salt = 0): StyleRandom {
  let a = (Math.imul(Math.round(x * 8), 73856093) ^ Math.imul(Math.round(z * 8), 19349663) ^ Math.imul(salt + 1, 83492791)) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next();
  return {
    next,
    range: (lo: number, hi: number) => lo + next() * (hi - lo),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
  };
}

/** Weighted pick from [[weight, value], ...] */
function weighted<T>(rnd: StyleRandom, options: readonly (readonly [number, T])[]): T {
  let r = rnd.next() * options.reduce((t, o) => t + o[0], 0);
  for (const [w, v] of options) {
    r -= w;
    if (r < 0) return v;
  }
  return options[options.length - 1][1];
}

const SKYSCRAPER_FACADES: [number, Facade][] = [[3, Facade.DECO_LIMESTONE], [3, Facade.SETBACK_BRICK], [2, Facade.TERRACOTTA], [2, Facade.DARK_BRICK], [2, Facade.BRICK_BUFF], [1, Facade.GOTHIC]];

// Trim colours (vertex coloured, lit). The metal crowns are kept greyish
// (tarnished copper, dull brass) for the old-movie look (core/filmlook.ts).
const C = {
  roof: [0.36, 0.36, 0.37],
  stone: [0.80, 0.76, 0.68],
  darkstone: [0.42, 0.40, 0.38],
  copper: [0.46, 0.53, 0.50],
  steel: [0.78, 0.79, 0.80],
  steel2: [0.66, 0.67, 0.68],
  gold: [0.68, 0.62, 0.48],
  wood: [0.42, 0.30, 0.20],
  iron: [0.22, 0.22, 0.24],
  tin: [0.30, 0.29, 0.27], // pressed-metal cornices
  brick: [0.50, 0.30, 0.24],
};

/** Corners of a w x l rectangle, in the winding the walls and caps use. */
function rect(cx: number, cz: number, hx: number, hz: number): Corner[] {
  return [[cx - hx, cz + hz], [cx + hx, cz + hz], [cx + hx, cz - hz], [cx - hx, cz - hz]];
}

/** Corners of a regular polygon (sides >= 3), same winding as rect(). */
function poly(cx: number, cz: number, r: number, sides: number, phase = Math.PI / sides): Corner[] {
  const out: Corner[] = [];
  for (let i = 0; i < sides; i++) {
    const a = phase + (i / sides) * Math.PI * 2 - Math.PI / 2;
    out.push([cx + r * Math.sin(a), cz + r * Math.cos(a)]);
  }
  return out;
}

/**
 * Walls between two rings of corners (same count), from y0 to y1: straight
 * walls when the rings match, a tapering frustum otherwise. With a window
 * size, the walls are textured a whole number of windows across and one
 * floor per window, v=0 at the top. Not `closed`: an open run of walls,
 * with no wall from the last corner back to the first.
 */
function walls(gb: Builder, lower: Corner[], upper: Corner[], y0: number, y1: number, ws = 0, closed = true): void {
  const n = lower.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a0 = lower[i];
    const b0 = lower[(i + 1) % n];
    const a1 = upper[i];
    const b1 = upper[(i + 1) % n];
    let u = 0;
    let v0 = 0;
    let v1 = 0;
    if (ws) {
      u = Math.max(1, Math.round(Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) / ws));
      v0 = -y0 / ws;
      v1 = -y1 / ws;
    }
    gb.quad([a1[0], y1, a1[1], 0, v1], [a0[0], y0, a0[1], 0, v0], [b0[0], y0, b0[1], u, v0], [b1[0], y1, b1[1], u, v1]);
  }
}

/** Flat cap over a ring of corners at height y, facing up (or down). */
function cap(gb: Builder, ring: Corner[], y: number, down = false): void {
  for (let i = 1; i + 1 < ring.length; i++) {
    const a = [ring[0][0], y, ring[0][1], 0, 0];
    const b = [ring[i][0], y, ring[i][1], 0, 0];
    const c = [ring[i + 1][0], y, ring[i + 1][1], 0, 0];
    if (down) gb.tri(a, c, b);
    else gb.tri(a, b, c);
  }
}

/**
 * Textured walls round a ring of corners, one face at a time: each face is a
 * whole number of window bays across (starting on a bay at a random offset
 * into the tile, so neighbouring faces differ), and the texture rows run
 * from `v0` at y0 to `v1` at y1, in floors (tile rows).
 */
interface FaceOptions { layer: number; ws: number; v0: number; v1: number; rnd?: StyleRandom | null }

function faces(gb: Builder, ring: Corner[], y0: number, y1: number, { layer, ws, v0, v1, rnd = null }: FaceOptions): void {
  gb.layer = layer;
  gb.solid(ring, y0, y1);
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const bays = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / ws));
    const u0 = rnd ? Math.floor(rnd.next() * BAYS) : 0;
    const U0 = u0 / BAYS;
    const U1 = (u0 + bays) / BAYS;
    const V0 = v0 / BAYS;
    const V1 = v1 / BAYS;
    gb.quad([a[0], y1, a[1], U0, V1], [a[0], y0, a[1], U0, V0], [b[0], y0, b[1], U1, V0], [b[0], y1, b[1], U1, V1]);
  }
}

/** Walls whose floors are counted up from yRef (row boundaries on floors). */
function floors(gb: Builder, ring: Corner[], y0: number, y1: number, layer: number, ws: number, yRef: number,
  rnd: StyleRandom): void {
  faces(gb, ring, y0, y1, { layer, ws, v0: -(y0 - yRef) / ws, v1: -(y1 - yRef) / ws, rnd });
}

/** Tar roof, textured in world space. */
function roofCap(gb: Builder, ring: Corner[], y: number): void {
  gb.layer = Facade.ROOF;
  const k = 1 / 160;
  for (let i = 1; i + 1 < ring.length; i++) {
    const P = (p: Corner): Vertex => [p[0], y, p[1], p[0] * k, p[1] * k];
    gb.tri(P(ring[0]), P(ring[i]), P(ring[i + 1]));
  }
}

/** A solid block (prism) of the given colour on the trim builder. */
function block(gb: Builder, ring: Corner[], y0: number, y1: number, color: RGB, top = ring, capped = true): void {
  gb.color = color;
  gb.solid(ring, y0, y1);
  walls(gb, ring, top, y0, y1);
  if (capped) cap(gb, top, y1);
}

/** Point (pyramid / spire) over a ring of corners. */
function point(gb: Builder, ring: Corner[], y0: number, y1: number, color: RGB): void {
  const cx = ring.reduce((t, p) => t + p[0], 0) / ring.length;
  const cz = ring.reduce((t, p) => t + p[1], 0) / ring.length;
  gb.color = color;
  // a pyramid, as three boxes narrowing upwards
  const h = y1 - y0;
  gb.solid(ring, y0, y0 + h * 0.3, 0.85);
  gb.solid(ring, y0 + h * 0.3, y0 + h * 0.6, 0.5);
  gb.solid(ring, y0 + h * 0.6, y1, 0.2);
  const apex = [cx, y1, cz, 0, 0];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    gb.tri(apex, [a[0], y0, a[1], 0, 0], [b[0], y0, b[1], 0, 0]);
  }
}

// Cornices overhang less than half the SPACING between lots, so the
// ledges of neighbouring buildings never overlap (coplanar overlaps z-fight).
const MAX_OVERHANG = SPACING / 2 - 0.1;

/** Overhanging ledge around the top of a wall at y: a band and its top,
 *  leaving the middle open for the roof. (No underside: it is thin enough
 *  not to be missed from the street.) `flush` lists the sides shared with
 *  an adjoining building ('-x', '+x', '-z', '+z'), which get no overhang. */
type Side = '-x' | '+x' | '-z' | '+z';

function cornice(gb: Builder, cx: number, cz: number, hx: number, hz: number, y: number, depth: number,
  overhang: number, color: RGB, flush: readonly Side[] = []): void {
  const inner = rect(cx, cz, hx, hz);
  const o = Math.min(overhang, MAX_OVERHANG);
  const side = (s: Side): number => (flush.includes(s) ? 0 : o);
  const x0 = cx - hx - side('-x');
  const x1 = cx + hx + side('+x');
  const z0 = cz - hz - side('-z');
  const z1 = cz + hz + side('+z');
  const outer: Corner[] = [[x0, z1], [x1, z1], [x1, z0], [x0, z0]];
  gb.color = color;
  // The band, except on shared sides: there it would lie in the plane of
  // the building's own wall and z-fight with it wherever the neighbour is
  // lower. (rect() order: the edges run +z, +x, -z, -x.)
  const edges: Side[] = ['+z', '+x', '-z', '-x'];
  for (let i = 0; i < 4; i++) {
    if (flush.includes(edges[i])) continue;
    walls(gb, [outer[i], outer[(i + 1) % 4]], [outer[i], outer[(i + 1) % 4]], y - depth, y, 0, false);
  }
  const P = (p: Corner): Vertex => [p[0], y, p[1], 0, 0];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    gb.quad(P(inner[i]), P(outer[i]), P(outer[j]), P(inner[j]));
  }
}

/** The classic New York rooftop water tank on its stand, with a conical hat. */
function waterTower(gb: Builder, x: number, z: number, r: number, y: number): void {
  const base = y + r * 0.8;
  block(gb, rect(x, z, r * 0.6, r * 0.6), y, base, C.iron, undefined, false);
  const tank = poly(x, z, r, 8);
  gb.color = C.wood;
  walls(gb, tank, tank, base, base + r * 1.6);
  point(gb, poly(x, z, r * 1.08, 8), base + r * 1.6, base + r * 2.3, C.iron);
}

const WS = APPROX_WINDOW_SIZE; // floor height of the new midrise buildings
const GROUND_FLOOR = WS * 1.3; // shop fronts are taller

/** One building's footprint: centre, half sizes, and the sides it shares. */
interface Lot extends Spot { hx: number; hz: number; flush: Side[] }

/**
 * A lot is split into narrower buildings along its longer side, as
 * Manhattan's 25-100 foot lots were, each one a walk-up, a loft or a taller
 * apartment/office building.
 */
function addBuilding(fb: Builder, trim: Builder, b: LotData, lite = false): void {
  const rnd = styleRandom(b.x, b.z, 1);
  const alongX = b.w >= b.l;
  const span = alongX ? b.w : b.l;
  const pieces: number[] = [];
  let left = span;
  while (left > 130) {
    const p = rnd.range(42, 100);
    pieces.push(p);
    left -= p;
  }
  pieces.push(left);
  let start = -span / 2;
  const axis = alongX ? 'x' : 'z';
  pieces.forEach((p, i) => {
    const c = start + p / 2;
    start += p;
    const lot: Lot = alongX
      ? { x: b.x + c, z: b.z, hx: p / 2, hz: b.l / 2, flush: [] }
      : { x: b.x, z: b.z + c, hx: b.w / 2, hz: p / 2, flush: [] };
    // the sides it shares with its neighbours in the row
    if (i > 0) lot.flush.push(`-${axis}`);
    if (i < pieces.length - 1) lot.flush.push(`+${axis}`);
    addMidrise(fb, trim, lot, b.h, styleRandom(lot.x, lot.z, 3), lite);
  });
}

/**
 * One building. `lite` is the far level of detail: the walls go down to the
 * pavement in one face (no storefront or lobby band) and there is no trim
 * (cornices, bulkheads, water tanks).
 */
function addMidrise(fb: Builder, trimBuilder: Builder, lot: Lot, lotHeight: number, rnd: StyleRandom, lite = false): void {
  const trim = lite ? NULL : trimBuilder;
  const base0 = lite ? NULL : fb;
  const maxFloors = Math.max(3, Math.floor(lotHeight / WS));
  const kind = weighted<'walkup' | 'loft' | 'tall'>(rnd, maxFloors >= 9
    ? [[35, 'walkup'], [30, 'loft'], [35, 'tall']]
    : [[60, 'walkup'], [40, 'loft']]);
  let nFloors: number;
  let layer: Facade;
  let base: 'shops' | 'lobby' | 'none' = 'shops';
  if (kind === 'walkup') {
    nFloors = Math.min(maxFloors, 4 + Math.floor(rnd.next() * 3));
    layer = weighted(rnd, [[3, Facade.TENEMENT], [3, Facade.BRICK_RED], [2, Facade.BROWNSTONE], [2, Facade.BRICK_BUFF]]);
    if (rnd.chance(0.25)) base = 'none';
  } else if (kind === 'loft') {
    nFloors = Math.min(maxFloors, 8 + Math.floor(rnd.next() * 7));
    layer = weighted(rnd, [[4, Facade.LOFT], [2, Facade.BRICK_BUFF], [2, Facade.TERRACOTTA], [1, Facade.BRICK_RED]]);
  } else {
    nFloors = maxFloors;
    layer = weighted(rnd, [[3, Facade.BRICK_RED], [3, Facade.BRICK_BUFF], [2, Facade.SETBACK_BRICK], [2, Facade.DARK_BRICK], [1, Facade.DECO_LIMESTONE], [1, Facade.TERRACOTTA]]);
    base = rnd.chance(0.45) ? 'lobby' : 'shops';
  }
  const ring = rect(lot.x, lot.z, lot.hx, lot.hz);
  // ground floor
  let y = 0;
  if (base === 'shops') {
    y = GROUND_FLOOR;
    const row = Math.floor(rnd.next() * BAYS);
    faces(base0, ring, 0, y, { layer: Facade.STOREFRONT, ws: WS, v0: row + 1, v1: row, rnd });
  } else if (base === 'lobby') {
    y = 2 * WS;
    const v = rnd.chance(0.5) ? 0 : 2;
    faces(base0, ring, 0, y, { layer: Facade.LOBBY, ws: WS, v0: v + 2, v1: v, rnd });
  }
  const yRef = y;
  // a setback of a few floors on top of some taller buildings
  const setback = kind === 'tall' && nFloors > 12 && rnd.chance(0.4) ? 2 + Math.floor(rnd.next() * 3) : 0;
  const top = yRef + (nFloors - (base === 'none' ? 0 : base === 'lobby' ? 2 : 1)) * WS;
  const body = top - setback * WS;
  floors(fb, ring, lite ? 0 : y, body, layer, WS, yRef, rnd);
  const trimColor = kind === 'walkup' ? weighted(rnd, [[3, C.tin], [2, C.stone], [1, C.darkstone]]) : weighted(rnd, [[2, C.stone], [1, C.darkstone], [1, C.tin]]);
  roofCap(fb, ring, body);
  cornice(trim, lot.x, lot.z, lot.hx, lot.hz, body, WS * (kind === 'walkup' ? 0.55 : 0.4), WS * (kind === 'walkup' ? 0.22 : 0.14), trimColor, lot.flush);
  let roofTop = body;
  let hx = lot.hx;
  let hz = lot.hz;
  if (setback) {
    hx *= 0.72;
    hz *= 0.72;
    const r2 = rect(lot.x, lot.z, hx, hz);
    floors(fb, r2, body, top, layer, WS, yRef, rnd);
    roofCap(fb, r2, top);
    cornice(trim, lot.x, lot.z, hx, hz, top, WS * 0.3, WS * 0.1, trimColor);
    roofTop = top;
  }
  // rooftop: stair bulkhead, water tank
  if (nFloors > 5 && Math.min(hx, hz) > 18 && rnd.chance(0.6)) {
    const bx = lot.x + rnd.range(-0.4, 0.4) * hx;
    const bz = lot.z + rnd.range(-0.4, 0.4) * hz;
    block(trim, rect(bx, bz, WS * 0.5, WS * 0.7), roofTop, roofTop + WS * 0.9, C.brick);
  }
  if (nFloors > 5 && Math.min(hx, hz) > 22 && rnd.chance(kind === 'walkup' ? 0.15 : 0.45)) {
    const r = WS * rnd.range(0.55, 0.75);
    waterTower(trim, lot.x + rnd.range(-1, 1) * (hx - r * 1.5), lot.z + rnd.range(-1, 1) * (hz - r * 1.5), r, roofTop);
  }
}

// ======================================================= skyscrapers

const Crown = {
  FLAT: 'flat', DECO: 'deco', EMPIRE: 'empire', CHRYSLER: 'chrysler', GOTHIC: 'gothic', TEMPLE: 'temple',
} as const;
type Crown = (typeof Crown)[keyof typeof Crown];

/**
 * A 1916-zoning-law skyscraper: a podium filling the lot, a few setbacks,
 * then a tower shaft on a quarter of the lot or so, and a crown. Height and
 * width come from the generator (its stepped profile and spire);
 * everything else from styleRandom().
 */
function addSkyscraper(fb: Builder, trimBuilder: Builder, sk: SkyscraperData, lite = false): void {
  // lite (far) version: no lobby band or ledges, and a simple point in
  // place of the metal crowns (on trimBuilder, the only trim drawn)
  const trim = lite ? NULL : trimBuilder;
  const base0 = lite ? NULL : fb;
  const rnd = styleRandom(sk.x, sk.z, 2);
  const ws = sk.windowSize;
  let H = 0;
  for (let j = 0; j < sk.step.length; j += 2) H += sk.step[j] * ws;
  const W = sk.w / 2;
  const tall = H + sk.spire > 900;
  const crown: Crown = sk.crown ?? (sk.spire > 0
    ? weighted<Crown>(rnd, [[3, Crown.EMPIRE], [3, Crown.CHRYSLER], [1, Crown.GOTHIC]])
    : weighted<Crown>(rnd, tall
      ? [[2, Crown.FLAT], [3, Crown.DECO], [2, Crown.EMPIRE], [2, Crown.CHRYSLER], [2, Crown.GOTHIC], [2, Crown.TEMPLE]]
      : [[4, Crown.FLAT], [3, Crown.DECO], [1, Crown.GOTHIC], [2, Crown.TEMPLE]]));
  const layer = crown === Crown.GOTHIC && rnd.chance(0.7) ? Facade.GOTHIC : weighted(rnd, SKYSCRAPER_FACADES);
  const lobby = 2 * ws; // floors are counted from the top of the lobby
  const wall = (ring: Corner[], y0: number, y1: number): void => floors(fb, ring, lite ? y0 : Math.max(y0, lobby), y1, layer, ws, lobby, rnd);
  const trimColor = rnd.chance(0.6) ? C.stone : C.darkstone;

  // How much of the height goes on the crown, then the body's tiers.
  const crownH = ({
    flat: 0, deco: 0.08, empire: 0.1, chrysler: 0.16, gothic: 0.12, temple: 0.12,
  } satisfies Record<Crown, number>)[crown] * H;
  const bodyH = H - crownH;
  const T = W * rnd.range(0.42, 0.58); // tower half-width
  const podiumH = Math.max(ws * 3, bodyH * rnd.range(0.12, 0.3));
  const setbacks = tall ? 2 + Math.floor(rnd.next() * 3) : 1 + Math.floor(rnd.next() * 2);
  const tiers: { half: number; top: number }[] = [{ half: W, top: podiumH }];
  let y = podiumH;
  for (let i = 1; i <= setbacks; i++) {
    y += Math.max(ws * 2, bodyH * rnd.range(0.04, 0.09));
    tiers.push({ half: W - (W - T) * (i / (setbacks + 1)), top: y });
  }
  tiers.push({ half: T, top: Math.max(y + ws * 4, bodyH) });

  // Snap tier tops to whole floors, draw each with a ledge and a flat roof.
  let y0 = 0;
  for (const t of tiers) {
    const y1 = Math.max(y0 + ws, lobby + ws, Math.round(t.top / ws) * ws);
    const ring = rect(sk.x, sk.z, t.half, t.half);
    if (y0 === 0) {
      const v = rnd.chance(0.5) ? 0 : 2;
      faces(base0, ring, 0, lobby, { layer: Facade.LOBBY, ws, v0: v + 2, v1: v, rnd });
    }
    wall(ring, y0, y1);
    roofCap(fb, ring, y1);
    cornice(trim, sk.x, sk.z, t.half, t.half, y1, ws * 0.4, ws * 0.15, trimColor);
    y0 = y1;
  }
  const top = y0;
  const r = (k: number): Corner[] => rect(sk.x, sk.z, T * k, T * k);
  const oct = (k: number): Corner[] => poly(sk.x, sk.z, T * k, 8);

  switch (crown) {
    case Crown.FLAT: {
      // penthouse, maybe a water tank
      const ph = ws * rnd.range(1.5, 2.5);
      block(trim, r(0.55), top, top + ph, trimColor);
      if (rnd.chance(0.6)) waterTower(trim, sk.x + T * 0.55, sk.z - T * 0.55, ws * 0.7, top);
      break;
    }
    case Crown.DECO: {
      // stepped deco top: three narrowing setbacks, each a band of windows
      let yy = top;
      const n = 3;
      for (let i = 0; i < n; i++) {
        const k = 0.85 - i * 0.2;
        const ring = r(k);
        const y1 = yy + crownH / n;
        wall(ring, yy, y1);
        roofCap(fb, ring, y1);
        cornice(trim, sk.x, sk.z, T * k, T * k, y1, ws * 0.3, ws * 0.1, trimColor);
        yy = y1;
      }
      if (rnd.chance(0.5)) block(trim, r(0.05), yy, yy + ws * 3, C.iron); // flagpole
      break;
    }
    case Crown.EMPIRE: {
      // narrow setbacks, then a mooring mast
      const s1 = top + crownH * 0.35;
      wall(r(0.7), top, s1);
      roofCap(fb, r(0.7), s1);
      cornice(trim, sk.x, sk.z, T * 0.7, T * 0.7, s1, ws * 0.3, ws * 0.1, trimColor);
      const s2 = s1 + crownH * 0.25;
      block(trim, r(0.45), s1, s2, trimColor);
      const s3 = s2 + crownH * 0.4;
      block(trim, oct(0.28), s2, s3, C.steel, oct(0.2));
      const needle = Math.max(crownH * 0.5, sk.spire * 0.5);
      point(trim, oct(0.06), s3, s3 + needle, C.steel);
      break;
    }
    case Crown.CHRYSLER: {
      // stacked, narrowing steel rings with arched windows, then a needle
      const n = 5;
      let yy = top;
      block(trim, oct(0.95), yy, yy + ws, trimColor);
      yy += ws;
      for (let i = 0; i < n; i++) {
        // a straight band, then a sloping step in to the next one
        const k = 0.9 - i * 0.15;
        const band = yy + crownH / n * 0.6;
        const y1 = yy + crownH / n;
        const color = i & 1 ? C.steel : C.steel2;
        block(trim, oct(k), yy, band, color, undefined, false);
        block(trim, oct(k), band, y1, color, oct(k - 0.12));
        yy = y1;
      }
      point(trim, oct(0.12), yy, yy + Math.max(crownH * 0.5, sk.spire * 0.5), C.steel);
      break;
    }
    case Crown.GOTHIC: {
      // steep copper roof with corner pinnacles and a lantern (Woolworth)
      const base = top + ws * 0.5;
      block(trim, r(0.95), top, base, trimColor);
      const roofTop = base + crownH * 0.75;
      const lantern = r(0.18);
      block(trim, r(0.9), base, roofTop, C.copper, r(0.22));
      block(trim, lantern, roofTop, roofTop + crownH * 0.12, trimColor);
      point(trim, r(0.2), roofTop + crownH * 0.12, roofTop + crownH * 0.25 + sk.spire, C.copper);
      for (const [px, pz] of rect(sk.x, sk.z, T * 0.85, T * 0.85)) {
        const pin = rect(px, pz, T * 0.07, T * 0.07);
        block(trim, pin, base, base + crownH * 0.25, trimColor);
        point(trim, pin, base + crownH * 0.25, base + crownH * 0.4, C.copper);
      }
      break;
    }
    case Crown.TEMPLE: {
      // colonnade, stepped gilded pyramid, lantern (Municipal / NY Life)
      const colTop = top + crownH * 0.35;
      block(trim, r(0.8), top, colTop, C.stone);
      cornice(trim, sk.x, sk.z, T * 0.8, T * 0.8, colTop, ws * 0.3, ws * 0.12, C.stone);
      let yy = colTop;
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const y1 = yy + crownH * 0.4 / steps;
        block(trim, r(0.75 - i * 0.13), yy, y1, C.gold, r(0.68 - i * 0.13));
        yy = y1;
      }
      block(trim, oct(0.14), yy, yy + crownH * 0.15, C.gold);
      point(trim, oct(0.14), yy + crownH * 0.15, yy + crownH * 0.25, C.gold);
      break;
    }
    default:
  }
  if (lite) crownProxy(trimBuilder, crown, sk, T, top, crownH, ws);
}

/** The far version of a crown: a tapering shaft and a point, the same
 *  height as the real one. */
function crownProxy(gb: Builder, crown: Crown, sk: SkyscraperData, T: number, top: number, crownH: number,
  ws: number): void {
  const oct = (k: number): Corner[] => poly(sk.x, sk.z, T * k, 8);
  const r = (k: number): Corner[] => rect(sk.x, sk.z, T * k, T * k);
  const needle = Math.max(crownH * 0.5, sk.spire * 0.5);
  switch (crown) {
    case Crown.EMPIRE:
      block(gb, r(0.7), top, top + crownH * 0.6, C.stone, r(0.4), false);
      point(gb, r(0.4), top + crownH * 0.6, top + crownH + needle, C.steel);
      break;
    case Crown.CHRYSLER:
      block(gb, oct(0.95), top, top + ws + crownH * 0.4, C.steel, oct(0.6), false);
      point(gb, oct(0.6), top + ws + crownH * 0.4, top + ws + crownH + needle, C.steel);
      break;
    case Crown.GOTHIC:
      point(gb, r(0.9), top, top + ws * 0.5 + crownH + sk.spire, C.copper);
      break;
    case Crown.TEMPLE:
      block(gb, r(0.8), top, top + crownH * 0.35, C.stone, r(0.8), false);
      point(gb, r(0.75), top + crownH * 0.35, top + crownH, C.gold);
      break;
    default:
  }
}

// ===================================================================== trees
//
// Every tree (park or street) is a cross tree: two billboards at right
// angles, fixed in the world at a random turn, instanced (one quad pair per
// tree).

/** A park's grass, with the texture once across. */
function addPark(gb: Builder, p: ParkData): void {
  const hw = p.w * 0.5;
  const hl = p.l * 0.5;
  const P = (x: number, z: number, u: number, v: number): Vertex => [p.x + x, 0, p.z + z, u, v];
  gb.quad(P(-hw, -hl, 0, 0), P(-hw, hl, 0, 1), P(hw, hl, 1, 1), P(hw, -hl, 1, 0));
}

const TREE_TEXTURES = ['tree1.png', 'tree2.png', 'tree3.png', 'tree_autumn.png'];
const STREET_TREE_HEIGHT = 44;

/** Two unit quads crossed at right angles, centred on the origin, v = 0
 *  at the top (flipY = false). */
function crossQuad(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    0, -0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5,
  ], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  g.computeBoundingSphere();
  return g;
}

/** Unlit cut-out material for the trees. */
function treeMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide });
}

/** Instanced cross trees, one InstancedMesh per tree texture. */
function buildTrees(trees: TreeData[], materials: CityMaterials): THREE.Group {
  const group = new THREE.Group();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const col = new THREE.Color();
  TREE_TEXTURES.forEach((_, tex) => {
    const list = trees.filter((t) => t.tex === tex);
    if (!list.length) return;
    const im = new THREE.InstancedMesh(materials.treeQuad, materials.trees[tex], list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, (t.rot ?? 0) * Math.PI / 180);
      m.compose(pos.set(t.x, t.y, t.z), q, scale.set(t.w, t.h, t.w));
      im.setMatrixAt(i, m);
      const g = t.g ?? 1;
      im.setColorAt(i, col.setRGB(g * 0.9, g, g * 0.85));
    });
    im.computeBoundingSphere();
    group.add(im);
  });
  return group;
}

interface Furniture {
  lamp: THREE.BufferGeometry;
  lampFar: THREE.BufferGeometry;
  hydrant: THREE.BufferGeometry;
  mat: THREE.MeshLambertMaterial;
}

export interface CityMaterials {
  facades: THREE.MeshLambertMaterial;
  trim: THREE.MeshLambertMaterial;
  grass: THREE.MeshLambertMaterial;
  ground: THREE.MeshLambertMaterial;
  trees: THREE.MeshBasicMaterial[];
  treeAspect: number[];
  treeQuad: THREE.BufferGeometry;
  furniture: Furniture;
}

export async function loadCityMaterials(): Promise<CityMaterials> {
  const dir = 'data/images/city/';
  const bb = 'data/images/billboards/';
  const [grass, ...trees] = await Promise.all([
    loadTexture(`${dir}grass.jpg`),
    ...TREE_TEXTURES.map((t) => loadTextureVariant(bb + t, clampTexture)),
  ]);
  const trim = new THREE.MeshLambertMaterial({ vertexColors: true });
  return {
    facades: facadeMaterial(),
    trim,
    grass: new THREE.MeshLambertMaterial({ map: grass }),
    ground: new THREE.MeshLambertMaterial({ map: groundTexture(), depthTest: false, depthWrite: false }),
    trees: trees.map((map) => treeMaterial(map)),
    treeAspect: trees.map((t) => (t.image as HTMLImageElement).width / (t.image as HTMLImageElement).height),
    treeQuad: crossQuad(),
    furniture: streetFurniture(),
  };
}

// ============================================================ street furniture

// Where the curb is: the block's half-width in the ground texture.
const CURB = (GROUND_BLOCK * BLOCKSIZE) / 2;
const LAMP_GREEN = [0.13, 0.19, 0.15];
const LANTERN = [1.0, 0.94, 0.72];

/** gb.build() for geometry that is known not to be empty. */
function built(gb: GeomBuilder, opts: Parameters<GeomBuilder['build']>[0]): THREE.BufferGeometry {
  const g = gb.build(opts);
  if (!g) throw new Error('empty geometry');
  return g;
}

/** Bishop's crook lamp post, arm along +x, about 9 m (45 units) tall. */
function lampGeometry(): THREE.BufferGeometry {
  const gb = new GeomBuilder();
  const green = LAMP_GREEN;
  block(gb, poly(0, 0, 2.4, 6), 0, 5, green, poly(0, 0, 1.4, 6), false);
  block(gb, poly(0, 0, 0.8, 5), 5, 42, green, poly(0, 0, 0.5, 5), false);
  // the crook: up, over and down to the lantern
  block(gb, rect(1.6, 0, 1.8, 0.35), 41, 42.2, green);
  block(gb, rect(4.6, 0, 1.6, 0.35), 40.4, 41.4, green);
  block(gb, poly(6.4, 0, 1.7, 4, Math.PI / 4), 34.5, 39.5, LANTERN, poly(6.4, 0, 0.9, 4, Math.PI / 4), false);
  point(gb, poly(6.4, 0, 1.9, 4, Math.PI / 4), 39.5, 41, green);
  return built(gb, { colors: true });
}

/** The far lamp post: a three-sided pole, the arm and the lantern
 *  (16 triangles instead of 70). */
function lampGeometryFar(): THREE.BufferGeometry {
  const gb = new GeomBuilder();
  block(gb, poly(0, 0, 1.2, 3), 0, 42, LAMP_GREEN, poly(0, 0, 0.6, 3), false);
  gb.color = LAMP_GREEN;
  const P = (x: number, y: number): Vertex => [x, y, 0, 0, 0];
  gb.quad(P(0, 42), P(0, 40.5), P(6.4, 40.5), P(6.4, 42));
  block(gb, poly(6.4, 0, 1.6, 3), 34.5, 40.5, LANTERN, poly(6.4, 0, 1.0, 3), false);
  return built(gb, { colors: true });
}

function hydrantGeometry(): THREE.BufferGeometry {
  const gb = new GeomBuilder();
  block(gb, poly(0, 0, 1.3, 6), 0, 4, [0.72, 0.16, 0.12]);
  block(gb, rect(0, 0, 2.0, 0.5), 2.2, 3.0, [0.72, 0.16, 0.12]);
  return built(gb, { colors: true });
}

function streetFurniture(): Furniture {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  return { lamp: lampGeometry(), lampFar: lampGeometryFar(), hydrant: hydrantGeometry(), mat };
}

/** The street trees along every leafy block's curbs (cross trees). */
function streetTrees(blocks: BlockData[], aspect: number[]): TreeData[] {
  const trees: TreeData[] = [];
  for (const blk of blocks) {
    const rnd = styleRandom(blk.x, blk.z, 4);
    const leafy = blk.park || rnd.chance(0.55);
    if (!leafy) continue;
    const c = CURB - 7;
    for (let side = 0; side < 4; side++) {
      const a = (side * Math.PI) / 2;
      const nx = Math.cos(a);
      const nz = -Math.sin(a);
      for (let i = 0; i < 6; i++) {
        if (!blk.park && rnd.chance(0.35)) continue;
        const t = -c + (2 * c * (i + 0.5)) / 6;
        const tex = Math.floor(rnd.next() * 3); // (no autumn trees on the street)
        const h = STREET_TREE_HEIGHT * rnd.range(0.8, 1.25);
        trees.push({ x: blk.x + nx * c - nz * t, y: h / 2, z: blk.z + nz * c + nx * t, w: h * aspect[tex], h, rot: rnd.range(0, 90), tex, g: rnd.range(0.75, 1.1) });
      }
    }
  }
  return trees;
}

/**
 * Lamps on every block's curb (corners included) and hydrants on some, as
 * instanced meshes, in four groups (the quarters of the patch) so the level
 * of detail can change a quarter at a time. Each quarter has the full lamp
 * posts and hydrants (`near`), and simpler lamp posts (`far`) sharing their
 * positions.
 */
interface Placed extends Spot { rot: number }

/** A quarter patch's street furniture: `near` (full lamps and hydrants) and
 *  `far` (simple lamps), centred on (x, z). */
interface FurnitureQuarter extends Spot { group: THREE.Group; near: THREE.Group; far: THREE.InstancedMesh }

function buildFurniture(blocks: BlockData[], f: Furniture, cx: number, cz: number): FurnitureQuarter[] {
  const quarters = [0, 1, 2, 3].map((q): Spot & { lamps: Placed[]; hydrants: Placed[] } => ({
    x: cx + ((q & 1) - 0.5) * CHILD_LENGTH / 2, z: cz + ((q >> 1) - 0.5) * CHILD_LENGTH / 2, lamps: [], hydrants: [],
  }));
  const LAMP_EVERY = 3; // lamps per side, plus the corners
  for (const blk of blocks) {
    const quarter = quarters[(blk.x > cx ? 1 : 0) + (blk.z > cz ? 2 : 0)];
    const rnd = styleRandom(blk.x, blk.z, 5);
    const c = CURB - 3;
    // four sides: [outward normal angle, along-side direction]
    for (let side = 0; side < 4; side++) {
      const a = (side * Math.PI) / 2; // outward: +x, -z, -x, +z
      const nx = Math.cos(a);
      const nz = -Math.sin(a);
      const tx = -nz;
      const tz = nx;
      for (let i = 0; i <= LAMP_EVERY; i++) {
        const t = -c + (2 * c * i) / (LAMP_EVERY + 1);
        quarter.lamps.push({ x: blk.x + nx * c + tx * t, z: blk.z + nz * c + tz * t, rot: a });
      }
      if (rnd.chance(0.4)) {
        const t = rnd.range(-0.8, 0.8) * c;
        quarter.hydrants.push({ x: blk.x + nx * (c - 2) + tx * t, z: blk.z + nz * (c - 2) + tz * t, rot: 0 });
      }
    }
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const make = (geom: THREE.BufferGeometry, list: Placed[]): THREE.InstancedMesh => {
    const im = new THREE.InstancedMesh(geom, f.mat, list.length);
    list.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rot);
      im.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, 0, p.z), q, one));
    });
    im.computeBoundingSphere();
    return im;
  };
  return quarters.filter((qt) => qt.lamps.length).map((qt) => {
    const group = new THREE.Group();
    const near = new THREE.Group();
    const lamps = make(f.lamp, qt.lamps);
    near.add(lamps);
    if (qt.hydrants.length) near.add(make(f.hydrant, qt.hydrants));
    const far = new THREE.InstancedMesh(f.lampFar, f.mat, qt.lamps.length);
    far.instanceMatrix = lamps.instanceMatrix; // the same lamps
    far.boundingSphere = lamps.boundingSphere;
    group.add(near, far);
    return { x: qt.x, z: qt.z, group, near, far };
  });
}

// ===================================================== patches and their LOD

/** The full-detail version of a patch's buildings, with its street furniture. */
interface PatchNear { group: THREE.Group; furniture: FurnitureQuarter[] }

/** A patch of the grid: its data and its meshes. */
interface Patch {
  key: string;
  group: THREE.Group;
  centre: Spot;
  data: PatchData;
  /** The keys of this patch's blocks in CityGrid.solids and .tops. */
  blockKeys: string[];
  trees: THREE.Group;
  far: THREE.Group;
  near: PatchNear | null;
}

/** Everything a patch always has: grass, trees, and the far (lite)
 *  version of its buildings, with the boxes the buildings collide with
 *  (taken from the lite version, whose walls go down to the street). */
function buildPatchBase(data: PatchData, materials: CityMaterials): { group: THREE.Group; trees: THREE.Group; far: THREE.Group; boxes: Box[] } {
  const group = new THREE.Group();
  const add = (parent: THREE.Object3D, geom: THREE.BufferGeometry | null, mat: THREE.Material): THREE.Mesh | null => {
    if (!geom) return null;
    const mesh = new THREE.Mesh(geom, mat);
    parent.add(mesh);
    return mesh;
  };
  const grass = new GeomBuilder();
  for (const p of data.parks) addPark(grass, p);
  add(group, grass.build(), materials.grass);

  const parkTrees = data.trees.map((t) => ({ ...t, w: t.h * materials.treeAspect[t.tex] }));
  const trees = buildTrees(parkTrees.concat(streetTrees(data.blocks, materials.treeAspect)), materials);
  group.add(trees);

  const far = new THREE.Group();
  const fb = new GeomBuilder();
  const trim = new GeomBuilder();
  const boxes: Box[] = [];
  fb.boxes = boxes;
  trim.boxes = boxes;
  for (const b of data.buildings) addBuilding(fb, trim, b, true);
  for (const s of data.skyscrapers) addSkyscraper(fb, trim, s, true);
  add(far, fb.build({ layers: true }), materials.facades);
  add(far, trim.build({ colors: true }), materials.trim);
  group.add(far);
  return { group, trees, far, boxes };
}

/** The near (full detail) version of a patch's buildings, with the street
 *  furniture. It's a lot of work (tens of milliseconds), so it comes as a
 *  generator that yields between buildings, to be spread over several
 *  frames (each building's styling is hashed from its position, so it
 *  doesn't matter when they're built). */
function* buildPatchNear(data: PatchData, materials: CityMaterials, cx: number, cz: number): Generator<void, PatchNear> {
  const group = new THREE.Group();
  const fb = new GeomBuilder();
  const trim = new GeomBuilder();
  for (const b of data.buildings) {
    addBuilding(fb, trim, b);
    yield;
  }
  for (const s of data.skyscrapers) {
    addSkyscraper(fb, trim, s);
    yield;
  }
  const facades = fb.build({ layers: true });
  if (facades) group.add(new THREE.Mesh(facades, materials.facades));
  yield;
  const t = trim.build({ colors: true });
  if (t) group.add(new THREE.Mesh(t, materials.trim));
  yield;
  const furniture = buildFurniture(data.blocks, materials.furniture, cx, cz);
  for (const q of furniture) group.add(q.group);
  return { group, furniture };
}

/** Free a group's own geometry (not the shared furniture/tree geometry). */
function disposeGroup(group: THREE.Object3D, materials: CityMaterials): void {
  const shared = new Set([materials.treeQuad, materials.furniture.lamp, materials.furniture.lampFar, materials.furniture.hydrant]);
  group.traverse((o) => {
    if (o instanceof THREE.Mesh && !shared.has(o.geometry)) o.geometry.dispose();
    if (o instanceof THREE.InstancedMesh) o.dispose();
  });
}

/**
 * The ground: one subdivided quad across the whole grid, with the street
 * tile once per block, drawn first without depth testing.
 */
function buildGround(materials: CityMaterials): THREE.Mesh {
  const side = CITY_LENGTH;
  const subdivisions = 16;
  const repeats = PATCHES * BLOCKSPERPATCH;
  const offset = (STREET_WIDTH_RATIO - SIDEWALK_WIDTH_RATIO) / 2;
  const ou = -offset;
  const ov = offset;
  const inc = repeats / subdivisions;
  const shift = side / subdivisions;
  const h = side / 2;
  const gb = new GeomBuilder();
  // u at x = ou - inc + (x + h) / shift * inc ; v at z = ov + (z + h) / shift * inc
  const U = (x: number): number => ou - inc + ((x + h) / shift) * inc;
  const V = (z: number): number => ov + ((z + h) / shift) * inc;
  const P = (x: number, z: number): Vertex => [x, 0, z, U(x), V(z)];
  for (let i = 0; i < subdivisions; i++) {
    const x0 = -h + i * shift;
    const x1 = x0 + shift;
    for (let j = 0; j < subdivisions; j++) {
      const z0 = -h + j * shift;
      const z1 = z0 + shift;
      gb.quad(P(x0, z0), P(x0, z1), P(x1, z1), P(x1, z0));
    }
  }
  const mesh = new THREE.Mesh(built(gb, {}), materials.ground);
  mesh.renderOrder = -1;
  return mesh;
}

// ================================================================ CityGrid

// Level of detail, by distance from the camera to the nearest point of a
// patch (or a quarter of one, for the street furniture):
// - buildings: full detail (storefronts and lobbies, cornices, rooftop
//   bulkheads and water tanks, metal crowns) nearer than NEAR_DISTANCE,
//   otherwise the lite version (plain walls down to the street, a point for
//   a crown). The full version is built when a patch first comes near (a
//   few milliseconds' work a frame, so the game doesn't stutter), and thrown
//   away again once it is NEAR_KEEP further out.
// - lamp posts and hydrants: full nearer than LAMP_DISTANCE, simple lamp
//   posts only out to FURNITURE_DISTANCE, nothing beyond (or when the
//   camera is higher than FURNITURE_MAX_HEIGHT).
// - trees (cross trees, four triangles each): out to TREE_DISTANCE.
const NEAR_DISTANCE = 2500;
const NEAR_KEEP = 1500;
const NEAR_BUDGET = 3; // msecs a frame spent building a patch's full version
const LAMP_DISTANCE = 500;
const FURNITURE_DISTANCE = 1800;
const FURNITURE_MAX_HEIGHT = 2500;
const TREE_DISTANCE = 6000;

/** Distance from (x, z) to the nearest point of a square. */
function boxDistance(x: number, z: number, cx: number, cz: number, half: number): number {
  return Math.hypot(Math.max(0, Math.abs(x - cx) - half), Math.max(0, Math.abs(z - cz) - half));
}

/**
 * An 8x8 grid of patches kept centred on the camera. When the
 * camera crosses into another patch, the row/column that falls off one side
 * is dropped and a new one is generated on the other (one patch per frame).
 * Patch (i, j) is centred on ((i + 0.5), (j + 0.5)) * CHILD_LENGTH.
 */
export class CityGrid {
  /** Everything in the city, to add to the scene. */
  readonly group = new THREE.Group();
  private ground: THREE.Mesh;
  private patches = new Map<string, Patch>();
  /** Patches [i, j] still to generate, nearest first. */
  private queue: number[][] = [];
  private centre = { x: 0, z: 0 };
  /** The patch being given full detail, a bit each frame (see update()). */
  private upgrading: { patch: Patch; steps: Generator<void, PatchNear> } | null = null;
  /** The tallest roof of each block, by block key (for maxHeightNear()). */
  private tops = new Map<string, number>();
  /** Collision boxes by block key. */
  private solids = new Map<string, Box[]>();

  constructor(private materials: CityMaterials) {
    this.ground = buildGround(materials);
    this.group.add(this.ground);
  }

  static key(i: number, j: number): string { return `${i},${j}`; }

  private addPatch(i: number, j: number): Patch {
    const x = (i + 0.5) * CHILD_LENGTH;
    const z = (j + 0.5) * CHILD_LENGTH;
    const data = generatePatch(x, z);
    const { boxes, ...base } = buildPatchBase(data, this.materials);
    // collision boxes, by block (every building stands inside one block)
    const solidKeys = new Set<string>();
    for (const b of boxes) {
      const k = CityGrid.key(Math.floor((b.x0 + b.x1) / 2 / BLOCKSIZE), Math.floor((b.z0 + b.z1) / 2 / BLOCKSIZE));
      let list = this.solids.get(k);
      if (!list) this.solids.set(k, list = []);
      list.push(b);
      solidKeys.add(k);
    }
    // tallest roof per block, for maxHeightNear()
    const topKeys = new Set<string>();
    const note = (bx: number, bz: number, h: number): void => {
      const k = CityGrid.key(Math.floor(bx / BLOCKSIZE), Math.floor(bz / BLOCKSIZE));
      this.tops.set(k, Math.max(this.tops.get(k) ?? 0, h));
      topKeys.add(k);
    };
    for (const b of data.buildings) note(b.x, b.z, b.h + WS * 3);
    for (const sk of data.skyscrapers) {
      let h = 0;
      for (let k = 0; k < sk.step.length; k += 2) h += sk.step[k] * sk.windowSize;
      note(sk.x, sk.z, h * 1.15 + sk.spire);
    }
    const key = CityGrid.key(i, j);
    const patch: Patch = { ...base, key, centre: { x, z }, data, blockKeys: [...new Set([...solidKeys, ...topKeys])], near: null };
    this.group.add(patch.group);
    this.patches.set(key, patch);
    return patch;
  }

  /** Build the full-detail version of a patch, all at once (while loading). */
  private addNear(patch: Patch): void {
    const { data, centre } = patch;
    const steps = buildPatchNear(data, this.materials, centre.x, centre.z);
    let step = steps.next();
    while (!step.done) step = steps.next();
    patch.near = step.value;
    patch.group.add(patch.near.group);
  }

  /** Carry on building the full-detail version of the patch being
   *  upgraded, for about `budget` milliseconds. */
  private stepUpgrade(budget: number): void {
    const up = this.upgrading;
    if (!up) return;
    const until = performance.now() + budget;
    do {
      const step = up.steps.next();
      if (step.done) {
        this.upgrading = null;
        // (the grid may have scrolled on and dropped the patch meanwhile)
        if (this.patches.get(up.patch.key) === up.patch) {
          up.patch.near = step.value;
          up.patch.group.add(step.value.group);
        } else {
          disposeGroup(step.value.group, this.materials);
        }
        return;
      }
    } while (performance.now() < until);
  }

  private dropNear(patch: Patch): void {
    const { near } = patch;
    if (!near) return;
    patch.group.remove(near.group);
    disposeGroup(near.group, this.materials);
    patch.near = null;
  }

  /** The initial city, generated row by row from +Z (the order matters:
   *  it decides each patch's random numbers), with full detail round the
   *  start (the origin). */
  async generate(onProgress: (fraction: number) => void): Promise<void> {
    const half = PATCHES / 2;
    let done = 0;
    let shown = performance.now();
    for (let row = 0; row < PATCHES; row++) {
      for (let col = 0; col < PATCHES; col++) {
        const patch = this.addPatch(col - half, half - 1 - row);
        const { x, z } = patch.centre;
        if (boxDistance(0, 0, x, z, CHILD_LENGTH / 2) < NEAR_DISTANCE) this.addNear(patch);
        onProgress(++done / (PATCHES * PATCHES));
        // let the load bar draw, about once a frame's worth of work
        if (performance.now() - shown > 12) {
          await new Promise((r) => requestAnimationFrame(r));
          shown = performance.now();
        }
      }
    }
  }

  /**
   * Follow the camera at `pos`: scroll the grid, hide patches entirely
   * beyond `visible` (the fog's far end, where they'd be drawn in the fog
   * colour anyway) and choose the level of detail (see above). At most one
   * patch is generated per frame, and one at a time is given full detail,
   * `budget` milliseconds' work a frame. True while there was any to do.
   */
  update(pos: THREE.Vector3, visible = Infinity, budget = NEAR_BUDGET): boolean {
    let busy = false;
    const cx = Math.round(pos.x / CHILD_LENGTH);
    const cz = Math.round(pos.z / CHILD_LENGTH);
    if (cx !== this.centre.x || cz !== this.centre.z) {
      this.centre = { x: cx, z: cz };
      this.ground.position.set(cx * CHILD_LENGTH, 0, cz * CHILD_LENGTH);
      const half = PATCHES / 2;
      const wanted = new Set<string>();
      for (let i = cx - half; i < cx + half; i++) {
        for (let j = cz - half; j < cz + half; j++) wanted.add(CityGrid.key(i, j));
      }
      for (const [k, patch] of this.patches) {
        if (!wanted.has(k)) {
          this.group.remove(patch.group);
          disposeGroup(patch.group, this.materials);
          for (const bk of patch.blockKeys) {
            this.solids.delete(bk);
            this.tops.delete(bk);
          }
          this.patches.delete(k);
        }
      }
      this.queue = [...wanted].filter((k) => !this.patches.has(k)).map((k) => k.split(',').map(Number));
    }
    if (this.queue.length) {
      // nearest missing patch first
      const d = ([i, j]: number[]): number => Math.hypot((i + 0.5) * CHILD_LENGTH - pos.x, (j + 0.5) * CHILD_LENGTH - pos.z);
      this.queue.sort((a, b) => d(a) - d(b));
      const [i, j] = this.queue.shift()!;
      this.addPatch(i, j);
      busy = true;
    }
    // Furniture is judged from a little above the street, so it goes when
    // the camera is high as well as far.
    const lift = Math.max(0, pos.y - 150);
    const furnitureOn = pos.y < FURNITURE_MAX_HEIGHT;
    let upgrade: Patch | null = null;
    let upgradeD = Infinity;
    for (const patch of this.patches.values()) {
      const u = patch;
      const d = boxDistance(pos.x, pos.z, u.centre.x, u.centre.z, CHILD_LENGTH / 2);
      patch.group.visible = d < visible;
      u.trees.visible = d < TREE_DISTANCE;
      if (!u.near && d < NEAR_DISTANCE && d < upgradeD) {
        upgrade = patch;
        upgradeD = d;
      } else if (u.near && d > NEAR_DISTANCE + NEAR_KEEP) {
        this.dropNear(patch);
      }
      const near = !!u.near && d < NEAR_DISTANCE;
      u.far.visible = !near;
      if (!u.near) continue;
      u.near.group.visible = near;
      for (const q of u.near.furniture) {
        const fd = Math.hypot(boxDistance(pos.x, pos.z, q.x, q.z, CHILD_LENGTH / 4), lift);
        q.group.visible = furnitureOn && fd < FURNITURE_DISTANCE;
        q.near.visible = fd < LAMP_DISTANCE;
        q.far.visible = !q.near.visible;
      }
    }
    if (upgrade && !this.upgrading) this.upgrading = { patch: upgrade, steps: buildPatchNear(upgrade.data, this.materials, upgrade.centre.x, upgrade.centre.z) };
    busy ||= !!this.upgrading;
    this.stepUpgrade(budget);
    return busy;
  }

  /** Bring the city round `pos` fully up to date at once: every patch
   *  generated and those near it in full detail (for the test harness's
   *  snapshots, which can't wait a few frames as the game does). */
  settle(pos: THREE.Vector3, visible = Infinity): void {
    for (let i = 0; i < 200 && this.update(pos, visible, Infinity); i++);
  }

  /** The collision boxes of block (i, j), the block covering
   *  [i, i + 1) x [j, j + 1) times BLOCKSIZE (none if it isn't generated). */
  blockBoxes(i: number, j: number): readonly Box[] {
    return this.solids.get(CityGrid.key(i, j)) ?? [];
  }

  /** The tallest building top within `radius` of (x, z). */
  maxHeightNear(x: number, z: number, radius = BLOCKSIZE * 1.5): number {
    let h = 0;
    const r = Math.ceil(radius / BLOCKSIZE);
    const bi = Math.floor(x / BLOCKSIZE);
    const bj = Math.floor(z / BLOCKSIZE);
    for (let i = bi - r; i <= bi + r; i++) {
      for (let j = bj - r; j <= bj + r; j++) h = Math.max(h, this.tops.get(CityGrid.key(i, j)) ?? 0);
    }
    return h;
  }

  /**
   * The first thing the segment p0 -> p1 hits, for a sphere of `radius`:
   * a building (from the boxes the lite buildings note) or the ground.
   * Returns where along it (t, 0..1), the point and the surface normal.
   */
  sweep(p0: THREE.Vector3, p1: THREE.Vector3, radius = 0): Hit | null {
    let best: Hit | null = null;
    const d = p1.clone().sub(p0);
    if (p1.y < radius && d.y < 0) {
      const t = Math.max(0, (radius - p0.y) / d.y);
      best = { t, point: p0.clone().addScaledVector(d, t).setY(0), normal: new THREE.Vector3(0, 1, 0) };
    }
    const r = radius;
    const i0 = Math.floor((Math.min(p0.x, p1.x) - r) / BLOCKSIZE);
    const i1 = Math.floor((Math.max(p0.x, p1.x) + r) / BLOCKSIZE);
    const j0 = Math.floor((Math.min(p0.z, p1.z) - r) / BLOCKSIZE);
    const j1 = Math.floor((Math.max(p0.z, p1.z) + r) / BLOCKSIZE);
    const o = [p0.x, p0.y, p0.z];
    const dir = [d.x, d.y, d.z];
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        for (const b of this.solids.get(CityGrid.key(i, j)) ?? []) {
          // slab test against the box grown by the radius
          const lo = [b.x0 - r, b.y0 - r, b.z0 - r];
          const hi = [b.x1 + r, b.y1 + r, b.z1 + r];
          let tin = 0;
          let tout = best ? best.t : 1;
          let axis = -1;
          let sign = 0;
          let miss = false;
          for (let a = 0; a < 3 && !miss; a++) {
            if (Math.abs(dir[a]) < 1e-9) {
              if (o[a] < lo[a] || o[a] > hi[a]) miss = true;
              continue;
            }
            let ta = (lo[a] - o[a]) / dir[a];
            let tb = (hi[a] - o[a]) / dir[a];
            let s = -1;
            if (ta > tb) { [ta, tb] = [tb, ta]; s = 1; }
            if (ta > tin) { tin = ta; axis = a; sign = s; }
            tout = Math.min(tout, tb);
            if (tin > tout) miss = true;
          }
          if (miss) continue;
          // (axis -1: it starts inside; call that a hit from above)
          const normal = new THREE.Vector3(0, 1, 0);
          if (axis >= 0) normal.set(0, 0, 0).setComponent(axis, sign);
          const point = p0.clone().addScaledVector(d, tin).addScaledVector(normal, -r);
          best = { t: tin, point, normal };
        }
      }
    }
    return best;
  }

  dispose(): void {
    // (the shared furniture and tree geometry is kept for the next mission)
    disposeGroup(this.group, this.materials);
  }
}
