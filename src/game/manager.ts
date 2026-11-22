// Plays the components of a .game file in sequence.
//
// A .game file lists components, one per line:
//   blank <rrggbb> | picture <file> [msecs] [rrggbb] [film] | storyteller <file.shot>
//   mission <file.xml> | card <msecs> <text, | for a new line>
//   transition <fade|spin> <msecs>
// A transition links the component before it to the one after it.

import { readLines } from '../core/assets.ts';
import type { Display } from '../core/display.ts';
import type { Input } from '../core/input.ts';
import { hexcolor } from '../core/settings.ts';
import { GameComponent, Status } from './component.ts';
import { Blank, Picture, TitleCard } from './simple.ts';
import { StoryTeller } from './storyteller.ts';
import { makeTransition, Transition } from './transition.ts';
import { Mission } from '../mission/mission.ts';

// Components worth loading ahead of time (missions generate a whole city,
// so they load when reached, behind the load bar).
const PREFETCH_AHEAD = 4;

export class GameManager extends GameComponent {
  override status: Status = Status.PLAYING;
  components: GameComponent[] = [];
  private transition: Transition | null = null;
  private lastComponent: GameComponent | null = null;
  current = 0;

  static async fromFile(filename: string): Promise<GameManager> {
    const gm = new GameManager();
    console.log(`GameManager: ${filename}`);
    for (const line of await readLines(filename)) {
      try {
        gm.handleLine(line);
      } catch (e) {
        console.warn(`GameFileReader: ${e instanceof Error ? e.message : e}`);
      }
    }
    if (gm.transition) console.log('Warning: transition at the end of the file is ignored');
    if (!gm.components.length) gm.status = Status.QUIT;
    return gm;
  }

  handleLine(line: string): void {
    let words = line.split(' ');
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
    let gc: GameComponent;
    if (component === 'storyteller') {
      const st = new StoryTeller();
      st.setFilename(words[1]);
      gc = st;
    } else if (component === 'mission') {
      gc = new Mission(words[1]);
    } else if (component === 'blank') {
      const b = new Blank();
      const col = hexcolor(words[1]);
      if (col) b.setColor(col[0], col[1], col[2]);
      gc = b;
    } else if (component === 'card') {
      gc = new TitleCard(words.slice(2).join(' '), parseInt(words[1], 10) || 0);
    } else if (component === 'picture') {
      const p = new Picture();
      p.setFilm(words.includes('film'));
      words = words.filter((w) => w !== 'film');
      p.setFilename(words[1]);
      if (words.length >= 3) p.setTime(parseInt(words[2], 10) || 0);
      if (words.length >= 4) {
        const col = hexcolor(words[3]);
        if (col) p.setColor(col[0], col[1], col[2]);
      }
      gc = p;
    } else {
      throw new Error(`${err} invalid line`);
    }
    this.addComponent(gc);
  }

  private setTransition(t: Transition): void {
    if (this.transition) console.log('Warning: 2 sequential transitions');
    this.transition = t;
  }

  addComponent(gc: GameComponent): void {
    if (this.transition) {
      this.transition.setPrev(this.lastComponent);
      this.transition.setNext(gc);
      this.components.push(this.transition);
      this.transition = null;
    }
    this.components.push(gc);
    this.lastComponent = gc;
  }

  currentComponent(): GameComponent { return this.components[this.current]; }

  private prefetch(): void {
    // a title card covers the city being generated for the mission after it
    const cur = this.components[this.current];
    if (cur instanceof TitleCard && !cur.ahead) {
      const after = this.components.slice(this.current + 1, this.current + 3);
      const m = after.find((c) => c instanceof Mission);
      if (m && after.indexOf(m) === after.findIndex((c) => !(c instanceof Transition))) {
        cur.ahead = m;
        m.load();
      }
    }
    for (let i = this.current; i < Math.min(this.components.length, this.current + PREFETCH_AHEAD); i++) {
      const c = this.components[i];
      if (c instanceof Mission) break;
      if (c instanceof Transition && c.next instanceof Mission) continue;
      c.load();
    }
  }

  override play(display: Display, msecs: number, input: Input): void {
    if (this.status !== Status.PLAYING) return;
    this.prefetch();
    const current = this.currentComponent();
    display.clearDepth();
    current.play(display, msecs, input);

    const s = current.getStatus();
    // (Esc doesn't quit here: main.ts turns it into the pause menu.)
    if (s === Status.QUIT) {
      this.status = Status.QUIT;
    } else if (current.loaded && s === Status.NEXT) {
      this.advance();
    } else if (s === Status.LOST) {
      this.status = Status.QUIT;
    }
  }

  advance(): void {
    const old = this.current;
    if (++this.current >= this.components.length) {
      this.status = Status.QUIT;
    }
    // A component may still be drawn by the transition that follows it, so
    // free things two steps behind.
    const stale = this.components[old - 1];
    if (stale) this.release(stale);
  }

  /** Start at the `n`th mission (1-based), at the title card before it if
   *  it has one: for jumping into the story partway. False if there's no
   *  such mission. Call before playing. */
  startAtMission(n: number): boolean {
    let target = -1;
    for (let i = 0, seen = 0; i < this.components.length; i++) {
      if (this.components[i] instanceof Mission) {
        if (++seen === n) { target = i; break; }
      }
    }
    if (target < 0) return false;
    let j = target - 1;
    while (j >= 0 && this.components[j] instanceof Transition) j--;
    if (j >= 0 && this.components[j] instanceof TitleCard) target = j;
    this.current = target;
    return true;
  }

  /** Jump straight to the next mission, skipping the story before it. */
  skipToMission(): boolean {
    const target = this.components.findIndex((c, i) => i > this.current && c instanceof Mission);
    if (target < 0) return false;
    for (let i = 0; i < target; i++) this.components[i].dispose();
    this.current = target;
    return true;
  }

  private release(c: GameComponent): void {
    c.dispose();
    if (c instanceof Transition) c.prev?.dispose();
  }

  override dispose(): void {
    for (const c of this.components) c.dispose();
  }
}
