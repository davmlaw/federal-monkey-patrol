// The HTML stage: pictures, blanks and story
// scenes are DOM layers over the 4:3 view instead of WebGL quads, so text
// is real text and transitions are CSS (opacity, clip-path, masks). Missions
// still draw with WebGL on the canvas underneath.
//
// Immediate-mode, like the rest of the drawing: each frame, a component
// that is drawn calls show() on its layer; layers not shown in a frame are
// taken off the stage at endFrame(). Layers shown later in a frame stack on
// top. Transitions wrap a component's play() in withEffect() to clip or fade
// its layer.

import { display, type Viewport } from '../core/display.ts';

/** A look applied to the layers shown inside Stage.withEffect(). */
export interface Effect {
  opacity?: number;
  clipPath?: string;
  mask?: string;
}

/** [x, y], in ortho units or percent of the stage. */
export type Point2 = readonly number[];

class Stage {
  readonly el: HTMLDivElement;
  private shown = new Set<Element>();
  private z = 0;
  private effects: Effect[] = [];
  /** The view the stage was last laid out for (null until the first frame). */
  view: Viewport | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'stage';
    document.body.append(this.el);
  }

  beginFrame(): void {
    this.shown.clear();
    this.z = 0;
    const v = display.view;
    if (v && (!this.view || v.x !== this.view.x || v.y !== this.view.y || v.w !== this.view.w || v.h !== this.view.h)) {
      this.view = { ...v };
      Object.assign(this.el.style, {
        left: `${v.x}px`, top: `${v.y}px`, width: `${v.w}px`, height: `${v.h}px`,
        fontSize: `${Math.max(11, v.h * 0.033)}px`,
      });
    }
  }

  /** Show `layer` this frame, with `alpha` and any effect in force. */
  show(layer: HTMLElement, alpha = 1): void {
    if (layer.parentNode !== this.el) this.el.append(layer);
    this.shown.add(layer);
    const fx: Effect = this.effects[this.effects.length - 1] ?? {};
    const s = layer.style;
    s.zIndex = String(++this.z);
    const opacity = alpha * (fx.opacity ?? 1);
    s.opacity = opacity < 1 ? String(opacity) : '';
    s.clipPath = fx.clipPath ?? '';
    s.webkitMaskImage = s.maskImage = fx.mask ?? '';
  }

  /** Run f() with layers it shows clipped/faded by `fx`
   *  ({ opacity, clipPath, mask }). */
  withEffect(fx: Effect, f: () => void): void {
    this.effects.push(fx);
    try {
      f();
    } finally {
      this.effects.pop();
    }
  }

  endFrame(): void {
    for (const n of [...this.el.children]) if (!this.shown.has(n)) n.remove();
  }

  clear(): void {
    this.el.replaceChildren();
    this.shown.clear();
  }
}

export const stage = new Stage();

/** A layer element filling the stage. */
export function makeLayer(className: string, html = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `layer ${className}`;
  el.innerHTML = html;
  return el;
}

// ------------------------------------------------- masks for transitions

/** Ortho coordinates (centred, y up, 1 x 0.75) to percent of the stage. */
export function toPercent([x, y]: Point2, w: number, h: number): [number, number] {
  return [(x / w + 0.5) * 100, (0.5 - y / h) * 100];
}

const f = (n: number): string => n.toFixed(2);

/** clip-path showing only inside the polygon (points in percent). */
export function clipInside(pts: Point2[]): string {
  return `polygon(${pts.map(([x, y]) => `${f(x)}% ${f(y)}%`).join(',')})`;
}

/** mask-image showing everything except inside the polygon. */
export function maskOutside(pts: Point2[]): string {
  const hole = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>`
    + `<path fill-rule='evenodd' d='M-50 -50H150V150H-50Z ${hole}Z'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** An SVG overlay layer with a closed outline (e.g. the star wipe's edge). */
export function outlineLayer(layer: HTMLElement, pts: Point2[], width: number): HTMLElement {
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ');
  layer.innerHTML = `<svg viewBox='0 0 100 100' preserveAspectRatio='none' width='100%' height='100%'>`
    + `<path d='${d}Z' fill='none' stroke='white' stroke-width='${width}' vector-effect='non-scaling-stroke' stroke-linejoin='round'/></svg>`;
  return layer;
}
