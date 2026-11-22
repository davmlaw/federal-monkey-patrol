// A mission: built from data/missions/*.xml, then the plane flying over the
// city with its HUD, until an outcome changes the status.

import * as THREE from 'three';
import { display as theDisplay, ORTHO_H, ORTHO_W, type Display } from '../core/display.ts';
import { Container2D, LEFT, RIGHT, Text2D, textWidth, TOP } from '../core/draw2d.ts';
import { fetchText, playBang } from '../core/assets.ts';
import { dircheck, settings } from '../core/settings.ts';
import type { Input } from '../core/input.ts';
import { GameComponent, Status } from '../game/component.ts';
import { Constraints, Outcomes, xmlMap, xmlStringMap } from './outcomes.ts';
import { gamestats, Stat } from './stats.ts';
import { FlyMode, makeCameraMan, Player, World, type CameraMan } from './world.ts';
import { Banner, blondeIconTexture, ClawAlert, CountDownTimer, FogPlane, FPSCounter, fpsOverlay, IconTally, KissPop, LivesDisplay, LoadBar, Radar, TurnBack } from './hud.ts';
import { CityGrid, loadCityMaterials } from './city.ts';
import { KongTroop, type Area, type TroopOptions } from './kongs.ts';

// Top-down mode flies this far above the tallest building around the plane
// (plus a kong's height, when they're on the roofs): high, so with the
// camera close over the plane it shows it big and still a lot of the city.
const TOPDOWN_CLEARANCE = 380;
// After a crash: how long the wreck burns before the next plane, how high
// over the rooftops it comes back, and how long it can't crash again.
const RESPAWN_MSECS = 2500;
const RESPAWN_CLEARANCE = 120;
const INVULNERABLE_MSECS = 3000;
const GAME_OVER_MSECS = 4000; // the last crash, then "GAME OVER", then lost
// The radar reaches this far (world units); kongs further off sit on its rim.
const RADAR_RANGE = 2400;
const RADAR_SIZE = 0.2;
// After losing a plane for flying out of bounds: this long a message shows.
const OUT_MESSAGE_MSECS = 3000;
// With no patrol area, the kongs' area is centred this far (in radii) ahead
// of the plane.
const ROAM_AHEAD = 0.4;
// When an outcome ends the mission, its message shows this long first.
const ENDING_MSECS = 4500;
// A blonde caught or landed: this long the message shows.
const BLONDE_MESSAGE_MSECS = 2500;

/** How the last mission ended, for the menu: set when it finishes or is
 *  lost, cleared when one loads. */
export const lastResult = { title: '', line: '' };

/** Top-down missions' speed range (game.properties topdown_min_speed and
 *  topdown_max_speed; it doesn't go by altitude). */
function topdownSpeeds(): { min: number; max: number } {
  const min = settings.getf('game', 'topdown_min_speed') || 200;
  return { min, max: Math.max(min, settings.getf('game', 'topdown_max_speed') || 600) };
}

/** "m:ss" */
const minutes = (secs: number): string => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

/** "N kongs downed in m:ss", with the blondes caught if there were any. */
function summary(): string {
  const n = gamestats.get(Stat.MONKEY_DEATHS);
  const b = gamestats.get(Stat.BLONDE_RESCUES);
  const blondes = b + gamestats.get(Stat.BLONDE_CASUALTIES) > 0 ? `, ${b} blonde${b === 1 ? '' : 's'} caught` : '';
  return `${n} kong${n === 1 ? '' : 's'} downed${blondes} in ${minutes(gamestats.get(Stat.GAME_SECONDS))}`;
}

/** The Giant Claw. Built from <claw>, but nothing calls update() yet, so
 *  its anger never changes. */
class GiantClaw {
  private anger = 0;
  inc = 0;
  dec = 0;
  heightFactor = 1;

  constructor(private minVisibleHeight: number) {}

  update(playerPos: { y: number }, msecs: number): void {
    const change = playerPos.y > this.minVisibleHeight ? this.inc : -this.dec;
    this.anger = Math.min(1, Math.max(0, this.anger + change * msecs / 1000));
  }

  getState(): number { return this.anger; }
}

function parseXML(text: string, filename: string): Element {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error(`XML error in ${filename}: ${err.textContent}`);
  return doc.documentElement;
}

