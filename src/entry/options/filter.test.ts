import { describe, expect, it } from 'vitest';
import type { FieldRule } from '../../domain/types';
import { matchesFilter } from './filter';

const rule: FieldRule = {
  id: 'r1',
  name: 'Sign-in credential',
  match: {
    kind: 'regex',
    patterns: ['zzz-pattern', 'qqq-second'],
    attributes: ['placeholder'],
  },
  action: 'mirror',
  fieldType: 'email',
  mirrorSource: 'previous-password',
};

describe('matchesFilter', () => {
  it('matches everything for an empty or whitespace query', () => {
    expect(matchesFilter(rule, '')).toBe(true);
    expect(matchesFilter(rule, '   ')).toBe(true);
  });

  it('matches the rule name', () => {
    expect(matchesFilter(rule, 'sign-in')).toBe(true);
  });

  it('matches each pattern entry', () => {
    expect(matchesFilter(rule, 'zzz-pattern')).toBe(true);
    expect(matchesFilter(rule, 'qqq-second')).toBe(true);
  });

  it('matches the match kind', () => {
    expect(matchesFilter(rule, 'regex')).toBe(true);
  });

  it('matches an attribute entry', () => {
    expect(matchesFilter(rule, 'placeholder')).toBe(true);
  });

  it('matches the action', () => {
    expect(matchesFilter(rule, 'mirror')).toBe(true);
  });

  it('matches the field type when set', () => {
    expect(matchesFilter(rule, 'email')).toBe(true);
  });

  it('matches the mirror source when set', () => {
    expect(matchesFilter(rule, 'previous-password')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesFilter(rule, 'SIGN-IN')).toBe(true);
    expect(matchesFilter(rule, 'ZZZ-PATTERN')).toBe(true);
  });

  it('trims the query', () => {
    expect(matchesFilter(rule, '  sign-in  ')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesFilter(rule, 'nonexistent')).toBe(false);
  });

  it('treats a missing action as fill', () => {
    const sparse: FieldRule = {
      id: 'r2',
      name: 'Sparse',
      match: { kind: 'exact', patterns: [] },
    };
    expect(matchesFilter(sparse, 'fill')).toBe(true);
    expect(matchesFilter(sparse, 'sparse')).toBe(true);
    expect(matchesFilter(sparse, 'placeholder')).toBe(false);
  });

  it('does not throw for a sparse rule', () => {
    const sparse: FieldRule = {
      id: 'r3',
      name: 'Bare',
      match: { kind: 'contains', patterns: [] },
    };
    expect(() => matchesFilter(sparse, 'bare')).not.toThrow();
  });
});
