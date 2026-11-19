// Port of graphics/3d/city/ (patchgrid, city_generator, cityblock, building,
// skyscraper, parkland) and graphics/3d/crosstree + billboards.
//
// The algorithm and the random number sequence are the same as the C++
// (a static MTRand seeded with 42, shared by every city generated in a
// session); the class structure is not. Generation produces plain data per
// patch, then each patch becomes a handful of merged meshes.

import * as THREE from 'three';
import { MTRand } from '../core/mtrand.js';
import { clampTexture, loadTexture, loadTextureVariant } from '../core/assets.js';

// kong.h: ratios of data/images/city/city_block_base.png
const SIDEWALK_WIDTH_RATIO = 20.0 / 512.0;
const STREET_WIDTH_RATIO = 0.235;

// patchgridfactory.cpp / patchgrid.h
const BLOCKSIZE = 400.0;
const BLOCKSPERPATCH = 8;
export const PATCHES = 8;
const CHILD_LENGTH = BLOCKSIZE * BLOCKSPERPATCH; // one patch
export const CITY_LENGTH = CHILD_LENGTH * PATCHES;

const NORTH_BIT = 1 << 0;
const EAST_BIT = 1 << 1;
const SOUTH_BIT = 1 << 2;
const WEST_BIT = 1 << 3;

// "FIXME: we could set random seed here according to grid location so the
// generation below is CONSISTANT" - it is one static generator.
const mt = new MTRand(42);

// =============================================================== generation

/** City_Generator(): a quadtree of city blocks / parks, as a flat list. */
function cityGenerator(out, width, minSideLength, x, z) {
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
    if (mt.rand() < 0.1) parkland(out, len, len, x, z);
    else cityBlock(out, len, x, z);
  }
}

// cityblock.cpp
const UPPER_BOUNDS = 500;
const LOWER_BOUNDS = 100;
const MIN_HEIGHT = 150.0;
const BUILDING_HEIGHT_VAR = 300;
const SKYSCRAPER_CHANCE = 25; // percent
const HEIGHT_VARIATION = 20;
const MIN_BUILDING_WIDTH = 80.0;
const SPACING = 5.0;

function cityBlock(out, length, x, z) {
  const height = MIN_HEIGHT + mt.rand() * BUILDING_HEIGHT_VAR;
  subdivideBlock(out, { x, z }, length, length, height, NORTH_BIT | EAST_BIT | SOUTH_BIT | WEST_BIT);
  // (DO_SIDEWALK_OBJECTS - lamps, trees, hydrants - was 0 in 2006)
}