export class Mission extends GameComponent {
  private claw: GiantClaw | null = null;
  private constraints: Constraints | null = null;
  private outcomes: Outcomes | null = null;
  private countdowntimer: CountDownTimer | null = null;
  private clawalert: ClawAlert | null = null;
  private fps = new FPSCounter();
  /** City generation progress, 0..1, shown by the load bar. */
  private progress = 0;
  private loadbar: LoadBar | null = null;
  /** Planes left, counting the one flying (game.properties `lives`). */
  private lives = 3;
  private livesDisplay!: LivesDisplay;
  /** Counts down while the wreck burns (0: flying). */
  private crashTimer = 0;
  private gameOver = new Text2D('GAME OVER', 0.6);
  /** The patrol area (game.properties patrol_radius, round the start). */
  private patrol: Area = { x: 0, z: 0, r: 3200 };
  private turnBackMsecs = 6000;
  /** Milliseconds spent outside the patrol area this time (0: inside). */
  private outside = 0;
  /** Outside, but heading back in. */
  private heading = false;
  /** None with <radar>off</radar>. */
  private radar: Radar | null = null;
  private showRadar = true;
  /** <view>topdown</view>: a top-down mission (no throttle), with
   *  <controls>steer</controls> to turn rather than slide sideways. */
  private flyMode: FlyMode = FlyMode.FOLLOW;
  private steer = false;
  private turnBack = new TurnBack();
  private outMessage = new Text2D('Out of bounds: you lost a plane', 0.25);
  private outMessageMsecs = 0;
  /** "Missed her!" (one caught gets a kiss instead). */
  private blondeMessage = new Text2D('', 0.25);
  private blondeMessageMsecs = 0;
  private kiss = new KissPop();
  // Set by _load(); the mission is only played once it has loaded.
  private fogplane!: FogPlane;
  private hud!: Container2D;
  /** The kongs: <kongs> in <startconditions>, else kong.properties. */
  private kongOptions: TroopOptions = {};
  /** <patrolradius> in <startconditions>, else game.properties. */
  private patrolRadius: number | null = null;
  /** <patrolradius>none</patrolradius>: no edge to the world. The kongs'
   *  area (game.properties roam_radius) goes along with the plane, centred
   *  a little ahead of it. */
  private roaming = false;
  /** Kongs downed (or left), as a kong's head and "x3". */
  private tally!: IconTally;
  /** Blondes caught, under the kongs (when there are blondes). */
  private blondeTally: IconTally | null = null;
  /** An outcome has ended the mission: the status to take when the banner
   *  has shown for ENDING_MSECS. */
  private ending: { status: Status; msecs: number } | null = null;
  private banner = new Banner();
  kongs: KongTroop | null = null;
  cameraman!: CameraMan;
  player!: Player;
  world: World | null = null;

  constructor(readonly name: string) {
    super();
    this.status = Status.PLAYING;
  }

  override getName(): string { return `Mission(${this.name})`; }

  override drawLoading(display: Display): void {
    const loadbar = this.loadbar;
    if (!loadbar) return;
    loadbar.setState(this.progress);
    display.draw2dWith((g) => loadbar.drawWith(g, 1, display));
  }

