// Port of game/gamemanager.cpp and game/gamefilereader.cpp.
//
// A .game file lists components, one per line:
//   blank <rrggbb> | picture <file> [msecs] [rrggbb] | storyteller <file.shot>
//   mission <file.xml> | music <file> | transition <type> <msecs>
// A transition links the component before it to the one after it.

import { readLines } from '../core/assets.js';
import { MenuFilter } from '../core/input.js';
import { hexcolor } from '../core/settings.js';
import { GameComponent, Status } from './component.js';
import { Blank, Picture, SoundTrack } from './simple.js';
import { StoryTeller } from './storyteller.js';
import { makeTransition } from './transition.js';
import { Mission } from '../mission/mission.js';

// Components worth loading ahead of time (missions generate a whole city,
// so they load when reached, behind the load bar, as in 2006).
const PREFETCH_AHEAD = 4;

export class GameManager extends GameComponent {
  constructor(tuner) {
    super();
    this.status = Status.PLAYING;
    this.components = [];
    this.transition = null;
    this.lastComponent = null;
    this.current = 0;
    this.menu = new MenuFilter();
    this.tuner = tuner;
  }

  static async fromFile(filename, tuner) {
    const gm = new GameManager(tuner);
    console.log(`GameManager: ${filename}`);
    for (const line of await readLines(filename)) {
      try {
        gm.handleLine(line);
      } catch (e) {
        console.warn(`GameFileReader: ${e.message}`);
      }
    }
    if (gm.transition) console.log('Warning: transition at the end of the file is ignored');
    if (!gm.components.length) gm.status = Status.QUIT;
    return gm;
  }

  handleLine(line) {
    const words = line.split(' ');
    const err = `GameFileReader(${line}): `;
    if (words.length < 2) throw new Error(`${err} line too short`);
    const component = words[0];
    if (words.length === 3 && component === 'transition') {
      const t = makeTransition(words[1]);
      if (!t) throw new Error(`${err} bad transition`);
      t.setTime(parseInt(words[2], 10) || 0);
      this.setTransition(t);
      return;
    }
    let gc;
    if (component === 'storyteller') {
      gc = new StoryTeller();
      gc.setFilename(words[1]);
    } else if (component === 'mission') {
      gc = new Mission(words[1]);
    } else if (component === 'blank') {
      gc = new Blank();
      const col = hexcolor(words[1]);
      if (col) gc.setColor(col[0], col[1], col[2]);
    } else if (component === 'picture') {
      gc = new Picture();
      gc.setFilename(words[1]);
      if (words.length >= 3) gc.setTime(parseInt(words[2], 10) || 0);
      if (words.length >= 4) {
        const col = hexcolor(words[3]);
        if (col) gc.setColor(col[0], col[1], col[2]);
      }
    } else if (component === 'music') {
      gc = new SoundTrack();
      gc.setFilename(words[1]);
    } else {
      throw new Error(`${err} invalid line`);
    }
    this.addComponent(gc);
  }

  setTransition(t) {
    if (this.transition) console.log('Warning: 2 sequential transitions');
    this.transition = t;
  }

  addComponent(gc) {
    if (this.transition) {
      this.transition.setPrev(this.lastComponent);
      this.transition.setNext(gc);
      this.components.push(this.transition);
      this.transition = null;
    }
    this.components.push(gc);
    this.lastComponent = gc;
  }

  currentComponent() { return this.components[this.current]; }

  prefetch() {
    for (let i = this.current; i < Math.min(this.components.length, this.current + PREFETCH_AHEAD); i++) {
      const c = this.components[i];
      if (c instanceof Mission) break;
      if (c.next instanceof Mission) continue;
      c.load();
    }
  }

  play(display, msecs, input) {
    if (this.status !== Status.PLAYING) return;
    this.prefetch();
    const current = this.currentComponent();
    display.clearDepth();
    this.menu.read(input);
    const tunerOpen = this.menu.tuner();
    this.tuner?.setVisible(tunerOpen);
    if (tunerOpen) current.play(display, 0, null);
    else current.play(display, msecs, input);

    const s = current.getStatus();
    // (Esc no longer quits here: main.js turns it into the pause menu.)
    if (s === Status.QUIT) {
      this.status = Status.QUIT;
    } else if (this.menu.skip() || (current.loaded && s === Status.NEXT)) {
      this.advance();
    } else if (s === Status.LOST) {
      console.log('LOSTY WOSTY!');
      this.status = Status.QUIT;
    }
  }

  advance() {
    const old = this.current;
    if (++this.current >= this.components.length) {
      this.status = Status.QUIT;
    }
    // A component may still be drawn by the transition that follows it, so
    // free things two steps behind.
    const stale = this.components[old - 1];
    if (stale) this.release(stale);
  }

  /** True if a mission comes later in the sequence. */
  hasMissionAhead() {
    return this.components.some((c, i) => i > this.current && c instanceof Mission);
  }

  /** Jump straight to the next mission, skipping the story before it. */
  skipToMission() {
    const target = this.components.findIndex((c, i) => i > this.current && c instanceof Mission);
    if (target < 0) return false;
    for (let i = 0; i < target; i++) this.components[i].dispose();
    this.current = target;
    return true;
  }

  release(c) {
    c.dispose();
    if (c.prev) c.prev.dispose();
  }

  dispose() {
    for (const c of this.components) c.dispose();
  }
}
