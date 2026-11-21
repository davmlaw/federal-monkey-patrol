// Test page for the kong's animations (kongtest.html): the rigged model
// going through its clips, on a ground that moves under it as it walks and
// a wall that slides down as it climbs, so slipping feet and hands show.
// lil-gui picks the clip and shows the skeleton or the skin weights.
//
// URL parameters: clip=walk, phase=0.25, paused=1, view=side|front|back|
// three|top, weights=all|<bone>, skeleton=1, and sheet=<clip> for a contact
// sheet of one cycle (frames=8, views=side,front, tile=260, sign=-1 to fall
// on its face) instead of the live view.

import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModel } from './core/assets.ts';
import {
  CLIMB_STRIDE, CLIPS, FALL_SETTLE, GROUND_Y, KongAnimator, KongRig, ROAR_SECONDS, IDLE_SECONDS, WALK_STRIDE,
  type KongClip,
} from './mission/kongrig.ts';

const params = new URLSearchParams(location.search);
const TILE = 500; // the checks on the ground and wall
// the game's speeds (data/etc/kong.properties), in model units
const HEIGHT = 90;
const MODEL_HEIGHT = 3318;
const WALK_SPEED = 35 * MODEL_HEIGHT / HEIGHT;
const CLIMB_SPEED = 45 * MODEL_HEIGHT / HEIGHT;
const FALL_SECS = 1.4; // the street topple in kongs.ts
const FALL_LOOP = FALL_SECS + FALL_SETTLE + 1.5;