/** Use curb to make sure that the subdivision isn't landlocked. */
function subdivideBlock(out, pos, xSpan, zSpan, height, curb) {
  if (height > LOWER_BOUNDS && height < UPPER_BOUNDS) {
    height += mt.rand() * HEIGHT_VARIATION - 2 * HEIGHT_VARIATION;
  }
  const shortest = Math.min(xSpan, zSpan);
  // stop subdividing if not enough space
  if (shortest < 2 * MIN_BUILDING_WIDTH) {
    building(out, xSpan, height, zSpan, pos);
    // BB_ROOVES: the roof is a horizontal billboard
    out.roofs.push({ x: pos.x, y: height, z: pos.z, w: xSpan, l: zSpan });
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

// building.cpp
const APPROX_WINDOW_SIZE = 18;

function building(out, xSize, ySize, zSize, pos) {
  const floors = Math.trunc(ySize / APPROX_WINDOW_SIZE);
  if (floors < 1) throw new Error('building has <1 floors');
  // Window texture: NUM_TEX was 1, so always win_brick.jpg
  mt.randInt(0);
  mt.rand(); // gray (unused)
  out.buildings.push({ x: pos.x, z: pos.z, w: xSize, h: ySize, l: zSize, floors, invWin: 1.0 / (ySize / floors) });
}

// skyscraper.cpp
const SPIRE_MIN_SKYSCRAPER_HEIGHT = 1000.0;
const SPIRE_CHANCE_RATIO = 0.3;
const STRETCHY_BELLY_RATIO = 0.4;

function skyscraper(out, w, h, pos) {
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
  const step = new Array(numSteps).fill(0);

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

  mt.randInt(0); // window texture (NUM_TEX 1: win_brick.jpg)
  mt.rand(); // gray (unused)
  out.skyscrapers.push({ x: pos.x, z: pos.z, w, windowSize, step, spire });
}

// parkland.cpp
const TREE_SIZE = 100.0;
const TREE_VARIANCE = 10;
const TREE_DENSITY = 0.12;
const NUM_TREES = 4; // crosstree.cpp: tree1, tree2, tree3, tree_autumn

function parkland(out, xLength, zLength, px, pz) {
  out.parks.push({ x: px, z: pz, w: xLength, l: zLength });
  const hx = xLength / 2;
  const xi = 20.0 * xLength / (TREE_SIZE + TREE_VARIANCE);
  const hz = zLength / 2;
  const zi = 20.0 * zLength / (TREE_SIZE + TREE_VARIANCE);
  for (let x = -hx; x < hx; x += xi) {
    for (let z = -hz; z < hz; z += zi) {
      if (mt.rand() < TREE_DENSITY) {
        const height = TREE_SIZE + mt.rand() * TREE_VARIANCE;
        // CrossTree(mt, width = height/3, height)
        const rot = mt.rand() * 90.0;
        const tex = mt.randInt(NUM_TREES - 1);
        out.trees.push({ x: px + x, y: height * 0.5, z: pz + z, w: height / 3, h: height, rot, tex });
      }
    }
  }
}

/** Generate one patch's contents, centred on (cx, cz). */
export function generatePatch(cx, cz) {
  const out = { buildings: [], skyscrapers: [], roofs: [], parks: [], trees: [] };
  cityGenerator(out, CHILD_LENGTH, BLOCKSIZE, cx, cz);
  return out;
}

// ================================================================= geometry

class GeomBuilder {
  constructor() {
    this.pos = [];
    this.uv = [];
    this.col = [];
    this.color = [1, 1, 1]; // vertex colour for what's added next
  }

  tri(a, b, c) {
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.uv.push(a[3], a[4], b[3], b[4], c[3], c[4]);
    const [r, g, bl] = this.color;
    this.col.push(r, g, bl, r, g, bl, r, g, bl);
  }

  /** quad a-b-c-d anticlockwise seen from the front */
  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  build({ normals = true, colors = false } = {}) {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (normals) g.computeVertexNormals(); // non-indexed: flat face normals
    g.computeBoundingSphere();
    return g;
  }
}

// ======================================================= buildings: styling
//
// New since 2006 (which drew every block in win_brick.jpg and every
// skyscraper as a ziggurat that tapered to a point): wall textures, cornices,
// rooftop water towers, and skyscrapers in the style of 1910s-30s New York.
// The 2006 generator still decides where every building goes and how tall
// and wide it is (the MTRand sequence is untouched); the styling below uses
// its own random numbers, hashed from the building's position, so a given
// building always looks the same.

/** mulberry32, seeded from a position: deterministic per building. */
function styleRandom(x, z, salt = 0) {
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
    range: (lo, hi) => lo + next() * (hi - lo),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

/** Weighted pick from [[weight, value], ...] */
function weighted(rnd, options) {
  let r = rnd.next() * options.reduce((t, o) => t + o[0], 0);
  for (const [w, v] of options) {
    r -= w;
    if (r < 0) return v;
  }
  return options[options.length - 1][1];
}

// Wall textures (data/images/city/); the index is the wall mesh per patch.
const WALL_TEXTURES = ['win_brick.jpg', 'win_redbrick.jpg', 'win_concrete.jpg', 'win_concrete_vstrip.jpg', 'win_dark_gray.jpg', 'win_gray.jpg'];
const Wall = { BRICK: 0, REDBRICK: 1, CONCRETE: 2, VSTRIP: 3, DARKGRAY: 4, GRAY: 5 };
const BUILDING_WALLS = [[5, Wall.BRICK], [3, Wall.REDBRICK], [2, Wall.CONCRETE], [1, Wall.DARKGRAY]];
const SKYSCRAPER_WALLS = [[3, Wall.BRICK], [3, Wall.CONCRETE], [3, Wall.VSTRIP], [2, Wall.DARKGRAY], [1, Wall.GRAY]];

// Trim colours (vertex coloured, lit)
const C = {
  roof: [0.36, 0.36, 0.37],
  stone: [0.80, 0.76, 0.68],
  darkstone: [0.42, 0.40, 0.38],
  copper: [0.40, 0.64, 0.54],
  steel: [0.84, 0.86, 0.90],
  gold: [0.86, 0.70, 0.32],
  wood: [0.42, 0.30, 0.20],
  iron: [0.22, 0.22, 0.24],
};

/** Corners of a w x l rectangle, in the winding the walls and caps use. */
function rect(cx, cz, hx, hz) {
  return [[cx - hx, cz + hz], [cx + hx, cz + hz], [cx + hx, cz - hz], [cx - hx, cz - hz]];
}

/** Corners of a regular polygon (sides >= 3), same winding as rect(). */
function poly(cx, cz, r, sides, phase = Math.PI / sides) {
  const out = [];
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
 * floor per window, v=0 at the top as in the 2006 code.
 */
function walls(gb, lower, upper, y0, y1, ws = 0) {
  const n = lower.length;
  for (let i = 0; i < n; i++) {
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
function cap(gb, ring, y, down = false) {
  for (let i = 1; i + 1 < ring.length; i++) {
    const a = [ring[0][0], y, ring[0][1], 0, 0];
    const b = [ring[i][0], y, ring[i][1], 0, 0];
    const c = [ring[i + 1][0], y, ring[i + 1][1], 0, 0];
    if (down) gb.tri(a, c, b);
    else gb.tri(a, b, c);
  }
}

/** A solid block (prism) of the given colour on the trim builder. */
function block(gb, ring, y0, y1, color, top = ring, capped = true) {
  gb.color = color;
  walls(gb, ring, top, y0, y1);
  if (capped) cap(gb, top, y1);
}

/** Point (pyramid / spire) over a ring of corners. */
function point(gb, ring, y0, y1, color) {
  const cx = ring.reduce((t, p) => t + p[0], 0) / ring.length;
  const cz = ring.reduce((t, p) => t + p[1], 0) / ring.length;
  gb.color = color;
  const apex = [cx, y1, cz, 0, 0];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    gb.tri(apex, [a[0], y0, a[1], 0, 0], [b[0], y0, b[1], 0, 0]);
  }
}

/** Overhanging ledge around the top of a wall at y: a band and its top,
 *  leaving the middle open for the roof. (No underside: it is thin enough
 *  not to be missed from the street.) */
function cornice(gb, cx, cz, hx, hz, y, depth, overhang, color) {
  const inner = rect(cx, cz, hx, hz);
  const outer = rect(cx, cz, hx + overhang, hz + overhang);
  gb.color = color;
  walls(gb, outer, outer, y - depth, y);
  const P = (p) => [p[0], y, p[1], 0, 0];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    gb.quad(P(inner[i]), P(outer[i]), P(outer[j]), P(inner[j]));
  }
}

/** The classic New York rooftop water tank on its stand, with a conical hat. */
function waterTower(gb, x, z, r, y) {
  const base = y + r * 0.8;
  block(gb, rect(x, z, r * 0.6, r * 0.6), y, base, C.iron, undefined, false);
  const tank = poly(x, z, r, 8);
  gb.color = C.wood;
  walls(gb, tank, tank, base, base + r * 1.6);
  point(gb, poly(x, z, r * 1.08, 8), base + r * 1.6, base + r * 2.3, C.iron);
}

function addBuilding(wallBuilders, trim, b) {
  const rnd = styleRandom(b.x, b.z, 1);
  const h = b.h;
  const hw = b.w * 0.5;
  const hl = b.l * 0.5;
  const ws = h / b.floors;
  // Walls as in 2006 (whole windows across, v=0 at the top), now in one of
  // several textures.
  const gb = wallBuilders[weighted(rnd, BUILDING_WALLS)];
  const sw = Math.trunc(b.w * b.invWin);
  const sl = Math.trunc(b.l * b.invWin);
  const f = b.floors;
  const P = (x, y, z, u, v) => [b.x + x, y, b.z + z, u, v];
  // +Z, +X, -Z, -X walls (texcoord v=0 at the top, floors at the bottom)
  gb.quad(P(-hw, h, hl, 0, 0), P(-hw, 0, hl, 0, f), P(hw, 0, hl, sw, f), P(hw, h, hl, sw, 0));
  gb.quad(P(hw, h, hl, 0, 0), P(hw, 0, hl, 0, f), P(hw, 0, -hl, sl, f), P(hw, h, -hl, sl, 0));
  gb.quad(P(hw, h, -hl, 0, 0), P(hw, 0, -hl, 0, f), P(-hw, 0, -hl, sw, f), P(-hw, h, -hl, sw, 0));
  gb.quad(P(-hw, h, -hl, 0, 0), P(-hw, 0, -hl, 0, f), P(-hw, 0, hl, sl, f), P(-hw, h, hl, sl, 0));

  if (rnd.chance(0.7)) cornice(trim, b.x, b.z, hw, hl, h, ws * 0.35, ws * 0.12, rnd.chance(0.5) ? C.stone : C.darkstone);
  if (rnd.chance(0.25) && Math.min(hw, hl) > 25) {
    const r = ws * rnd.range(0.55, 0.75);
    const x = b.x + rnd.range(-1, 1) * (hw - r * 1.5);
    const z = b.z + rnd.range(-1, 1) * (hl - r * 1.5);
    waterTower(trim, x, z, r, h);
  }
}

// ======================================================= skyscrapers

export const Crown = { FLAT: 'flat', DECO: 'deco', EMPIRE: 'empire', CHRYSLER: 'chrysler', GOTHIC: 'gothic', TEMPLE: 'temple' };

/**
 * A 1916-zoning-law skyscraper: a podium filling the lot, a few setbacks,
 * then a tower shaft on a quarter of the lot or so, and a crown. Height and
 * width come from the 2006 generator (its stepped profile and spire);
 * everything else from styleRandom().
 */
function addSkyscraper(wallBuilders, trim, sk) {
  const rnd = styleRandom(sk.x, sk.z, 2);
  const ws = sk.windowSize;
  let H = 0;
  for (let j = 0; j < sk.step.length; j += 2) H += sk.step[j] * ws;
  const W = sk.w / 2;
  const tall = H + sk.spire > 900;
  const crown = sk.crown ?? (sk.spire > 0
    ? weighted(rnd, [[3, Crown.EMPIRE], [3, Crown.CHRYSLER], [1, Crown.GOTHIC]])
    : weighted(rnd, tall
      ? [[2, Crown.FLAT], [3, Crown.DECO], [2, Crown.EMPIRE], [2, Crown.CHRYSLER], [2, Crown.GOTHIC], [2, Crown.TEMPLE]]
      : [[4, Crown.FLAT], [3, Crown.DECO], [1, Crown.GOTHIC], [2, Crown.TEMPLE]]));
  const wb = wallBuilders[weighted(rnd, SKYSCRAPER_WALLS)];
  const trimColor = rnd.chance(0.6) ? C.stone : C.darkstone;

  // How much of the height goes on the crown, then the body's tiers.
  const crownH = {
    flat: 0, deco: 0.08, empire: 0.1, chrysler: 0.16, gothic: 0.12, temple: 0.12,
  }[crown] * H;
  const bodyH = H - crownH;
  const T = W * rnd.range(0.42, 0.58); // tower half-width
  const podiumH = Math.max(ws * 3, bodyH * rnd.range(0.12, 0.3));
  const setbacks = tall ? 2 + Math.floor(rnd.next() * 3) : 1 + Math.floor(rnd.next() * 2);
  const tiers = [{ half: W, top: podiumH }];
  let y = podiumH;
  for (let i = 1; i <= setbacks; i++) {
    y += Math.max(ws * 2, bodyH * rnd.range(0.04, 0.09));
    tiers.push({ half: W - (W - T) * (i / (setbacks + 1)), top: y });
  }
  tiers.push({ half: T, top: Math.max(y + ws * 4, bodyH) });

  // Snap tier tops to whole floors, draw each with a ledge and a flat roof.
  let y0 = 0;
  for (const t of tiers) {
    const y1 = Math.max(y0 + ws, Math.round(t.top / ws) * ws);
    const ring = rect(sk.x, sk.z, t.half, t.half);
    walls(wb, ring, ring, y0, y1, ws);
    trim.color = C.roof;
    cap(trim, ring, y1);
    cornice(trim, sk.x, sk.z, t.half, t.half, y1, ws * 0.4, ws * 0.15, trimColor);
    t.y0 = y0;
    t.y1 = y1;
    y0 = y1;
  }
  const top = y0;
  const r = (k) => rect(sk.x, sk.z, T * k, T * k);
  const oct = (k) => poly(sk.x, sk.z, T * k, 8);

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
        walls(wb, ring, ring, yy, y1, ws);
        trim.color = C.roof;
        cap(trim, ring, y1);
        cornice(trim, sk.x, sk.z, T * k, T * k, y1, ws * 0.3, ws * 0.1, trimColor);
        yy = y1;
      }
      if (rnd.chance(0.5)) block(trim, r(0.05), yy, yy + ws * 3, C.iron); // flagpole
      break;
    }
    case Crown.EMPIRE: {
      // narrow setbacks, then a mooring mast
      const s1 = top + crownH * 0.35;
      walls(wb, r(0.7), r(0.7), top, s1, ws);
      trim.color = C.roof;
      cap(trim, r(0.7), s1);
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
        const color = i & 1 ? C.steel : [0.7, 0.72, 0.76];
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
}

/** Horizontal billboard (billboards_addh), e.g. building roofs. */
function addRoof(gb, r) {
  const hw = r.w * 0.5;
  const hh = r.l * 0.5;
  const P = (x, z, u, v) => [r.x + x, r.y, r.z + z, u, v];
  gb.quad(P(-hw, hh, 0, 0), P(hw, hh, 1, 0), P(hw, -hh, 1, 1), P(-hw, -hh, 0, 1));
}

/** Vertical billboard pair of a CrossTree (billboards_addv), at right angles. */
function addTree(gb, t) {
  const hw = t.w * 0.5;
  const hh = t.h * 0.5;
  for (const rot of [t.rot, t.rot + 90]) {
    const a = rot * Math.PI / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const P = (x, y, u, v) => [t.x + x * c, t.y + y, t.z - x * s, u, v];
    gb.quad(P(-hw, hh, 0, 0), P(-hw, -hh, 0, 1), P(hw, -hh, 1, 1), P(hw, hh, 1, 0));
  }
}

/** A park's grass: SubdividedQuad(x, z, 2) with the texture once across. */
function addPark(gb, p) {
  const hw = p.w * 0.5;
  const hl = p.l * 0.5;
  const P = (x, z, u, v) => [p.x + x, 0, p.z + z, u, v];
  gb.quad(P(-hw, -hl, 0, 0), P(-hw, hl, 0, 1), P(hw, hl, 1, 1), P(hw, -hl, 1, 0));
}

const TREE_TEXTURES = ['tree1.png', 'tree2.png', 'tree3.png', 'tree_autumn.png'];

export async function loadCityMaterials() {
  const dir = 'data/images/city/';
  const bb = 'data/images/billboards/';
  const [roof, grass, ground, ...rest] = await Promise.all([
    loadTextureVariant(`${dir}building_top_dark2.jpg`, clampTexture),
    loadTexture(`${dir}grass.jpg`),
    loadTexture(`${dir}city_block_base.png`),
    ...TREE_TEXTURES.map((t) => loadTextureVariant(bb + t, clampTexture)),
    ...WALL_TEXTURES.map((t) => loadTexture(dir + t)),
  ]);
  const trees = rest.slice(0, TREE_TEXTURES.length);
  const walls = rest.slice(TREE_TEXTURES.length);
  return {
    walls: walls.map((map) => new THREE.MeshLambertMaterial({ map })),
    trim: new THREE.MeshLambertMaterial({ vertexColors: true }),
    // billboards: no lighting, depth test but no depth writes, blended
    roof: new THREE.MeshBasicMaterial({ map: roof, side: THREE.DoubleSide, depthWrite: false }),
    grass: new THREE.MeshLambertMaterial({ map: grass }),
    ground: new THREE.MeshLambertMaterial({ map: ground, depthTest: false, depthWrite: false }),
    trees: trees.map((map) => new THREE.MeshBasicMaterial({
      map, side: THREE.DoubleSide, transparent: true, depthWrite: false, alphaTest: 0.05,
    })),
  };
}

/** Build the meshes for one generated patch. */
export function buildPatchMeshes(data, materials) {
  const group = new THREE.Group();
  const walls = WALL_TEXTURES.map(() => new GeomBuilder());
  const trim = new GeomBuilder();
  for (const b of data.buildings) addBuilding(walls, trim, b);
  for (const s of data.skyscrapers) addSkyscraper(walls, trim, s);
  const grass = new GeomBuilder();
  for (const p of data.parks) addPark(grass, p);
  const roofs = new GeomBuilder();
  for (const r of data.roofs) addRoof(roofs, r);
  const trees = TREE_TEXTURES.map(() => new GeomBuilder());
  for (const t of data.trees) addTree(trees[t.tex], t);

  const add = (geom, mat, order) => {
    if (!geom) return null;
    const mesh = new THREE.Mesh(geom, mat);
    mesh.renderOrder = order;
    group.add(mesh);
    return mesh;
  };
  add(grass.build(), materials.grass, 0);
  walls.forEach((wb, i) => add(wb.build(), materials.walls[i], 0));
  group.userData.trim = add(trim.build({ colors: true }), materials.trim, 0);
  // billboards_draw() happens after everything else
  add(roofs.build({ normals: false }), materials.roof, 2);
  trees.forEach((tb, i) => add(tb.build({ normals: false }), materials.trees[i], 3));
  return group;
}

/**
 * PatchGrid's ground: one SubdividedQuad across the whole grid, textured with
 * city_block_base.png once per block, drawn first without depth testing.
 */
export function buildGround(materials) {
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
  const U = (x) => ou - inc + ((x + h) / shift) * inc;
  const V = (z) => ov + ((z + h) / shift) * inc;
  const P = (x, z) => [x, 0, z, U(x), V(z)];
  for (let i = 0; i < subdivisions; i++) {
    const x0 = -h + i * shift;
    const x1 = x0 + shift;
    for (let j = 0; j < subdivisions; j++) {
      const z0 = -h + j * shift;
      const z1 = z0 + shift;
      gb.quad(P(x0, z0), P(x0, z1), P(x1, z1), P(x1, z0));
    }
  }
  const mesh = new THREE.Mesh(gb.build(), materials.ground);
  mesh.renderOrder = -1;
  return mesh;
}

// ================================================================ CityGrid

// Cornices, water towers and crowns are left off patches further than this.
const TRIM_DISTANCE = 5000;

/**
 * PatchGrid: an 8x8 grid of patches kept centred on the camera. When the
 * camera crosses into another patch, the row/column that falls off one side
 * is dropped and a new one is generated on the other (one patch per frame).
 * Patch (i, j) is centred on ((i + 0.5), (j + 0.5)) * CHILD_LENGTH.
 */
export class CityGrid {
  constructor(materials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.ground = buildGround(materials);
    this.group.add(this.ground);
    this.patches = new Map();
    this.queue = [];
    this.centre = { x: 0, z: 0 };
  }

  static key(i, j) { return `${i},${j}`; }

  addPatch(i, j) {
    const x = (i + 0.5) * CHILD_LENGTH;
    const z = (j + 0.5) * CHILD_LENGTH;
    const data = generatePatch(x, z);
    const meshes = buildPatchMeshes(data, this.materials);
    meshes.userData.centre = { x, z };
    this.group.add(meshes);
    this.patches.set(CityGrid.key(i, j), meshes);
  }

  /** The initial city, in the C++ generation order (row-major, from +Z). */
  async generate(onProgress) {
    const half = PATCHES / 2;
    let done = 0;
    for (let row = 0; row < PATCHES; row++) {
      for (let col = 0; col < PATCHES; col++) {
        this.addPatch(col - half, half - 1 - row);
        onProgress(++done / (PATCHES * PATCHES));
        await new Promise((r) => requestAnimationFrame(r)); // let the load bar draw
      }
    }
  }

  /**
   * PatchGrid::setPosition(camera position). New: patches entirely beyond
   * `visible` (the fog's far end, where they'd be drawn in the fog colour
   * anyway) are hidden, and the rooftop detail of patches beyond
   * TRIM_DISTANCE.
   */
  update(pos, visible = Infinity) {
    const cx = Math.round(pos.x / CHILD_LENGTH);
    const cz = Math.round(pos.z / CHILD_LENGTH);
    if (cx !== this.centre.x || cz !== this.centre.z) {
      this.centre = { x: cx, z: cz };
      this.ground.position.set(cx * CHILD_LENGTH, 0, cz * CHILD_LENGTH);
      const half = PATCHES / 2;
      const wanted = new Set();
      for (let i = cx - half; i < cx + half; i++) {
        for (let j = cz - half; j < cz + half; j++) wanted.add(CityGrid.key(i, j));
      }
      for (const [k, meshes] of this.patches) {
        if (!wanted.has(k)) {
          this.group.remove(meshes);
          meshes.traverse((o) => o.geometry?.dispose());
          this.patches.delete(k);
        }
      }
      this.queue = [...wanted].filter((k) => !this.patches.has(k)).map((k) => k.split(',').map(Number));
    }
    if (this.queue.length) {
      // nearest missing patch first
      const d = ([i, j]) => Math.hypot((i + 0.5) * CHILD_LENGTH - pos.x, (j + 0.5) * CHILD_LENGTH - pos.z);
      this.queue.sort((a, b) => d(a) - d(b));
      const [i, j] = this.queue.shift();
      this.addPatch(i, j);
    }
    const reach = CHILD_LENGTH * Math.SQRT1_2; // centre to corner
    for (const meshes of this.patches.values()) {
      const { x, z } = meshes.userData.centre;
      const d = Math.max(0, Math.hypot(x - pos.x, z - pos.z) - reach);
      meshes.visible = d < visible;
      if (meshes.userData.trim) meshes.userData.trim.visible = d < TRIM_DISTANCE;
    }
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
  }
}
