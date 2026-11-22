// HUD widgets: FogPlane, CountDownTimer, ClawAlert, LivesDisplay, Radar,
// TurnBack, KongPointer, IconTally, KissPop, Banner, the FPS readout, and the "generating
// skyscrapers" LoadBar.

import * as THREE from 'three';
import { ORTHO_H, ORTHO_W, type Display } from '../core/display.ts';
import {
  Container2D, Drawable2D, Image, LEFT, Quad, Text2D, Transitional2D, textHeight, textWidth, type Batch2D, type Color, type Point,
} from '../core/draw2d.ts';
import { loadProperties, hexcolor, type RGBA } from '../core/settings.ts';
import { MTRand } from '../core/mtrand.ts';
import { FOG_COLOR } from './world.ts';
import { filmColor } from '../core/filmlook.ts';

/** A quad pushed to the far plane with fog on: i.e. a fog-coloured screen
 *  (graded like the 3D scene, so the horizon matches). */
export class FogPlane extends Quad {
  constructor() {
    super(ORTHO_W, ORTHO_H);
    this.setColor(...filmColor(FOG_COLOR));
  }
}

/** "hh:mm:ss", with a leading '-' when negative. */
function clockString(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  // Only positive values carry into minutes and hours, so negative times
  // show as -00:00:ss with seconds growing past 59.
  let s = totalSeconds;
  let m = 0;
  let h = 0;
  if (s >= 60) { m += Math.trunc(s / 60); s %= 60; }
  if (m >= 60) { h += Math.trunc(m / 60); m %= 60; }
  const p = (n: number): string => String(Math.abs(n)).padStart(2, '0');
  return `${neg ? '-' : ''}${p(h)}:${p(m)}:${p(s)}`;
}

export class CountDownTimer extends Drawable2D {
  private timeRemaining: number;
  private font = 0.2;

  constructor(private timeStart: number, private label: string) {
    super();
    this.timeRemaining = timeStart;
    const zero = new Text2D(`${label} ${clockString(0)}`, this.font);
    this.setWidth(zero.getWidth());
    this.setHeight(zero.getHeight());
  }

  update(timePassed: number): void { this.timeRemaining = this.timeStart - timePassed; }

  protected override representation(g: Batch2D, alpha: number): void {
    new Text2D(`${this.label} ${clockString(this.timeRemaining)}`, this.font).draw(g, alpha);
  }
}

const BARH = 0.01;

/** The Giant Claw meter. Nothing updates its state yet, so it stays at 0,
 *  and at 0 nothing is drawn. */
export class ClawAlert extends Transitional2D {
  private line: Quad;

  private constructor(w: number, h: number, private chart: Image) {
    super(w, h);
    this.line = new Quad(w, h * BARH);
    this.line.setColor(1, 0, 0);
  }

  static async create(w: number, h: number): Promise<ClawAlert> {
    return new ClawAlert(w, h, await Image.load('data/images/menu/claw_alert.jpg', w * 0.95, h));
  }

  protected override representation(g: Batch2D, alpha: number): void {
    if (this.getState() <= 0) return;
    this.chart.draw(g, alpha);
    const mid = (this.getState() - 0.5) * this.getHeight();
    this.line.position.y = mid - BARH * this.getHeight();
    this.line.draw(g, alpha);
    this.line.position.y = mid + BARH * this.getHeight();
    this.line.draw(g, alpha);
  }
}

/** Lives left: a row of Harlow's heads. */
export class LivesDisplay extends Drawable2D {
  lives = 0;

  private constructor(private head: Image, private max: number, private gap: number) {
    super(max * (head.getWidth() + gap), head.getHeight());
  }

  static async create(max: number, h = 0.06): Promise<LivesDisplay> {
    const head = await Image.load('data/story/harlow_headshot.png');
    head.setHeight(h);
    const d = new LivesDisplay(head, max, h * 0.15);
    d.lives = max;
    return d;
  }

