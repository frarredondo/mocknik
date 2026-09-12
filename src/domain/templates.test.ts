import { describe, expect, it } from 'vitest';
import { createRandom } from './random';
import { expandTemplate } from './templates';

interface TokenCase {
  readonly label: string;
  readonly token: string;
  readonly pattern: RegExp;
}

const tokenCases: readonly TokenCase[] = [
  { label: 'X yields a digit from 1 to 9', token: 'X', pattern: /^[1-9]$/ },
  { label: 'x yields a digit from 0 to 9', token: 'x', pattern: /^[0-9]$/ },
  { label: 'L yields an uppercase letter', token: 'L', pattern: /^[A-Z]$/ },
  { label: 'l yields a lowercase letter', token: 'l', pattern: /^[a-z]$/ },
  { label: 'D yields a letter of either case', token: 'D', pattern: /^[A-Za-z]$/ },
  { label: 'C yields an uppercase consonant', token: 'C', pattern: /^[BCDFGHJKLMNPQRSTVWXYZ]$/ },
  { label: 'c yields a lowercase consonant', token: 'c', pattern: /^[bcdfghjklmnpqrstvwxyz]$/ },
  { label: 'V yields an uppercase vowel', token: 'V', pattern: /^[AEIOU]$/ },
  { label: 'v yields a lowercase vowel', token: 'v', pattern: /^[aeiou]$/ },
];

describe('expandTemplate tokens', () => {
  it.each(tokenCases)('$label', ({ token, pattern }) => {
    const random = createRandom(7);
    for (let index = 0; index < 50; index += 1) {
      expect(expandTemplate(random, token)).toMatch(pattern);
    }
  });

  it('never emits a zero for X', () => {
    const random = createRandom(99);
    for (let index = 0; index < 200; index += 1) {
      expect(expandTemplate(random, 'X')).not.toBe('0');
    }
  });

  it('expands every token independently inside one template', () => {
    const output = expandTemplate(createRandom(3), 'XxLlDcCVv');
    expect(output).toMatch(/^[1-9][0-9][A-Z][a-z][A-Za-z][bcdfghjklmnpqrstvwxyz][BCDFGHJKLMNPQRSTVWXYZ][AEIOU][aeiou]$/);
    expect(output).toHaveLength(9);
  });
});

describe('expandTemplate escapes and literals', () => {
  it('emits an escaped character literally', () => {
    expect(expandTemplate(createRandom(1), '[L]')).toBe('L');
  });

  it('keeps surrounding literals around an escape', () => {
    expect(expandTemplate(createRandom(1), 'a[L]b')).toBe('aLb');
  });

  it('treats an escaped token as literal text, not as a token', () => {
    expect(expandTemplate(createRandom(1), '[L]X')).toMatch(/^L[1-9]$/);
  });

  it('emits a lone opening bracket', () => {
    expect(expandTemplate(createRandom(1), '[')).toBe('[');
  });

  it('passes other characters through unchanged', () => {
    expect(expandTemplate(createRandom(1), 'user-Xx97')).toMatch(/^user-[1-9][0-9]97$/);
    expect(expandTemplate(createRandom(1), 'user-Xx97')).toHaveLength(9);
    expect(expandTemplate(createRandom(1), 'AbZ 123!')).toBe('AbZ 123!');
  });
});

describe('expandTemplate determinism', () => {
  it('produces the same output for equal seeds', () => {
    const first = expandTemplate(createRandom(123), 'XxLlDcCVv');
    const second = expandTemplate(createRandom(123), 'XxLlDcCVv');
    expect(first).toBe(second);
  });
});
