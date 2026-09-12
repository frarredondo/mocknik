import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { checkboxSpec } from './checkbox';

function context(seed: number): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: 'checkbox' }),
    fieldType: 'checkbox',
    random: createRandom(seed),
    secureRandom: createRandom(seed + 1000),
    clock: { now: () => new Date(0) },
  };
}

function checkedValue(value: FieldValue): boolean {
  if (value.kind !== 'checked') {
    throw new Error(`expected checked value, got ${value.kind}`);
  }
  return value.value;
}

describe('parseOptions', () => {
  it('rejects non-plain-object input', () => {
    for (const raw of [undefined, null, 'options', 7, true, [], () => ({})]) {
      expect(checkboxSpec.parseOptions?.(raw)).toBeUndefined();
    }
  });

  it('accepts the three modes and defaults to an empty object', () => {
    expect(checkboxSpec.parseOptions?.({ checked: 'random' })).toEqual({ checked: 'random' });
    expect(checkboxSpec.parseOptions?.({ checked: 'always' })).toEqual({ checked: 'always' });
    expect(checkboxSpec.parseOptions?.({ checked: 'never' })).toEqual({ checked: 'never' });
    expect(checkboxSpec.parseOptions?.({})).toEqual({});
  });

  it('returns undefined for invalid modes', () => {
    expect(checkboxSpec.parseOptions?.({ checked: 'sometimes' })).toBeUndefined();
    expect(checkboxSpec.parseOptions?.({ checked: 1 })).toBeUndefined();
    expect(checkboxSpec.parseOptions?.({ checked: true })).toBeUndefined();
  });
});

describe('checkboxSpec', () => {
  it('always checks in always mode', () => {
    expect(checkboxSpec.generate(context(1), { checked: 'always' })).toEqual({
      kind: 'checked',
      value: true,
    });
  });

  it('never checks in never mode', () => {
    expect(checkboxSpec.generate(context(1), { checked: 'never' })).toEqual({
      kind: 'checked',
      value: false,
    });
  });

  it('defaults to the random source bool deterministically', () => {
    const first = checkboxSpec.generate(context(7), {});
    expect(checkedValue(first)).toBe(createRandom(7).bool());
    expect(checkboxSpec.generate(context(7), {})).toEqual(first);
  });
});
