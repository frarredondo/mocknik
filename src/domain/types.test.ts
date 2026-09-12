import { describe, expect, it } from 'vitest';
import { FIELD_TYPES, MATCH_KINDS } from './types';

describe('domain constants', () => {
  it('exposes the supported field types', () => {
    expect(FIELD_TYPES).toContain('email');
    expect(FIELD_TYPES).toContain('password');
    expect(FIELD_TYPES).toContain('checkbox');
  });

  it('exposes the supported match kinds', () => {
    expect(MATCH_KINDS).toEqual(['contains', 'exact', 'glob', 'regex']);
  });
});