  protected override async _load(): Promise<void> {
    console.log(`Loading ${this.getName()}`);
    this.loadbar = await LoadBar.create();
    await this.build();

    this.fogplane = new FogPlane();
    this.hud = new Container2D(ORTHO_W, ORTHO_H);
    if (this.claw) {
      this.clawalert = await ClawAlert.create(0.15, 0.35);
      this.hud.add(this.clawalert, RIGHT);
    }
    if (this.countdowntimer) this.hud.add(this.countdowntimer, TOP | RIGHT);
    const pos = this.player.entity.object.position;
    const radius = this.roaming ? settings.getf('game', 'roam_radius') || 2500 : this.patrolRadius;
    this.patrol = { x: pos.x, z: pos.z, r: radius ?? (settings.getf('game', 'patrol_radius') || 3200) };
    this.turnBackMsecs = (settings.getf('game', 'turn_back_seconds') || 6) * 1000;
    if (this.showRadar) {
      this.radar = new Radar(RADAR_SIZE, RADAR_RANGE, this.roaming ? null : this.patrol);
      this.hud.add(this.radar, TOP | RIGHT);
      this.radar.position.x -= 0.015;
      this.radar.position.y -= 0.015 + (this.countdowntimer ? this.countdowntimer.getHeight() : 0);
    }
    this.outMessage.setColor(1, 0.85, 0.3);
    this.outMessage.position.y = 0.1;
    this.lives = settings.geti('game', 'lives') || 3;
    this.livesDisplay = await LivesDisplay.create(this.lives);
    this.hud.add(this.livesDisplay, TOP | LEFT);
    this.livesDisplay.position.x += 0.01;
    this.livesDisplay.position.y -= 0.06; // below the FPS readout
    this.cameraman = makeCameraMan();

    // The city, generated patch by patch behind the load bar
    const materials = await loadCityMaterials();
    const grid = new CityGrid(materials);
    await grid.generate((p: number) => { this.progress = p; });
    this.world = new World(grid);
    this.world.addEntity(this.player.entity);
    this.kongs = await KongTroop.create(this.kongOptions, this.patrol);
    this.tally = new IconTally(this.kongs.portrait(theDisplay.renderer), 0.22, this.kongs.respawns ? '' : 'LEFT');
    this.hud.add(this.tally, TOP);
    this.tally.position.y -= 0.06; // below the pause button
    if (this.kongs.blondes) {
      this.kongs.blondes.plane = this.player.entity;
      this.blondeTally = new IconTally(blondeIconTexture(), 0.22);
      this.hud.add(this.blondeTally, TOP);
      this.blondeTally.position.y = this.tally.position.y - this.tally.getHeight() - 0.005;
      this.blondeTally.setColor(1, 0.95, 0.7);
    }
    this.blondeMessage.position.y = 0.2;
    gamestats.reset();
    lastResult.title = lastResult.line = '';
  }

  /** Reads the mission's XML. */
  private async build(): Promise<void> {
    const dir = dircheck(settings.gets('game', 'mission.dir'));
    const root = parseXML(await fetchText(dir + this.name), this.name);
    const node = xmlMap(root);

    // <startconditions>
    const sc = xmlMap(node.startconditions);
    const startHeight = parseFloat(sc.height?.textContent ?? '') || 0;
    const model = xmlStringMap(sc.model);
    if (sc.claw) {
      const c = xmlStringMap(sc.claw);
      this.claw = new GiantClaw(parseFloat(c.targetheight ?? '') || 0);
      if (c.inc) this.claw.inc = parseFloat(c.inc) / 100; // percent
      if (c.dec) this.claw.dec = parseFloat(c.dec) / 100;
      if (c.heightfactor) this.claw.heightFactor = parseFloat(c.heightfactor);
    }
    // <kongs respawn_msecs="N" health_min="N" health_max="N" height="N" on="rooftops">count</kongs>,
    // with respawn_msecs="never" for a fixed number to clear, and
    // on="rooftops" to have them all up on the roofs
    if (sc.kongs) {
      const k = sc.kongs;
      const num = (name: string): number | undefined => {
        const v = parseFloat(k.getAttribute(name) ?? '');
        return Number.isFinite(v) ? v : undefined;
      };
      this.kongOptions = {
        count: parseInt(k.textContent ?? '', 10) || 0,
        respawnMsecs: k.getAttribute('respawn_msecs') === 'never' ? null : num('respawn_msecs'),
        rooftops: k.getAttribute('on') === 'rooftops',
        height: num('height'),
        healthMin: num('health_min'),
        healthMax: num('health_max'),
      };
    }
    if (sc.patrolradius) {
      const t = (sc.patrolradius.textContent ?? '').trim();
      if (t === 'none') this.roaming = true;
      else this.patrolRadius = parseFloat(t) || null;
    }
    this.player = await Player.create(model.name ?? '', model.skin ?? '', startHeight);
    const text = (e: Element | undefined): string => (e?.textContent ?? '').trim().toLowerCase();
    if (text(sc.view) === 'topdown') this.flyMode = FlyMode.TOPDOWN;
    this.steer = text(sc.controls) === 'steer';
    this.showRadar = text(sc.radar) !== 'off';
    this.player.controllers[FlyMode.TOPDOWN].steer = this.steer;
    this.player.setMode(this.flyMode);
    if (sc.countdown) {
      const cd = xmlStringMap(sc.countdown);
      this.countdowntimer = new CountDownTimer(parseInt(cd.seconds ?? '', 10) || 0, cd.label ?? '');
    }

    // <constraints>: none of the XML files use these keys (they say
    // <maxheight> etc.), so in practice the defaults apply. Left as it is
    // until the missions are revisited.
    if (node.constraints) {
      const c = xmlStringMap(node.constraints);
      this.constraints = new Constraints();
      if (c.max_height) this.constraints.maxHeight = parseFloat(c.max_height);
      if (c.min_height) this.constraints.minHeight = parseFloat(c.min_height);
      if (c.max_speed) this.constraints.maxSpeed = parseFloat(c.max_speed);
      if (c.min_speed) this.constraints.minSpeed = parseFloat(c.min_speed);
    }

    // <outcomes>
    if (node.outcomes) this.outcomes = new Outcomes(node.outcomes);
  }

