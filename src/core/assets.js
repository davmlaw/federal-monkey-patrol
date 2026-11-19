// Asset loading. Every path is relative to the site root, which mirrors the
// repo root, so the original data paths (e.g. "data/etc/") work unchanged.

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const textCache = new Map();

export async function fetchText(path) {
  if (!textCache.has(path)) {
    textCache.set(path, (async () => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`can't open "${path}" (${res.status})`);
      return res.text();
    })());
  }
  return textCache.get(path);
}

/** Lines of a text file, as legacy TextFileReader: skips empty and '#' lines. */
export async function readLines(path) {
  const text = await fetchText(path);
  return text.split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length && l[0] !== '#');
}

// ---------------------------------------------------------------- textures

const MISSING_TEXTURE = 'data/images/missing_texture.jpg';
const textureCache = new Map();
const imageLoader = new THREE.ImageLoader();

function makeTexture(image) {
  const tex = new THREE.Texture(image);
  // The C++ uploaded SDL surfaces top row first, so texcoord v=0 is the top
  // of the image. Keep that, so the original texcoords can be used as-is.
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

/** Cached texture. Falls back to missing_texture.jpg, as Texture_Factory did. */
export function loadTexture(path) {
  if (!textureCache.has(path)) {
    textureCache.set(path, imageLoader.loadAsync(path).then(makeTexture, (err) => {
      console.warn(`Could not load texture "${path}"`, err);
      if (path === MISSING_TEXTURE) throw new Error(`Can't load fall back image: ${path}`);
      return loadTexture(MISSING_TEXTURE);
    }));
  }
  return textureCache.get(path);
}

/** Same texture image but with its own sampler state (e.g. clamped). */
export async function loadTextureVariant(path, setup) {
  const key = `${path}#${setup.name}`;
  if (!textureCache.has(key)) {
    textureCache.set(key, loadTexture(path).then((t) => {
      const c = t.clone();
      setup(c);
      c.needsUpdate = true;
      return c;
    }));
  }
  return textureCache.get(key);
}

export function clampTexture(t) {
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
}

// ------------------------------------------------------------------ models

const MODEL_DIR = 'data/models/';
const geometryCache = new Map();

/** One merged, smooth-shaded geometry per .obj file (legacy SimpleModel). */
function loadOBJGeometry(filename) {
  if (!geometryCache.has(filename)) {
    geometryCache.set(filename, (async () => {
      const text = await fetchText(MODEL_DIR + filename);
      const group = new OBJLoader().parse(text);
      const parts = [];
      group.traverse((o) => { if (o.isMesh) parts.push(o.geometry); });
      let geom = parts.length === 1 ? parts[0] : mergeGeometries(parts);
      geom.deleteAttribute('normal');
      if (!geom.getAttribute('uv')) {
        const n = geom.getAttribute('position').count;
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
      }
      // Smooth normals across shared vertices, like the C++ loader.
      geom = mergeVertices(geom, 1e-4);
      geom.computeVertexNormals();
      geom.computeBoundingSphere();
      geom.userData.shared = true;
      return geom;
    })());
  }
  return geometryCache.get(filename);
}

function mergeGeometries(geoms) {
  const pos = [];
  const uv = [];
  for (const g of geoms) {
    const gi = g.index ? g.toNonIndexed() : g;
    pos.push(...gi.getAttribute('position').array);
    const u = gi.getAttribute('uv');
    if (u) uv.push(...u.array);
    else uv.push(...new Array(gi.getAttribute('position').count * 2).fill(0));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

const materialCache = new Map();

/** Model::Factory(model, skin): a new mesh sharing geometry and material. */
export async function loadModel(filename, skin) {
  const key = `${filename}|${skin}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, (async () => {
      const [geom, tex] = await Promise.all([loadOBJGeometry(filename), loadTexture(MODEL_DIR + skin)]);
      const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
      return { geom, mat };
    })());
  }
  const { geom, mat } = await materialCache.get(key);
  return new THREE.Mesh(geom, mat);
}

// ------------------------------------------------------------------- sound

let audioCtx = null;
const bufferCache = new Map();

/** Must be called from a user gesture before any sound can play. */
export function unlockAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

/** Pause or resume every sound (music and dialogue) together. */
export function setAudioPaused(paused) {
  if (!audioCtx) return;
  if (paused && audioCtx.state === 'running') audioCtx.suspend();
  else if (!paused && audioCtx.state === 'suspended') audioCtx.resume();
}

export function loadSound(path) {
  if (!audioCtx) return Promise.resolve(null);
  if (!bufferCache.has(path)) {
    bufferCache.set(path, fetch(path)
      .then((r) => r.arrayBuffer())
      .then((b) => audioCtx.decodeAudioData(b))
      .catch((e) => { console.warn(`Could not load sound "${path}"`, e); return null; }));
  }
  return bufferCache.get(path);
}

/** Play a decoded buffer. Returns a handle whose .done turns true at the end. */
export function playSound(buffer, { loop = false } = {}) {
  const handle = { done: true, stop() {} };
  if (!audioCtx || !buffer) return handle;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = loop;
  src.connect(audioCtx.destination);
  handle.done = false;
  src.onended = () => { handle.done = true; };
  handle.stop = () => { try { src.stop(); } catch { /* already stopped */ } handle.done = true; };
  src.start();
  return handle;
}
