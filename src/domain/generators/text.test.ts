import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldDescriptor, FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { paragraphSpec, textSpec } from './text';

function context(overrides: Partial<FieldDescriptor> = {}, seed = 1): GenerationContext {
  return {
    descriptor: makeDescriptor(overrides),
    fieldType: 'text',
    random: createRandom(seed),
    secureRandom: createRandom(seed + 100),
    clock: { now: () => new Date(0) },
  };
}

function textValue(value: FieldValue): string {
  if (value.kind !== 'text') {
    throw new Error(`expected text value, got ${value.kind}`);
  }
  return value.value;
}

describe('textSpec', () => {
  it('generates 1-3 words by default', () => {
    const count = textValue(textSpec.generate(context(), {})).split(' ').length;
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(3);
  });

  it('respects custom word bounds', () => {
    const value = textValue(textSpec.generate(context(), { minWords: 4, maxWords: 4 }));
    expect(value.split(' ')).toHaveLength(4);
  });

  it('truncates to an option maxLength', () => {
    const value = textValue(textSpec.generate(context(), { maxLength: 10 }));
    expect(value.length).toBeLessThanOrEqual(10);
  });

  it('falls back to the descriptor maxLength', () => {
    const value = textValue(textSpec.generate(context({ maxLength: 7 }), {}));
    expect(value.length).toBeLessThanOrEqual(7);
  });

  it('lets the option maxLength win over the descriptor', () => {
    const value = textValue(textSpec.generate(context({ maxLength: 12 }), { maxLength: 5 }));
    expect(value.length).toBeLessThanOrEqual(5);
  });

  it('is deterministic under createRandom(1)', () => {
    expect(textSpec.generate(context({}, 1), {})).toEqual(
      textSpec.generate(context({}, 1), {}),
    );
  });
});

describe('paragraphSpec', () => {
  it('generates 5-20 words by default and ends with a period', () => {
    const value = textValue(paragraphSpec.generate(context(), {}));
    expect(value.endsWith('.')).toBe(true);
    const count = value.replace(/\.$/, '').split(' ').length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(20);
  });

  it('respects custom word bounds', () => {
    const value = textValue(paragraphSpec.generate(context(), { minWords: 6, maxWords: 6 }));
    expect(value.replace(/\.$/, '').split(' ')).toHaveLength(6);
  });

  it('truncates to a maxLength', () => {
    const value = textValue(paragraphSpec.generate(context(), { maxLength: 14 }));
    expect(value.length).toBeLessThanOrEqual(14);
  });

  it('is deterministic under createRandom(1)', () => {
    expect(paragraphSpec.generate(context({}, 1), {})).toEqual(
      paragraphSpec.generate(context({}, 1), {}),
    );
  });
});

describe('parseOptions', () => {
  it('rejects non-plain-object input', () => {
    for (const raw of [undefined, null, 'text', 42, true, [], () => ({})]) {
      expect(textSpec.parseOptions?.(raw)).toBeUndefined();
      expect(paragraphSpec.parseOptions?.(raw)).toBeUndefined();
    }
  });

  it('keeps finite non-negative numbers', () => {
    expect(textSpec.parseOptions?.({ minWords: 2, maxWords: 5, maxLength: 0 })).toEqual({
      minWords: 2,
      maxWords: 5,
      maxLength: 0,
    });
  });

  it('ignores non-finite, negative and unknown fields', () => {
    expect(
      textSpec.parseOptions?.({
        minWords: Number.NaN,
        maxWords: Number.POSITIVE_INFINITY,
        maxLength: -3,
        unknown: 'x',
      }),
    ).toEqual({});
  });
});
