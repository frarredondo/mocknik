import type { RandomSource } from './ports';

/** Returns a seeded mulberry32 generator producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(items: readonly T[], index: number): T {
  if (items.length === 0) {
    throw new Error('pick from empty array');
  }
  return items[index] as T;
}

/** Builds a deterministic RandomSource backed by a seeded mulberry32 generator. */
export function createRandom(seed: number): RandomSource {
  const next = mulberry32(seed);
  return {
    next,
    int(min: number, max: number): number {
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      return low + Math.floor(next() * (high - low + 1));
    },
    pick<T>(items: readonly T[]): T {
      return pickFrom(items, Math.floor(next() * items.length));
    },
    bool(probability = 0.5): boolean {
      return next() < probability;
    },
  };
}

/** RandomSource backed by Math.random. */
export const systemRandom: RandomSource = {
  next: () => Math.random(),
  int(min: number, max: number): number {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    return low + Math.floor(Math.random() * (high - low + 1));
  },
  pick<T>(items: readonly T[]): T {
    return pickFrom(items, Math.floor(Math.random() * items.length));
  },
  bool(probability = 0.5): boolean {
    return Math.random() < probability;
  },
};
