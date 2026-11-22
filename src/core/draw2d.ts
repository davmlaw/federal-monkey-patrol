// 2D drawing: an immediate-mode batcher for the ortho 2D space, plus a
// small scene graph on top of it (Drawable2D, Quad, Image, Container2D,
// Text2D in the bitmap font).

import * as THREE from 'three';
import { loadTexture } from './assets.ts';

const ORTHO_W = 1.0;
const ORTHO_H = 0.75;

const VERT = /* glsl */`
attribute vec4 rgba;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vUv = uv;
  vColor = rgba;
  gl_Position = vec4(position.x * ${(2 / ORTHO_W).toFixed(6)}, position.y * ${(2 / ORTHO_H).toFixed(6)}, 0.0, 1.0);
}`;

const FRAG = /* glsl */`
uniform sampler2D map;
uniform int mode;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec4 c = vColor;
  if (mode == 1) c *= texture2D(map, vUv);
  gl_FragColor = c;
}`;

const MODE_COLOR = 0;
const MODE_TEXTURE = 1;
type Mode = typeof MODE_COLOR | typeof MODE_TEXTURE;

/** [r, g, b, a], 0..1. */
export type Color = number[];
/** [x, y] or [x, y, u, v]. */
export type Point = number[];
export type Blend = 'normal' | 'premult';

interface Batch { mode: Mode; tex: THREE.Texture | null; blend: Blend; start: number; count: number }
type Material2D = THREE.ShaderMaterial & {
  uniforms: { map: THREE.IUniform<THREE.Texture | null>; mode: THREE.IUniform<number> };
};

/** Blend modes: 'normal' = src alpha / one minus src alpha,
 *  'premult' = one / one minus src alpha (Text2D). */
function makeMaterial(blend: Blend): Material2D {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { map: { value: null }, mode: { value: 0 } },
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: blend === 'premult' ? THREE.OneFactor : THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  }) as Material2D;
}

export class Batch2D {
  private capacity = 0;
  private materials: Record<Blend, Material2D> = { normal: makeMaterial('normal'), premult: makeMaterial('premult') };
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private mesh: THREE.Mesh<THREE.BufferGeometry, Material2D>;
  private pos = new Float32Array(0);
  private uv = new Float32Array(0);
  private col = new Float32Array(0);
  private count = 0;
  private batches: Batch[] = [];
  private stack: number[][] = [];
  /** affine: x' = a x + c y + e, y' = b x + d y + f */
  private m = [1, 0, 0, 1, 0, 0];
  blend: Blend = 'normal';

