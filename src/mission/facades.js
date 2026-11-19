// Procedural textures for the city (new, not in the 2006 version, which used
// photos: win_brick.jpg for every wall and city_block_base.png for the
// streets). Everything is painted on a canvas from a seeded random number
// generator, so it is the same every run.
//
// Facades are one texture array (one layer per kind of wall), so a whole
// patch of the city is one draw call. Each layer is a tile of 4 x 4 window
// "bays"; walls are mapped so every face starts and ends on a bay boundary
// and every floor lines up with a row (see city.js).

import * as THREE from 'three';

export const TILE = 512; // pixels
export const BAYS = 4; // bays across and floors down one tile
const B = TILE / BAYS; // pixels per bay

/** Wall kinds: index = texture array layer. */
export const Facade = {
  BRICK_RED: 0,
  BRICK_BUFF: 1,
  BROWNSTONE: 2,
  DECO_LIMESTONE: 3,
  TERRACOTTA: 4,
  GOTHIC: 5,
  DARK_BRICK: 6,
  TENEMENT: 7, // red brick with fire escapes
  LOFT: 8,
  SETBACK_BRICK: 9, // tan brick with grouped windows, for setback towers
  STOREFRONT: 10, // 4 rows of 1-floor shop fronts
  LOBBY: 11, // 2 variants of a 2-floor stone base
  ROOF: 12,
};
const NUM_LAYERS = 13;

function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

const rgb = (c, k = 1) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
const jitter = (r, c, amount) => c.map((v) => v * (1 + r.range(-amount, amount)));

/** Fill with a colour plus speckle noise. */
function speckle(ctx, r, x, y, w, h, base, amount = 0.12, density = 0.004) {
  ctx.fillStyle = rgb(base);
  ctx.fillRect(x, y, w, h);
  const n = Math.round(w * h * density);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rgb(base, 1 + r.range(-amount, amount));
    ctx.fillRect(x + r.next() * w, y + r.next() * h, 1 + r.int(3), 1 + r.int(2));
  }
}

/** Brick: courses with mortar, each brick slightly different. */
function brick(ctx, r, x, y, w, h, base, mortar) {
  ctx.fillStyle = rgb(mortar);
  ctx.fillRect(x, y, w, h);
  const bh = 5;
  const bw = 14;
  for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
    for (let xx = x - (row & 1 ? bw / 2 : 0); xx < x + w; xx += bw) {
      ctx.fillStyle = rgb(jitter(r, base, 0.09));
      ctx.fillRect(xx + 1, yy + 1, bw - 1, bh - 1);
    }
  }
}

/** Ashlar stone: big blocks with faint joints. */
function stone(ctx, r, x, y, w, h, base, course = 16) {
  speckle(ctx, r, x, y, w, h, base, 0.05, 0.01);
  ctx.fillStyle = rgb(base, 0.86);
  for (let yy = y + course; yy < y + h; yy += course) ctx.fillRect(x, yy, w, 1);
  for (let row = 0, yy = y; yy < y + h; row++, yy += course) {
    for (let xx = x + (row & 1 ? 20 : 0); xx < x + w; xx += 40) ctx.fillRect(xx, yy, 1, course);
  }
}

/**
 * A window pane: dark glass with a sky reflection, or blinds, curtains or a
 * lamp on inside. `bars` = [columns, rows] of glazing bars.
 */
