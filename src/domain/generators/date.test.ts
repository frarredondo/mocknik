import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldDescriptor, FieldType, FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { dateSpec, timeSpec } from './date';

const TODAY = '2020-06-15';

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
    clock: { now: () => new Date(`${TODAY}T12:00:00Z`) },
  };
}

function textValue(value: FieldValue): string {
  if (value.kind !== 'text') {
    throw new Error(`expected text value, got ${value.kind}`);
  }
  return value.value;
}

describe('parseOptions', () => {
  it('rejects non-plain-object input', () => {
    for (const raw of [undefined, null, 'options', 7, true, [], () => ({})]) {
      expect(dateSpec.parseOptions?.(raw)).toBeUndefined();
      expect(timeSpec.parseOptions?.(raw)).toBeUndefined();
    }
  });

  it('keeps finite days and string fields, flooring days', () => {
    expect(
      dateSpec.parseOptions?.({
        minDaysFromToday: -3,
        maxDaysFromToday: 2.9,
        minDate: '2020-01-01',
        maxDate: '2020-02-01',
        format: 'DD-MMM-YYYY',
      }),
    ).toEqual({
      minDaysFromToday: -3,
      maxDaysFromToday: 2,
      minDate: '2020-01-01',
      maxDate: '2020-02-01',
      format: 'DD-MMM-YYYY',
    });
  });

  it('ignores invalid fields', () => {
    expect(
      dateSpec.parseOptions?.({
        minDaysFromToday: Number.NaN,
        maxDaysFromToday: '3',
        minDate: 42,
        maxDate: null,
        format: true,
        unknown: 'x',
      }),
    ).toEqual({});
  });
});

describe('dateSpec ranges', () => {
  it('picks a day within absolute bounds', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = textValue(
        dateSpec.generate(context('date', seed), {
          minDate: '2020-01-01',
          maxDate: '2020-01-31',
        }),
      );
      expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(value >= '2020-01-01').toBe(true);
      expect(value <= '2020-01-31').toBe(true);
    }
  });

  it('picks the exact day when bounds are equal', () => {
    expect(
      textValue(
        dateSpec.generate(context('date', 3), {
          minDate: '2020-03-05',
          maxDate: '2020-03-05',
        }),
      ),
    ).toBe('2020-03-05');
  });

  it('supports relative day bounds', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = textValue(
        dateSpec.generate(context('date', seed), {
          minDaysFromToday: 1,
          maxDaysFromToday: 3,
        }),
      );
      expect(value >= '2020-06-16').toBe(true);
      expect(value <= '2020-06-18').toBe(true);
    }
  });

  it('supports zero relative bounds', () => {
    expect(
      textValue(
        dateSpec.generate(context('date', 1), {
          minDaysFromToday: 0,
          maxDaysFromToday: 0,
        }),
      ),
    ).toBe(TODAY);
  });

  it('defaults the start to 1970-01-01 and the end to today', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const value = textValue(
        dateSpec.generate(context('date', seed), { maxDaysFromToday: 0 }),
      );
      expect(value >= '1970-01-01').toBe(true);
      expect(value <= TODAY).toBe(true);
    }
  });

  it('swaps reversed absolute bounds', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const value = textValue(
        dateSpec.generate(context('date', seed), {
          minDate: '2020-05-01',
          maxDate: '2020-04-01',
        }),
      );
      expect(value >= '2020-04-01').toBe(true);
      expect(value <= '2020-05-01').toBe(true);
    }
  });

  it('ignores unparseable date bounds', () => {
    const value = textValue(
      dateSpec.generate(context('date', 1), { minDate: 'nope', maxDate: 'nope' }),
    );
    expect(value >= '1970-01-01').toBe(true);
    expect(value <= TODAY).toBe(true);
  });

  it('falls back to descriptor min and max dates when options omit them', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = textValue(
        dateSpec.generate(
          context('date', seed, { min: '2020-01-01', max: '2020-12-31' }),
          {},
        ),
      );
      expect(value >= '2020-01-01').toBe(true);
      expect(value <= '2020-12-31').toBe(true);
    }
  });

  it('prefers explicit options over descriptor date bounds', () => {
    const value = textValue(
      dateSpec.generate(
        context('date', 4, { min: '2020-01-01', max: '2020-12-31' }),
        { minDate: '2021-03-05', maxDate: '2021-03-05' },
      ),
    );
    expect(value).toBe('2021-03-05');
  });
});

describe('dateSpec formatting', () => {
  it('always uses ISO for descriptors typed date', () => {
    const value = textValue(
      dateSpec.generate(context('date', 2), {
        minDate: '2020-03-05',
        maxDate: '2020-03-05',
        format: 'DD/MM/YYYY',
      }),
    );
    expect(value).toBe('2020-03-05');
  });

  it('uses the custom format otherwise', () => {
    const value = textValue(
      dateSpec.generate(context('date', 2, { type: 'text' }), {
        minDate: '2020-03-05',
        maxDate: '2020-03-05',
        format: 'DD-MMM-YYYY',
      }),
    );
    expect(value).toBe('05-Mar-2020');
  });

  it('passes unknown tokens through literally', () => {
    const value = textValue(
      dateSpec.generate(context('date', 2, { type: 'text' }), {
        minDate: '2020-03-05',
        maxDate: '2020-03-05',
        format: 'D.M.YY',
      }),
    );
    expect(value).toBe('5.3.20');
  });
});

describe('timeSpec', () => {
  it('generates HH:mm times by default', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = textValue(timeSpec.generate(context('time', seed), {}));
      expect(value).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });

  it('supports single-digit format tokens', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const value = textValue(timeSpec.generate(context('time', seed), { format: 'H.m' }));
      expect(value).toMatch(/^([0-9]|1\d|2[0-3])\.([0-9]|[1-5]\d)$/);
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(timeSpec.generate(context('time', 9), {})).toEqual(
      timeSpec.generate(context('time', 9), {}),
    );
    expect(dateSpec.generate(context('date', 9), {})).toEqual(
      dateSpec.generate(context('date', 9), {}),
    );
  });
});
