import type { RandomSource } from '../../domain/ports';

const TWO_POW_32 = 0x1_0000_0000;

function cryptoNext(): (() => number) | undefined {
  const source = globalThis.crypto;
  if (!source || typeof source.getRandomValues !== 'function') {
    return undefined;
  }
  return () => {
    const buffer = new Uint32Array(1);
    source.getRandomValues(buffer);
    return (buffer[0] ?? 0) / TWO_POW_32;
  };
}

/** Creates a `RandomSource` backed by `crypto.getRandomValues`, falling back to `Math.random`. */
export function createSecureRandom(): RandomSource {
  const next = cryptoNext() ?? (() => Math.random());
  return {
    next,
    int(min: number, max: number): number {
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      return low + Math.floor(next() * (high - low + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error('pick from empty array');
      }
      return items[Math.floor(next() * items.length)] as T;
    },
    bool(probability = 0.5): boolean {
      return next() < probability;
    },
  };
}