function glass(ctx, r, x, y, w, h, { bars = [1, 2], frame = [225, 222, 210], lit = 0.06 } = {}) {
  const kind = r.next();
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  if (kind < lit) {
    g.addColorStop(0, rgb([255, 224, 150])); g.addColorStop(1, rgb([214, 160, 80]));
  } else {
    const k = r.range(0.8, 1.15);
    g.addColorStop(0, rgb([96, 110, 128], k)); g.addColorStop(0.45, rgb([44, 52, 64], k)); g.addColorStop(1, rgb([24, 28, 36], k));
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  if (kind >= lit && kind < 0.45) { // blind pulled down part way
    ctx.fillStyle = rgb(r.pick([[226, 214, 180], [210, 200, 170], [190, 170, 130], [236, 230, 214]]));
    ctx.fillRect(x, y, w, h * r.range(0.2, 0.75));
  } else if (kind >= 0.45 && kind < 0.6) { // curtains
    ctx.fillStyle = rgb(r.pick([[150, 60, 50], [200, 190, 160], [90, 100, 70], [120, 90, 60]]));
    ctx.fillRect(x, y, w * 0.28, h);
    ctx.fillRect(x + w * 0.72, y, w * 0.28, h);
  }
  ctx.fillStyle = rgb(frame);
  const t = Math.max(1, Math.round(w / 22));
  ctx.fillRect(x, y, w, t); ctx.fillRect(x, y + h - t, w, t);
  ctx.fillRect(x, y, t, h); ctx.fillRect(x + w - t, y, t, h);
  for (let i = 1; i < bars[0]; i++) ctx.fillRect(x + (w * i) / bars[0] - t / 2, y, t, h);
  for (let i = 1; i < bars[1]; i++) ctx.fillRect(x, y + (h * i) / bars[1] - t / 2, w, t);
}

/** Each bay of the tile, with its pixel rectangle. */
function eachBay(f) {
  for (let fy = 0; fy < BAYS; fy++) for (let bx = 0; bx < BAYS; bx++) f(bx * B, fy * B, bx, fy);
}

// ------------------------------------------------------------- the layers

function brickWall(ctx, r, base, mortar, { pairs = false, lintel = [205, 196, 178], frame, lit } = {}) {
  brick(ctx, r, 0, 0, TILE, TILE, base, mortar);
  eachBay((x, y) => {
    const w = B * (pairs ? 0.3 : 0.44);
    const h = B * 0.58;
    const top = y + B * 0.2;
    const xs = pairs ? [x + B * 0.14, x + B * 0.56] : [x + (B - w) / 2];
    for (const wx of xs) {
      ctx.fillStyle = rgb(lintel);
      ctx.fillRect(wx - 3, top - 6, w + 6, 6); // lintel
      ctx.fillRect(wx - 3, top + h, w + 6, 4); // sill
      glass(ctx, r, wx, top, w, h, { frame, lit });
    }
  });
}

function decoLimestone(ctx, r) {
  stone(ctx, r, 0, 0, TILE, TILE, [214, 206, 188], 32);
  eachBay((x, y) => {
    // windows between continuous piers, dark spandrel panels below them
    const w = B * 0.56;
    const wx = x + (B - w) / 2;
    ctx.fillStyle = rgb([92, 84, 76]);
    ctx.fillRect(wx, y + B * 0.72, w, B * 0.28);
    ctx.fillStyle = rgb([120, 110, 98]);
    for (let i = 0; i < 3; i++) ctx.fillRect(wx + 4 + i * (w / 3), y + B * 0.76, w / 3 - 8, B * 0.2);
    glass(ctx, r, wx, y, w, B * 0.72, { bars: [2, 2], frame: [70, 70, 66] });
  });
  ctx.fillStyle = rgb([232, 226, 210]); // pier highlights
  for (let i = 0; i <= BAYS; i++) ctx.fillRect(i * B - 3, 0, 6, TILE);
}

function terracotta(ctx, r) {
  speckle(ctx, r, 0, 0, TILE, TILE, [226, 210, 178], 0.05, 0.01);
  eachBay((x, y) => {
    const w = B * 0.5;
    const wx = x + (B - w) / 2;
    glass(ctx, r, wx, y + B * 0.12, w, B * 0.66, { bars: [1, 2], frame: [120, 100, 70] });
    ctx.fillStyle = rgb([196, 150, 104]); // glazed spandrel with a chevron
    ctx.fillRect(wx, y + B * 0.8, w, B * 0.14);
    ctx.fillStyle = rgb([150, 110, 74]);
    ctx.beginPath();
    ctx.moveTo(wx + w * 0.2, y + B * 0.92); ctx.lineTo(wx + w / 2, y + B * 0.82); ctx.lineTo(wx + w * 0.8, y + B * 0.92);
    ctx.lineWidth = 3; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
  });
  ctx.fillStyle = rgb([200, 180, 146]);
  for (let i = 0; i <= BAYS; i++) ctx.fillRect(i * B - 5, 0, 10, TILE);
}

function gothic(ctx, r) {
  stone(ctx, r, 0, 0, TILE, TILE, [168, 168, 166], 20);
  eachBay((x, y) => {
    const w = B * 0.36;
    const wx = x + (B - w) / 2;
    const top = y + B * 0.2;
    const h = B * 0.62;
    ctx.save();
    ctx.beginPath(); // pointed arch
    ctx.moveTo(wx, top + h); ctx.lineTo(wx, top + w * 0.5);
    ctx.quadraticCurveTo(wx, top, wx + w / 2, top - w * 0.25);
    ctx.quadraticCurveTo(wx + w, top, wx + w, top + w * 0.5);
    ctx.lineTo(wx + w, top + h); ctx.closePath();
    ctx.clip();
    glass(ctx, r, wx, top - w * 0.3, w, h + w * 0.3, { bars: [2, 3], frame: [80, 80, 82] });
    ctx.restore();
    ctx.fillStyle = rgb([196, 196, 192]);
    ctx.fillRect(wx - 4, top + h, w + 8, 4);
  });
  ctx.fillStyle = rgb([188, 188, 184]); // buttress lines
  for (let i = 0; i <= BAYS; i++) ctx.fillRect(i * B - 4, 0, 8, TILE);
}

function tenement(ctx, r) {
  brickWall(ctx, r, [150, 70, 52], [176, 160, 146]);
  // fire escape over the middle two bays: a balcony per floor, ladders
  ctx.fillStyle = rgb([28, 28, 30]);
  ctx.strokeStyle = rgb([28, 28, 30]);
  const x0 = B * 0.85;
  const x1 = B * 3.15;
  for (let fy = 0; fy < BAYS; fy++) {
    const py = fy * B + B * 0.82;
    ctx.fillRect(x0, py, x1 - x0, 5); // platform
    ctx.fillRect(x0, py - B * 0.3, x1 - x0, 2); // railing
    ctx.lineWidth = 2;
    for (let xx = x0; xx <= x1; xx += 10) { ctx.beginPath(); ctx.moveTo(xx, py - B * 0.3); ctx.lineTo(xx, py); ctx.stroke(); }
    // ladder to the floor below
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 + B * 0.25, py); ctx.lineTo(x0 + B * 1.05, py + B); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let k = 0.1; k < 1; k += 0.12) {
      const lx = x0 + B * 0.25 + B * 0.8 * k;
      const ly = py + B * k;
      ctx.beginPath(); ctx.moveTo(lx - 8, ly); ctx.lineTo(lx + 8, ly); ctx.stroke();
    }
  }
}

