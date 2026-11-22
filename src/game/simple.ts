// Blank, Picture and SoundTrack components. Blank and Picture are HTML
// layers on the stage (see stage.ts) rather than WebGL quads.

import { loadSound, playSound, type SoundHandle } from '../core/assets.ts';
import type { Display } from '../core/display.ts';
import type { Input } from '../core/input.ts';
import { GameComponent, Status } from './component.ts';
import { FilmGrain } from './film.ts';
import { makeLayer, stage } from './stage.ts';

const css = ([r, g, b]: readonly number[]): string => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

/** A full-screen colour. Like Picture, it is only shown for one frame. */
export class Blank extends GameComponent {
  override isDom = true;
  private layer = makeLayer('blank');

  constructor() {
    super();
    this.layer.style.background = '#fff';
  }

  setColor(r: number, g: number, b: number): void { this.layer.style.background = css([r, g, b]); }

  protected override _play(_display: Display, _msecs: number, _input: Input | null, alpha: number): void {
    stage.show(this.layer, alpha);
  }
}

/**
 * A full-screen image. The status is never set to PLAYING, so despite the
 * optional display time a picture is shown for a single frame; it is only
 * seen for longer as the prev/next of a transition. The colour tints it
 * (multiplies).
 */
export class Picture extends GameComponent {
  override isDom = true;
  private filename = '';
  private showTime = 0;
  private timeDisplayed = 0;
  private color = [1, 1, 1];
  private layer: HTMLDivElement = makeLayer('picture');
  /** `film` on the line: sepia toned, with grain, flicker and scratches
   *  over it, like the title cards. */
  private film: FilmGrain | null = null;

  setFilename(f: string): void { this.filename = f; }

  setFilm(on: boolean): void { this.film = on ? new FilmGrain() : null; }

  setTime(ms: number): void { this.showTime = ms; }

  setColor(r: number, g: number, b: number): void { this.color = [r, g, b]; }

  protected override async _load(): Promise<void> {
    const img = new Image();
    img.src = this.filename;
    img.alt = '';
    await img.decode().catch(() => console.warn(`Could not load picture "${this.filename}"`));
    this.layer.append(img);
    if (this.color.some((c) => c < 1)) {
      const tint = document.createElement('div');
      tint.className = 'tint';
      tint.style.background = css(this.color);
      this.layer.append(tint);
    }
    if (this.film) {
      this.film = new FilmGrain({ ...SEPIA_FILM, weave: img });
      this.layer.classList.add('sepia');
      this.layer.append(this.film.el);
    }
  }

  protected override _play(_display: Display, msecs: number, _input: Input | null, alpha: number): void {
    this.timeDisplayed += msecs;
    this.film?.update();
    stage.show(this.layer, alpha);
    if (this.timeDisplayed > this.showTime) this.status = Status.NEXT;
  }
}

/**
 * `card <msecs> <text>`: a silent-film title card, sepia lettering in a
 * border on dark brown, with slow film grain over it (all cards alike). `|` breaks a line. It shows
 * for `msecs`, and if the mission after it (`ahead`, set by the
 * GameManager, which loads it early) is still generating its city, until
 * that's ready, so the card covers the load bar.
 */
export class TitleCard extends GameComponent {
  override isDom = true;
  override status: Status = Status.PLAYING;
  private shown = 0;
  private card: Card;
  ahead: GameComponent | null = null;

  constructor(text: string, private msecs: number) {
    super();
    this.card = cardLayer(text);
  }

  protected override _play(_display: Display, msecs: number, _input: Input | null, alpha: number): void {
    this.shown += msecs;
    this.card.update();
    stage.show(this.card.layer, alpha);
    if (this.shown >= this.msecs && (!this.ahead || this.ahead.loaded)) this.status = Status.NEXT;
  }
}

/** A title card's layer; update() it each frame it's shown (the film). */
export interface Card { layer: HTMLDivElement; update(): void }

/** Old film over the title cards and the film leader (`picture ... film`):
 *  all sepia toned, with the grain changing slowly, so they match. */
const SEPIA_FILM = { fps: 10, flicker: 0.07, strength: 0.8 };

/** A title card (see TitleCard) saying `text` (`|` breaks a line). */
export function cardLayer(text: string): Card {
  const esc = (t: string): string => t.replace(/[<>&]/g, (c) => `&#${c.charCodeAt(0)};`);
  const lines = text.split('|').map((l) => `<span>${esc(l.trim())}</span>`).join('');
  const layer = makeLayer('card', `<div class="frame"><div class="words">${lines}</div></div>`);
  const film = new FilmGrain({ ...SEPIA_FILM, weave: layer.firstElementChild as HTMLElement });
  layer.append(film.el);
  return { layer, update: () => film.update() };
}

/**
 * `music <file>`: starts the named file (relative to data/sound/music/)
 * looping, and moves on.
 */
let currentMusic: SoundHandle | null = null;

export class SoundTrack extends GameComponent {
  private filename = '';
  private buffer: AudioBuffer | null = null;

  setFilename(f: string): void { this.filename = f; }

  protected override async _load(): Promise<void> {
    this.buffer = await loadSound(`data/sound/music/${this.filename}`);
  }

  protected override _play(): void {
    console.log(`playing '${this.filename}'`);
    currentMusic?.stop();
    currentMusic = playSound(this.buffer, { loop: true });
    this.status = Status.NEXT;
  }
}

export function stopMusic(): void {
  currentMusic?.stop();
  currentMusic = null;
}
