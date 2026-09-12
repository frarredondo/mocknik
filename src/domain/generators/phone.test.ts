import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../ports';
import { createRandom } from '../random';
import type { FieldValue } from '../types';
import { makeDescriptor } from '../../../test/fakes/descriptor';
import type { TelephoneOptions } from './phone';
import { telephoneSpec } from './phone';

const DEFAULT_PATTERN = /^\+1 \([1-9]\d{2}\) [1-9]\d{2}-[1-9]\d{3}$/;

function context(seed = 1): GenerationContext {
  return {
    descriptor: makeDescriptor({ type: 'tel' }),
    fieldType: 'telephone',
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

function generate(options: TelephoneOptions | undefined, seed = 1): string {
  return textValue(telephoneSpec.generate(context(seed), options ?? {}));
}

describe('telephoneSpec', () => {
  it('generates the default +1 (XxX) XxX-XxxX format', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      expect(generate(undefined, seed)).toMatch(DEFAULT_PATTERN);
    }
  });

  it('honors a custom template', () => {
    const options = telephoneSpec.parseOptions?.({ template: '(Xxx) Xxx-XXXX' });
    for (let seed = 0; seed < 10; seed += 1) {
      expect(generate(options, seed)).toMatch(/^\([1-9]\d{2}\) [1-9]\d{2}-[1-9]\d{3}$/);
    }
  });

  it('emits every non-placeholder character literally', () => {
    const options = telephoneSpec.parseOptions?.({ template: 'REF-Xx' });
    for (let seed = 0; seed < 10; seed += 1) {
      expect(generate(options, seed)).toMatch(/^REF-[1-9]\d$/);
    }
  });

  it('is deterministic under createRandom(3)', () => {
    expect(generate(undefined, 3)).toBe(generate(undefined, 3));
    expect(generate({ template: 'XxX' }, 3)).toBe(generate({ template: 'XxX' }, 3));
  });

  it('never throws, even for malformed direct options', () => {
    const weird: readonly unknown[] = [
      undefined,
      {},
      { template: '' },
      { template: '   ' },
      { template: 42 },
      { template: null },
    ];
    for (const raw of weird) {
      expect(() => telephoneSpec.parseOptions?.(raw)).not.toThrow();
      expect(() =>
        telephoneSpec.generate(context(), (telephoneSpec.parseOptions?.(raw) ?? {}) as TelephoneOptions),
      ).not.toThrow();
      expect(() => telephoneSpec.generate(context(), raw as unknown as TelephoneOptions)).not.toThrow();
    }
  });
});

describe('telephoneSpec.parseOptions', () => {
  it('rejects non-plain-object input', () => {
    for (const raw of [undefined, null, '+1 XxX', 42, true, [], () => ({})]) {
      expect(telephoneSpec.parseOptions?.(raw)).toBeUndefined();
    }
  });

  it('accepts an empty object for the default template', () => {
    expect(telephoneSpec.parseOptions?.({})).toEqual({});
  });

  it('trims a non-empty template', () => {
    expect(telephoneSpec.parseOptions?.({ template: '  +44 XxX  ' })).toEqual({
      template: '+44 XxX',
    });
  });

  it('rejects an empty or non-string template', () => {
    expect(telephoneSpec.parseOptions?.({ template: '' })).toBeUndefined();
    expect(telephoneSpec.parseOptions?.({ template: '   ' })).toBeUndefined();
    expect(telephoneSpec.parseOptions?.({ template: 42 })).toBeUndefined();
  });

  it('falls back to the default template when options are invalid', () => {
    const options = telephoneSpec.parseOptions?.({ template: '' });
    expect(options).toBeUndefined();
    expect(textValue(telephoneSpec.generate(context(4), options ?? {}))).toMatch(DEFAULT_PATTERN);
  });
});
