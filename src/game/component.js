// Port of game/gamecomponent.h: the base for everything in a .game sequence.

export const Status = { PLAYING: 0, NEXT: 1, LOST: 2, QUIT: 3 };
const NAMES = ['PLAYING', 'NEXT', 'LOST', 'QUIT'];

export function statusName(s) { return NAMES[s] ?? ''; }

/** Unknown names map to PLAYING (0), as std::map's operator[] default did. */
export function statusFromName(name) {
  const i = NAMES.indexOf(String(name).toUpperCase());
  return i < 0 ? Status.PLAYING : i;
}

export class GameComponent {
  constructor() {
    // Components finish after one frame unless they say otherwise.
    this.status = Status.NEXT;
    this.loaded = false;
    this.loading = null;
    this.loadError = null;
  }

  getName() { return this.constructor.name; }

  getStatus() { return this.status; }

  setStatus(s) { this.status = s; }

  /**
   * Loading is asynchronous in the browser (the C++ loaded on first play).
   * Returns a promise; play() does nothing until it has resolved.
   */
  load() {
    if (!this.loading) {
      this.loading = Promise.resolve()
        .then(() => this._load())
        .then(() => { this.loaded = true; })
        .catch((e) => {
          console.error(`${this.getName()}: load failed`, e);
          this.loadError = e;
          this.loaded = true;
          this.status = Status.NEXT; // skip it rather than hang
        });
    }
    return this.loading;
  }

  play(display, msecs, input, alpha = 1) {
    if (!this.loaded) {
      this.load();
      this.drawLoading(display);
      return;
    }
    if (this.loadError) return;
    this._play(display, msecs, input, alpha);
  }

  /** Drawn every frame while loading (missions show the skyline load bar). */
  drawLoading() {}

  /** Free GPU resources once the component can no longer be drawn. */
  dispose() {}

  async _load() {}

  _play() {}
}
