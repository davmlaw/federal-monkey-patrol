// Test harness (gametest.html, dev only: not in the build): loads a
// mission without the menu, runs a scripted scenario as fast as it can
// (game time, not real time), and lays out snapshots and a log on the
// page. Drive it headless with tools/shoot.mjs, e.g.
//
//   npm run shoot -- 'gametest.html?scenario=blonde&catch=1'
//
// URL parameters:
//   scenario=<name>   one of SCENARIOS below (default: hud): hud, kongs,
//                     blonde, icons, kongfall, gameover, bananas, pointer, win
//   mission=<file>    data/missions/<file> (default: claw.xml, Free Patrol)
//   set=mod.key=value override a .properties setting before loading
//                     (repeatable), e.g. set=kong.climb_chance=1
//   secs=<n>          how long scenarios that run for a while run
//   plus each scenario's own (see its comment).
//
// When it's finished, window.harness is { done: true, ok, log }: ok is
// false if the scenario threw or failed a check().

import * as THREE from 'three';
import { display } from './core/display.ts';
import { settings } from './core/settings.ts';
import { loadFont } from './core/draw2d.ts';
import { Input } from './core/input.ts';
import { Mission } from './mission/mission.ts';
import { gamestats, Stat } from './mission/stats.ts';
import type { Kong, Area } from './mission/kongs.ts';
import { BLOCKSIZE } from './mission/city.ts';
import { blondeIconTexture, KissPop } from './mission/hud.ts';
import type { World, Plane } from './mission/world.ts';

const params = new URLSearchParams(location.search);
const num = (k: string, d: number): number => {
  const v = parseFloat(params.get(k) ?? '');
  return Number.isFinite(v) ? v : d;
};

// The internals the scenarios poke at (private in the game's types).
interface MissionInternals {
  update(msecs: number, input: Input | null): void;
  patrol: Area;
  lives: number;
  crashTimer: number;
  finale: { msecs: number; camera: { position: THREE.Vector3 }; kong: Kong } | null;
  pointer: { dir: { x: number; y: number } | null; behind: boolean } | null;
  pointerRange: number;
  player: { turnTo(yaw: number, invulnerable: number): void };
}
interface KongInternals {
  tasks: { kind: string; roar?: boolean }[];
  yaw: number;
  cfg: { climbChance: number };
}

export class Harness {
  readonly input = new Input();
  /** Game milliseconds stepped so far. */
  t = 0;
  readonly lines: string[] = [];
  ok = true;
  readonly shots = document.getElementById('shots')!;
  private logEl = document.getElementById('log')!;

  constructor(readonly mission: Mission, private canvas: HTMLCanvasElement) {}

  get world(): World { return this.mission.world!; }
  get plane(): Plane { return this.mission.player.entity; }
  get internals(): MissionInternals { return this.mission as unknown as MissionInternals; }
  kongs(): Kong[] { return [...(this.mission.kongs?.all() ?? [])]; }
  kong(k: Kong): KongInternals { return k as unknown as KongInternals; }

  log(s: string): void {
    this.lines.push(s);
    this.logEl.textContent += `${s}\n`;
    console.log(s);
  }

  /** Fails the run (and logs it) unless `cond`. */
  check(cond: boolean, what: string): void {
    this.log(`${cond ? 'PASS' : 'FAIL'} ${what}`);
    if (!cond) this.ok = false;
  }

  /** Game time, "12.3s". */
  get when(): string { return `${(this.t / 1000).toFixed(1)}s`; }

  /** Run the game for `msecs` in steps of `dt`, without drawing (the city
   *  only grows round the camera when drawn: see snap()). `each` runs
   *  before every step, e.g. to hold the plane somewhere. Stops early if
   *  `until` comes true. */
  run(msecs: number, { dt = 50, each, until }: { dt?: number; each?: () => void; until?: () => boolean } = {}): boolean {
    for (let left = msecs; left > 0; left -= dt) {
      each?.();
      this.internals.update(dt, this.input);
      this.t += dt;
      if (until?.()) return true;
    }
    return false;
  }

  private addImage(label: string, width: number): void {
    const d = document.createElement('figure');
    const img = new Image();
    img.src = this.canvas.toDataURL();
    img.width = width;
    const cap = document.createElement('figcaption');
    cap.textContent = label;
    d.append(img, cap);
    this.shots.append(d);
  }

