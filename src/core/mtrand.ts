// Mersenne Twister MT19937 (after Richard J. Wagner's MTRand v1.0): seeding,
// rand() and randInt(n) as there, so a seed always gives the same sequence
// (the city layout depends on it).

const N = 624;
const M = 397;

export class MTRand {
  private state = new Uint32Array(N);
  private left = 0;
  private next = 0;

  constructor(seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0) {
    this.seed(seed);
  }

  seed(s: number): void {
    const st = this.state;
    st[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = st[i - 1] ^ (st[i - 1] >>> 30);
      // 1812433253 * prev + i, in 32-bit unsigned arithmetic
      st[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.reload();
  }

  private reload(): void {
    const st = this.state;
    const twist = (m: number, s0: number, s1: number): number =>
      (m ^ ((((s0 & 0x80000000) | (s1 & 0x7fffffff)) >>> 1)) ^ ((s1 & 1) ? 0x9908b0df : 0)) >>> 0;
    let p = 0;
    for (let i = N - M; i--; ++p) st[p] = twist(st[p + M], st[p], st[p + 1]);
    for (let i = M; --i; ++p) st[p] = twist(st[p + M - N], st[p], st[p + 1]);
    st[p] = twist(st[p + M - N], st[p], st[0]);
    this.left = N;
    this.next = 0;
  }

  /** 32-bit unsigned integer */
  randInt32(): number {
    if (this.left === 0) this.reload();
    --this.left;
    let s1 = this.state[this.next++];
    s1 ^= s1 >>> 11;
    s1 ^= (s1 << 7) & 0x9d2c5680;
    s1 ^= (s1 << 15) & 0xefc60000;
    return (s1 ^ (s1 >>> 18)) >>> 0;
  }

  /** integer in [0, n] inclusive (n >= 0) */
  randInt(n: number): number {
    let used = n >>> 0;
    used |= used >>> 1;
    used |= used >>> 2;
    used |= used >>> 4;
    used |= used >>> 8;
    used |= used >>> 16;
    let i: number;
    do {
      i = (this.randInt32() & used) >>> 0;
    } while (i > n);
    return i;
  }

  /** real number in [0, 1] inclusive */
  rand(): number {
    return this.randInt32() * (1.0 / 4294967295.0);
  }
}