function checker(a: string, b: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = a;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = b;
  g.fillRect(0, 0, 32, 32);
  g.fillRect(32, 32, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const VIEWS: Record<string, [number, number, number]> = {
  side: [9000, 0, 0],
  front: [0, 0, 9000],
  back: [0, 0, -9000],
  three: [6000, 1500, 6500],
  top: [0, 9000, 1],
};

async function main(): Promise<void> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9aa3ad);
  scene.fog = new THREE.Fog(0x9aa3ad, 15000, 40000);
  scene.add(new THREE.HemisphereLight(0xeef0ff, 0x554433, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 5, 4);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40 * TILE, 40 * TILE),
    new THREE.MeshLambertMaterial({ map: checker('#6d6a64', '#5c5953') }),
  );
  (ground.material.map as THREE.Texture).repeat.set(20, 20);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  scene.add(ground);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(16 * TILE, 40 * TILE),
    new THREE.MeshLambertMaterial({ map: checker('#8a6f5a', '#7a604c'), transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  (wall.material.map as THREE.Texture).repeat.set(8, 20);
  wall.rotation.y = Math.PI;
  scene.add(wall);

  // as in the game: the mesh in a group that topples about the feet
  const proto = await loadModel('kong2.obj', 'kongcolor.jpg');
  const skinMat = proto.material as THREE.MeshLambertMaterial;
  const rig = new KongRig(proto.geometry, skinMat);
  const anim = new KongAnimator(rig);
  const pose = new THREE.Group();
  pose.position.y = GROUND_Y;
  rig.mesh.position.y = -GROUND_Y;
  pose.add(rig.mesh);
  scene.add(pose);
  wall.position.z = rig.wallZ;

  const skel = new THREE.SkeletonHelper(rig.mesh);
  (skel.material as THREE.LineBasicMaterial).depthTest = false;
  (skel.material as THREE.LineBasicMaterial).linewidth = 2;
  skel.visible = false;
  scene.add(skel);

  // skin weights as colours: one bone, or every bone its own colour
  const weightMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const geom = rig.mesh.geometry;
  function paintWeights(bone: string): void {
    const idx = geom.getAttribute('skinIndex');
    const wt = geom.getAttribute('skinWeight');
    const n = idx.count;
    const col = new Float32Array(n * 3);
    const which = rig.boneNames.indexOf(bone);
    const hues = rig.boneNames.map((_, i) => new THREE.Color().setHSL((i * 0.618) % 1, 0.8, 0.55));
    for (let i = 0; i < n; i++) {
      const c = new THREE.Color(which >= 0 ? 0x223355 : 0x000000);
      for (let k = 0; k < 4; k++) {
        const b = idx.getComponent(i, k);
        const w = wt.getComponent(i, k);
        if (which >= 0) { if (b === which) c.lerp(new THREE.Color(1, 0.2, 0.1), w); } else c.add(hues[b].clone().multiplyScalar(w));
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    geom.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }

  const state = {
    clip: (params.get('clip') ?? 'walk') as KongClip,
    speed: 1,
    paused: params.has('paused'),
    phase: parseFloat(params.get('phase') ?? '0'),
    fallSign: 1,
    skeleton: params.has('skeleton'),
    weights: params.get('weights') ?? 'off',
    wireframe: false,
    view: params.get('view') ?? 'three',
  };
  let walked = 0;
  let climbed = 0;
  let fallTime = 0;

  /** Everything for `clip` at `phase`, straight from the rig (no blending). */
  function poseAt(clip: KongClip, phase: number): void {
    rig.fallSign = state.fallSign;
    rig.apply(clip, phase);
    placeScenery(clip, phase);
  }

  function placeScenery(clip: KongClip, phase: number): void {
    wall.visible = clip === 'climb';
    ground.position.z = clip === 'walk' ? -((phase * WALK_STRIDE) % TILE) : 0;
    wall.position.y = clip === 'climb' ? -((phase * CLIMB_STRIDE) % TILE) : 0;
    const k = clip === 'fall' ? Math.min(1, phase) : 0;
    pose.rotation.x = -state.fallSign * (Math.PI / 2) * k * k;
  }

  // ---------------------------------------------------------- contact sheet
  if (params.has('weights')) { paintWeights(params.get('weights')!); rig.mesh.material = weightMat; }
  if (params.has('skeleton')) skel.visible = true;
  const sheet = params.get('sheet') as KongClip | null;
  if (sheet) {
    const frames = parseInt(params.get('frames') ?? '8', 10);
    const views = (params.get('views') ?? 'side,front').split(',');
    const tile = parseInt(params.get('tile') ?? '260', 10);
    if (params.get('sign') === '-1') state.fallSign = -1;
    document.getElementById('help')!.remove();
    renderer.setPixelRatio(1);
    renderer.setSize(frames * tile, views.length * tile);
    renderer.setScissorTest(true);
    const cam = new THREE.PerspectiveCamera(30, 1, 100, 60000);
    const span = sheet === 'fall' ? 1 + FALL_SETTLE : 1;
    views.forEach((v, row) => {
      for (let i = 0; i < frames; i++) {
        poseAt(sheet, span * i / (sheet === 'fall' ? frames - 1 : frames));
        const [x, y, z] = VIEWS[v] ?? VIEWS.three;
        cam.position.set(x, y + 200, z).multiplyScalar(1.05);
        cam.lookAt(0, 0, sheet === 'climb' ? 300 : 0);
        const yPix = (views.length - 1 - row) * tile;
        renderer.setViewport(i * tile, yPix, tile, tile);
        renderer.setScissor(i * tile, yPix, tile, tile);
        renderer.render(scene, cam);
      }
    });
    (window as unknown as { sheetDone: boolean }).sheetDone = true;
    return;
  }

  // ----------------------------------------------------------------- live
  const camera = new THREE.PerspectiveCamera(35, 1, 100, 60000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  function setView(v: string): void {
    const p = VIEWS[v] ?? VIEWS.three;
    camera.position.set(...p);
    controls.target.set(0, 0, state.clip === 'climb' ? 300 : 0);
    controls.update();
  }
  setView(state.view);

  function resize(): void {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const gui = new GUI({ title: 'Kong' });
  gui.add(state, 'clip', CLIPS).onChange(() => { walked = climbed = fallTime = 0; });
  gui.add(state, 'speed', 0, 2, 0.05);
  gui.add(state, 'paused');
  const phaseCtl = gui.add(state, 'phase', 0, 1 + FALL_SETTLE, 0.001).listen().onChange(() => { state.paused = true; });
  gui.add(state, 'fallSign', { 'onto its back': 1, 'onto its face': -1 });
  gui.add(state, 'skeleton').onChange((v: boolean) => { skel.visible = v; });
  gui.add(state, 'weights', ['off', 'all', ...rig.boneNames]).onChange((v: string) => {
    if (v === 'off') rig.mesh.material = skinMat;
    else { paintWeights(v); rig.mesh.material = weightMat; }
  });
  gui.add(state, 'wireframe').onChange((v: boolean) => { skinMat.wireframe = v; weightMat.wireframe = v; });
  gui.add(state, 'view', Object.keys(VIEWS)).onChange(setView);
  void phaseCtl;

  window.addEventListener('keydown', (e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= CLIPS.length) { state.clip = CLIPS[n - 1]; gui.controllersRecursive().forEach((c) => c.updateDisplay()); }
    else if (e.key === ' ') state.paused = !state.paused;
    else if (e.key === ',' || e.key === '.') { state.paused = true; state.phase += e.key === '.' ? 1 / 32 : -1 / 32; }
  });

  // for scripts driving the page
  (window as unknown as { kongtest: unknown }).kongtest = { state, setView, rig, anim };

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.1, (now - last) / 1000) * state.speed;
    last = now;
    rig.fallSign = state.fallSign;
    if (state.paused) {
      anim.update(1, state.clip, 0, state.phase); // (a long dt: no blend)
    } else {
      switch (state.clip) {
        case 'walk': walked += WALK_SPEED * dt; anim.update(dt, 'walk', WALK_SPEED * dt); break;
        case 'climb': climbed += CLIMB_SPEED * dt; anim.update(dt, 'climb', CLIMB_SPEED * dt); break;
        case 'fall': {
          fallTime = (fallTime + dt) % FALL_LOOP;
          const ph = fallTime < FALL_SECS ? fallTime / FALL_SECS : 1 + Math.min(FALL_SETTLE, fallTime - FALL_SECS);
          anim.update(dt, 'fall', 0, ph);
          break;
        }
        default: anim.update(dt, state.clip); break;
      }
      state.phase = anim.phase % (state.clip === 'fall' ? 99 : 1);
      void ROAR_SECONDS; void IDLE_SECONDS;
    }
    placeScenery(state.clip, state.clip === 'walk' && !state.paused ? walked / WALK_STRIDE
      : state.clip === 'climb' && !state.paused ? climbed / CLIMB_STRIDE : state.phase);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  void poseAt;
}

main();