  /** A picture of the world from `eye` looking at `at` (no HUD). */
  snap(label: string, eye: THREE.Vector3, at: THREE.Vector3, width = 320): void {
    const cam = { getPosition: () => eye, getTarget: () => at, up: new THREE.Vector3(0, 1, 0) };
    // (twice: the first lets the city catch up round the camera)
    for (let i = 0; i < 2; i++) {
      display.beginFrame();
      this.world.draw(display, cam as unknown as Parameters<World['draw']>[1]);
    }
    this.addImage(`${label} @${this.when}`, width);
  }

  /** A picture of `target` from `dist` away, on the side `side` (radians
   *  about the vertical, 0: from +Z) and `up` above it. */
  look(label: string, target: THREE.Vector3, dist = 150, side = 0.6, up = 0.35, width = 320): void {
    const eye = target.clone().add(new THREE.Vector3(Math.sin(side), up, Math.cos(side)).setLength(dist));
    this.snap(label, eye, target, width);
  }

  /** The game as the player sees it (HUD and all), after `frames` frames
   *  of `dt` (they move the game on). */
  frame(label: string, frames = 3, dt = 30, width = 640): void {
    for (let i = 0; i < frames; i++) {
      display.beginFrame();
      this.mission.play(display, dt, this.input);
      this.t += dt;
    }
    this.addImage(`${label} @${this.when}`, width);
  }

  /** The middle of a kong's body (for look()). */
  static middle(k: Kong): THREE.Vector3 {
    return k.object.position.clone().add(new THREE.Vector3(0, k.height * 0.5, 0));
  }
}

// ---------------------------------------------------------------- scenarios

type Scenario = (h: Harness) => void | Promise<void>;

