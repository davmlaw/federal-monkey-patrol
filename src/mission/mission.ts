// A mission: built from data/missions/*.xml, then the plane flying over the
// city with its HUD, until an outcome changes the status.

import { ORTHO_H, ORTHO_W, type Display } from '../core/display.ts';
import { Container2D, LEFT, RIGHT, Text2D, TOP } from '../core/draw2d.ts';
import { fetchText, playBang } from '../core/assets.ts';
import { dircheck, settings } from '../core/settings.ts';
import type { Input } from '../core/input.ts';
import { GameComponent, Status } from '../game/component.ts';
import { Constraints, Outcomes, xmlMap, xmlStringMap } from './outcomes.ts';
import { gamestats, Stat } from './stats.ts';
import { makeCameraMan, Player, World, type CameraMan } from './world.ts';
import { ClawAlert, CountDownTimer, FogPlane, FPSCounter, fpsOverlay, LivesDisplay, LoadBar } from './hud.ts';
import { CityGrid, loadCityMaterials } from './city.ts';

// Top-down mode flies this far above the tallest building around the plane.
const TOPDOWN_CLEARANCE = 150;
// After a crash: how long the wreck burns before the next plane, how high
// over the rooftops it comes back, and how long it can't crash again.
const RESPAWN_MSECS = 2500;
const RESPAWN_CLEARANCE = 120;
const INVULNERABLE_MSECS = 3000;
const GAME_OVER_MSECS = 4000; // the last crash, then "GAME OVER", then lost

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
  // Set by _load(); the mission is only played once it has loaded.
  private fogplane!: FogPlane;
  private hud!: Container2D;
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
    gamestats.reset();
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
    this.player = await Player.create(model.name ?? '', model.skin ?? '', startHeight);
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
    gamestats.addGameTime(msecs);
    this.countdowntimer?.update(gamestats.get(Stat.GAME_SECONDS));
    const plane = this.player.entity;
    if (plane.crashed) {
      this.crashTimer -= msecs;
      if (this.crashTimer <= 0) {
        if (this.lives > 0) {
          const pos = plane.object.position;
          this.player.respawn(world.grid.maxHeightNear(pos.x, pos.z) + RESPAWN_CLEARANCE, INVULNERABLE_MSECS);
        } else {
          this.setStatus(Status.LOST);
        }
      }
    } else if (input) {
      const pos = this.player.entity.object.position;
      const safe = world.grid.maxHeightNear(pos.x, pos.z) + TOPDOWN_CLEARANCE;
      this.player.read(input, this.speedFor(input.throttle), safe);
    }
    const wasCrashed = plane.crashed;
    if (!wasCrashed) this.constraints?.restrict(this.player);
    world.update(msecs);
    if (plane.crashed && !wasCrashed) {
      // it just hit something
      this.lives--;
      this.livesDisplay.lives = this.lives;
      this.crashTimer = this.lives > 0 ? RESPAWN_MSECS : GAME_OVER_MSECS;
      playBang();
    }
  }

  private draw(display: Display, msecs: number): void {
    display.draw2d(this.fogplane);
    display.clearDepth();
    this.cameraman.lookAt(this.player.entity.object, this.player.mode, msecs);
    this.world!.draw(display, this.cameraman.getCamera());
    display.draw2d(this.hud);
    if (this.player.entity.crashed && this.lives <= 0) display.draw2d(this.gameOver);
    if (msecs) {
      this.fps.update(msecs);
      display.draw2d(fpsOverlay(this.fps));
    }
  }

  /** Throttle (0..1) to speed, within the mission's speed constraints. */
  private speedFor(throttle: number): number {
    const c = this.constraints ?? new Constraints();
    return c.minSpeed + throttle * (c.maxSpeed - c.minSpeed);
  }

  override dispose(): void {
    this.world?.dispose();
    this.world = null;
  }
}