  /** `input` is null when drawn frozen (by a transition or the pause menu). */
  protected override _play(display: Display, msecs: number, input: Input | null): void {
    this.update(msecs, input);
    this.draw(display, msecs);
    this.outcomes?.update(this);
  }

  private update(msecs: number, input: Input | null): void {
    const world = this.world!;
    if (this.ending) {
      this.ending.msecs -= msecs;
      if (this.ending.msecs <= 0) this.setStatus(this.ending.status);
    } else {
      gamestats.addGameTime(msecs); // (the clock stops at the end)
    }
    this.countdowntimer?.update(gamestats.get(Stat.GAME_SECONDS));
    const plane = this.player.entity;
    if (plane.crashed) {
      this.crashTimer -= msecs;
      if (this.crashTimer <= 0) {
        if (this.lives > 0) {
          const pos = plane.object.position;
          this.player.respawn(world.grid.maxHeightNear(pos.x, pos.z) + RESPAWN_CLEARANCE, INVULNERABLE_MSECS);
        } else if (!this.ending) {
          lastResult.title = 'Game over';
          lastResult.line = summary();
          this.setStatus(Status.LOST);
        }
      }
    } else if (input) {
      const pos = this.player.entity.object.position;
      // clear of the roofs, and of kongs standing on them
      const safe = world.grid.maxHeightNear(pos.x, pos.z) + TOPDOWN_CLEARANCE + (this.kongs?.rooftops ? this.kongs.height : 0);
      const topdown = this.flyMode === FlyMode.TOPDOWN;
      const { min, max } = topdown ? topdownSpeeds() : (this.constraints ?? new Constraints()).speeds(pos.y);
      // (top-down missions have no throttle: they cruise halfway)
      const throttle = topdown ? 0.5 : input.throttle;
      this.player.read(input, min + throttle * (max - min), min, safe);
    }
    if (this.roaming) {
      const o = plane.object;
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(o.quaternion).setY(0);
      if (fwd.lengthSq() > 1e-6) fwd.normalize();
      this.patrol.x = o.position.x + fwd.x * this.patrol.r * ROAM_AHEAD;
      this.patrol.z = o.position.z + fwd.z * this.patrol.r * ROAM_AHEAD;
    }
    const wasCrashed = plane.crashed;
    if (!wasCrashed) this.constraints?.restrict(this.player);
    this.kongs?.update(world, msecs, plane.object);
    world.update(msecs);
    if (this.kongs) {
      gamestats.set(Stat.MONKEY_POPULATION, this.kongs.remaining());
      this.tally.count = this.kongs.respawns ? gamestats.get(Stat.MONKEY_DEATHS) : this.kongs.remaining();
      if (this.blondeTally) this.blondeTally.count = gamestats.get(Stat.BLONDE_RESCUES);
      this.blondeEvents(msecs);
    }
    if (!plane.crashed && !this.ending && !this.roaming) this.checkBounds(msecs);
    if (plane.crashed && !wasCrashed) {
      // it just hit something
      this.lives--;
      this.livesDisplay.lives = this.lives;
      this.crashTimer = this.lives > 0 ? RESPAWN_MSECS : GAME_OVER_MSECS;
      this.outside = 0; // a fresh countdown after the respawn
      playBang();
    }
  }

  /** A kiss (a heart or lipstick) when a blonde is caught, "Missed her!"
   *  when one lands. */
  private blondeEvents(msecs: number): void {
    this.blondeMessageMsecs = Math.max(0, this.blondeMessageMsecs - msecs);
    this.kiss.update(msecs);
    const kit = this.kongs?.blondes;
    if (!kit?.events.length) return;
    const caught = kit.events.pop() === 'caught';
    kit.events.length = 0;
    if (caught) {
      this.kiss.pop();
      return;
    }
    this.blondeMessage.text = 'Missed her! She landed with a bump';
    this.blondeMessage.setWidth(textWidth(this.blondeMessage.text) * this.blondeMessage.font);
    this.blondeMessage.setColor(0.85, 0.85, 0.85);
    this.blondeMessageMsecs = BLONDE_MESSAGE_MSECS;
  }

