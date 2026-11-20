// Cutscenes from .shot files. A picture fills the
// top two thirds; dialogue lines (with speaker portraits) play underneath.
//
// A scene is an HTML layer on the stage (stage.ts), so the text is real text
// and transitions clip or fade the whole scene with CSS. Each line shows for
// msec_initial + words * msec_per_word (story.properties), or until its
// sound ends; consecutive lines stack in the box while they fit (earlier
// ones dimmed) so a conversation reads as one, speakers are named, and a
// tap, click, Space or Enter moves on to the next line.

import { loadSound, playSound, readLines, type SoundHandle } from '../core/assets.ts';
import type { Display } from '../core/display.ts';
import { Button, type Input } from '../core/input.ts';
import { dircheck, settings } from '../core/settings.ts';
import { GameComponent, Status } from './component.ts';
import { makeLayer, stage } from './stage.ts';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);
}

class Dialogue {
  private timeDisplayed = 0;
  private handle: SoundHandle | null = null;

  constructor(
    readonly speaker: string,
    readonly portrait: string | null, // image URL, or null (narrator)
    readonly text: string,
    readonly timeTotal: number,
    readonly sound: AudioBuffer | null,
  ) {}

  node(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = this.portrait ? 'line' : 'line narrator';
    el.innerHTML = (this.portrait ? `<img src="${escapeHtml(this.portrait)}" alt="">` : '')
      + `<div class="said">${this.portrait ? `<span class="who">${escapeHtml(this.speaker)}</span>` : ''}`
      + `<span class="text">${escapeHtml(this.text)}</span></div>`;
    return el;
  }

  speak(msecs: number): void {
    if (this.sound && !this.handle && !this.done()) this.handle = playSound(this.sound);
    this.timeDisplayed += msecs;
  }

  stop(): void { this.handle?.stop(); }

  done(): boolean {
    let done = this.timeDisplayed >= this.timeTotal;
    if (this.sound) done = done && !!this.handle && this.handle.done;
    return done;
  }
}

export class StoryTeller extends GameComponent {
  override isDom = true;
  override status: Status = Status.PLAYING;
  private filename = '';
  private dialogues: Dialogue[] = [];
  private current = 0;
  private started = false;
  private lastTaps: [boolean, boolean] | null = null;
  /** Speaker name -> portrait file (relative to dir). */
  private portrait: Record<string, string> = {};
  private msecInitial = 0;
  private msecPerWord = 0;
  private dir = '';
  private imagePath = '';
  private layer: HTMLDivElement = makeLayer('story');
  private box: HTMLElement = this.layer;

  setFilename(f: string): void { this.filename = f; }

  override getName(): string { return `StoryTeller(${this.filename})`; }

  protected override async _load(): Promise<void> {
    const prop = (k: string): string => settings.gets('story', k);
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

    let lines: string[] = [];
    try {
      lines = await readLines(this.dir + this.filename);
    } catch (e) {
      console.warn(e instanceof Error ? e.message : e);
    }
    // Lines are handled in order; pictures/portraits affect what follows.
    const pending: Promise<Dialogue | null>[] = [];
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
    this.layer = makeLayer('story', '<div class="pic"></div><div class="dialogue"></div>');
    this.box = this.layer.querySelector<HTMLElement>('.dialogue')!;
    if (this.imagePath) {
      const img = new Image();
      img.src = this.imagePath;
      img.alt = '';
      await img.decode().catch(() => console.warn(`Could not load picture "${this.imagePath}"`));
      this.layer.querySelector('.pic')!.append(img);
    }
    this.dialogues = (await Promise.all(pending)).filter((d): d is Dialogue => !!d);
    this.current = 0;
    if (!this.dialogues.length) this.status = Status.NEXT; // no point displaying
  }

  private async addDialogue(wordlist: string[]): Promise<Dialogue | null> {
    const first = wordlist[0];
    if (!(first.length > 1 && first.endsWith(':'))) return null;
    const speaker = first.slice(0, -1);
    // A narrator by default has no portrait.
    const portrait = Object.hasOwn(this.portrait, speaker) ? this.dir + this.portrait[speaker] : null;
    // SOUND= and TIME= tokens (first of each) are removed from the text.
    const words = wordlist.slice(1);
    let sound: AudioBuffer | null = null;
    let timeFixed = 0;
    const s = words.findIndex((x) => x.includes('SOUND='));
    if (s >= 0) {
      const name = words[s].slice(words[s].indexOf('SOUND=') + 6);
      sound = await loadSound(`data/sound/sfx/${name}`);
      words.splice(s, 1);
    }
    const t = words.findIndex((x) => x.includes('TIME='));
    if (t >= 0) {
      timeFixed = parseInt(words[t].slice(words[t].indexOf('TIME=') + 5), 10) || 0;
      words.splice(t, 1);
    }
    const text = words.filter(Boolean).join(' ');
    const time = Math.max(timeFixed, this.msecInitial + words.length * this.msecPerWord);
    return new Dialogue(speaker, portrait, text, time, sound);
  }

  /** A new press of Space/Enter or a tap/click since the last frame. */
  private tapped(input: Input | null): boolean {
    if (!input) return false;
    const taps: [boolean, boolean] = [input.buttonToggled(Button.FIRE1), input.buttonToggled(Button.NEXT)];
    const last = this.lastTaps;
    this.lastTaps = taps;
    return !!last && (taps[0] !== last[0] || taps[1] !== last[1]);
  }

  /** Show line i in the box, stacked under the earlier ones if it fits. */
  private show(i: number): void {
    const node = this.dialogues[i].node();
    for (const n of this.box.children) n.classList.add('earlier');
    this.box.append(node);
    if (this.box.children.length > 1 && this.box.scrollHeight > this.box.clientHeight + 1) {
      for (const n of [...this.box.children]) if (n !== node) n.remove();
    }
  }

  protected override _play(_display: Display, msecs: number, input: Input | null, alpha: number): void {
    stage.show(this.layer, alpha); // on the stage first, so the box can be measured
    const d = this.dialogues[this.current];
    if (!d) return;
    if (!this.started) {
      this.started = true;
      this.show(this.current);
    }
    if (!input) return; // drawn by a transition or while paused: frozen
    d.speak(msecs);
    const tap = this.tapped(input);
    if (this.status === Status.PLAYING && (tap || d.done())) {
      if (tap) d.stop();
      // keep showing the last dialogue after the component has finished
      if (this.current + 1 < this.dialogues.length) {
        this.current++;
        this.show(this.current);
      } else {
        this.status = Status.NEXT;
      }
    }
  }
}
