// Port of game/mission/gamestatistics.cpp. One global instance, like the
// `gamestats` global in main.cpp; it is reset when each mission loads.

export const Stat = {
  NOSUCHSTAT: 0,
  GAME_SECONDS: 1,
  PLAYER_DEATHS: 2,
  BULLETS_FIRED: 3,
  BOMBS_DROPPED: 4,
  MONKEY_DEATHS: 5,
  MONKEY_POPULATION: 6,
  BLONDE_RESCUES: 7,
  BLONDE_CASUALTIES: 8,
  BUILDINGS_DESTROYED: 9,
};
const NAMES = Object.keys(Stat);

export function statName(i) { return NAMES[i] ?? ''; }

export function statFromName(name) {
  const i = NAMES.indexOf(String(name).toUpperCase());
  return i < 0 ? Stat.NOSUCHSTAT : i;
}

class GameStatistics {
  constructor() { this.reset(); }

  reset() {
    this.stats = new Array(NAMES.length).fill(0);
    this.gameSecsRemainder = 0;
  }

  addGameTime(msecs) {
    const inc = this.gameSecsRemainder + msecs;
    this.stats[Stat.GAME_SECONDS] += Math.floor(inc / 1000);
    this.gameSecsRemainder = inc % 1000;
  }

  get(s) { return this.stats[s]; }

  inc(s) { this.stats[s]++; }

  toString() {
    return NAMES.map((n, i) => `${n} = ${this.stats[i]}`).join('\n');
  }
}

export const gamestats = new GameStatistics();
