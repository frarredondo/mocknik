import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldDescriptor, FieldOption, FieldType, FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { choiceSpec, multiChoiceSpec } from './choice';

const DESCRIPTOR_OPTIONS: readonly FieldOption[] = [
  { value: 'red', label: 'Red', disabled: false },
  { value: 'green', label: 'Green', disabled: true },
  { value: 'blue', label: 'Blue', disabled: false },
];

const ENABLED_VALUES = ['red', 'blue'];

function context(
  fieldType: FieldType,
  seed: number,
  overrides: Partial<FieldDescriptor> = {},
): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: fieldType, ...overrides }),
    fieldType,
    random: createRandom(seed),
    secureRandom: createRandom(seed + 1000),
    clock: { now: () => new Date(0) },
  };
}

function choiceValue(value: FieldValue): string {
  if (value.kind !== 'choice') {
    throw new Error(`expected choice value, got ${value.kind}`);
  }
  return value.value;
}

function multiValue(value: FieldValue): readonly string[] {
  if (value.kind !== 'multiChoice') {
    throw new Error(`expected multiChoice value, got ${value.kind}`);
  }
  return value.value;
}

describe('parseOptions', () => {
  it('rejects non-plain-object input', () => {
    for (const raw of [undefined, null, 'options', 7, true, () => ({})]) {
      expect(choiceSpec.parseOptions?.(raw)).toBeUndefined();
      expect(multiChoiceSpec.parseOptions?.(raw)).toBeUndefined();
    }
  });

  it('rejects a list that is not an array of strings', () => {
    for (const list of [1, 'red', ['red', 2], [{ value: 'red' }], null]) {
      expect(choiceSpec.parseOptions?.({ list })).toBeUndefined();
      expect(multiChoiceSpec.parseOptions?.({ list })).toBeUndefined();
    }
  });

  it('keeps valid and empty lists, ignoring unknown fields', () => {
    expect(choiceSpec.parseOptions?.({ list: ['x', 'y'] })).toEqual({ list: ['x', 'y'] });
    expect(choiceSpec.parseOptions?.({ list: [] })).toEqual({ list: [] });
    expect(choiceSpec.parseOptions?.({ unknown: true })).toEqual({});
  });
});

describe('choiceSpec', () => {
  it('picks among enabled descriptor options', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = choiceValue(
        choiceSpec.generate(context('choice', seed, { options: DESCRIPTOR_OPTIONS }), {}),
      );
      expect(ENABLED_VALUES).toContain(value);
    }
  });

  it('prefers the list override when non-empty', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const value = choiceValue(
        choiceSpec.generate(context('choice', seed, { options: DESCRIPTOR_OPTIONS }), {
          list: ['x', 'y'],
        }),
      );
      expect(['x', 'y']).toContain(value);
    }
  });

  it('falls back to descriptor options for an empty list', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const value = choiceValue(
        choiceSpec.generate(context('choice', seed, { options: DESCRIPTOR_OPTIONS }), {
          list: [],
        }),
      );
      expect(ENABLED_VALUES).toContain(value);
    }
  });

  it('returns none when there are no candidates', () => {
    expect(choiceSpec.generate(context('choice', 1), {})).toEqual({ kind: 'none' });
    expect(choiceSpec.generate(context('choice', 1), { list: [] })).toEqual({ kind: 'none' });
    expect(
      choiceSpec.generate(
        context('choice', 1, {
          options: [{ value: 'green', label: 'Green', disabled: true }],
        }),
        {},
      ),
    ).toEqual({ kind: 'none' });
  });

  it('is deterministic for a fixed seed', () => {
    expect(
      choiceSpec.generate(context('choice', 42, { options: DESCRIPTOR_OPTIONS }), {}),
    ).toEqual(choiceSpec.generate(context('choice', 42, { options: DESCRIPTOR_OPTIONS }), {}));
  });
});

describe('multiChoiceSpec', () => {
  it('returns a unique non-empty subset of enabled candidates', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const values = multiValue(
        multiChoiceSpec.generate(context('multiChoice', seed, { options: DESCRIPTOR_OPTIONS }), {}),
      );
      expect(values.length).toBeGreaterThanOrEqual(1);
      expect(values.length).toBeLessThanOrEqual(ENABLED_VALUES.length);
      expect(new Set(values).size).toBe(values.length);
      for (const value of values) {
        expect(ENABLED_VALUES).toContain(value);
      }
    }
  });

  it('uses the full candidate pool over many seeds', () => {
    const sizes = new Set<number>();
    for (let seed = 0; seed < 40; seed += 1) {
      const values = multiValue(
        multiChoiceSpec.generate(context('multiChoice', seed, { options: DESCRIPTOR_OPTIONS }), {}),
      );
      sizes.add(values.length);
    }
    expect(sizes.has(2)).toBe(true);
  });

  it('uses the list override when non-empty', () => {
    const values = multiValue(
      multiChoiceSpec.generate(context('multiChoice', 5, { options: DESCRIPTOR_OPTIONS }), {
        list: ['x', 'y', 'z'],
      }),
    );
    for (const value of values) {
      expect(['x', 'y', 'z']).toContain(value);
    }
  });

  it('deduplicates repeated candidate values', () => {
    const values = multiValue(
      multiChoiceSpec.generate(context('multiChoice', 5), { list: ['x', 'x', 'y'] }),
    );
    expect(new Set(values).size).toBe(values.length);
  });

  it('returns none when there are no candidates', () => {
    expect(multiChoiceSpec.generate(context('multiChoice', 1), {})).toEqual({ kind: 'none' });
  });

  it('is deterministic for a fixed seed', () => {
    expect(
      multiChoiceSpec.generate(context('multiChoice', 42, { options: DESCRIPTOR_OPTIONS }), {}),
    ).toEqual(
      multiChoiceSpec.generate(context('multiChoice', 42, { options: DESCRIPTOR_OPTIONS }), {}),
    );
  });
});
