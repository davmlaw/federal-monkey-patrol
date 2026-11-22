// Game statistics: one global instance, reset when each mission loads.

export const Stat = {
  NOSUCHSTAT: 0,
  GAME_SECONDS: 1,
  PLAYER_DEATHS: 2,
  BULLETS_FIRED: 3,
  MONKEY_DEATHS: 4,
  MONKEY_POPULATION: 5,
  BLONDE_RESCUES: 6,
  BLONDE_CASUALTIES: 7,
} as const;
export type Stat = (typeof Stat)[keyof typeof Stat];
const NAMES = Object.keys(Stat);

export function statFromName(name: string): Stat {
  const i = NAMES.indexOf(String(name).toUpperCase());
  return i < 0 ? Stat.NOSUCHSTAT : (i as Stat);
}

class GameStatistics {
  private stats: number[] = [];
  private gameSecsRemainder = 0;

  constructor() { this.reset(); }

  reset(): void {
    this.stats = new Array(NAMES.length).fill(0);
    this.gameSecsRemainder = 0;
  }

  addGameTime(msecs: number): void {
    const inc = this.gameSecsRemainder + msecs;
    this.stats[Stat.GAME_SECONDS] += Math.floor(inc / 1000);
    this.gameSecsRemainder = inc % 1000;
  }

  get(s: Stat): number { return this.stats[s]; }

  inc(s: Stat): void { this.stats[s]++; }

  set(s: Stat, value: number): void { this.stats[s] = value; }

  toString(): string {
    return NAMES.map((n, i) => `${n} = ${this.stats[i]}`).join('\n');
  }
}

export const gamestats = new GameStatistics();