function loft(ctx, r) {
  brick(ctx, r, 0, 0, TILE, TILE, [168, 134, 104], [150, 140, 128]);
  eachBay((x, y) => {
    const w = B * 0.72;
    const wx = x + (B - w) / 2;
    ctx.fillStyle = rgb([190, 180, 160]);
    ctx.fillRect(wx - 3, y + B * 0.1 - 5, w + 6, 5);
    glass(ctx, r, wx, y + B * 0.1, w, B * 0.72, { bars: [3, 4], frame: [60, 64, 60], lit: 0.03 });
  });
  ctx.fillStyle = rgb([150, 120, 92]); // piers
  for (let i = 0; i <= BAYS; i++) ctx.fillRect(i * B - 6, 0, 12, TILE);
}

function setbackBrick(ctx, r) {
  brick(ctx, r, 0, 0, TILE, TILE, [186, 158, 120], [200, 190, 172]);
  eachBay((x, y) => {
    const w = B * 0.5;
    const wx = x + (B - w) / 2;
    glass(ctx, r, wx, y + B * 0.16, w, B * 0.6, { bars: [1, 2], frame: [235, 232, 222] });
  });
  ctx.fillStyle = rgb([160, 132, 98]); // recessed vertical strips
  for (let i = 0; i < BAYS; i++) {
    const x = i * B + B * 0.25;
    ctx.fillRect(x - 2, 0, 3, TILE);
    ctx.fillRect(x + B * 0.5 - 1, 0, 3, TILE);
  }
}

