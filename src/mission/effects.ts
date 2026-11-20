// Particle effects: sparks where bullets hit, explosions for crashes and
// bombs. Each layer is one THREE.Points with its own size and colour per
// particle, updated on the CPU (there are only ever a few hundred).

import * as THREE from 'three';

type RGBA = readonly [number, number, number, number];

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number; // seconds
  life: number;
  size0: number; // world units, from birth...
  size1: number; // ...to death
  color0: RGBA;
  color1: RGBA;
  gravity: number; // units/s^2 (negative rises)
  drag: number; // 1/s
  bounce: boolean; // off the street, losing most of its speed
}

export type ParticleSpec = Omit<Particle, 'age'>;

/** A soft round blob, white, alpha falling off from the centre. */
function blobTexture(hardness: number): THREE.Texture {
  const n = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(hardness, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, n, n);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  return tex;
}

/** A lumpy puff (fire and smoke): overlapping soft blobs, fading out
 *  towards the edge. */
function puffTexture(): THREE.Texture {
  const n = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * n * 0.22;
    const x = n / 2 + Math.cos(a) * d;
    const y = n / 2 + Math.sin(a) * d;
    const r = n * (0.12 + Math.random() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  return tex;
}

const VERTEX = /* glsl */ `
attribute float size;
attribute vec4 rgba;
uniform float scale;
varying vec4 vColor;
#include <fog_pars_vertex>
void main() {
  vColor = rgba;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / max(1.0, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

// Additive layers fade out into the fog; normal ones take its colour. The
// film grade (filmlook.ts) comes with dithering_fragment.
const FRAGMENT = /* glsl */ `
uniform sampler2D map;
varying vec4 vColor;
#include <fog_pars_fragment>
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a);
  #ifdef USE_FOG
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #ifdef ADDITIVE
      gl_FragColor.rgb *= 1.0 - fogFactor;
    #else
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    #endif
  #endif
  #include <dithering_fragment>
}`;

class ParticleLayer {
  readonly points: THREE.Points;
  private particles: Particle[] = [];
  private position: THREE.BufferAttribute;
  private size: THREE.BufferAttribute;
  private rgba: THREE.BufferAttribute;
  private viewport = new THREE.Vector4();

  constructor(private capacity: number, map: THREE.Texture, additive: boolean) {
    const g = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    this.size = new THREE.BufferAttribute(new Float32Array(capacity), 1);
    this.rgba = new THREE.BufferAttribute(new Float32Array(capacity * 4), 4);
    for (const a of [this.position, this.size, this.rgba]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.position);
    g.setAttribute('size', this.size);
    g.setAttribute('rgba', this.rgba);
    g.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null }, scale: { value: 1 } }]),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: additive ? { ADDITIVE: '' } : {},
      fog: true,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    mat.uniforms.map.value = map;
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2; // after the city; fire over smoke
    // point sizes are in pixels: scale world sizes by the view's height
    this.points.onBeforeRender = (renderer, _scene, camera) => {
      renderer.getCurrentViewport(this.viewport);
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
      mat.uniforms.scale.value = this.viewport.w / (2 * Math.tan(fov * Math.PI / 360));
    };
  }

  add(p: ParticleSpec): void {
    if (this.particles.length >= this.capacity) this.particles.shift();
    this.particles.push({ ...p, age: 0 });
  }

  update(msecs: number): void {
    const dt = msecs / 1000;
    this.particles = this.particles.filter((p) => (p.age += dt) < p.life);
    const pos = this.position.array as Float32Array;
    const size = this.size.array as Float32Array;
    const rgba = this.rgba.array as Float32Array;
    this.particles.forEach((p, i) => {
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.bounce && p.pos.y < 0) {
        p.pos.y = 0;
        p.vel.y = -p.vel.y * 0.35;
        p.vel.x *= 0.6;
        p.vel.z *= 0.6;
      }
      const t = p.age / p.life;
      pos[i * 3] = p.pos.x;
      pos[i * 3 + 1] = p.pos.y;
      pos[i * 3 + 2] = p.pos.z;
      size[i] = p.size0 + (p.size1 - p.size0) * t;
      for (let c = 0; c < 4; c++) rgba[i * 4 + c] = p.color0[c] + (p.color1[c] - p.color0[c]) * t;
    });
    const n = this.particles.length;
    for (const a of [this.position, this.size, this.rgba]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, n * a.itemSize);
      a.needsUpdate = true;
    }
    this.points.geometry.setDrawRange(0, n);
  }

  clear(): void { this.particles = []; }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** A random unit vector. */
function randomDir(): THREE.Vector3 {
  const z = rand(-1, 1);
  const a = rand(0, Math.PI * 2);
  const r = Math.sqrt(1 - z * z);
  return new THREE.Vector3(r * Math.cos(a), z, r * Math.sin(a));
}

// colours (the film grade washes them out towards silver)
const WHITE_HOT: RGBA = [1, 0.95, 0.75, 1];
const SPARK_END: RGBA = [1, 0.35, 0.05, 0];
const FIRE: RGBA = [1, 0.7, 0.3, 0.9];
const FIRE_END: RGBA = [0.6, 0.12, 0.02, 0];
const SMOKE: RGBA = [0.12, 0.11, 0.1, 0.85];
const SMOKE_END: RGBA = [0.45, 0.44, 0.43, 0];
const DUST: RGBA = [0.6, 0.58, 0.55, 0.5];
const DUST_END: RGBA = [0.7, 0.7, 0.7, 0];

export class Effects {
  readonly group = new THREE.Group();
  private glow: ParticleLayer; // sparks and flashes (additive)
  private fire: ParticleLayer; // (additive)
  private smoke: ParticleLayer;
  private textures: THREE.Texture[];

  constructor() {
    const hard = blobTexture(0.25);
    const soft = blobTexture(0.05);
    const puff = puffTexture();
    this.textures = [hard, soft, puff];
    this.smoke = new ParticleLayer(1500, puff, false);
    this.fire = new ParticleLayer(1000, puff, true);
    this.glow = new ParticleLayer(3000, hard, true);
    this.group.add(this.smoke.points, this.fire.points, this.glow.points);
  }

  /** A bullet striking a wall or the street: sparks thrown back off the
   *  surface (whose normal is `normal`), a flash and a puff of dust.
   *  `dir` is the way the bullet was going. */
  sparks(point: THREE.Vector3, normal: THREE.Vector3, dir: THREE.Vector3): void {
    const d = dir.clone().normalize();
    const reflect = d.clone().addScaledVector(normal, -2 * d.dot(normal));
    const at = point.clone().addScaledVector(normal, 0.3);
    this.glow.add({
      pos: at.clone(), vel: new THREE.Vector3(), life: 0.1, size0: 9, size1: 4,
      color0: WHITE_HOT, color1: [1, 0.6, 0.2, 0], gravity: 0, drag: 0, bounce: false,
    });
    const n = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      const v = reflect.clone().multiplyScalar(0.6).add(normal.clone().multiplyScalar(0.5)).add(randomDir().multiplyScalar(0.6));
      v.normalize().multiplyScalar(rand(40, 120));
      this.glow.add({
        pos: at.clone(), vel: v, life: rand(0.25, 0.6), size0: rand(1.4, 2.4), size1: 0.6,
        color0: WHITE_HOT, color1: SPARK_END, gravity: 160, drag: 2, bounce: true,
      });
    }
    this.smoke.add({
      pos: at.clone(), vel: normal.clone().multiplyScalar(6), life: rand(0.6, 1.0), size0: 3, size1: 10,
      color0: DUST, color1: DUST_END, gravity: -2, drag: 2, bounce: false,
    });
  }

  /**
   * A fireball, smoke and burning debris. `size` scales it (1: the plane);
   * `velocity` is what it carries on with (the plane's speed, mostly lost).
   */
  explosion(point: THREE.Vector3, size = 1, velocity = new THREE.Vector3()): void {
    const carry = velocity.clone().multiplyScalar(0.25);
    this.glow.add({
      pos: point.clone(), vel: new THREE.Vector3(), life: 0.2, size0: 25 * size, size1: 45 * size,
      color0: [1, 0.95, 0.85, 1], color1: [1, 0.7, 0.3, 0], gravity: 0, drag: 0, bounce: false,
    });
    // fire: fast at first, then billowing up as it burns out
    for (let i = 0; i < 45 * size + 5; i++) {
      const v = randomDir().multiplyScalar(rand(10, 45) * size).add(carry);
      this.fire.add({
        pos: point.clone().addScaledVector(randomDir(), rand(0, 3) * size), vel: v, life: rand(0.4, 1.3),
        size0: rand(3, 7) * size, size1: rand(12, 20) * size,
        color0: FIRE, color1: FIRE_END, gravity: -15, drag: 3, bounce: false,
      });
    }
    for (let i = 0; i < 30 * size + 4; i++) {
      const v = randomDir().multiplyScalar(rand(4, 18) * size).add(carry);
      v.y += rand(4, 14);
      this.smoke.add({
        pos: point.clone().addScaledVector(randomDir(), rand(0, 5) * size), vel: v, life: rand(1.8, 3.5),
        size0: rand(5, 9) * size, size1: rand(22, 38) * size,
        color0: SMOKE, color1: SMOKE_END, gravity: -8, drag: 1.2, bounce: false,
      });
    }
    for (let i = 0; i < 50 * size; i++) {
      const v = randomDir().multiplyScalar(rand(30, 110) * Math.sqrt(size)).add(carry);
      v.y = Math.abs(v.y) * 0.8 + 10;
      this.glow.add({
        pos: point.clone(), vel: v, life: rand(0.8, 1.8), size0: rand(1, 2) * Math.sqrt(size), size1: 0.4,
        color0: WHITE_HOT, color1: SPARK_END, gravity: 90, drag: 0.8, bounce: true,
      });
    }
  }

  update(msecs: number): void {
    this.glow.update(msecs);
    this.fire.update(msecs);
    this.smoke.update(msecs);
  }

  dispose(): void {
    this.glow.dispose();
    this.fire.dispose();
    this.smoke.dispose();
    for (const t of this.textures) t.dispose();
  }
}
