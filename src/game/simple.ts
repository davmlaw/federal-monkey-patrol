// Blank, Picture and SoundTrack components. Blank and Picture are HTML
// layers on the stage (see stage.ts) rather than WebGL quads.

import { loadSound, playSound, type SoundHandle } from '../core/assets.ts';
import type { Display } from '../core/display.ts';
import type { Input } from '../core/input.ts';
import { GameComponent, Status } from './component.ts';
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

  setFilename(f: string): void { this.filename = f; }

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
  }

  protected override _play(_display: Display, msecs: number, _input: Input | null, alpha: number): void {
    this.timeDisplayed += msecs;
    stage.show(this.layer, alpha);
    if (this.timeDisplayed > this.showTime) this.status = Status.NEXT;
  }
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
