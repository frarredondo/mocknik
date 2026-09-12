import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { LOREM_WORDS } from './words';
import { searchSpec } from './search';

function context(seed: number): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: 'search' }),
    fieldType: 'search',
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

describe('searchSpec', () => {
  it('picks one lorem word without punctuation or spaces', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = textValue(searchSpec.generate(context(seed), undefined));
      expect(value.length).toBeGreaterThan(0);
      expect(value).not.toMatch(/\s/);
      expect(value).toMatch(/^[a-z]+$/);
      expect(LOREM_WORDS).toContain(value);
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(searchSpec.generate(context(42), undefined)).toEqual(
      searchSpec.generate(context(42), undefined),
    );
  });
});
