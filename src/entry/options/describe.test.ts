import { describe, expect, it } from 'vitest';
import type { FieldRule, MatchAttribute } from '../../domain/types';
import { describeRule } from './describe';

function rule(partial: Partial<FieldRule> = {}): FieldRule {
  return {
    id: 'rule-1',
    name: 'Rule',
    match: { kind: 'contains', patterns: ['confirm'] },
    ...partial,
  };
}

const fallback: readonly MatchAttribute[] = ['name', 'id'];

describe('describeRule attributes', () => {
  it('uses the rule attributes when present', () => {
    const described = describeRule(
      rule({ match: { kind: 'contains', patterns: ['x'], attributes: ['label'] } }),
      fallback,
    );
    expect(described.attributes).toEqual(['label']);
  });

  it('falls back to the global attributes when the rule omits them', () => {
    const described = describeRule(rule(), fallback);
    expect(described.attributes).toEqual(fallback);
  });

  it('preserves explicitly empty rule attributes rather than falling back', () => {
    const described = describeRule(
      rule({ match: { kind: 'contains', patterns: ['x'], attributes: [] } }),
      fallback,
    );
    expect(described.attributes).toEqual([]);
  });
});

describe('describeRule patterns and kind', () => {
  it('carries the match kind and patterns through', () => {
    const described = describeRule(
      rule({ match: { kind: 'glob', patterns: ['a*', 'b*'], attributes: ['name'] } }),
      fallback,
    );
    expect(described.kind).toBe('glob');
    expect(described.patterns).toEqual(['a*', 'b*']);
  });

  it('returns an empty pattern list for a sparse rule', () => {
    const sparse = { id: 's', name: 'Sparse', match: { kind: 'contains' } } as unknown as FieldRule;
    expect(describeRule(sparse, fallback).patterns).toEqual([]);
  });
});

describe('describeRule action default', () => {
  it('defaults the action to fill when omitted', () => {
    expect(describeRule(rule(), fallback).action).toBe('fill');
  });

  it('keeps an explicit action', () => {
    expect(describeRule(rule({ action: 'skip' }), fallback).action).toBe('skip');
  });
});

describe('describeRule fieldType and mirrorSource', () => {
  it('omits fieldType and mirrorSource when unset', () => {
    const described = describeRule(rule(), fallback);
    expect('fieldType' in described).toBe(false);
    expect('mirrorSource' in described).toBe(false);
  });

  it('includes fieldType when set', () => {
    const described = describeRule(rule({ fieldType: 'email' }), fallback);
    expect(described.fieldType).toBe('email');
  });

  it('includes mirrorSource when set', () => {
    const described = describeRule(rule({ action: 'mirror', mirrorSource: 'previous-password' }), fallback);
    expect(described.mirrorSource).toBe('previous-password');
  });
});

describe('describeRule badge', () => {
  it('omits the badge for a plain contains rule', () => {
    const described = describeRule(rule(), fallback);
    expect('badge' in described).toBe(false);
    expect(described.badge).toBeUndefined();
  });

  it('marks a regex rule', () => {
    const described = describeRule(
      rule({ match: { kind: 'regex', patterns: ['^a$'], attributes: ['name'] } }),
      fallback,
    );
    expect(described.badge).toBe('regex');
  });

  it('marks a text literal value', () => {
    const described = describeRule(rule({ value: { kind: 'text', value: 'x' } }), fallback);
    expect(described.badge).toBe('literal');
  });

  it('does not mark a non-text value as literal', () => {
    const described = describeRule(rule({ value: { kind: 'checked', value: true } }), fallback);
    expect('badge' in described).toBe(false);
  });

  it('marks a template', () => {
    const described = describeRule(rule({ template: '{{name}}' }), fallback);
    expect(described.badge).toBe('template');
  });

  it('prefers literal over template and regex', () => {
    const described = describeRule(
      rule({
        match: { kind: 'regex', patterns: ['^a$'], attributes: ['name'] },
        value: { kind: 'text', value: 'x' },
        template: '{{name}}',
      }),
      fallback,
    );
    expect(described.badge).toBe('literal');
  });

  it('prefers template over regex', () => {
    const described = describeRule(
      rule({ match: { kind: 'regex', patterns: ['^a$'], attributes: ['name'] }, template: '{{name}}' }),
      fallback,
    );
    expect(described.badge).toBe('template');
  });
});

describe('describeRule sparse rules', () => {
  it('never throws and applies defaults', () => {
    const sparse = {
      id: 'sparse',
      name: 'Sparse',
      match: { kind: 'contains' },
    } as unknown as FieldRule;

    let described!: ReturnType<typeof describeRule>;
    expect(() => {
      described = describeRule(sparse, fallback);
    }).not.toThrow();

    expect(described.attributes).toEqual(fallback);
    expect(described.patterns).toEqual([]);
    expect(described.action).toBe('fill');
    expect('fieldType' in described).toBe(false);
    expect('mirrorSource' in described).toBe(false);
    expect('badge' in described).toBe(false);
  });
});
