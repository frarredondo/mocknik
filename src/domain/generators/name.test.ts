import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldType } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import { FIRST_NAMES, LAST_NAMES } from './words';
import { firstNameSpec, fullNameSpec, lastNameSpec, usernameSpec } from './name';

function context(fieldType: FieldType, seed: number): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: fieldType }),
    fieldType,
    random: createRandom(seed),
    secureRandom: createRandom(seed + 1000),
    clock: { now: () => new Date(0) },
  };
}

describe('name generators', () => {
  it('picks a first name from the bank', () => {
    const value = firstNameSpec.generate(context('firstName', 1), undefined);
    expect(value.kind).toBe('text');
    if (value.kind === 'text') {
      expect(FIRST_NAMES).toContain(value.value);
    }
  });

  it('picks a last name from the bank', () => {
    const value = lastNameSpec.generate(context('lastName', 2), undefined);
    expect(value.kind).toBe('text');
    if (value.kind === 'text') {
      expect(LAST_NAMES).toContain(value.value);
    }
  });

  it('composes a full name from both banks', () => {
    const value = fullNameSpec.generate(context('fullName', 3), undefined);
    expect(value.kind).toBe('text');
    if (value.kind === 'text') {
      const [first, last] = value.value.split(' ');
      expect(FIRST_NAMES).toContain(first);
      expect(LAST_NAMES).toContain(last);
    }
  });

  it('builds a username of 5-10 lowercase letters', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const value = usernameSpec.generate(context('username', seed), undefined);
      expect(value.kind).toBe('text');
      if (value.kind === 'text') {
        expect(value.value).toMatch(/^[a-z]{5,10}$/);
      }
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(firstNameSpec.generate(context('firstName', 42), undefined)).toEqual(
      firstNameSpec.generate(context('firstName', 42), undefined),
    );
    expect(fullNameSpec.generate(context('fullName', 42), undefined)).toEqual(
      fullNameSpec.generate(context('fullName', 42), undefined),
    );
    expect(usernameSpec.generate(context('username', 42), undefined)).toEqual(
      usernameSpec.generate(context('username', 42), undefined),
    );
  });
});
