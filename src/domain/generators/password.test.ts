import { describe, expect, it } from 'vitest';
import type { GenerationContext, RandomSource } from '../ports';
import { createRandom } from '../random';
import type { FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import type { PasswordOptions } from './password';
import { passwordSpec } from './password';

function context(
  overrides: Partial<Pick<GenerationContext, 'random' | 'secureRandom'>> = {},
  seed = 1,
): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: 'password' }),
    fieldType: 'password',
    random: overrides.random ?? createRandom(seed),
    secureRandom: overrides.secureRandom ?? createRandom(seed + 100),
    clock: { now: () => new Date(0) },
  };
}

function textValue(value: FieldValue): string {
  if (value.kind !== 'text') {
    throw new Error(`expected text value, got ${value.kind}`);
  }
  return value.value;
}

function spyRandom(calls: string[]): RandomSource {
  return {
    next() {
      calls.push('next');
      return 0.5;
    },
    int(min) {
      calls.push('int');
      return min;
    },
    pick<T>(items: readonly T[]): T {
      calls.push('pick');
      return items[0] as T;
    },
    bool() {
      calls.push('bool');
      return true;
    },
  };
}

describe('passwordSpec', () => {
  it('returns the defined value exactly', () => {
    const options = passwordSpec.parseOptions?.({ mode: 'defined', value: ' S3cret! ' });
    expect(options).toEqual({ mode: 'defined', value: ' S3cret! ' });
    expect(textValue(passwordSpec.generate(context(), options ?? {}))).toBe(' S3cret! ');
  });

  it('generates a 12 character alphanumeric password by default', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const value = textValue(passwordSpec.generate(context({}, seed), { mode: 'random' }));
      expect(value).toMatch(/^[a-zA-Z0-9]{12}$/);
    }
  });

  it('respects a custom length', () => {
    const value = textValue(
      passwordSpec.generate(context(), { mode: 'random', length: 20 }),
    );
    expect(value).toHaveLength(20);
    expect(value).toMatch(/^[a-zA-Z0-9]{20}$/);
  });

  it('uses only printable ASCII 33..126 for the ascii charset', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const value = textValue(
        passwordSpec.generate(context({}, seed), { mode: 'random', charset: 'ascii' }),
      );
      expect(value).toHaveLength(12);
      for (const char of value) {
        const code = char.charCodeAt(0);
        expect(code).toBeGreaterThanOrEqual(33);
        expect(code).toBeLessThanOrEqual(126);
      }
    }
  });

  it('uses secureRandom and never random for random mode', () => {
    const secureCalls: string[] = [];
    const randomCalls: string[] = [];
    const testContext = context({
      random: spyRandom(randomCalls),
      secureRandom: spyRandom(secureCalls),
    });
    passwordSpec.generate(testContext, { mode: 'random', length: 16, charset: 'ascii' });
    expect(secureCalls).toContain('int');
    expect(randomCalls).toHaveLength(0);
  });

  it('is deterministic under createRandom as secureRandom', () => {
    const first = passwordSpec.generate(context({}, 7), { mode: 'random', length: 10 });
    const second = passwordSpec.generate(context({}, 7), { mode: 'random', length: 10 });
    expect(first).toEqual(second);
  });

  it('never throws, even for malformed direct options', () => {
    const weird: readonly unknown[] = [
      undefined,
      {},
      { mode: 'defined' },
      { mode: 'defined', value: '' },
      { mode: 'defined', value: 42 },
      { mode: 'nonsense', value: 'x' },
      { mode: 'random', length: 0 },
      { mode: 'random', length: 4.5 },
      { mode: 'random', length: 1_000_000 },
      { mode: 'random', charset: 'nope' },
    ];
    for (const raw of weird) {
      expect(() => passwordSpec.parseOptions?.(raw)).not.toThrow();
      expect(() =>
        passwordSpec.generate(context(), (passwordSpec.parseOptions?.(raw) ?? {}) as PasswordOptions),
      ).not.toThrow();
      expect(() => passwordSpec.generate(context(), raw as unknown as PasswordOptions)).not.toThrow();
    }
  });
});

describe('passwordSpec.parseOptions', () => {
  it('rejects non-plain-object input', () => {
    for (const raw of [undefined, null, 'password', 42, true, [], () => ({})]) {
      expect(passwordSpec.parseOptions?.(raw)).toBeUndefined();
    }
  });

  it('defaults mode to random', () => {
    expect(passwordSpec.parseOptions?.({})).toEqual({ mode: 'random' });
    expect(passwordSpec.parseOptions?.({ mode: 'random' })).toEqual({ mode: 'random' });
  });

  it('accepts a defined mode only with a non-empty string value', () => {
    expect(passwordSpec.parseOptions?.({ mode: 'defined', value: 'secret' })).toEqual({
      mode: 'defined',
      value: 'secret',
    });
    expect(passwordSpec.parseOptions?.({ mode: 'defined' })).toBeUndefined();
    expect(passwordSpec.parseOptions?.({ mode: 'defined', value: '' })).toBeUndefined();
    expect(passwordSpec.parseOptions?.({ mode: 'defined', value: 42 })).toBeUndefined();
  });

  it('rejects an unknown mode', () => {
    expect(passwordSpec.parseOptions?.({ mode: 'sequential' })).toBeUndefined();
  });

  it('accepts an integer length between 4 and 128', () => {
    expect(passwordSpec.parseOptions?.({ length: 4 })).toEqual({ mode: 'random', length: 4 });
    expect(passwordSpec.parseOptions?.({ length: 128 })).toEqual({ mode: 'random', length: 128 });
  });

  it('rejects an invalid length', () => {
    for (const length of [3, 129, 4.5, Number.NaN, Number.POSITIVE_INFINITY, '12', null]) {
      expect(passwordSpec.parseOptions?.({ length })).toBeUndefined();
    }
  });

  it('accepts alnum and ascii charsets', () => {
    expect(passwordSpec.parseOptions?.({ charset: 'alnum' })).toEqual({
      mode: 'random',
      charset: 'alnum',
    });
    expect(passwordSpec.parseOptions?.({ charset: 'ascii' })).toEqual({
      mode: 'random',
      charset: 'ascii',
    });
  });

  it('rejects an unknown charset', () => {
    expect(passwordSpec.parseOptions?.({ charset: 'hex' })).toBeUndefined();
    expect(passwordSpec.parseOptions?.({ charset: 3 })).toBeUndefined();
  });

  it('falls back to random defaults when options are invalid', () => {
    const options = passwordSpec.parseOptions?.({ length: 3 });
    expect(options).toBeUndefined();
    const value = textValue(passwordSpec.generate(context({}, 9), options ?? {}));
    expect(value).toMatch(/^[a-zA-Z0-9]{12}$/);
  });
});