const AWNINGS = [[[178, 40, 40], [236, 230, 220]], [[30, 92, 60], [220, 214, 196]], [[34, 44, 92], [226, 220, 200]], [[176, 120, 40], [236, 226, 200]], [[110, 30, 40], null], [[40, 70, 50], null]];

function storefronts(ctx, r) {
  for (let row = 0; row < BAYS; row++) {
    const y = row * B;
    stone(ctx, r, 0, y, TILE, B, r.pick([[120, 100, 84], [176, 168, 150], [70, 66, 62], [150, 74, 56]]), 32);
    for (let bx = 0; bx < BAYS; bx++) {
      const x = bx * B;
      const door = r.chance(0.3);
      // sign band, shop window, door
      ctx.fillStyle = rgb(r.pick([[30, 30, 34], [60, 30, 26], [24, 44, 34], [190, 180, 160]]));
      ctx.fillRect(x + 6, y + 8, B - 12, B * 0.16);
      ctx.fillStyle = rgb(r.pick([[220, 190, 110], [240, 236, 220], [200, 60, 50]]));
      for (let k = 0, lx = x + 14; k < 6 + r.int(4) && lx < x + B - 20; k++, lx += 10 + r.int(4)) {
        ctx.fillRect(lx, y + 13, 6 + r.int(4), B * 0.16 - 10); // lettering
      }
      const gy = y + B * 0.3;
      const gh = B * 0.66;
      const winW = door ? B * 0.58 : B - 16;
      glass(ctx, r, x + 8, gy, winW, gh, { bars: [r.chance(0.5) ? 3 : 2, 1], frame: [40, 36, 30], lit: 0.25 });
      // goods on display
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = rgb([r.range(80, 240), r.range(60, 220), r.range(40, 200)]);
        ctx.fillRect(x + 12 + r.next() * (winW - 16), gy + gh - 10 - r.next() * 12, 4 + r.int(6), 8);
      }
      if (door) {
        ctx.fillStyle = rgb([46, 32, 24]);
        ctx.fillRect(x + B * 0.7, gy, B * 0.22, gh + B * 0.04);
        glass(ctx, r, x + B * 0.73, gy + 4, B * 0.16, gh * 0.45, { bars: [1, 1], frame: [46, 32, 24], lit: 0.2 });
      }
    }
    // awnings over most of the row
    if (r.chance(0.75)) {
      const [c1, c2] = r.pick(AWNINGS);
      const ay = y + B * 0.27;
      for (let x = 4; x < TILE - 4; x += 8) {
        ctx.fillStyle = rgb(c2 && (x / 8) % 2 >= 1 ? c2 : c1);
        ctx.fillRect(x, ay, 8, B * 0.17);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(4, ay + B * 0.17, TILE - 8, 4);
    }
  }
}