  constructor(private renderer: THREE.WebGLRenderer) {
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.materials.normal);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.ensure(4096);
  }

  private ensure(n: number): void {
    if (n <= this.capacity) return;
    let cap = Math.max(this.capacity, 1024);
    while (cap < n) cap *= 2;
    const old = this.mesh.geometry;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3);
    this.uv = new Float32Array(cap * 2);
    this.col = new Float32Array(cap * 4);
    if (this.count && old) {
      const prev = (name: string, n: number): Float32Array =>
        (old.getAttribute(name).array as Float32Array).subarray(0, this.count * n);
      this.pos.set(prev('position', 3));
      this.uv.set(prev('uv', 2));
      this.col.set(prev('rgba', 4));
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgba', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.mesh.geometry = g;
    old?.dispose();
    this.capacity = cap;
  }

  begin(): void {
    this.count = 0;
    this.batches = [];
    this.stack = [];
    this.m = [1, 0, 0, 1, 0, 0];
    this.blend = 'normal';
  }

  // --------------------------------------------------------- transforms
  push(): void { this.stack.push(this.m.slice()); }

  pop(): void { this.m = this.stack.pop() ?? [1, 0, 0, 1, 0, 0]; }

  translate(x: number, y: number): void {
    const m = this.m;
    m[4] += m[0] * x + m[2] * y;
    m[5] += m[1] * x + m[3] * y;
  }

  /** Degrees, anticlockwise. */
  rotate(deg: number): void {
    if (!deg) return;
    const r = deg * Math.PI / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const [a, b, cc, d] = this.m;
    this.m[0] = a * c + cc * s;
    this.m[1] = b * c + d * s;
    this.m[2] = -a * s + cc * c;
    this.m[3] = -b * s + d * c;
  }

  setBlend(b: Blend): void { this.blend = b; }

  // ------------------------------------------------------------ geometry
  private batchFor(mode: Mode, tex: THREE.Texture | null, n: number): Batch {
    this.ensure(this.count + n);
    const last = this.batches[this.batches.length - 1];
    if (last && last.mode === mode && last.tex === tex && last.blend === this.blend) return last;
    const b: Batch = { mode, tex, blend: this.blend, start: this.count, count: 0 };
    this.batches.push(b);
    return b;
  }

  private vertex(x: number, y: number, u: number, v: number, c: Color): void {
    const m = this.m;
    const i = this.count++;
    this.pos[i * 3] = m[0] * x + m[2] * y + m[4];
    this.pos[i * 3 + 1] = m[1] * x + m[3] * y + m[5];
    this.pos[i * 3 + 2] = 0;
    this.uv[i * 2] = u;
    this.uv[i * 2 + 1] = v;
    this.col.set(c, i * 4);
  }

  /** Triangles from a flat list of [x, y, u, v] points (3 per triangle). */
  triangles(points: Point[], color: Color, tex: THREE.Texture | null = null): void {
    const mode = tex ? MODE_TEXTURE : MODE_COLOR;
    const b = this.batchFor(mode, tex, points.length);
    for (const p of points) this.vertex(p[0], p[1], p[2] || 0, p[3] || 0, color);
    b.count += points.length;
  }

  /** Quad of size w x h centred on the origin, texcoords (u0,v0) top-left. */
  quad(w: number, h: number, color: Color, tex: THREE.Texture | null = null, uv = [0, 0, 1, 1]): void {
    const hw = w / 2;
    const hh = h / 2;
    const [u0, v0, u1, v1] = uv;
    const tl = [-hw, hh, u0, v0];
    const bl = [-hw, -hh, u0, v1];
    const br = [hw, -hh, u1, v1];
    const tr = [hw, hh, u1, v0];
    this.triangles([tl, bl, br, tl, br, tr], color, tex);
  }

  /** Axis-aligned rectangle by corners (no texture). */
  rect(x0: number, y0: number, x1: number, y1: number, color: Color): void {
    this.triangles([[x0, y1], [x0, y0], [x1, y0], [x0, y1], [x1, y0], [x1, y1]], color);
  }

  /** A thick line strip (a loop if `closed`). */
  polyline(pts: Point[], width: number, color: Color, closed = false): void {
    const hw = width / 2;
    const n = closed ? pts.length : pts.length - 1;
    const tris: Point[] = [];
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      // extend each segment by half the width so joints have no gaps
      const ex = (dx / len) * hw;
      const ey = (dy / len) * hw;
      const nx = (-dy / len) * hw;
      const ny = (dx / len) * hw;
      const a = [x0 - ex + nx, y0 - ey + ny];
      const b = [x0 - ex - nx, y0 - ey - ny];
      const c = [x1 + ex - nx, y1 + ey - ny];
      const d = [x1 + ex + nx, y1 + ey + ny];
      tris.push(a, b, c, a, c, d);
    }
    if (tris.length) this.triangles(tris, color);
  }

  flush(): void {
    if (!this.count) return;
    const g = this.mesh.geometry;
    for (const name of ['position', 'uv', 'rgba']) {
      const a = g.getAttribute(name) as THREE.BufferAttribute;
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.count * a.itemSize);
      a.needsUpdate = true;
    }
    for (const b of this.batches) {
      if (!b.count) continue;
      const mat = this.materials[b.blend];
      mat.uniforms.map.value = b.tex;
      mat.uniforms.mode.value = b.mode;
      mat.uniformsNeedUpdate = true;
      this.mesh.material = mat;
      g.setDrawRange(b.start, b.count);
      this.renderer.render(this.scene, this.camera);
    }
    this.count = 0;
    this.batches = [];
  }
}

// =================================================================== Drawable2D

export interface Vec2 { x: number; y: number }

export class Drawable2D {
  position: Vec2 = { x: 0, y: 0 };
  size: Vec2;
  /** Degrees, anticlockwise. */
  rotation = 0;
  color: Color = [1, 1, 1, 1];

  constructor(w = 0, h = 0) {
    this.size = { x: w, y: h };
  }

  getWidth(): number { return this.size.x; }

  getHeight(): number { return this.size.y; }

  setWidth(w: number): void { this.size.x = w; }

  setHeight(h: number): void { this.size.y = h; }

