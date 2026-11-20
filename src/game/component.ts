// The base for everything in a .game sequence.

import type { Display } from '../core/display.ts';
import type { Input } from '../core/input.ts';

export const Status = { PLAYING: 0, NEXT: 1, LOST: 2, QUIT: 3 } as const;
export type Status = (typeof Status)[keyof typeof Status];
const NAMES = ['PLAYING', 'NEXT', 'LOST', 'QUIT'];

export function statusName(s: Status): string { return NAMES[s] ?? ''; }

/** Unknown names map to PLAYING. */
export function statusFromName(name: string): Status {
  const i = NAMES.indexOf(String(name).toUpperCase());
  return i < 0 ? Status.PLAYING : (i as Status);
}

export class GameComponent {
  // Components finish after one frame unless they say otherwise.
  status: Status = Status.NEXT;
  loaded = false;
  loading: Promise<void> | null = null;
  loadError: unknown = null;
  /** Shown as an HTML layer on the stage (stage.ts) rather than drawn with WebGL. */
  isDom = false;

  getName(): string { return this.constructor.name; }

  getStatus(): Status { return this.status; }

  setStatus(s: Status): void { this.status = s; }

  /** Loads asynchronously; play() does nothing until it has resolved. */
  load(): Promise<void> {
    if (!this.loading) {
      this.loading = Promise.resolve()
        .then(() => this._load())
        .then(() => { this.loaded = true; })
        .catch((e: unknown) => {
          console.error(`${this.getName()}: load failed`, e);
          this.loadError = e;
          this.loaded = true;
          this.status = Status.NEXT; // skip it rather than hang
        });
    }
    return this.loading;
  }

  /** `input` is null when the component is drawn frozen (paused, or by a transition). */
  play(display: Display, msecs: number, input: Input | null, alpha = 1): void {
    if (!this.loaded) {
      this.load();
      this.drawLoading(display);
      return;
    }
    if (this.loadError) return;
    this._play(display, msecs, input, alpha);
  }

  /** Drawn every frame while loading (missions show the skyline load bar). */
  drawLoading(_display: Display): void {}

  /** Free GPU resources once the component can no longer be drawn. */
  dispose(): void {}

  protected async _load(): Promise<void> {}

  protected _play(_display: Display, _msecs: number, _input: Input | null, _alpha: number): void {}
}
