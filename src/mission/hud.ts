// HUD widgets: FogPlane, CountDownTimer, ClawAlert, the FPS readout, and
// the "generating skyscrapers" LoadBar.

import { ORTHO_H, ORTHO_W, type Display } from '../core/display.ts';
import {
  Container2D, Drawable2D, Image, LEFT, Quad, Text2D, Transitional2D, textHeight, type Batch2D, type Color, type Point,
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
