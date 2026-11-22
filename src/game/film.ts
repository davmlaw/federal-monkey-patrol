// Old film over an HTML layer: grain and static, dust, scratches, flicker
// and a dark vignette, as if the scene were cut in from a worn print.
//
// A FilmGrain is a layer of its own (a canvas, scaled up over the stage)
// redrawn at 24 frames a second of real time (or `fps`), so it keeps moving while the
// component under it is frozen by a transition.

const W = 200; // the canvas: coarse, so the grain shows as clumps
const H = 150;

export interface FilmOptions {
  /** How strong it all is: 1 for a picture, less over the 3D world. */
  strength?: number;
  /** How much the brightness jumps from frame to frame (0..1). */
  flicker?: number;
  /** Jiggled about a little each frame (gate weave). */
  weave?: HTMLElement;
  /** How many times a second the grain changes (24, the film's rate). */
  fps?: number;
}

export class FilmGrain {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private img: ImageData;
  private last = -1;
  private strength: number;
  private flicker: number;
  private weave: HTMLElement | null;
  private fps: number;
  /** A scratch that stays a few frames: x (0..1), frames left. */
  private scratch: { x: number; left: number; dark: boolean } | null = null;

  constructor({ strength = 1, flicker = 0.12, weave, fps = 24 }: FilmOptions = {}) {
    this.fps = fps;
    this.strength = strength;
    this.flicker = flicker;
    this.weave = weave ?? null;
    this.el = document.createElement('div');
    this.el.className = 'film';
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.g = this.canvas.getContext('2d')!;
    this.img = this.g.createImageData(W, H);
    const vignette = document.createElement('div');
    vignette.className = 'vignette';
    this.el.append(this.canvas, vignette);
  }

  /** Redraw if a film frame has gone by. `now` in milliseconds. */
  update(now = performance.now()): void {
    const frame = Math.floor(now * this.fps / 1000);
    if (frame === this.last) return;
    this.last = frame;
    const s = this.strength;
    const d = this.img.data;
    // grain: every pixel a little light or dark; now and then a burst of static
    const burst = Math.random() < 0.06 ? 2.2 : 1;
    const grain = 38 * s * burst;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = Math.random() * grain;
    }
    this.g.putImageData(this.img, 0, 0);
    const g = this.g;
    // dust and hairs
    const specks = Math.floor(Math.random() * 5 * s);
    for (let i = 0; i < specks; i++) {
      g.fillStyle = Math.random() < 0.8 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.ellipse(Math.random() * W, Math.random() * H, 0.4 + Math.random() * 1.4, 0.4 + Math.random() * 1.1, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
    if (Math.random() < 0.08 * s) {
      g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.lineWidth = 0.5;
      g.beginPath();
      let x = Math.random() * W;
      let y = Math.random() * H;
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) g.quadraticCurveTo(x += Math.random() * 8 - 4, y += Math.random() * 8 - 4, x += Math.random() * 8 - 4, y += Math.random() * 8 - 4);
      g.stroke();
    }
    // a scratch down the frame, lasting a few frames and wandering
    if (!this.scratch && Math.random() < 0.05 * s) this.scratch = { x: Math.random(), left: 3 + Math.floor(Math.random() * 10), dark: Math.random() < 0.3 };
    if (this.scratch) {
      const sc = this.scratch;
      sc.x += (Math.random() - 0.5) * 0.004;
      g.fillStyle = sc.dark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';
      g.fillRect(sc.x * W, 0, 0.6, H);
      if (--sc.left <= 0) this.scratch = null;
    }
    // flicker: the whole frame a touch brighter or darker
    const f = (Math.random() - 0.5) * 2 * this.flicker;
    g.fillStyle = f > 0 ? `rgba(255,250,235,${f * 0.6})` : `rgba(0,0,0,${-f})`;
    g.fillRect(0, 0, W, H);
    if (this.weave) {
      const j = (): string => `${((Math.random() - 0.5) * 0.5 * s).toFixed(2)}%`;
      this.weave.style.transform = `translate(${j()}, ${j()})`;
    }
  }
}
