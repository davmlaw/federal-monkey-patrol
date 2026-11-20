// Asset loading. Every path is relative to the site root, which mirrors the
// repo root, so the original data paths (e.g. "data/etc/") work unchanged.

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const textCache = new Map<string, Promise<string>>();

export async function fetchText(path: string): Promise<string> {
  if (!textCache.has(path)) {
    textCache.set(path, (async () => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`can't open "${path}" (${res.status})`);
      return res.text();
    })());
  }
  return textCache.get(path)!;
}

/** Lines of a text file, skipping empty and '#' lines. */
export async function readLines(path: string): Promise<string[]> {
  const text = await fetchText(path);
  return text.split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length && l[0] !== '#');
}

// ---------------------------------------------------------------- textures

const MISSING_TEXTURE = 'data/images/missing_texture.jpg';
const textureCache = new Map<string, Promise<THREE.Texture>>();
const imageLoader = new THREE.ImageLoader();

function makeTexture(image: HTMLImageElement): THREE.Texture {
  const tex = new THREE.Texture(image);
  // Texcoord v=0 is the top of the image (the original data's convention:
  // the models' and the 2D drawing's texcoords assume it).
  tex.flipY = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapNearestFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.userData.aspectRatio = image.width / image.height;
  return tex;
}

/** Cached texture. Falls back to missing_texture.jpg. */
export function loadTexture(path: string): Promise<THREE.Texture> {
  if (!textureCache.has(path)) {
    textureCache.set(path, imageLoader.loadAsync(path).then(makeTexture, (err: unknown) => {
      console.warn(`Could not load texture "${path}"`, err);
      if (path === MISSING_TEXTURE) throw new Error(`Can't load fall back image: ${path}`);
      return loadTexture(MISSING_TEXTURE);
    }));
  }
  return textureCache.get(path)!;
}

/** Same texture image but with its own sampler state (e.g. clamped). */
export async function loadTextureVariant(path: string, setup: (t: THREE.Texture) => void): Promise<THREE.Texture> {
  const key = `${path}#${setup.name}`;
  if (!textureCache.has(key)) {
    textureCache.set(key, loadTexture(path).then((t) => {
      const c = t.clone();
      setup(c);
      c.needsUpdate = true;
      return c;
    }));
  }
  return textureCache.get(key)!;
}

export function clampTexture(t: THREE.Texture): void {
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
}

// ------------------------------------------------------------------ models

const MODEL_DIR = 'data/models/';
const geometryCache = new Map<string, Promise<THREE.BufferGeometry>>();

/** One merged, smooth-shaded geometry per .obj file. */
function loadOBJGeometry(filename: string): Promise<THREE.BufferGeometry> {
  if (!geometryCache.has(filename)) {
    geometryCache.set(filename, (async () => {
      const text = await fetchText(MODEL_DIR + filename);
      const group = new OBJLoader().parse(text);
      const parts: THREE.BufferGeometry[] = [];
      group.traverse((o) => { if (o instanceof THREE.Mesh) parts.push(o.geometry); });
      let geom = parts.length === 1 ? parts[0] : mergeGeometries(parts);
      geom.deleteAttribute('normal');
      if (!geom.getAttribute('uv')) {
        const n = geom.getAttribute('position').count;
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
      }
      // Smooth normals across shared vertices.
      geom = mergeVertices(geom, 1e-4);
      geom.computeVertexNormals();
      geom.computeBoundingSphere();
      geom.userData.shared = true;
      return geom;
    })());
  }
  return geometryCache.get(filename)!;
}

function mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  for (const g of geoms) {
    const gi = g.index ? g.toNonIndexed() : g;
    pos.push(...gi.getAttribute('position').array);
    const u = gi.getAttribute('uv');
    if (u) uv.push(...u.array);
    else uv.push(...new Array<number>(gi.getAttribute('position').count * 2).fill(0));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

const materialCache = new Map<string, Promise<{ geom: THREE.BufferGeometry; mat: THREE.Material }>>();

/** A new mesh sharing the model's geometry and the skin's material. */
export async function loadModel(filename: string, skin: string): Promise<THREE.Mesh> {
  const key = `${filename}|${skin}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, (async () => {
      const [geom, tex] = await Promise.all([loadOBJGeometry(filename), loadTexture(MODEL_DIR + skin)]);
      const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
      return { geom, mat };
    })());
  }
  const { geom, mat } = await materialCache.get(key)!;
  return new THREE.Mesh(geom, mat);
}

// ------------------------------------------------------------------- sound

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

/** Must be called from a user gesture before any sound can play. */
export function unlockAudio(): void {
  if (!audioCtx) {
    const Ctx = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

/** Pause or resume every sound (music and dialogue) together. */
export function setAudioPaused(paused: boolean): void {
  if (!audioCtx) return;
  if (paused && audioCtx.state === 'running') audioCtx.suspend();
  else if (!paused && audioCtx.state === 'suspended') audioCtx.resume();
}

export function loadSound(path: string): Promise<AudioBuffer | null> {
  const ctx = audioCtx;
  if (!ctx) return Promise.resolve(null);
  if (!bufferCache.has(path)) {
    bufferCache.set(path, fetch(path)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .catch((e: unknown) => { console.warn(`Could not load sound "${path}"`, e); return null; }));
  }
  return bufferCache.get(path)!;
}

export interface SoundHandle { done: boolean; stop(): void }

/** Play a decoded buffer. Returns a handle whose .done turns true at the end. */
export function playSound(buffer: AudioBuffer | null, { loop = false, volume = 1 } = {}): SoundHandle {
  const handle: SoundHandle = { done: true, stop() {} };
  if (!audioCtx || !buffer) return handle;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = loop;
  if (volume === 1) {
    src.connect(audioCtx.destination);
  } else {
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(audioCtx.destination);
  }
  handle.done = false;
  src.onended = () => { handle.done = true; };
  handle.stop = () => { try { src.stop(); } catch { /* already stopped */ } handle.done = true; };
  src.start();
  return handle;
}

/** A synthesised bang: filtered noise dying away over `seconds`, the
 *  filter closing from `cutoff` Hz (lower is a deeper boom). */
export function playBang(seconds = 1.8, cutoff = 1200, volume = 0.9): void {
  const ctx = audioCtx;
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + seconds);
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}