  /** Out of the patrol area for turn_back_seconds: lose a plane and get
   *  turned round to face the middle of it (or, with none left, crash). */
  private checkBounds(msecs: number): void {
    const plane = this.player.entity;
    const p = plane.object.position;
    this.outMessageMsecs = Math.max(0, this.outMessageMsecs - msecs);
    const dx = this.patrol.x - p.x;
    const dz = this.patrol.z - p.z;
    if (Math.hypot(dx, dz) <= this.patrol.r) {
      this.outside = 0;
      this.heading = false;
      return;
    }
    // heading back in: the clock stops (so a plane just turned round isn't
    // warned again while it flies back)
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(plane.object.quaternion);
    this.heading = fwd.x * dx + fwd.z * dz > 0;
    if (this.heading) return;
    this.outside += msecs;
    this.turnBack.secondsLeft = (this.turnBackMsecs - this.outside) / 1000;
    if (this.outside < this.turnBackMsecs) return;
    this.outside = 0;
    if (this.lives <= 1) {
      // the last plane: crash it where it is (update() takes the life)
      plane.invulnerable = 0;
      plane.hit(this.world!, { t: 0, point: p.clone(), normal: new THREE.Vector3(0, 1, 0) }, new THREE.Vector3());
      return;
    }
    this.lives--;
    this.livesDisplay.lives = this.lives;
    gamestats.inc(Stat.PLAYER_DEATHS);
    this.player.turnTo(Math.atan2(p.x - this.patrol.x, p.z - this.patrol.z), INVULNERABLE_MSECS);
    this.outMessageMsecs = OUT_MESSAGE_MSECS;
  }

  /** An outcome's result: show `message` (and how it went), then take
   *  `status`. Once only. */
  finish(status: Status, message: string): void {
    if (this.ending || this.status !== Status.PLAYING) return;
    if (status === Status.PLAYING) return;
    this.ending = { status, msecs: ENDING_MSECS };
    this.player.entity.charmed = true;
    this.outside = 0;
    lastResult.title = message;
    lastResult.line = summary();
    this.banner.set(message, lastResult.line);
  }

  private draw(display: Display, msecs: number): void {
    display.draw2d(this.fogplane);
    display.clearDepth();
    this.cameraman.lookAt(this.player.entity.object, this.player.mode, msecs, this.player.screenOffset());
    this.world!.draw(display, this.cameraman.getCamera());
    this.updateRadar(msecs);
    display.draw2d(this.hud);
    if (this.outside > 0 && !this.heading && !this.player.entity.crashed) {
      this.turnBack.update(msecs);
      display.draw2d(this.turnBack);
    }
    if (this.outMessageMsecs > 0) display.draw2d(this.outMessage);
    if (this.blondeMessageMsecs > 0 && !this.ending) display.draw2d(this.blondeMessage);
    if (this.kiss.showing) display.draw2d(this.kiss);
    if (this.ending) display.draw2d(this.banner);
    else if (this.player.entity.crashed && this.lives <= 0) display.draw2d(this.gameOver);
    if (msecs) {
      this.fps.update(msecs);
      display.draw2d(fpsOverlay(this.fps));
    }
  }

  private updateRadar(msecs: number): void {
    if (!this.radar) return;
    const o = this.player.entity.object;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(o.quaternion);
    this.radar.plane = { x: o.position.x, z: o.position.z, yaw: Math.atan2(-fwd.x, -fwd.z) };
    this.radar.blips = [
      ...(this.kongs?.living() ?? []).map((k) => ({ x: k.object.position.x, z: k.object.position.z, kind: k.blonde ? 'carrying' as const : 'kong' as const })),
      ...(this.kongs?.blondes?.falling() ?? []).map((b) => ({ x: b.object.position.x, z: b.object.position.z, kind: 'blonde' as const })),
    ];
    this.radar.warn = this.outside > 0 && !this.heading;
    this.radar.update(msecs);
  }

  override dispose(): void {
    this.world?.dispose();
    this.world = null;
  }
}