const SCENARIOS: Record<string, Scenario> = {
  /** Kongs throwing bananas (use mission=survive1.xml or survive2.xml):
   *  fly straight on, not dodging, for `secs` (default 12), a frame each
   *  second (drawn every step: kongs only throw when on screen). Checks
   *  bananas are thrown and that one brings the plane down. */
  bananas(h) {
    const b = h.mission.bananas;
    if (!b) throw new Error('no bananas in this mission (try mission=survive1.xml)');
    const secs = num('secs', 12);
    let most = 0;
    for (let i = 0; i < secs; i++) {
      for (let f = 0; f < 10; f++) {
        h.frame('', 3, 33);
        h.shots.lastElementChild?.remove();
        most = Math.max(most, b.count);
      }
      h.frame(`${b.count} bananas in the air, ${gamestats.get(Stat.PLAYER_DEATHS)} planes lost`, 1, 1);
    }
    h.log(`${b.thrown} thrown, at most ${most} in the air at once; ${gamestats.get(Stat.PLAYER_DEATHS)} planes lost`);
    h.check(most > 0, 'the kongs throw bananas');
    h.check(gamestats.get(Stat.PLAYER_DEATHS) > 0, 'a banana brings the plane down when it flies straight on');
  },

  /** The arrow to the nearest kong (use mission=killmonkeys.xml or
   *  clear.xml: a fixed number). Waits for a kong to climb (climbs made
   *  certain), then puts the plane `dist` (default 700) from it, facing
   *  it, with it to the left, and with it behind, a frame each; then far
   *  off, where the arrow should go. */
  pointer(h) {
    if (!h.internals.pointer) throw new Error('no pointer in this mission (try mission=killmonkeys.xml)');
    for (const k of h.kongs()) h.kong(k).cfg.climbChance = 1;
    h.plane.charmed = true;
    const park = (): void => { h.plane.object.position.set(h.internals.patrol.x, 2500, h.internals.patrol.z); };
    const high = (): Kong | undefined => h.kongs().find((k) => k.object.position.y > 120);
    h.run(120000, { each: park, until: () => !!high() });
    const kong = high() ?? h.kongs()[0];
    h.check(!!kong, 'there is a kong');
    if (!kong) return;
    h.log(`kong at y=${kong.object.position.y.toFixed(0)}`);
    const dist = num('dist', 700);
    const place = (label: string, turn: number, away = dist): void => {
      const k = kong.object.position;
      const a = h.t * 0.001; // some direction
      const p = new THREE.Vector3(k.x + Math.sin(a) * away, Math.max(150, k.y - 60), k.z + Math.cos(a) * away);
      h.plane.object.position.copy(p);
      h.internals.player.turnTo(Math.atan2(-(k.x - p.x), -(k.z - p.z)) + turn, 0);
      h.frame(label, 20, 30);
      const ptr = h.internals.pointer!;
      h.log(`${label}: ${ptr.dir ? `points ${ptr.dir.x.toFixed(2)},${ptr.dir.y.toFixed(2)}${ptr.behind ? ' (behind)' : ''}` : 'hidden'}`);
    };
    place('facing it', 0);
    h.check(!!h.internals.pointer!.dir && !h.internals.pointer!.behind, 'the arrow shows, the kong ahead');
    place('it to the left', -Math.PI / 2);
    h.check((h.internals.pointer!.dir?.x ?? 0) < 0, 'it points left');
    place('it behind', Math.PI);
    h.check(!!h.internals.pointer!.behind, 'it says behind');
    place('far off', 0, h.internals.pointerRange + 1500);
    h.check(!h.internals.pointer!.dir, 'no arrow when it is far off');
  },

  /** Shoot every kong down at once and show the mission's ending (use a
   *  mission with a fixed number, e.g. killmonkeys.xml). */
  win(h) {
    h.plane.charmed = true;
    h.run(3000);
    for (const kong of h.kongs()) {
      kong.struck(h.world, { t: 0, point: Harness.middle(kong), normal: new THREE.Vector3(0, 0, 1) }, new THREE.Vector3(0, 0, -100), 100);
    }
    h.run(500);
    h.frame('just won', 10, 30);
    h.run(2000);
    h.frame('a little later', 3, 30);
  },

  /** Fly straight on for `secs`, a full frame (with the HUD) each second. */
  hud(h) {
    h.plane.charmed = true;
    const secs = num('secs', 4);
    for (let i = 0; i < secs; i++) {
      h.run(1000);
      h.frame(`frame ${i + 1}`);
    }
  },

  /** Every kong close up, every `every` seconds (default 5) for `secs`
   *  (default 10), with what it's doing. */
  kongs(h) {
    h.plane.charmed = true;
    const secs = num('secs', 10);
    const every = num('every', 5);
    for (let s = 0; s <= secs; s += every) {
      if (s) h.run(every * 1000);
      for (const [i, k] of h.kongs().entries()) {
        const ki = h.kong(k);
        const p = k.object.position;
        h.log(`kong ${i} at ${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)} ${ki.tasks.map((x) => x.kind).join(',')}`);
        h.look(`kong ${i} ${ki.tasks[0]?.kind ?? ''}${k.blonde ? ' +blonde' : ''}`, Harness.middle(k), 3 * k.height, ki.yaw + Math.PI);
      }
    }
  },

  /** A kong grabs a blonde, climbs a tower and is shot on top; she falls
   *  and lands, or (catch=1) the plane flies through her. Climbs and grabs
   *  are made certain. */
  blonde(h) {
    const kit = h.mission.kongs?.blondes;
    if (!kit) throw new Error('no blondes in this mission');
    kit.cfg.grabChance = 1;
    for (const k of h.kongs()) h.kong(k).cfg.climbChance = 1;
    h.plane.charmed = true;
    // keep the plane out of the way, high over the middle
    const park = (): void => { h.plane.object.position.set(h.internals.patrol.x, 2500, h.internals.patrol.z); };
    let kong: Kong | undefined;
    h.run(180000, { each: park, until: () => !!(kong = h.kongs().find((k) => k.blonde)) });
    h.check(!!kong, 'a kong grabbed a blonde');
    if (!kong) return;
    const ki = h.kong(kong);
    h.log(`grabbed at y=${kong.object.position.y.toFixed(0)}: ${ki.tasks.map((x) => x.kind).join(',')}`);
    h.look('grab', Harness.middle(kong), 200, ki.yaw + Math.PI);
    h.look('her, close', kong.blonde!.object.position, 40);
    const onTop = (): boolean => ki.tasks[0]?.kind === 'wait' && !!ki.tasks[0].roar && kong!.object.position.y > 10;
    for (let i = 0; i < 2 && !onTop(); i++) {
      h.run(10000, { each: park, until: onTop });
      h.look(`climbing (${ki.tasks[0]?.kind})`, Harness.middle(kong), 200, ki.yaw + Math.PI);
    }
    h.check(h.run(240000, { each: park, until: onTop }) || onTop(), 'it got to the top');
    h.log(`on top at y=${kong.object.position.y.toFixed(0)}`);
    h.look('on top', Harness.middle(kong), 200, ki.yaw);
    const blonde = kong.blonde!;
    kong.struck(h.world, { t: 0, point: kong.object.position.clone(), normal: new THREE.Vector3(0, 0, 1) }, new THREE.Vector3(0, 0, -100), 100);
    h.check(blonde.state === 'falling', 'she falls when it is shot');
    const from = blonde.object.position.clone();
    h.run(1500, { each: park });
    h.look('falling', blonde.object.position, 60);
    h.frame('falling (her head on the radar)');
    if (params.has('catch')) {
      h.run(240000, { each: park, until: () => blonde.object.position.y < from.y - 150 || blonde.state !== 'falling' });
      h.log(`she is ${blonde.state} at y=${blonde.object.position.y.toFixed(0)} (from ${from.y.toFixed(0)})`);
      h.plane.object.position.copy(blonde.object.position);
      h.run(50);
      h.log(`then she is ${blonde.state}, the plane ${h.plane.object.position.distanceTo(blonde.object.position).toFixed(1)} from her`);
      h.check(blonde.state === 'caught' && gamestats.get(Stat.BLONDE_RESCUES) === 1, 'flying through her catches her');
      h.frame('caught (a kiss, and the tallies)', 8);
    } else {
      h.run(240000, { each: park, until: () => blonde.state !== 'falling' });
      const p = blonde.object.position;
      h.check(blonde.state === 'landed' && gamestats.get(Stat.BLONDE_CASUALTIES) === 1, `she landed (at y=${p.y.toFixed(0)}, ${Math.hypot(p.x - from.x, p.z - from.z).toFixed(0)} out)`);
      const street = Math.min(Math.abs(p.x - Math.round(p.x / BLOCKSIZE) * BLOCKSIZE), Math.abs(p.z - Math.round(p.z / BLOCKSIZE) * BLOCKSIZE));
      h.check(p.y < 1 && street < 45, `she came down in the street (${street.toFixed(0)} off its middle)`);
      h.run(1000);
      h.look('landed', p.clone().add(new THREE.Vector3(0, 5, 0)), 40);
    }
  },

  /** The HUD's icons, large: the kong's head (rendered from the model),
   *  the blonde's, and the kisses for catching her. */
  icons(h) {
    const kongs = h.mission.kongs;
    if (!kongs) throw new Error('no kongs in this mission');
    const kiss = new KissPop() as unknown as { textures: Record<string, THREE.Texture> };
    const show: [string, THREE.Texture][] = [
      ['kong', kongs.portrait(display.renderer, 256)],
      ['blonde', blondeIconTexture()],
      ...Object.entries(kiss.textures),
    ];
    for (const [label, t] of show) {
      const d = document.createElement('figure');
      const img = t.image as HTMLCanvasElement;
      img.style.width = img.style.height = '200px';
      img.style.background = '#8a8a80';
      const cap = document.createElement('figcaption');
      cap.textContent = label;
      d.append(img, cap);
      h.shots.append(d);
    }
    h.frame('in the HUD');
  },

  /** Kongs shot up on buildings fall down to the street: `n` (default 3)
   *  of them, each shot as soon as it's `at` (climb: on a wall more than
   *  60 up; top: roaring on a roof; any: anywhere above the street, e.g.
   *  with mission=rooftops.xml). Climbs are made certain. */
  kongfall(h) {
    for (const k of h.kongs()) h.kong(k).cfg.climbChance = 1;
    h.plane.charmed = true;
    // keep the plane out of the way, high over where it starts (the kongs'
    // area may move with it)
    const start = h.plane.object.position.clone().setY(2500);
    const park = (): void => { h.plane.object.position.copy(start); };
    const at = params.get('at') ?? 'climb';
    const ready = (k: Kong): boolean => {
      const task = h.kong(k).tasks[0];
      const y = k.object.position.y;
      if (k.isDying() || y < 10) return false;
      if (at === 'climb') return task?.kind === 'climb' && y > 60;
      if (at === 'top') return task?.kind === 'wait' && !!task.roar;
      return true;
    };
    const n = num('n', 3);
    for (let i = 0; i < n; i++) {
      let kong: Kong | undefined;
      h.run(240000, { each: park, until: () => !!(kong = h.kongs().find(ready)) });
      h.check(!!kong, `kong ${i}: up a building (${at})`);
      if (!kong) return;
      const from = kong.object.position.clone();
      const yaw = h.kong(kong).yaw;
      h.log(`kong ${i}: shot at ${from.x.toFixed(0)},${from.y.toFixed(0)},${from.z.toFixed(0)}`);
      const side = yaw + Math.PI / 2;
      const target = from.clone().setY(from.y / 2);
      const dist = Math.max(250, from.y * 1.3);
      h.look(`kong ${i}: shot`, Harness.middle(kong), 3 * kong.height, yaw + Math.PI);
      kong.struck(h.world, { t: 0, point: Harness.middle(kong), normal: new THREE.Vector3(0, 0, 1) }, new THREE.Vector3(0, 0, -100), 100);
      for (let f = 0; f < 3; f++) {
        h.run(400, { each: park });
        h.look(`kong ${i}: falling`, target, dist, side, 0.2);
      }
      const k = kong;
      const down = (): boolean => (k as unknown as { landed: boolean }).landed;
      h.run(15000, { each: park, until: down });
      h.run(1500, { each: park });
      const p = k.object.position;
      const street = Math.min(Math.abs(p.x - Math.round(p.x / BLOCKSIZE) * BLOCKSIZE), Math.abs(p.z - Math.round(p.z / BLOCKSIZE) * BLOCKSIZE));
      h.check(down() && Math.abs(p.y) < 1, `kong ${i}: down on the street (y=${p.y.toFixed(1)}, ${street.toFixed(0)} off the street's middle, ${h.when})`);
      h.check(street < 45, `kong ${i}: in the street, not on a building`);
      h.look(`kong ${i}: down`, p.clone().setY(10), 3 * k.height, side, 2);
    }
  },

  /** The last plane crashes and the game-over shot plays: the camera flies
   *  to a kong on a roof (one already up there, or, with roof=0 or none
   *  about, a new one behind the plane) and closes in on it roaring. A
   *  frame every `every` msecs (default 1000). roof=1 first waits for a
   *  kong to be up on a roof (climbs made certain). */
  gameover(h) {
    const mi = h.internals;
    if (params.get('roof') === '1') {
      for (const k of h.kongs()) h.kong(k).cfg.climbChance = 1;
      h.plane.charmed = true;
      const start = h.plane.object.position.clone().setY(2500);
      h.check(h.run(240000, { each: () => h.plane.object.position.copy(start), until: () => h.kongs().some((k) => k.onRoof()) }), 'a kong got up on a roof');
      h.plane.charmed = false;
      h.plane.object.position.copy(start).setY(400);
      h.frame('flying', 3);
    }
    const p = h.plane.object.position;
    h.plane.hit(h.world, { t: 0, point: p.clone(), normal: new THREE.Vector3(0, 1, 0) }, new THREE.Vector3());
    // (as Mission.update does when it sees the crash)
    mi.lives = 0;
    mi.crashTimer = 1500;
    h.frame('the last crash', 4);
    const started = h.run(5000, { until: () => !!mi.finale });
    h.check(started && !!mi.finale, 'the game-over shot starts after the wreck burns');
    const fin = mi.finale;
    if (!fin) return;
    const kong = fin.kong;
    const kp = kong.object.position;
    h.log(`kong at ${kp.x.toFixed(0)},${kp.y.toFixed(0)},${kp.z.toFixed(0)}, ${p.distanceTo(kp).toFixed(0)} from the wreck`);
    h.check(kp.y > 100, 'the kong is up on a building');
    const every = num('every', 1000);
    const until = h.t + 60000;
    while (h.mission.getStatus() === 0 && h.t < until) {
      h.frame(`game over +${(fin.msecs / 1000).toFixed(1)}s`, Math.max(1, Math.round(every / 30)));
    }
    const d = fin.camera.position.distanceTo(kp.clone().setY(kp.y + kong.height * 0.6));
    h.check(d < 3 * kong.height, `the camera ends close on it (${d.toFixed(0)} away)`);
    h.check(h.kong(kong).tasks[0]?.roar === true, 'it is roaring');
    h.check(h.mission.getStatus() === 2, 'and then the game is lost');
  },
};

