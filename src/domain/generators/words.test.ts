import { describe, expect, it } from 'vitest';
import type { RandomSource } from '../ports';
import { createRandom } from '../random';
import {
  COMPANY_SUFFIXES,
  CONSONANTS,
  FIRST_NAMES,
  LAST_NAMES,
  LETTERS,
  LOREM_WORDS,
  TLDS,
  VOWELS,
  loremWords,
  paragraph,
  scrambledWord,
} from './words';

const LETTER_RE = /^[a-z]$/;

function constantRandom(): RandomSource {
  return {
    next: () => 0,
    int: (min) => min,
    pick<T>(items: readonly T[]): T {
      return items[0] as T;
    },
    bool: () => false,
  };
}

describe('word banks', () => {
  it('exposes 40-60 unique lorem words', () => {
    expect(LOREM_WORDS.length).toBeGreaterThanOrEqual(40);
    expect(LOREM_WORDS.length).toBeLessThanOrEqual(60);
    expect(new Set(LOREM_WORDS).size).toBe(LOREM_WORDS.length);
  });

  it('exposes at least 50 unique first names', () => {
    expect(FIRST_NAMES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(FIRST_NAMES).size).toBe(FIRST_NAMES.length);
  });

  it('exposes at least 50 unique last names', () => {
    expect(LAST_NAMES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(LAST_NAMES).size).toBe(LAST_NAMES.length);
  });

  it('exposes the expected company suffixes and tlds', () => {
    expect(COMPANY_SUFFIXES).toEqual([
      'Inc',
      'Plc',
      'LLC',
      'Traders',
      'Associates',
      'Trading',
      'Co',
    ]);
    expect(TLDS).toEqual(['.com', '.net', '.org', '.info', '.biz', '.co.uk', '.io', '.dev']);
  });

  it('exposes lowercase single-char letter banks', () => {
    expect(LETTERS.join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    for (const bank of [LETTERS, CONSONANTS, VOWELS]) {
      expect(bank.length).toBeGreaterThan(0);
      expect(bank.every((letter) => LETTER_RE.test(letter))).toBe(true);
    }
    expect(CONSONANTS.filter((letter) => VOWELS.includes(letter))).toEqual([]);
  });
});

describe('scrambledWord', () => {
  it('stays within the default length bounds', () => {
    const random = createRandom(1);
    for (let i = 0; i < 50; i += 1) {
      const word = scrambledWord(random);
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(15);
    }
  });

  it('stays within custom length bounds', () => {
    const random = createRandom(2);
    for (let i = 0; i < 50; i += 1) {
      const word = scrambledWord(random, 5, 10);
      expect(word.length).toBeGreaterThanOrEqual(5);
      expect(word.length).toBeLessThanOrEqual(10);
    }
  });

  it('alternates consonant and vowel starting with a consonant', () => {
    const random = createRandom(3);
    for (let i = 0; i < 50; i += 1) {
      const word = scrambledWord(random, 3, 15);
      const mismatches = [...word].filter(
        (char, index) => !(index % 2 === 0 ? CONSONANTS : VOWELS).includes(char),
      );
      expect(mismatches).toEqual([]);
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(scrambledWord(createRandom(42), 5, 10)).toBe(
      scrambledWord(createRandom(42), 5, 10),
    );
  });
});

describe('loremWords', () => {
  it('joins the requested number of words with single spaces', () => {
    const text = loremWords(createRandom(4), 5);
    expect(text.split(' ')).toHaveLength(5);
  });

  it('returns an empty string for zero words', () => {
    expect(loremWords(createRandom(4), 0)).toBe('');
  });

  it('capitalizes the first letter of the result', () => {
    const text = loremWords(createRandom(5), 3);
    expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase());
    expect(text.charAt(0)).toMatch(/[A-Z]/);
  });

  it('truncates to maxLength when positive', () => {
    const text = loremWords(createRandom(6), 20, 12);
    expect(text.length).toBeLessThanOrEqual(12);
  });

  it('does not truncate when maxLength is absent or zero', () => {
    expect(loremWords(createRandom(7), 20).length).toBeGreaterThan(20);
    expect(loremWords(createRandom(7), 20, 0).length).toBeGreaterThan(20);
  });

  it('is deterministic for a fixed seed', () => {
    expect(loremWords(createRandom(11), 6, 40)).toBe(loremWords(createRandom(11), 6, 40));
  });
});

describe('paragraph', () => {
  it('ends with a period', () => {
    expect(paragraph(createRandom(8), 3, 6).endsWith('.')).toBe(true);
  });

  it('picks a word count within the inclusive range', () => {
    const random = createRandom(9);
    for (let i = 0; i < 20; i += 1) {
      const count = paragraph(random, 3, 6).replace(/\.$/, '').split(' ').length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(6);
    }
  });

  it('swaps bounds when min exceeds max', () => {
    expect(paragraph(constantRandom(), 4, 2)).toBe('Lorem lorem.');
  });

  it('appends the period after truncation only when it fits', () => {
    expect(paragraph(constantRandom(), 2, 2, 8)).toBe('Lorem lo');
    expect(paragraph(constantRandom(), 2, 2, 11)).toBe('Lorem lorem');
    expect(paragraph(constantRandom(), 2, 2, 12)).toBe('Lorem lorem.');
  });
});
