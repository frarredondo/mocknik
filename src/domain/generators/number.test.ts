import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldType, FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { integerSpec, numberSpec } from './number';

function context(fieldType: FieldType, seed: number): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: fieldType }),
    fieldType,
    random: createRandom(seed),
    secureRandom: createRandom(seed + 1000),
    clock: { now: () => new Date(0) },
  };
}

function textValue(value: FieldValue): string {
  if (value.kind !== 'text') {
    throw new Error(`expected text value, got ${value.kind}`);
  }
  return value.value;
}

function decimalPlaces(value: string): number {
  const dot = value.indexOf('.');
  return dot === -1 ? 0 : value.length - dot - 1;
}

describe('parseOptions', () => {
  it('rejects non-plain-object input', () => {
    for (const raw of [undefined, null, 'options', 7, true, [], () => ({})]) {
      expect(numberSpec.parseOptions?.(raw)).toBeUndefined();
      expect(integerSpec.parseOptions?.(raw)).toBeUndefined();
    }
  });

  it('keeps finite numbers and integer decimals in 0..8', () => {
    expect(numberSpec.parseOptions?.({ min: 5, max: 10, decimals: 2 })).toEqual({
      min: 5,
      max: 10,
      decimals: 2,
    });
    expect(numberSpec.parseOptions?.({ decimals: 0 })).toEqual({ decimals: 0 });
    expect(numberSpec.parseOptions?.({ decimals: 8 })).toEqual({ decimals: 8 });
  });

  it('ignores invalid fields', () => {
    expect(
      numberSpec.parseOptions?.({
        min: Number.NaN,
        max: Number.POSITIVE_INFINITY,
        decimals: 3.5,
        unknown: 'x',
      }),
    ).toEqual({});
    expect(numberSpec.parseOptions?.({ decimals: -1 })).toEqual({});
    expect(numberSpec.parseOptions?.({ decimals: 9 })).toEqual({});
  });

  it('swaps min and max when reversed', () => {
    expect(numberSpec.parseOptions?.({ min: 10, max: 1 })).toEqual({ min: 1, max: 10 });
  });
});

describe('numberSpec', () => {
  it('generates within the default range', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = Number(textValue(numberSpec.generate(context('number', seed), {})));
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(1000);
    }
  });

  it('generates within custom bounds', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = Number(
        textValue(numberSpec.generate(context('number', seed), { min: 5, max: 10 })),
      );
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
    }
  });

  it('falls back to descriptor min and max when options omit them', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const ctx = {
        ...context('number', seed),
        descriptor: makeDescriptor({ type: 'number', min: '5', max: '20' }),
      };
      const value = Number(textValue(numberSpec.generate(ctx, {})));
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(20);
    }
  });

  it('prefers explicit options over descriptor bounds', () => {
    const ctx = {
      ...context('number', 1),
      descriptor: makeDescriptor({ type: 'number', min: '5', max: '20' }),
    };
    const value = Number(textValue(numberSpec.generate(ctx, { min: 50, max: 60 })));
    expect(value).toBeGreaterThanOrEqual(50);
    expect(value).toBeLessThanOrEqual(60);
  });

  it('rounds to the requested number of decimals', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const raw = textValue(
        numberSpec.generate(context('number', seed), { min: 0, max: 1, decimals: 2 }),
      );
      expect(raw).toMatch(/^\d+(\.\d{1,2})?$/);
      expect(decimalPlaces(raw)).toBeLessThanOrEqual(2);
      const value = Number(raw);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('produces fractional values sometimes', () => {
    const values = Array.from({ length: 20 }, (_, seed) =>
      textValue(numberSpec.generate(context('number', seed), { min: 0, max: 1, decimals: 2 })),
    );
    expect(values.some((value) => value.includes('.'))).toBe(true);
  });

  it('swaps reversed bounds at generation time', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = Number(
        textValue(numberSpec.generate(context('number', seed), { min: 10, max: 1 })),
      );
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(numberSpec.generate(context('number', 42), { min: 1, max: 9, decimals: 3 })).toEqual(
      numberSpec.generate(context('number', 42), { min: 1, max: 9, decimals: 3 }),
    );
    expect(integerSpec.generate(context('integer', 42), { min: 1, max: 9, decimals: 3 })).toEqual(
      integerSpec.generate(context('integer', 42), { min: 1, max: 9, decimals: 3 }),
    );
  });
});

describe('integerSpec', () => {
  it('ignores decimals and returns integers', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const raw = textValue(
        integerSpec.generate(context('integer', seed), { min: 1, max: 100, decimals: 3 }),
      );
      expect(raw).toMatch(/^\d+$/);
      const value = Number(raw);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('generates within the default range', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = Number(textValue(integerSpec.generate(context('integer', seed), {})));
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(1000);
    }
  });
});