function lobby(ctx, r) {
  for (let v = 0; v < 2; v++) {
    const y = v * 2 * B;
    stone(ctx, r, 0, y, TILE, 2 * B, v ? [96, 96, 98] : [190, 182, 166], 24);
    for (let bx = 0; bx < BAYS; bx++) {
      const x = bx * B;
      const w = B * 0.6;
      const wx = x + (B - w) / 2;
      const top = y + B * 0.35;
      const h = B * 1.5;
      ctx.save();
      ctx.beginPath(); // round arch
      ctx.moveTo(wx, top + h); ctx.lineTo(wx, top + w / 2);
      ctx.arc(wx + w / 2, top + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(wx + w, top + h); ctx.closePath();
      ctx.clip();
      glass(ctx, r, wx, top, w, h, { bars: [3, 5], frame: v ? [170, 150, 90] : [50, 50, 46], lit: 0.3 });
      ctx.restore();
      ctx.fillStyle = rgb(v ? [130, 130, 132] : [214, 206, 190]);
      ctx.fillRect(x - 5, y, 10, 2 * B);
    }
    ctx.fillStyle = rgb(v ? [70, 70, 72] : [160, 152, 136]);
    ctx.fillRect(0, y + 2 * B - 10, TILE, 10); // plinth
  }
}

function roof(ctx, r) {
  speckle(ctx, r, 0, 0, TILE, TILE, [74, 72, 70], 0.18, 0.05);
  for (let i = 0; i < 14; i++) { // patched tar
    ctx.fillStyle = rgb([60, 58, 56], r.range(0.85, 1.2));
    ctx.fillRect(r.next() * TILE, r.next() * TILE, r.range(30, 140), r.range(20, 90));
  }
  ctx.fillStyle = rgb([96, 94, 90]);
  for (let i = 0; i <= 8; i++) ctx.fillRect(0, i * 64, TILE, 1);
}

const PAINTERS = [
  (c, r) => brickWall(c, r, [150, 66, 48], [178, 166, 150]),
  (c, r) => brickWall(c, r, [196, 168, 122], [210, 200, 182], { pairs: true }),
  (c, r) => brickWall(c, r, [104, 70, 56], [120, 96, 84], { lintel: [136, 98, 80], frame: [70, 50, 40] }),
  decoLimestone,
  terracotta,
  gothic,
  (c, r) => brickWall(c, r, [64, 56, 54], [86, 80, 78], { lintel: [120, 114, 106], frame: [130, 126, 116], lit: 0.14 }),
  tenement,
  loft,
  setbackBrick,
  storefronts,
  lobby,
  roof,
];

let facadeTexture = null;

/** The facade texture array (built once). */
export function facadeArray() {
  if (facadeTexture) return facadeTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = new Uint8Array(TILE * TILE * 4 * NUM_LAYERS);
  PAINTERS.forEach((paint, i) => {
    ctx.save();
    ctx.clearRect(0, 0, TILE, TILE);
    paint(ctx, rng(1931 + i * 7919));
    ctx.restore();
    data.set(ctx.getImageData(0, 0, TILE, TILE).data, i * TILE * TILE * 4);
  });
  const t = new THREE.DataArrayTexture(data, TILE, TILE, NUM_LAYERS);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  facadeTexture = t;
  return t;
}

/** Lambert material whose colour comes from the facade array, by a
 *  per-vertex `layer` attribute. */
export function facadeMaterial() {
  const tex = facadeArray();
  const mat = new THREE.MeshLambertMaterial();
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.facades = { value: tex };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float layer;\nvarying vec3 vFacade;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvFacade = vec3(uv, layer);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform highp sampler2DArray facades;\nvarying vec3 vFacade;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor *= texture(facades, vec3(vFacade.xy, floor(vFacade.z + 0.5)));');
  };
  return mat;
}

// ------------------------------------------------------------------ ground

/**
 * The street tile, painted to the layout of the 2006 city_block_base.png
 * (one tile per block): the block, ringed by sidewalk, takes u in [0, BLOCK]
 * and v in [1 - BLOCK, 1]; the streets run along the +u and -v edges.
 * 1930s New York: asphalt with Belgian-block patches and manholes, granite
 * curbs, concrete flags, crosswalks as a pair of white lines, streetcar
 * tracks down the avenues, and no lane lines.
 */
export const GROUND_BLOCK = 412 / 512;
const SIDEWALK = 20 / 512;

