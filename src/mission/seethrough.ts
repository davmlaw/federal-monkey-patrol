// A hole through the city: for the game-over shot, buildings between the
// camera and the kong are cut away in a circle round the kong on screen
// (with a dithered edge), so the camera can fly in from anywhere and the
// kong is never hidden behind a skyscraper.
//
// patchSeeThrough() adds it to the city's materials (once each, before
// they're first drawn if possible, so nothing recompiles at game over);
// it costs nothing while the hole is off.

import * as THREE from 'three';

/** x, y: the middle (drawing-buffer pixels from the bottom left), z: the
 *  radius in pixels (0: off), w: cut only what's nearer than this (view
 *  distance). */
const hole = { value: new THREE.Vector4(0, 0, 0, 0) };
/** The camera's near and far planes, to get the view distance back from
 *  the depth. */
const nearFar = { value: new THREE.Vector2(1, 1000) };

const patched = new WeakSet<THREE.Material>();

const PARS = `
uniform vec4 uHole;
uniform vec2 uHoleNF;`;

const CUT = `
if (uHole.z > 0.0) {
  float hr = length(gl_FragCoord.xy - uHole.xy) / uHole.z;
  float nz = gl_FragCoord.z * 2.0 - 1.0;
  float vd = 2.0 * uHoleNF.x * uHoleNF.y / (uHoleNF.y + uHoleNF.x - nz * (uHoleNF.y - uHoleNF.x));
  if (hr < 1.0 && vd < uHole.w) {
    // dithered over the outer quarter
    float edge = clamp((hr - 0.75) * 4.0, 0.0, 1.0);
    float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (edge < n) discard;
  }
}`;

function patch(m: THREE.Material): void {
  if (patched.has(m)) return;
  patched.add(m);
  const before = m.onBeforeCompile.bind(m);
  const key = m.customProgramCacheKey();
  m.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    shader.uniforms.uHole = hole;
    shader.uniforms.uHoleNF = nearFar;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>${PARS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>${CUT}`);
  };
  m.customProgramCacheKey = () => `${key}|seethrough`;
  m.needsUpdate = true;
}

/** Give everything under `root` the hole (new materials only). */
export function patchSeeThrough(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      // (not the street: it's drawn under everything anyway)
      if (m.depthTest && !(m instanceof THREE.ShaderMaterial)) patch(m);
    }
  });
}

/**
 * Cut the hole round `point` as `camera` sees it: `radius` world units
 * across at that distance, through everything nearer than `point` less
 * `margin`. The view is `view` (CSS pixels, as display.view) at `ratio`
 * device pixels each; the drawing buffer is `bufferHeight` tall.
 */
export function setSeeThrough(camera: THREE.PerspectiveCamera, point: THREE.Vector3, radius: number, margin: number,
  view: { x: number; y: number; w: number; h: number }, ratio: number, bufferHeight: number): void {
  camera.updateMatrixWorld();
  const dist = point.distanceTo(camera.position);
  const ndc = point.clone().project(camera);
  if (ndc.z > 1 || dist < 1) {
    clearSeeThrough();
    return;
  }
  const focal = (view.h * ratio / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const x = (view.x + (ndc.x + 1) / 2 * view.w) * ratio;
  // (gl_FragCoord counts from the bottom of the buffer)
  const y = bufferHeight - (view.y + (1 - ndc.y) / 2 * view.h) * ratio;
  // the depth test goes by distance along the view axis
  const along = point.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));
  hole.value.set(x, y, radius / dist * focal, along - margin);
  nearFar.value.set(camera.near, camera.far);
}

export function clearSeeThrough(): void {
  hole.value.z = 0;
}
