// Port of game/storyteller/: cutscenes from .shot files. A picture fills the
// top two thirds; dialogue lines (with speaker portraits) play underneath,
// each shown for msec_initial + words * msec_per_word.

import { ORTHO_H, ORTHO_W } from '../core/display.js';
import { Container2D, Drawable2D, Image, Quad, WordList2D } from '../core/draw2d.js';
import { loadSound, playSound, readLines, loadTexture } from '../core/assets.js';
import { dircheck, settings } from '../core/settings.js';
import { GameComponent, Status } from './component.js';

const IMAGE_V_RATIO = 0.666; // of screen height (ORTHO_H)
const DIALOGUE_V_RATIO = 1.0 - IMAGE_V_RATIO;

// dialogue.cpp
const BORDER = 0.03;
const PICTURE_SIZE = 0.1;

class Dialogue extends Drawable2D {
  /** `image` is the speaker's portrait (or null); `words` includes the speaker. */
  constructor(w, h, image, words, msecInitial, msecPerWord, sound) {
    super();
    this.timeDisplayed = 0;
    this.sound = sound; // decoded buffer, or null
    this.handle = null;
    const border = w * BORDER;
    const size = { x: w - 2 * border, y: h - 2 * border };
    this.container = new Container2D(size.x, size.y);
    const topLeft = { x: -size.x / 2, y: size.y / 2 };
    const pos = { x: 0, y: 0 };
    if (image) {
      image.setWidth(w * PICTURE_SIZE);
      const ps = { x: image.getWidth(), y: -image.getHeight() };
      image.position = { x: topLeft.x + ps.x / 2, y: topLeft.y + ps.y / 2 };
      this.container.add(image);
      pos.x += (ps.x + border) / 2; // shift text right
      size.x -= image.getWidth() + border;
      size.y -= image.getHeight();
    }
    const text = new WordList2D(size.x, size.y, words);
    text.position = { x: pos.x, y: topLeft.y - text.getHeight() / 2 };
    this.timeTotal = msecInitial + text.getWordCount() * msecPerWord;
    this.container.add(text);
  }

  setTimeFixed(ms) { this.timeTotal = Math.max(this.timeTotal, ms); }

  representation(g, alpha) { this.container.draw(g, alpha); }

  speak(display, msecs) {
    if (this.sound && !this.handle && !this.done()) this.handle = playSound(this.sound);
    this.timeDisplayed += msecs;
    display.draw2d(this);
  }

  done() {
    let done = this.timeDisplayed >= this.timeTotal;
    if (this.sound) done = done && !!this.handle && this.handle.done;
    return done;
  }
}

export class StoryTeller extends GameComponent {
  constructor() {
    super();
    this.status = Status.PLAYING;
    this.image = null;
    this.dialogues = [];
    this.current = 0;
  }

  setFilename(f) { this.filename = f; }

  getName() { return `StoryTeller(${this.filename})`; }

  async _load() {
    const prop = (k) => settings.gets('story', k);
    // Default portraits (can be overridden in story files)
    this.portrait = {
      Harlow: prop('harlow_pic'),
      Chief: prop('chief_pic'),
      Mayor: prop('mayor_pic'),
      Boffin: prop('boffin_pic'),
    };
    this.msecInitial = parseInt(prop('msec_initial'), 10);
    this.msecPerWord = parseInt(prop('msec_per_word'), 10);
    this.dir = dircheck(prop('dir'));

    const w = ORTHO_W;
    const h = ORTHO_H * DIALOGUE_V_RATIO;
    this.textBackground = new Quad(w, h);
    this.textBackground.setColor(0, 0, 0);
    this.textBackground.position.y = -ORTHO_H / 2 + h / 2; // bottom

    let lines = [];
    try {
      lines = await readLines(this.dir + this.filename);
    } catch (e) {
      console.warn(e.message);
    }
    // Lines are handled in order; pictures/portraits affect what follows.
    const pending = [];
    for (const line of lines) {
      const words = line.split(' ');
      if (words.length < 2) continue;
      if (words[0] === 'picture') {
        this.imagePath = this.dir + words[1];
      } else if (words[0] === 'portrait') {
        if (words.length >= 3) this.portrait[words[1]] = words[2];
      } else {
        pending.push(this.addDialogue(words));
      }
    }
    if (this.imagePath) {
      this.image = await Image.load(this.imagePath);
      this.image.setWidth(ORTHO_W);
      this.image.position.y = ORTHO_H * (IMAGE_V_RATIO - 0.5);
    }
    this.dialogues = (await Promise.all(pending)).filter(Boolean);
    this.current = 0;
    if (!this.dialogues.length) this.status = Status.NEXT; // no point displaying
  }

  async addDialogue(wordlist) {
    const first = wordlist[0];
    if (!(first.length > 1 && first.endsWith(':'))) return null;
    const speaker = first.slice(0, -1);
    const width = ORTHO_W;
    const height = ORTHO_H * DIALOGUE_V_RATIO;
    // A narrator by default has no portrait.
    let portrait = null;
    if (Object.hasOwn(this.portrait, speaker)) {
      portrait = new Image(await loadTexture(this.dir + this.portrait[speaker]));
    }
    // SOUND= and TIME= tokens (first of each) are removed from the text.
    const words = wordlist.slice();
    let sound = null;
    let timeFixed = 0;
    const s = words.findIndex((x, i) => i > 0 && x.includes('SOUND='));
    if (s >= 0) {
      const name = words[s].slice(words[s].indexOf('SOUND=') + 6);
      sound = await loadSound(`data/sound/sfx/${name}`);
      words.splice(s, 1);
    }
    const t = words.findIndex((x, i) => i > 0 && x.includes('TIME='));
    if (t >= 0) {
      timeFixed = parseInt(words[t].slice(words[t].indexOf('TIME=') + 5), 10) || 0;
      words.splice(t, 1);
    }
    const d = new Dialogue(width, height, portrait, words, this.msecInitial, this.msecPerWord, sound);
    d.setTimeFixed(timeFixed);
    d.position.y = -ORTHO_H / 2 + height / 2; // bottom
    return d;
  }

  _play(display, msecs, input, alpha) {
    if (this.image) display.draw2d(this.image, alpha);
    display.draw2d(this.textBackground, alpha);
    const d = this.dialogues[this.current];
    if (!d) return;
    d.speak(display, msecs);
    if (d.done()) {
      // keep drawing the last dialogue after the component has finished
      if (this.current + 1 < this.dialogues.length) this.current++;
      else this.status = Status.NEXT;
    }
  }
}