  protected override representation(g: Batch2D, alpha: number): void {
    const step = this.head.getWidth() + this.gap;
    for (let i = 0; i < Math.min(this.lives, this.max); i++) {
      this.head.position = { x: this.left() + step * (i + 0.5), y: 0 };
      this.head.draw(g, alpha);
    }
  }
}

/** A blonde, for her icons: a symbol of blondness, all in one golden line
 *  with no fill: the head a plain circle, and round it a 1930s bob, swept
 *  over from a side parting and curling up at the ends below the chin.
 *  A soft dark shadow keeps it showing on anything. Drawn into `g` round
 *  (cx, cy), `r` the head's radius (the hair reaches about 1.5 r out). */
export function drawBlondeHead(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = Math.max(1.5, r * 0.17);
  g.strokeStyle = '#f2c230';
  g.shadowColor = 'rgba(0, 0, 0, 0.8)';
  g.shadowBlur = Math.max(1, r * 0.15);
  const x = (u: number): number => cx + u * r;
  const y = (v: number): number => cy + v * r;
  // the head
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  // the bob's outline: from a curl under the left of the jaw, up round
  // the head and down to a curl under the right
  g.beginPath();
  g.moveTo(x(-0.75), y(1.05));
  g.bezierCurveTo(x(-0.95), y(1.45), x(-1.5), y(1.3), x(-1.4), y(0.75));
  g.bezierCurveTo(x(-1.65), y(-0.2), x(-1.35), y(-1.45), x(0), y(-1.45));
  g.bezierCurveTo(x(1.35), y(-1.45), x(1.65), y(-0.2), x(1.4), y(0.75));
  g.bezierCurveTo(x(1.5), y(1.3), x(0.95), y(1.45), x(0.75), y(1.05));
  g.stroke();
  // a side parting: the hair swept over from it, down to the head
  g.beginPath();
  g.moveTo(x(-0.45), y(-1.4));
  g.quadraticCurveTo(x(-0.75), y(-1.0), x(-0.62), y(-0.79));
  g.moveTo(x(-0.45), y(-1.4));
  g.quadraticCurveTo(x(0.3), y(-0.75), x(0.92), y(-0.38));
  g.stroke();
  g.restore();
}

let blondeIcon: THREE.Texture | null = null;
/** Her head alone, for the radar (flipY false, as draw2d wants). */
export function blondeIconTexture(): THREE.Texture {
  if (!blondeIcon) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    drawBlondeHead(c.getContext('2d')!, 32, 34, 19);
    blondeIcon = new THREE.CanvasTexture(c);
    blondeIcon.flipY = false;
  }
  return blondeIcon;
}

/** Something to show on the radar, in world coordinates. */
/** A dot on the radar: a kong, or (`blonde`) one carrying a blonde, or
 *  a blonde falling. */
export interface Blip { x: number; z: number; kind?: 'kong' | 'carrying' | 'blonde' }

const RADAR_SEGMENTS = 48;

/**
 * A round radar, heading up, centred on the plane: the kongs as dots (ones
 * out of range sit on the rim, so it always shows which way to go) and the
 * edge of the patrol area as a ring.
 */
export class Radar extends Drawable2D {
  /** The plane's position and heading (radians, as world.ts measures it:
   *  0 is -Z, increasing anticlockwise seen from above). */
  plane = { x: 0, z: 0, yaw: 0 };
  blips: Blip[] = [];
  /** Blink the ring (out of bounds). */
  warn = false;
  private clock = 0;

  /** `size`: across, in ortho units; `range`: world units to the rim. */
  /** `area`: the patrol area, whose edge it draws (null: none). */
  constructor(size: number, public range: number, public area: { x: number; z: number; r: number } | null) {
    super(size, size);
  }

  update(msecs: number): void { this.clock += msecs; }

