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

/** Patch (col,row) centres, in the order the PatchGrid generated them. */
export function patchCentres() {
  const list = [];
  for (let row = 0; row < PATCHES; row++) {
    for (let col = 0; col < PATCHES; col++) {
      list.push({ x: (col - (PATCHES - 1) / 2) * CHILD_LENGTH, z: ((PATCHES - 1) / 2 - row) * CHILD_LENGTH });
    }
  }
  return list;
}

// ================================================================= geometry

class GeomBuilder {
  constructor() {
    this.pos = [];
    this.uv = [];
  }

  tri(a, b, c) {
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.uv.push(a[3], a[4], b[3], b[4], c[3], c[4]);
  }

  /** quad a-b-c-d anticlockwise seen from the front */
  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  build({ normals = true } = {}) {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (normals) g.computeVertexNormals(); // non-indexed: flat face normals
    g.computeBoundingSphere();
    return g;
  }
}

function addBuilding(gb, b) {
  const h = b.h;
  const hl = b.l * 0.5;
  const hw = b.w * 0.5;
  const sw = Math.trunc(b.w * b.invWin);
  const sl = Math.trunc(b.l * b.invWin);
  const f = b.floors;
  const P = (x, y, z, u, v) => [b.x + x, y, b.z + z, u, v];
  // +Z, +X, -Z, -X walls (texcoord v=0 at the top, floors at the bottom)
  gb.quad(P(-hw, h, hl, 0, 0), P(-hw, 0, hl, 0, f), P(hw, 0, hl, sw, f), P(hw, h, hl, sw, 0));
  gb.quad(P(hw, h, hl, 0, 0), P(hw, 0, hl, 0, f), P(hw, 0, -hl, sl, f), P(hw, h, -hl, sl, 0));
  gb.quad(P(hw, h, -hl, 0, 0), P(hw, 0, -hl, 0, f), P(-hw, 0, -hl, sw, f), P(-hw, h, -hl, sw, 0));
  gb.quad(P(-hw, h, -hl, 0, 0), P(-hw, 0, -hl, 0, f), P(-hw, 0, hl, sl, f), P(-hw, h, hl, sl, 0));
}

/** Skyscraper::create_interleaved_array(): one side's triangle strip, drawn
 *  four times rotated -90 degrees about Y. */
function addSkyscraper(gb, sk) {
  const { step, spire, windowSize } = sk;
  const numSteps = step.length;
  const winMul = 2.0 / windowSize;
  const sum = [0, sk.w / 2]; // [height, half width]
  const stepAmount = [windowSize, -1];
  let t = 0;
  let s = Math.trunc(sum[1] * winMul);
  const strip = [];
  strip.push([-sum[1], sum[0], sum[1], 0, 0]);
  strip.push([sum[1], sum[0], sum[1], s, 0]);
  for (let j = 0; j < numSteps - 1; j++) {
    const axis = j & 1;
    sum[axis] += step[j] * stepAmount[axis];
    s = Math.trunc(sum[1] * winMul);
    t += Math.trunc(step[j]) * (axis ? 0 : 1);
    strip.push([-sum[1], sum[0], sum[1], 0, t]);
    strip.push([sum[1], sum[0], sum[1], s, t]);
  }
  // Final point in middle of skyscraper roof.
  sum[1] -= step[numSteps - 1];
  sum[0] += spire;
  strip.push([sum[1], sum[0], sum[1], s, t]);

  for (let side = 0; side < 4; side++) {
    const a = -side * Math.PI / 2; // glRotatef(-90 * side, 0, 1, 0)
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const v = strip.map(([x, y, z, u, w]) => [sk.x + x * c + z * sn, y, sk.z - x * sn + z * c, u, w]);
    for (let k = 0; k + 2 < v.length; k++) {
      if (k & 1) gb.tri(v[k + 1], v[k], v[k + 2]);
      else gb.tri(v[k], v[k + 1], v[k + 2]);
    }
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
  const [walls, roof, grass, ground, ...trees] = await Promise.all([
    loadTexture(`${dir}win_brick.jpg`),
    loadTextureVariant(`${dir}building_top_dark2.jpg`, clampTexture),
    loadTexture(`${dir}grass.jpg`),
    loadTexture(`${dir}city_block_base.png`),
    ...TREE_TEXTURES.map((t) => loadTextureVariant(bb + t, clampTexture)),
  ]);
  return {
    walls: new THREE.MeshLambertMaterial({ map: walls }),
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
  const walls = new GeomBuilder();
  for (const b of data.buildings) addBuilding(walls, b);
  for (const s of data.skyscrapers) addSkyscraper(walls, s);
  const grass = new GeomBuilder();
  for (const p of data.parks) addPark(grass, p);
  const roofs = new GeomBuilder();
  for (const r of data.roofs) addRoof(roofs, r);
  const trees = TREE_TEXTURES.map(() => new GeomBuilder());
  for (const t of data.trees) addTree(trees[t.tex], t);

  const add = (geom, mat, order) => {
    if (!geom) return;
    const mesh = new THREE.Mesh(geom, mat);
    mesh.renderOrder = order;
    group.add(mesh);
  };
  add(grass.build(), materials.grass, 0);
  add(walls.build(), materials.walls, 0);
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
