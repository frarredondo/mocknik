import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import type { EmailOptions } from './email';
import { emailSpec } from './email';
import { TLDS } from './words';

function context(seed = 1): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: 'email' }),
    fieldType: 'email',
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

function generate(options: EmailOptions | undefined, seed = 1): string {
  return textValue(emailSpec.generate(context(seed), options ?? {}));
}

describe('emailSpec', () => {
  it('generates a valid email shape with a single @ and no spaces', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const value = generate(undefined, seed);
      expect(value.split('@')).toHaveLength(2);
      expect(value).not.toMatch(/\s/);
      expect(value).toMatch(/^[a-z]+@[a-z]+(\.[a-z]+)+$/);
    }
  });

  it('generates a 4-10 letter lowercase local part by default', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const [local] = generate(undefined, seed).split('@');
      expect(local).toMatch(/^[a-z]{4,10}$/);
    }
  });

  it('generates a random domain ending in a known TLD', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const value = generate(undefined, seed);
      expect(TLDS.some((tld) => value.endsWith(tld))).toBe(true);
    }
  });

  it('uses the list local mode when provided', () => {
    const options = emailSpec.parseOptions?.({ local: 'list', list: ['ada', 'grace'] });
    for (let seed = 0; seed < 10; seed += 1) {
      const [local] = generate(options, seed).split('@');
      expect(['ada', 'grace']).toContain(local);
    }
  });

  it('uses the literal local mode when provided', () => {
    const options = emailSpec.parseOptions?.({ local: 'literal', literal: 'support.team' });
    expect(generate(options)).toMatch(/^support\.team@/);
  });

  it('uses the list domain mode when provided', () => {
    const options = emailSpec.parseOptions?.({
      domain: 'list',
      domainList: ['example.org', 'mail.test'],
    });
    for (let seed = 0; seed < 10; seed += 1) {
      const domain = generate(options, seed).split('@')[1];
      expect(['example.org', 'mail.test']).toContain(domain);
    }
  });

  it('uses the literal domain mode and strips a leading @', () => {
    const options = emailSpec.parseOptions?.({ domain: 'literal', domainLiteral: '@example.com' });
    expect(options).toEqual({ domain: 'literal', domainLiteral: 'example.com' });
    expect(generate(options)).toMatch(/@example\.com$/);
  });

  it('prepends the prefix', () => {
    const options = emailSpec.parseOptions?.({ prefix: ' qa. ' });
    expect(generate(options)).toMatch(/^qa\./);
  });

  it('is deterministic under createRandom(5)', () => {
    expect(generate(undefined, 5)).toBe(generate(undefined, 5));
    expect(generate({ local: 'literal', literal: 'x' }, 5)).toBe(
      generate({ local: 'literal', literal: 'x' }, 5),
    );
  });

  it('never throws, even for malformed direct options', () => {
    const weird: readonly unknown[] = [
      undefined,
      {},
      { local: 'list', list: [] },
      { local: 'literal', literal: '' },
      { local: 'nonsense' },
      { domain: 'list', domainList: [] },
      { domain: 'literal', domainLiteral: '   ' },
      { prefix: 1 },
      { list: 'not-an-array' },
    ];
    for (const raw of weird) {
      expect(() => emailSpec.parseOptions?.(raw)).not.toThrow();
      expect(() =>
        emailSpec.generate(context(1), (emailSpec.parseOptions?.(raw) ?? {}) as EmailOptions),
      ).not.toThrow();
      expect(() => emailSpec.generate(context(1), raw as unknown as EmailOptions)).not.toThrow();
    }
  });
});

describe('emailSpec.parseOptions', () => {
  it('rejects non-plain-object input', () => {
    for (const raw of [undefined, null, 'email', 42, true, [], () => ({})]) {
      expect(emailSpec.parseOptions?.(raw)).toBeUndefined();
    }
  });

  it('accepts and normalizes valid fields', () => {
    expect(
      emailSpec.parseOptions?.({
        local: 'literal',
        literal: '  Ada.Lovelace  ',
        domain: 'literal',
        domainLiteral: ' @mail.test ',
        prefix: ' qa. ',
      }),
    ).toEqual({
      local: 'literal',
      literal: 'Ada.Lovelace',
      domain: 'literal',
      domainLiteral: 'mail.test',
      prefix: 'qa.',
    });
  });

  it('validates list fields and trims entries', () => {
    expect(emailSpec.parseOptions?.({ local: 'list', list: [' ada ', 'grace'] })).toEqual({
      local: 'list',
      list: ['ada', 'grace'],
    });
    expect(emailSpec.parseOptions?.({ domain: 'list', domainList: ['@example.org'] })).toEqual({
      domain: 'list',
      domainList: ['example.org'],
    });
  });

  it('rejects present fields of the wrong type', () => {
    expect(emailSpec.parseOptions?.({ local: 'bogus' })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ local: 5 })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ list: 'nope' })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ list: ['a', 3] })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ literal: 42 })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ domain: 'bogus' })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ domainList: 3 })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ domainLiteral: {} })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ prefix: 5 })).toBeUndefined();
  });

  it('rejects an empty list or literal for the selected mode', () => {
    expect(emailSpec.parseOptions?.({ local: 'list' })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ local: 'list', list: [] })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ local: 'literal' })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ local: 'literal', literal: '   ' })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ domain: 'list' })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ domain: 'list', domainList: [] })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ domain: 'literal' })).toBeUndefined();
    expect(emailSpec.parseOptions?.({ domain: 'literal', domainLiteral: '   ' })).toBeUndefined();
  });

  it('falls back to random generation when options are invalid', () => {
    const options = emailSpec.parseOptions?.({ local: 'list', list: [] });
    expect(options).toBeUndefined();
    const value = textValue(emailSpec.generate(context(2), options ?? {}));
    expect(value).toMatch(/^[a-z]+@[a-z]+(\.[a-z]+)+$/);
  });
});