  /** World (x, z) to radar coordinates (y up = ahead), unclamped. */
  private toRadar(x: number, z: number): [number, number] {
    const R = this.getWidth() / 2;
    const dx = x - this.plane.x;
    const dz = z - this.plane.z;
    // rotate so the heading points up the screen
    const c = Math.cos(this.plane.yaw);
    const s = Math.sin(this.plane.yaw);
    const right = dx * c - dz * s;
    const ahead = -dx * s - dz * c;
    return [right / this.range * R, ahead / this.range * R];
  }

  protected override representation(g: Batch2D, alpha: number): void {
    const R = this.getWidth() / 2;
    const circle = (r: number): Point[] => Array.from({ length: RADAR_SEGMENTS }, (_, i) => {
      const a = (i / RADAR_SEGMENTS) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    // the scope
    const rim = circle(R);
    const disc: Point[] = [];
    for (let i = 0; i < rim.length; i++) disc.push([0, 0], rim[i], rim[(i + 1) % rim.length]);
    g.triangles(disc, [0.05, 0.06, 0.05, 0.55 * alpha]);
    g.polyline(circle(R * 0.5), 0.0015, [0.7, 0.75, 0.7, 0.25 * alpha], true);
    // the patrol area's edge, where it falls inside the scope
    const blink = Math.floor(this.clock / 250) % 2 === 0;
    const edge: Color = this.warn && blink ? [1, 0.35, 0.25, alpha] : [0.85, 0.8, 0.6, 0.7 * alpha];
    let run: Point[] = [];
    const flush = (): void => {
      if (run.length > 1) g.polyline(run, 0.002, edge);
      run = [];
    };
    const n = this.area ? 128 : -1;
    for (let i = 0; i <= n; i++) {
      if (!this.area) break;
      const a = (i / n) * Math.PI * 2;
      const [px, py] = this.toRadar(this.area.x + Math.sin(a) * this.area.r, this.area.z + Math.cos(a) * this.area.r);
      if (Math.hypot(px, py) <= R) run.push([px, py]);
      else flush();
    }
    flush();
    g.polyline(rim, 0.003, [0.8, 0.8, 0.75, 0.8 * alpha], true);
    // the kongs
    const dot = R * 0.07;
    for (const b of this.blips) {
      let [px, py] = this.toRadar(b.x, b.z);
      const d = Math.hypot(px, py);
      const far = d > R - dot;
      if (far) {
        px *= (R - dot) / d;
        py *= (R - dot) / d;
      }
      g.push();
      g.translate(px, py);
      if (b.kind === 'blonde') {
        // a falling blonde: her head, blinking
        if (blink || far) g.quad(dot * 3.6, dot * 3.6, [1, 1, 1, alpha], blondeIconTexture());
      } else {
        g.quad(dot * 2, dot * 2, far ? [0.95, 0.55, 0.3, 0.7 * alpha] : [1, 0.4, 0.25, alpha]);
        // carrying one: her head on the kong's dot
        if (b.kind === 'carrying') g.quad(dot * 2.6, dot * 2.6, [1, 1, 1, alpha], blondeIconTexture());
      }
      g.pop();
    }
    // the plane, pointing up
    const p = R * 0.1;
    g.triangles([[0, p * 1.2], [-p * 0.7, -p * 0.8], [p * 0.7, -p * 0.8]], [1, 1, 1, alpha]);
  }
}

/** The out-of-bounds warning: "TURN BACK!" and the seconds left, blinking. */
export class TurnBack extends Drawable2D {
  private title = new Text2D('TURN BACK!', 0.45);
  private line = new Text2D('', 0.2);
  /** Seconds left (shown rounded up). */
  secondsLeft = 0;
  private clock = 0;

  constructor() {
    super();
    this.title.setColor(1, 0.85, 0.3);
    this.title.position.y = 0.03;
  }

  update(msecs: number): void { this.clock += msecs; }

  protected override representation(g: Batch2D, alpha: number): void {
    if (Math.floor(this.clock / 400) % 2 === 0) this.title.draw(g, alpha);
    const s = Math.ceil(this.secondsLeft);
    this.line.text = `Leaving the patrol area: ${s} second${s === 1 ? '' : 's'}`;
    this.line.setWidth(textWidth(this.line.text) * this.line.font);
    this.line.position.y = -0.04;
    this.line.draw(g, alpha);
  }
}

/**
 * An arrow pointing to the nearest kong when one is close (missions with a
 * fixed number to find): it points the way the kong lies on the screen
 * (up for one high on a building ahead), and says BEHIND when it's behind
 * the camera.
 */
export class KongPointer extends Drawable2D {
  /** Screen direction to point (ortho units, y up), or null: hidden. */
  dir: { x: number; y: number } | null = null;
  behind = false;
  private label = new Text2D('BEHIND', 0.14);
  private clock = 0;

  constructor(size: number) {
    super(size, size);
    this.label.setColor(1, 0.85, 0.3);
  }

  update(msecs: number): void { this.clock += msecs; }

  protected override representation(g: Batch2D, alpha: number): void {
    if (!this.dir) return;
    const len = Math.hypot(this.dir.x, this.dir.y);
    if (len < 1e-6) return;
    const ux = this.dir.x / len;
    const uy = this.dir.y / len;
    // a gentle pulse along the way it points
    const r = this.getWidth() / 2;
    const nudge = Math.sin(this.clock / 130) * r * 0.12;
    const at = (a: number, s: number): Point => [ux * (a + nudge) - uy * s, uy * (a + nudge) + ux * s];
    const head = [at(r, 0), at(r * 0.1, -r * 0.6), at(r * 0.1, r * 0.6)];
    const shaft = [at(r * 0.15, -r * 0.22), at(-r * 0.8, -r * 0.22), at(-r * 0.8, r * 0.22), at(r * 0.15, r * 0.22)];
    const fill: Color = [1, 0.4, 0.25, 0.9 * alpha];
    g.triangles([...head, shaft[0], shaft[1], shaft[2], shaft[0], shaft[2], shaft[3]], fill);
    const ink: Color = [0.1, 0.05, 0.03, 0.8 * alpha];
    g.polyline([head[0], head[1], shaft[0], shaft[1], shaft[2], shaft[3], head[2]], 0.003, ink, true);
    if (this.behind) {
      this.label.setWidth(textWidth(this.label.text) * this.label.font);
      this.label.position = { x: 0, y: -r * 1.45 };
      this.label.draw(g, alpha);
    }
  }
}

/** A HUD count as an icon and "x3" (and an optional word after). */
export class IconTally extends Drawable2D {
  private line: Text2D;
  private iconSize: number;

  /** `icon`: flipY false (v = 0 at the top), square. */
  constructor(private icon: THREE.Texture, font = 0.22, private after = '') {
    super();
    this.line = new Text2D('', font);
    this.iconSize = textHeight('0') * font * 1.9;
    this.setHeight(this.iconSize);
    this.count = 0;
  }

  set count(n: number) {
    const t = `x${n}${this.after ? ` ${this.after}` : ''}`;
    if (t === this.line.text) return;
    this.line.text = t;
    this.line.setWidth(textWidth(t) * this.line.font);
    this.setWidth(this.iconSize * 1.1 + this.line.getWidth());
  }

  protected override representation(g: Batch2D, alpha: number): void {
    const w = this.getWidth();
    g.push();
    g.translate(-w / 2 + this.iconSize / 2, 0);
    g.quad(this.iconSize, this.iconSize, [1, 1, 1, alpha], this.icon);
    g.pop();
    this.line.color = this.color;
    this.line.position = { x: w / 2 - this.line.getWidth() / 2, y: 0 };
    this.line.draw(g, alpha);
  }
}

/** A cartoon heart or a lipstick kiss, as a canvas texture (flipY false). */
function kissTexture(kind: 'heart' | 'lips'): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const ink = '#3a0610';
  g.lineJoin = 'round';
  if (kind === 'heart') {
    const heart = new Path2D();
    heart.moveTo(64, 112);
    heart.bezierCurveTo(30, 88, 6, 66, 10, 40);
    heart.bezierCurveTo(14, 14, 50, 6, 64, 34);
    heart.bezierCurveTo(78, 6, 114, 14, 118, 40);
    heart.bezierCurveTo(122, 66, 98, 88, 64, 112);
    heart.closePath();
    g.fillStyle = '#e8203c';
    g.fill(heart);
    g.lineWidth = 7;
    g.strokeStyle = ink;
    g.stroke(heart);
    // a cartoon shine
    g.beginPath();
    g.ellipse(38, 38, 10, 6, -0.7, 0, Math.PI * 2);
    g.fillStyle = '#ffd6dc';
    g.fill();
  } else {
    // a lipstick print: upper lip with its bow, fuller lower lip, a gap
    const upper = new Path2D();
    upper.moveTo(10, 66);
    upper.bezierCurveTo(24, 46, 38, 26, 50, 28);
    upper.bezierCurveTo(57, 29, 61, 36, 64, 40);
    upper.bezierCurveTo(67, 36, 71, 29, 78, 28);
    upper.bezierCurveTo(90, 26, 104, 46, 118, 66);
    upper.bezierCurveTo(98, 62, 80, 64, 64, 66);
    upper.bezierCurveTo(48, 64, 30, 62, 10, 66);
    upper.closePath();
    const lower = new Path2D();
    lower.moveTo(12, 70);
    lower.bezierCurveTo(32, 68, 48, 72, 64, 72);
    lower.bezierCurveTo(80, 72, 96, 68, 116, 70);
    lower.bezierCurveTo(104, 96, 84, 104, 64, 104);
    lower.bezierCurveTo(44, 104, 24, 96, 12, 70);
    lower.closePath();
    for (const lip of [upper, lower]) {
      g.fillStyle = '#d81a3a';
      g.fill(lip);
      g.lineWidth = 5;
      g.strokeStyle = ink;
      g.stroke(lip);
    }
    // the print's creases
    g.strokeStyle = 'rgba(80, 0, 20, 0.6)';
    g.lineWidth = 2.5;
    for (let i = -4; i <= 4; i++) {
      if (!i) continue;
      const x = 64 + i * 11;
      g.beginPath();
      g.moveTo(x, 75 + Math.abs(i) * 0.5);
      g.lineTo(x + i * 0.8, 92 - Math.abs(i) * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(x, 62 - Math.abs(i) * 0.3);
      g.lineTo(x + i * 0.6, 52 + Math.abs(i) * 1.5);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  return t;
}

const KISS_MSECS = 1300;

/** A blonde caught: a cartoon heart or a lipstick kiss pops up on the
 *  screen for a moment, tilted, then fades. */
export class KissPop extends Drawable2D {
  private textures = { heart: kissTexture('heart'), lips: kissTexture('lips') };
  private kind: 'heart' | 'lips' = 'heart';
  private msecs = 0;
  private tilt = 0;

  /** Pop one up, somewhere round the middle of the screen. */
  pop(): void {
    this.kind = Math.random() < 0.5 ? 'heart' : 'lips';
    this.msecs = KISS_MSECS;
    this.tilt = (Math.random() * 2 - 1) * 20;
    this.position = { x: (Math.random() * 2 - 1) * 0.15, y: 0.05 + Math.random() * 0.1 };
  }

  get showing(): boolean { return this.msecs > 0; }

  update(msecs: number): void { this.msecs = Math.max(0, this.msecs - msecs); }

  protected override representation(g: Batch2D, alpha: number): void {
    if (this.msecs <= 0) return;
    const t = 1 - this.msecs / KISS_MSECS; // 0..1
    // springs up past full size and settles, then fades
    const grow = Math.min(1, t / 0.15);
    const size = 0.22 * (grow < 1 ? 1.25 * grow : 1 + 0.25 * Math.exp(-(t - 0.15) * 18) * Math.cos((t - 0.15) * 40));
    const fade = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
    g.push();
    g.rotate(this.tilt);
    g.quad(size, size, [1, 1, 1, alpha * fade], this.textures[this.kind]);
    g.pop();
  }
}

/** The end of a mission: a big title and a line under it, centred. */
export class Banner extends Drawable2D {
  private title = new Text2D('', 0.5);
  private line = new Text2D('', 0.22);

  constructor() {
    super();
    this.title.setColor(1, 0.85, 0.3);
    this.title.position.y = 0.04;
    this.line.position.y = -0.05;
  }

  set(title: string, line: string): void {
    for (const [t, s] of [[this.title, title], [this.line, line]] as const) {
      t.text = s;
      t.setWidth(textWidth(s) * t.font);
      t.setHeight(textHeight(s) * t.font);
    }
  }

  protected override representation(g: Batch2D, alpha: number): void {
    this.title.draw(g, alpha);
    this.line.draw(g, alpha);
  }
}

const AVERAGE_OVER_FRAMES = 200;

export class FPSCounter {
  private frames = 0;
  private framesSum = 0;
  private fps = 0;
  private maxFrameLength = 0;

  update(msecs: number): void {
    this.framesSum += msecs;
    if (++this.frames % AVERAGE_OVER_FRAMES === 0) {
      this.fps = this.frames / (this.framesSum / 1000);
      this.frames = 0;
      this.framesSum = 0;
      this.maxFrameLength = 0;
    }
    this.maxFrameLength = Math.max(msecs, this.maxFrameLength);
  }

  getFPS(): number { return this.fps; }

  getWorstFPS(): number { return this.maxFrameLength ? 1000 / this.maxFrameLength : 999.99; }
}

/** 6 significant digits, no trailing zeros. */
function fmt(x: number): string { return String(Number(x.toPrecision(6))); }

/** The two FPS lines at the top left. */
export function fpsOverlay(counter: FPSCounter): Container2D {
  const stats = new Container2D(ORTHO_W, ORTHO_H);
  let y = ORTHO_H * 0.5;
  const avg = `avrge fps: ${fmt(counter.getFPS())}`;
  y -= textHeight(avg) * 0.2 / 2;
  const average = new Text2D(avg, 0.2);
  average.position.y = y;
  stats.add(average, LEFT);
  y -= textHeight(avg) * 0.2;
  const worst = new Text2D(`worst fps: ${fmt(counter.getWorstFPS())}`, 0.2);
  worst.position.y = y;
  stats.add(worst, LEFT);
  return stats;
}

// ===================================================================== LoadBar

// "The idea behind this bar came from a souvenir coffee mug I bought on the
// Seattle waterfront" - a skyline drawn progressively as the city generates.
const BORDER_SPACING = 0.1;
const X_MIN = BORDER_SPACING;
const X_MAX = ORTHO_W - BORDER_SPACING;
const Y_MIN = BORDER_SPACING;
const Y_MAX = ORTHO_H - 2 * BORDER_SPACING;

/** A colour from citynight.properties (black if it doesn't parse). */
const color = (hex: string): RGBA => hexcolor(hex) ?? [0, 0, 0, 1];

export class LoadBar extends Transitional2D {
  private bgcolor: Color = [];
  private skylinecolor: Color = [];
  private windowcolor: Color = [];
  private barcolor: Color = [];
  private bgLineWidth = 0;
  private barLineWidth = 0;
  private winW = 0;
  private winH = 0;
  private text = new Text2D('generating skyscrapers', 0.2);
  private segments: number[] = [];
  private windows: { x: number; y: number }[] = [];
  private total = 0;

  private constructor(private flare: Image) {
    super();
  }

  static async create(): Promise<LoadBar> {
    const prop = await loadProperties('data/etc/citynight.properties');
    const get = (k: string): string => prop.get(k) ?? '';
    const lb = new LoadBar(await Image.load(get('flare_image'), 0.05, 0.05));
    lb.bgcolor = color(get('bgcolor'));
    lb.skylinecolor = color(get('skylinecolor'));
    lb.windowcolor = color(get('windowcolor'));
    lb.barcolor = color(get('barcolor'));
    lb.bgLineWidth = parseFloat(get('bg_line_width'));
    lb.barLineWidth = parseFloat(get('bar_line_width'));
    lb.winW = parseFloat(get('win_w'));
    lb.winH = parseFloat(get('win_h'));
    lb.flare.setColor(color(get('flare_color')));
    lb.makeSkyline(new MTRand());
    return lb;
  }

  private makeSkyline(mt: MTRand): void {
    this.segments = [];
    this.windows = [];
    let x = X_MIN;
    let y = Y_MIN;
    while (x < X_MAX) {
      // across between buildings
      let val = (X_MAX - X_MIN) / 100.0;
      x += val;
      this.segments.push(val);
      // Up
      val = (Y_MAX - Y_MIN) / 8.0 + mt.rand() * (Y_MAX - y);
      if (val > Y_MAX - y) val = Y_MAX - y;
      y += val;
      this.segments.push(val);
      // Across (roof length)
      const FUDGE = 10;
      val = (X_MAX - X_MIN) / (FUDGE * 2.0) + mt.rand() * (X_MAX - X_MIN) / FUDGE;
      if (x + val > X_MAX) {
        this.segments.push(X_MAX - x);
        break;
      }
      x += val;
      this.segments.push(val);
      if (y > 0 && val > 2 * this.winW) {
        const n = 1 + mt.randInt(2);
        for (let i = 0; i < n; i++) {
          this.windows.push({ x: x - (mt.randInt(1) ? 0.25 : 0.75) * val, y: y - (i + 1) * 3.0 * this.winH });
        }
      }
      // Down
      val = (Y_MAX - Y_MIN) / 8.0 + mt.rand() * (y - Y_MIN);
      if (val > y - Y_MIN) val = y - Y_MIN;
      y -= val;
      this.segments.push(val);
    }
    this.total = this.segments.reduce((a, b) => a + b, 0);
  }

  /** Unlike other drawables, the load bar needs the Display (for line widths). */
  drawWith(g: Batch2D, alpha: number, display: Display): void {
    // clear to the background colour
    g.push();
    g.rect(-ORTHO_W / 2, -ORTHO_H / 2, ORTHO_W / 2, ORTHO_H / 2, this.bgcolor);
    // "HACK: haven't fixed up for new ortho projection settings...."
    g.translate(-ORTHO_W / 2, -ORTHO_H / 2);
    this.text.draw(g, alpha);
    for (const w of this.windows) {
      g.rect(w.x - this.winW, w.y - this.winH, w.x + this.winW, w.y + this.winH, this.windowcolor);
    }
    let pos = { x: X_MIN, y: Y_MIN };
    for (let j = 0; j < 2; j++) {
      let sum = 0;
      let i = 0;
      pos = { x: X_MIN, y: Y_MIN };
      const pts: Point[] = [[pos.x, pos.y]];
      for (const seg of this.segments) {
        let length = seg;
        if (j & 1) {
          if (sum / this.total > this.getState()) break;
          const maxlength = this.getState() * this.total - sum;
          if (length > maxlength) length = maxlength;
        }
        sum += seg;
        if (i & 1) {
          if ((i + 1) % 4) pos.y += length; // up
          else pos.y -= length; // down
        } else {
          pos.x += length;
        }
        ++i;
        pts.push([pos.x, pos.y]);
      }
      if (j & 1) g.polyline(pts, display.px(this.barLineWidth), this.barcolor);
      else g.polyline(pts, display.px(this.bgLineWidth), this.skylinecolor);
    }
    this.flare.position = { x: pos.x, y: pos.y };
    this.flare.rotation = this.getState() * 360 * 5;
    this.flare.draw(g, alpha);
    g.pop();
  }
}
