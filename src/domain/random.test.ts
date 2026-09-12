import { describe, expect, it } from 'vitest';
import { createRandom, mulberry32, systemRandom } from './random';

function sample(generator: () => number, count: number): number[] {
  return Array.from({ length: count }, () => generator());
}

describe('mulberry32', () => {
  it('produces identical sequences for the same seed', () => {
    const first = sample(mulberry32(42), 25);
    const second = sample(mulberry32(42), 25);
    expect(first).toEqual(second);
  });

  it('produces different sequences for different seeds', () => {
    const first = sample(mulberry32(1), 25);
    const second = sample(mulberry32(2), 25);
    expect(first).not.toEqual(second);
  });

  it('returns floats in [0, 1)', () => {
    const values = sample(mulberry32(7), 1000);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('createRandom', () => {
  it('is deterministic for a fixed seed', () => {
    const first = createRandom(123);
    const second = createRandom(123);
    const firstSequence = [
      first.next(),
      first.next(),
      first.int(0, 100),
      first.pick(['alpha', 'beta', 'gamma']),
      first.bool(),
    ];
    const secondSequence = [
      second.next(),
      second.next(),
      second.int(0, 100),
      second.pick(['alpha', 'beta', 'gamma']),
      second.bool(),
    ];
    expect(firstSequence).toEqual(secondSequence);
  });

  it('keeps int within range and hits both ends', () => {
    const random = createRandom(99);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i += 1) {
      const value = random.int(1, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect(seen.has(1)).toBe(true);
    expect(seen.has(6)).toBe(true);
  });

  it('swaps bounds when min is greater than max', () => {
    const random = createRandom(5);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const value = random.int(10, 3);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(10);
      seen.add(value);
    }
    expect(seen.has(3)).toBe(true);
    expect(seen.has(10)).toBe(true);
  });

  it('returns the only value for a single-point range', () => {
    expect(createRandom(1).int(4, 4)).toBe(4);
  });

  it('picks deterministically from a fixed seed', () => {
    const items = ['a', 'b', 'c', 'd'] as const;
    const first = createRandom(2024);
    const second = createRandom(2024);
    const firstPicks = Array.from({ length: 20 }, () => first.pick(items));
    const secondPicks = Array.from({ length: 20 }, () => second.pick(items));
    expect(firstPicks).toEqual(secondPicks);
    for (const pick of firstPicks) {
      expect(items).toContain(pick);
    }
  });

  it('throws when picking from an empty array', () => {
    expect(() => createRandom(1).pick([])).toThrow('pick from empty array');
  });

  it('returns true for bool(1) and false for bool(0)', () => {
    const random = createRandom(7);
    for (let i = 0; i < 200; i += 1) {
      expect(random.bool(1)).toBe(true);
      expect(random.bool(0)).toBe(false);
    }
  });

  it('compares next() against the given probability', () => {
    const random = createRandom(3);
    const reference = mulberry32(3);
    for (let i = 0; i < 50; i += 1) {
      const probability = 0.3;
      const expected = reference() < probability;
      expect(random.bool(probability)).toBe(expected);
    }
  });

  it('uses 0.5 as the default probability', () => {
    const random = createRandom(11);
    const reference = mulberry32(11);
    for (let i = 0; i < 50; i += 1) {
      expect(random.bool()).toBe(reference() < 0.5);
    }
  });
});

describe('systemRandom', () => {
  it('exposes the RandomSource contract', () => {
    expect(typeof systemRandom.next).toBe('function');
    expect(typeof systemRandom.int).toBe('function');
    expect(typeof systemRandom.pick).toBe('function');
    expect(typeof systemRandom.bool).toBe('function');
  });

  it('next returns floats in [0, 1)', () => {
    for (let i = 0; i < 200; i += 1) {
      const value = systemRandom.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int stays within range', () => {
    for (let i = 0; i < 200; i += 1) {
      const value = systemRandom.int(3, 9);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
  });

  it('pick returns an item from the array', () => {
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i += 1) {
      expect(items).toContain(systemRandom.pick(items));
    }
    expect(() => systemRandom.pick([])).toThrow('pick from empty array');
  });

  it('bool returns booleans', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(typeof systemRandom.bool()).toBe('boolean');
    }
    expect(systemRandom.bool(1)).toBe(true);
    expect(systemRandom.bool(0)).toBe(false);
  });
});
