// Port of game/mission/mission.cpp and missionbuilder.cpp.

import { ORTHO_H, ORTHO_W } from '../core/display.js';
import { Container2D, RIGHT, TOP } from '../core/draw2d.js';
import { fetchText } from '../core/assets.js';
import { dircheck, settings } from '../core/settings.js';
import { GameComponent, Status } from '../game/component.js';
import { Constraints, Outcomes, xmlMap, xmlStringMap } from './outcomes.js';
import { gamestats } from './stats.js';
import { makeCameraMan, Player, World } from './world.js';
import { ClawAlert, CountDownTimer, FogPlane, FPSCounter, fpsOverlay, LoadBar } from './hud.js';
import { CityGrid, loadCityMaterials } from './city.js';

// Top-down mode flies this far above the tallest building around the plane.
const TOPDOWN_CLEARANCE = 150;

/** game/mission/giantclaw.cpp. Built from <claw>, but Mission::update()'s
 *  call to update() was commented out in 2006, so it never changes. */
class GiantClaw {
  constructor(minVisibleHeight) {
    this.anger = 0;
    this.minVisibleHeight = minVisibleHeight;
    this.inc = 0;
    this.dec = 0;
    this.heightFactor = 1;
  }

  update(playerPos, msecs) {
    const change = playerPos.y > this.minVisibleHeight ? this.inc : -this.dec;
    this.anger = Math.min(1, Math.max(0, this.anger + change * msecs / 1000));
  }

  getState() { return this.anger; }
}

function parseXML(text, filename) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error(`XML error in ${filename}: ${err.textContent}`);
  return doc.documentElement;
}

export class Mission extends GameComponent {
  constructor(name) {
    super();
    this.name = name;
    this.status = Status.PLAYING;
    this.claw = null;
    this.constraints = null;
    this.outcomes = null;
    this.countdowntimer = null;
    this.clawalert = null;
    this.fps = new FPSCounter();
    this.progress = 0;
  }

  getName() { return `Mission(${this.name})`; }

  drawLoading(display) {
    if (!this.loadbar) return;
    this.loadbar.setState(this.progress);
    display.draw2dWith((g) => this.loadbar.draw(g, 1, display));
  }

  async _load() {
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
    this.cameraman = makeCameraMan();

    // World(): the PatchGrid city, generated patch by patch behind the load bar
    const materials = await loadCityMaterials();
    const grid = new CityGrid(materials);
    await grid.generate((p) => { this.progress = p; });
    this.world = new World(grid);
    this.world.addEntity(this.player.entity);
    gamestats.reset();
  }

  /** MissionBuilder */
  async build() {
    const dir = dircheck(settings.gets('game', 'mission.dir'));
    const root = parseXML(await fetchText(dir + this.name), this.name);
    const node = xmlMap(root);

    // <startconditions>
    const sc = xmlMap(node.startconditions);
    const startHeight = parseFloat(sc.height?.textContent) || 0;
    const model = xmlStringMap(sc.model);
    if (sc.claw) {
      const c = xmlStringMap(sc.claw);
      this.claw = new GiantClaw(parseFloat(c.targetheight) || 0);
      if (c.inc) this.claw.inc = parseFloat(c.inc) / 100; // percent
      if (c.dec) this.claw.dec = parseFloat(c.dec) / 100;
      if (c.heightfactor) this.claw.heightFactor = parseFloat(c.heightfactor);
    }
    this.player = await Player.create(model.name, model.skin, startHeight);
    if (sc.countdown) {
      const cd = xmlStringMap(sc.countdown);
      this.countdowntimer = new CountDownTimer(parseInt(cd.seconds, 10) || 0, cd.label ?? '');
    }

    // <constraints>: the C++ read these keys, which none of the XML files
    // use (they say <maxheight> etc.), so only the defaults ever applied.
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

  _play(display, msecs, input) {
    this.update(msecs, input);
    this.draw(display, msecs);
    this.outcomes?.update(this);
  }

  update(msecs, input) {
    gamestats.addGameTime(msecs);
    // (2006: fake MONKEY_DEATHS/BLONDE_RESCUES and the claw update were
    // commented out here.)
    this.countdowntimer?.update(gamestats.get(1 /* GAME_SECONDS */));
    if (input) {
      const pos = this.player.entity.object.position;
      const safe = this.world.grid.maxHeightNear(pos.x, pos.z) + TOPDOWN_CLEARANCE;
      this.player.read(input, this.speedFor(input.throttle), safe);
    }
    this.constraints?.restrict(this.player);
    this.world.update(msecs);
  }

  draw(display, msecs) {
    display.draw2d(this.fogplane);
    display.clearDepth();
    this.cameraman.lookAt(this.player.entity.object, this.player.mode, msecs);
    this.world.draw(display, this.cameraman.getCamera());
    display.draw2d(this.hud);
    if (msecs) {
      this.fps.update(msecs);
      display.draw2d(fpsOverlay(this.fps));
    }
  }

  /** Throttle (0..1) to speed, within the mission's speed constraints. */
  speedFor(throttle) {
    const c = this.constraints ?? new Constraints();
    return c.minSpeed + throttle * (c.maxSpeed - c.minSpeed);
  }

  dispose() {
    this.world?.dispose();
    this.world = null;
  }
}