// --------------------------------------------------------------------- main

async function main(): Promise<void> {
  const result = { done: false, ok: false, log: [] as string[] };
  (window as unknown as { harness: typeof result }).harness = result;
  const canvas = document.getElementById('screen') as HTMLCanvasElement;
  display.init(canvas);
  await settings.load();
  for (const s of params.getAll('set')) {
    const m = /^(\w+)\.([^=]+)=(.*)$/.exec(s);
    if (m) settings.set(m[1], m[2], m[3]);
  }
  await loadFont();
  const name = params.get('scenario') ?? 'hud';
  const scenario = SCENARIOS[name];
  const mission = new Mission(params.get('mission') ?? 'claw.xml');
  await mission.load();
  const h = new Harness(mission, canvas);
  (window as unknown as { gametest: Harness }).gametest = h;
  try {
    if (!scenario) throw new Error(`no scenario "${name}" (${Object.keys(SCENARIOS).join(', ')})`);
    if (mission.loadError) throw mission.loadError;
    // the city round the start, as the first frames would
    h.frame('start', 2);
    h.shots.replaceChildren();
    await scenario(h);
  } catch (e) {
    h.ok = false;
    h.log(`ERROR ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  }
  h.log(`${h.ok ? 'OK' : 'FAILED'} ${name} after ${h.when} of game time`);
  Object.assign(result, { done: true, ok: h.ok, log: h.lines });
  canvas.hidden = true;
}

main();
