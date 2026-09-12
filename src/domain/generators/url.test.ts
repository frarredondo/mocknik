import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { urlSpec } from './url';

const URL_PATTERN = /^https:\/\/www\.[a-z]+\.[a-z.]+$/;

function context(seed: number): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: 'url' }),
    fieldType: 'url',
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

describe('urlSpec', () => {
  it('generates https www urls with a scrambled word and a tld', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      expect(textValue(urlSpec.generate(context(seed), undefined))).toMatch(URL_PATTERN);
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(urlSpec.generate(context(42), undefined)).toEqual(urlSpec.generate(context(42), undefined));
  });
});