  setColor(r: number | readonly number[], g = 0, b = 0, a = 1): void {
    if (typeof r === 'number') this.color = [r, g, b, a];
    else this.color = r.slice(0, 4);
  }

  left(): number { return this.size.x * -0.5; }

  right(): number { return this.size.x * 0.5; }

  top(): number { return this.size.y * 0.5; }

  bottom(): number { return this.size.y * -0.5; }

  /** This node's colour with the given alpha. */
  glColor(alpha: number): Color { return [this.color[0], this.color[1], this.color[2], alpha]; }

  draw(g: Batch2D, alpha = 1): void {
    g.push();
    g.translate(this.position.x, this.position.y);
    g.rotate(this.rotation);
    const a = alpha * this.color[3];
    this.representation(g, a);
    g.pop();
  }

  protected representation(_g: Batch2D, _alpha: number): void {}
}

/** A Drawable2D with a state in [0, 1]. */
export class Transitional2D extends Drawable2D {
  state = 0;

  getState(): number { return this.state; }

  setState(s: number): void { this.state = Math.min(1, Math.max(0, s)); }
}

export class Quad extends Drawable2D {
  protected override representation(g: Batch2D, alpha: number): void {
    g.quad(this.size.x, this.size.y, this.glColor(alpha));
  }
}

export class Image extends Quad {
  /** `tex` must already be loaded (see Image.load). */
  aspectLock = true;

  constructor(public tex: THREE.Texture, w = 1, h = 1) {
    super(w, h);
  }

  static async load(path: string, w?: number, h?: number): Promise<Image> {
    return new Image(await loadTexture(path), w, h);
  }

  aspectRatio(): number { return (this.tex.userData.aspectRatio as number) || 1; }

  override setWidth(w: number): void {
    this.size.x = w;
    if (this.aspectLock) this.size.y = w / this.aspectRatio();
  }

  override setHeight(h: number): void {
    this.size.y = h;
    if (this.aspectLock) this.size.x = h * this.aspectRatio();
  }

  protected override representation(g: Batch2D, alpha: number): void {
    g.quad(this.size.x, this.size.y, this.glColor(alpha), this.tex);
  }
}

export const LEFT = 1;
export const RIGHT = 2;
export const TOP = 4;
const BOTTOM = 8;

export class Container2D extends Drawable2D {
  children: Drawable2D[] = [];

  add(d: Drawable2D, alignment = 0): void {
    if (alignment) {
      const hw = d.getWidth() / 2;
      const hh = d.getHeight() / 2;
      if (alignment & LEFT) d.position.x = this.left() + hw;
      else if (alignment & RIGHT) d.position.x = this.right() - hw;
      if (alignment & TOP) d.position.y = this.top() - hh;
      else if (alignment & BOTTOM) d.position.y = this.bottom() - hh;
    }
    this.children.push(d);
  }

  protected override representation(g: Batch2D, alpha: number): void {
    for (const c of this.children) c.draw(g, alpha);
  }
}

// ======================================================================= Text2D

