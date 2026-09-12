import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { colorSpec } from './color';

const COLOR_PATTERN = /^#[0-9a-f]{6}$/;

function context(seed: number): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: 'color' }),
    fieldType: 'color',
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

describe('colorSpec', () => {
  it('generates lowercase six-digit hex colors', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      expect(textValue(colorSpec.generate(context(seed), undefined))).toMatch(COLOR_PATTERN);
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(colorSpec.generate(context(42), undefined)).toEqual(
      colorSpec.generate(context(42), undefined),
    );
  });
});