export function groundTexture() {
  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const r = rng(1929);
  const blk = GROUND_BLOCK * S;
  const sw = SIDEWALK * S;
  const st = S - blk; // street width in pixels
  // asphalt everywhere first
  speckle(ctx, r, 0, 0, S, S, [70, 70, 72], 0.22, 0.06);
  for (let i = 0; i < 40; i++) { // repairs and wear
    ctx.fillStyle = `rgba(${r.pick(['40,40,44', '100,98,96', '58,58,60'])},${r.range(0.15, 0.4)})`;
    ctx.fillRect(r.next() * S, r.next() * S, r.range(10, 80), r.range(6, 50));
  }
  // block: sidewalk ring and the lot
  const by = S - blk;
  speckle(ctx, r, 0, by, blk, blk, [176, 174, 168], 0.06, 0.02);
  ctx.fillStyle = rgb([150, 148, 142]); // sidewalk flags
  for (let k = 0; k < blk; k += sw) {
    ctx.fillRect(k, by, 1, sw); ctx.fillRect(k, S - sw, 1, sw);
    ctx.fillRect(0, by + k, sw, 1); ctx.fillRect(blk - sw, by + k, sw, 1);
  }
  ctx.fillRect(sw, by + sw, blk - 2 * sw, 1); ctx.fillRect(sw, S - sw, blk - 2 * sw, 1);
  ctx.fillRect(sw, by + sw, 1, blk - 2 * sw); ctx.fillRect(blk - sw, by + sw, 1, blk - 2 * sw);
  speckle(ctx, r, sw + 1, by + sw + 1, blk - 2 * sw - 2, blk - 2 * sw - 2, [132, 130, 126], 0.08, 0.01);
  // granite curb
  ctx.strokeStyle = rgb([196, 194, 188]);
  ctx.lineWidth = 4;
  ctx.strokeRect(2, by + 2, blk - 4, blk - 4);
  // Belgian block near the corner (the cross street's old paving)
  for (let y = 4; y < st - 4; y += 7) {
    for (let x = blk + 4 + ((y / 7) % 2) * 5; x < S - 4; x += 10) {
      if (x > blk + st * 0.32 && x < S - st * 0.32 && y > st * 0.32 && y < st * 0.68) continue;
      ctx.fillStyle = rgb([92, 88, 84], r.range(0.8, 1.15));
      ctx.fillRect(x, y, 8, 5);
    }
  }
  // streetcar tracks down the avenue (the street along +u), two tracks
  const ax = blk + st / 2;
  for (const off of [-st * 0.22, st * 0.22]) {
    ctx.fillStyle = rgb([58, 56, 54]); // sett paving between the rails
    ctx.fillRect(ax + off - 15, st, 30, S - st);
    for (const rail of [-11, 11]) {
      ctx.fillStyle = rgb([150, 150, 152]);
      ctx.fillRect(ax + off + rail - 1.5, 0, 3, S);
    }
  }
  // crosswalks: two white lines across each street at the intersection
  ctx.fillStyle = rgb([226, 224, 214]);
  const cw = sw * 2.2;
  for (const y of [st + sw * 0.6, S - sw * 0.6 - 3]) { // across the avenue
    ctx.fillRect(blk + 2, y, st - 4, 4);
  }
  ctx.fillRect(blk + 2, st + sw * 0.6 + cw, st - 4, 4);
  ctx.fillRect(blk + 2, S - sw * 0.6 - cw - 3, st - 4, 4);
  for (const x of [sw * 0.6, blk - sw * 0.6 - 3]) ctx.fillRect(x, 2, 4, st - 4); // across the cross street
  ctx.fillRect(sw * 0.6 + cw, 2, 4, st - 4);
  ctx.fillRect(blk - sw * 0.6 - cw - 3, 2, 4, st - 4);
  // manholes
  ctx.fillStyle = rgb([44, 44, 46]);
  for (const [x, y] of [[ax, S * 0.55], [blk * 0.5, st * 0.5], [ax, S * 0.85]]) {
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.flipY = false; // texcoord v=0 is the top of the image, as SDL uploaded it
  return t;
}
