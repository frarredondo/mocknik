import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSecureRandom } from './secureRandom';

function stubValues(values: readonly number[]): void {
  let index = 0;
  vi.stubGlobal('crypto', {
    getRandomValues(array: Uint32Array): Uint32Array {
      array[0] = values[index % values.length] ?? 0;
      index += 1;
      return array;
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createSecureRandom', () => {
  it('returns floats in [0, 1)', () => {
    const random = createSecureRandom();
    for (let i = 0; i < 200; i += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps int within the inclusive range', () => {
    const random = createSecureRandom();
    for (let i = 0; i < 500; i += 1) {
      const value = random.int(3, 9);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
  });

  it('derives deterministic output from the crypto buffer', () => {
    stubValues([0, 0x80000000, 0xffffffff]);
    const random = createSecureRandom();
    expect(random.next()).toBe(0);
    expect(random.next()).toBe(0.5);
    expect(random.next()).toBe(0xffffffff / 0x100000000);
  });

  it('maps deterministic buffers to inclusive int values', () => {
    stubValues([0, 0xffffffff]);
    const random = createSecureRandom();
    expect(random.int(1, 6)).toBe(1);
    expect(random.int(1, 6)).toBe(6);
  });

  it('picks from a list', () => {
    stubValues([0, 0x80000000]);
    const random = createSecureRandom();
    expect(random.pick(['a', 'b'])).toBe('a');
    expect(random.pick(['a', 'b'])).toBe('b');
  });

  it('compares bool against the probability', () => {
    stubValues([0, 0xffffffff]);
    const random = createSecureRandom();
    expect(random.bool(0.5)).toBe(true);
    expect(random.bool(0.5)).toBe(false);
  });

  it('does not throw when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    const random = createSecureRandom();
    const value = random.next();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
    expect([0, 1]).toContain(random.int(0, 1));
    expect(typeof random.bool()).toBe('boolean');
  });
});