// Glyph rectangles in data/images/newchars_alpha.png (512x512), for '!'..'~'.
// (The table is originally from Cube's gl_text.cpp.)
const CHAR_COORDS = [
  [0, 0, 25, 64], [25, 0, 54, 64], [54, 0, 107, 64], [107, 0, 148, 64], [148, 0, 217, 64],
  [217, 0, 263, 64], [263, 0, 280, 64], [280, 0, 309, 64], [309, 0, 338, 64], [338, 0, 379, 64],
  [379, 0, 432, 64], [432, 0, 455, 64], [455, 0, 484, 64], [0, 64, 21, 128], [23, 64, 52, 128],
  [52, 64, 93, 128], [93, 64, 133, 128], [133, 64, 174, 128], [174, 64, 215, 128], [215, 64, 256, 128],
  [256, 64, 296, 128], [296, 64, 337, 128], [337, 64, 378, 128], [378, 64, 419, 128], [419, 64, 459, 128],
  [459, 64, 488, 128], [0, 128, 29, 192], [29, 128, 81, 192], [81, 128, 134, 192], [134, 128, 186, 192],
  [186, 128, 221, 192], [221, 128, 285, 192], [285, 128, 329, 192], [329, 128, 373, 192], [373, 128, 418, 192],
  [418, 128, 467, 192], [0, 192, 40, 256], [40, 192, 77, 256], [77, 192, 127, 256], [127, 192, 175, 256],
  [175, 192, 202, 256], [202, 192, 231, 256], [231, 192, 275, 256], [275, 192, 311, 256], [311, 192, 365, 256],
  [365, 192, 413, 256], [413, 192, 463, 256], [1, 256, 38, 320], [38, 256, 89, 320], [89, 256, 133, 320],
  [133, 256, 176, 320], [177, 256, 216, 320], [217, 256, 263, 320], [263, 256, 307, 320], [307, 256, 370, 320],
  [370, 256, 414, 320], [414, 256, 453, 320], [453, 256, 497, 320], [0, 320, 29, 384], [29, 320, 58, 384],
  [59, 320, 87, 384], [87, 320, 139, 384], [139, 320, 180, 384], [180, 320, 221, 384], [221, 320, 259, 384],
  [259, 320, 299, 384], [299, 320, 332, 384], [332, 320, 372, 384], [372, 320, 411, 384], [411, 320, 433, 384],
  [435, 320, 473, 384], [0, 384, 40, 448], [40, 384, 56, 448], [58, 384, 80, 448], [80, 384, 118, 448],
  [118, 384, 135, 448], [135, 384, 197, 448], [197, 384, 238, 448], [238, 384, 277, 448], [277, 384, 317, 448],
  [317, 384, 356, 448], [357, 384, 384, 448], [385, 384, 417, 448], [417, 384, 442, 448], [443, 384, 483, 448],
  [0, 448, 38, 512], [38, 448, 90, 512], [90, 448, 128, 512], [128, 448, 166, 512], [166, 448, 200, 512],
  [200, 448, 241, 512], [241, 448, 270, 512], [270, 448, 310, 512], [310, 448, 363, 512],
];
const IMAGE_W = 512;
const TAB_DIST = 0.24;
const SPACE_DIST = 0.06;
const TEXT_SPACING = 0.001;
const BANG = 33; // '!'
const TILDE = 126; // '~'

function characterWidth(c: number): number {
  if (c === 9) return TAB_DIST;
  if (c === 32) return SPACE_DIST;
  if (c >= BANG && c <= TILDE) {
    const r = CHAR_COORDS[c - BANG];
    return (r[2] - r[0]) / IMAGE_W;
  }
  return 0;
}

function characterHeight(c: number): number {
  if (c >= BANG && c <= TILDE) {
    const r = CHAR_COORDS[c - BANG];
    return (r[3] - r[1]) / IMAGE_W;
  }
  return 0;
}

export function textWidth(str: string): number {
  let w = 0;
  for (let i = 0; i < str.length; i++) w += characterWidth(str.charCodeAt(i)) + TEXT_SPACING;
  return w;
}

export function textHeight(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.max(h, characterHeight(str.charCodeAt(i)));
  return h;
}

let fontTexture: THREE.Texture | null = null;

/** Load the bitmap font once, before any Text2D is drawn. */
export async function loadFont(): Promise<void> {
  fontTexture = await loadTexture('data/images/newchars_alpha.png');
}

export class Text2D extends Drawable2D {
  constructor(public text: string, public font: number) {
    super();
    this.setWidth(textWidth(text) * font);
    this.setHeight(textHeight(text) * font);
  }

  protected override representation(g: Batch2D, alpha: number): void {
    const str = this.text;
    const font = this.font;
    const color = this.glColor(alpha);
    let xp = -this.getWidth() / 2;
    const yp = this.getHeight() / 2;
    const tris: Point[] = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      const w = characterWidth(c) * font;
      const h = characterHeight(c) * font;
      if (c >= BANG && c <= TILDE) {
        c -= BANG;
        const r = CHAR_COORDS[c];
        const l = r[0] / IMAGE_W;
        const t = (r[1] + 2) / IMAGE_W;
        const rr = r[2] / IMAGE_W;
        const b = (r[3] - 2) / IMAGE_W;
        const tl = [xp, yp, l, t];
        const tr = [xp + w, yp, rr, t];
        const br = [xp + w, yp - h, rr, b];
        const bl = [xp, yp - h, l, b];
        tris.push(tl, tr, br, tl, br, bl);
      }
      xp += w + TEXT_SPACING * font;
    }
    if (!tris.length) return;
    const prev = g.blend;
    g.setBlend('premult');
    g.triangles(tris, color, fontTexture);
    g.setBlend(prev);
  }
}
