// game/blank, game/picture and game/soundtrack. Blank and Picture are HTML
// layers on the stage (see stage.js) rather than WebGL quads.

import { loadSound, playSound } from '../core/assets.js';
import { GameComponent, Status } from './component.js';
import { makeLayer, stage } from './stage.js';

const css = ([r, g, b]) => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

/** A full-screen colour. Like Picture, it is only shown for one frame. */
export class Blank extends GameComponent {
  constructor() {
    super();
    this.isDom = true;
    this.layer = makeLayer('blank');
    this.layer.style.background = '#fff';
  }

  setColor(r, g, b) { this.layer.style.background = css([r, g, b]); }

  _play(display, msecs, input, alpha) {
    stage.show(this.layer, alpha);
  }
}

/**
 * A full-screen image. In 2006 the status was never set to PLAYING, so
 * despite the optional display time a picture is shown for a single frame;
 * it is only seen for longer as the prev/next of a transition. The colour
 * tints it (multiplies), as glColor did.
 */
export class Picture extends GameComponent {
  constructor() {
    super();
    this.isDom = true;
    this.filename = '';
    this.showTime = 0;
    this.timeDisplayed = 0;
    this.color = [1, 1, 1];
  }

  setFilename(f) { this.filename = f; }

  setTime(ms) { this.showTime = ms; }

  setColor(r, g, b) { this.color = [r, g, b]; }

  async _load() {
    const img = new Image();
    img.src = this.filename;
    img.alt = '';
    await img.decode().catch(() => console.warn(`Could not load picture "${this.filename}"`));
    this.layer = makeLayer('picture');
    this.layer.append(img);
    if (this.color.some((c) => c < 1)) {
      const tint = document.createElement('div');
      tint.className = 'tint';
      tint.style.background = css(this.color);
      this.layer.append(tint);
    }
  }

  _play(display, msecs, input, alpha) {
    this.timeDisplayed += msecs;
    stage.show(this.layer, alpha);
    if (this.timeDisplayed > this.showTime) this.status = Status.NEXT;
  }
}

/**
 * `music <file>`. The C++ SoundTrack always played mmmskyscraper.ogg and
 * never left PLAYING, which would have stalled the sequence; no .game file
 * used it. Here it starts the named file (relative to data/sound/music/)
 * looping, and moves on.
 */
let currentMusic = null;

export class SoundTrack extends GameComponent {
  setFilename(f) { this.filename = f; }

  async _load() {
    this.buffer = await loadSound(`data/sound/music/${this.filename}`);
  }

  _play() {
    console.log(`playing '${this.filename}'`);
    currentMusic?.stop();
    currentMusic = playSound(this.buffer, { loop: true });
    this.status = Status.NEXT;
  }
}

export function stopMusic() {
  currentMusic?.stop();
  currentMusic = null;
}
