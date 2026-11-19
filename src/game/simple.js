// game/blank, game/picture and game/soundtrack.

import { ORTHO_H, ORTHO_W } from '../core/display.js';
import { Image, Quad } from '../core/draw2d.js';
import { loadSound, playSound } from '../core/assets.js';
import { GameComponent, Status } from './component.js';

/** A full-screen colour. Like Picture, it is only shown for one frame. */
export class Blank extends GameComponent {
  constructor() {
    super();
    this.background = new Quad(ORTHO_W, ORTHO_H);
  }

  setColor(r, g, b) { this.background.setColor(r, g, b); }

  _play(display, msecs, input, alpha) {
    display.draw2d(this.background, alpha);
  }
}

/**
 * A full-screen image. In 2006 the status was never set to PLAYING, so
 * despite the optional display time a picture is shown for a single frame;
 * it is only seen for longer as the prev/next of a transition.
 */
export class Picture extends GameComponent {
  constructor() {
    super();
    this.filename = '';
    this.showTime = 0;
    this.timeDisplayed = 0;
    this.color = [1, 1, 1, 1];
  }

  setFilename(f) { this.filename = f; }

  setTime(ms) { this.showTime = ms; }

  setColor(r, g, b) { this.color = [r, g, b, 1]; }

  async _load() {
    this.image = await Image.load(this.filename, ORTHO_W, ORTHO_H);
    this.image.setColor(this.color);
  }

  _play(display, msecs, input, alpha) {
    this.timeDisplayed += msecs;
    display.draw2d(this.image, alpha);
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
