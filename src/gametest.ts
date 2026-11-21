// Test harness (gametest.html, dev only: not in the build): loads a
// mission without the menu, runs a scripted scenario as fast as it can
// (game time, not real time), and lays out snapshots and a log on the
// page. Drive it headless with tools/shoot.mjs, e.g.
//
//   npm run shoot -- 'gametest.html?scenario=blonde&catch=1'
//
// URL parameters:
//   scenario=<name>   one of SCENARIOS below (default: hud)
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
    if (params.has('catch')) {
      h.run(240000, { each: park, until: () => blonde.object.position.y < from.y - 150 || blonde.state !== 'falling' });
      h.plane.object.position.copy(blonde.object.position).add(new THREE.Vector3(0, 0, 10));
      h.run(50);
      h.check(blonde.state === 'caught' && gamestats.get(Stat.BLONDE_RESCUES) === 1, 'flying through her catches her');
      h.frame('caught');
    } else {
      h.run(240000, { each: park, until: () => blonde.state !== 'falling' });
      const p = blonde.object.position;
      h.check(blonde.state === 'landed' && gamestats.get(Stat.BLONDE_CASUALTIES) === 1, `she landed (at y=${p.y.toFixed(0)}, ${Math.hypot(p.x - from.x, p.z - from.z).toFixed(0)} out)`);
      h.check(p.y < from.y - 50, 'she was thrown clear of the roof');
      h.run(1000);
      h.look('landed', p.clone().add(new THREE.Vector3(0, 5, 0)), 40);
    }
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
