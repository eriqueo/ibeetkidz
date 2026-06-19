// Seedable RNG port. All randomness (the "make it crazy" surprise, generative
// effect params) flows through this so behavior is reproducible and testable.
//
// mulberry32: tiny, fast, deterministic 32-bit PRNG. Good enough for a toy.

export interface RngPort {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  /** Pick one element; throws on empty array. */
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): RngPort {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error("rng.pick: empty array");
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
  };
}
