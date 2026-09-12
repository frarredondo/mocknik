import { describe, expect, it } from 'vitest';
import { makeDescriptor } from '../../test/fakes/descriptor';
import { compileMatcher } from './matcher';
import type { FieldDescriptor, MatchAttribute, MatchKind, MatchSpec } from './types';

interface Case {
  readonly label: string;
  readonly spec: MatchSpec;
  readonly descriptor: FieldDescriptor;
  readonly expected: boolean;
}

const cases: readonly Case[] = [
  {
    label: 'contains matches a normalized substring',
    spec: { kind: 'contains', patterns: ['email'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'user_email' }),
    expected: true,
  },
  {
    label: 'contains is case-insensitive',
    spec: { kind: 'contains', patterns: ['EMAIL'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'Email' }),
    expected: true,
  },
  {
    label: 'contains normalizes its pattern',
    spec: { kind: 'contains', patterns: ['E-Mail!'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'email' }),
    expected: true,
  },
  {
    label: 'contains does not match absent text',
    spec: { kind: 'contains', patterns: ['password'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'username' }),
    expected: false,
  },
  {
    label: 'contains ignores unselected attributes',
    spec: { kind: 'contains', patterns: ['password'], attributes: ['label'] },
    descriptor: makeDescriptor({ name: 'password', label: 'nickname' }),
    expected: false,
  },
  {
    label: 'contains matches any of several patterns',
    spec: { kind: 'contains', patterns: ['bogus', 'mail'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'email' }),
    expected: true,
  },
  {
    label: 'contains with no patterns never matches',
    spec: { kind: 'contains', patterns: [], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'email' }),
    expected: false,
  },
  {
    label: 'contains with an empty normalized pattern never matches',
    spec: { kind: 'contains', patterns: ['!!!'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'email' }),
    expected: false,
  },
  {
    label: 'exact matches a whole normalized attribute',
    spec: { kind: 'exact', patterns: ['user-email'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'user_email' }),
    expected: true,
  },
  {
    label: 'exact is case-insensitive',
    spec: { kind: 'exact', patterns: ['EMAIL'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'Email' }),
    expected: true,
  },
  {
    label: 'exact rejects a substring',
    spec: { kind: 'exact', patterns: ['user'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'user_name' }),
    expected: false,
  },
  {
    label: 'exact rejects a different token',
    spec: { kind: 'exact', patterns: ['email'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'user_email' }),
    expected: false,
  },
  {
    label: 'exact matches any selected attribute',
    spec: { kind: 'exact', patterns: ['email'], attributes: ['name', 'id'] },
    descriptor: makeDescriptor({ name: 'other', id: 'e-mail' }),
    expected: true,
  },
  {
    label: 'exact with an empty normalized pattern never matches',
    spec: { kind: 'exact', patterns: ['!!!'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: '' }),
    expected: false,
  },
  {
    label: 'exact with no patterns never matches',
    spec: { kind: 'exact', patterns: [], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'email' }),
    expected: false,
  },
  {
    label: 'glob * matches any suffix',
    spec: { kind: 'glob', patterns: ['user*'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'username' }),
    expected: true,
  },
  {
    label: 'glob * matches any prefix',
    spec: { kind: 'glob', patterns: ['*name'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'username' }),
    expected: true,
  },
  {
    label: 'glob ? matches exactly one character',
    spec: { kind: 'glob', patterns: ['user?ame'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'username' }),
    expected: true,
  },
  {
    label: 'glob is anchored',
    spec: { kind: 'glob', patterns: ['user'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'username' }),
    expected: false,
  },
  {
    label: 'glob is case-insensitive',
    spec: { kind: 'glob', patterns: ['USER*'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'Username' }),
    expected: true,
  },
  {
    label: 'glob escapes regex metacharacters',
    spec: { kind: 'glob', patterns: ['a.c'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'abc' }),
    expected: false,
  },
  {
    label: 'glob wildcards span normalized separators',
    spec: { kind: 'glob', patterns: ['my*file'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'my-file' }),
    expected: true,
  },
  {
    label: 'glob with no patterns never matches',
    spec: { kind: 'glob', patterns: [], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'username' }),
    expected: false,
  },
  {
    label: 'regex matches raw values case-insensitively',
    spec: { kind: 'regex', patterns: ['^pass'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'Password' }),
    expected: true,
  },
  {
    label: 'regex anchors at the end',
    spec: { kind: 'regex', patterns: ['word$'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'password' }),
    expected: true,
  },
  {
    label: 'regex rejects the wrong position',
    spec: { kind: 'regex', patterns: ['^word'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'password' }),
    expected: false,
  },
  {
    label: 'regex tests raw values, not normalized ones',
    spec: { kind: 'regex', patterns: ['^user_email$'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'user_email' }),
    expected: true,
  },
  {
    label: 'regex does not see normalized values',
    spec: { kind: 'regex', patterns: ['^useremail$'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'user_email' }),
    expected: false,
  },
  {
    label: 'regex sees the raw concatenation of selected attributes',
    spec: { kind: 'regex', patterns: ['first second'], attributes: ['name', 'id'] },
    descriptor: makeDescriptor({ name: 'first', id: 'second' }),
    expected: true,
  },
  {
    label: 'regex with no patterns never matches',
    spec: { kind: 'regex', patterns: [], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'password' }),
    expected: false,
  },
  {
    label: 'invalid regex never matches',
    spec: { kind: 'regex', patterns: ['('], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'password' }),
    expected: false,
  },
  {
    label: 'regex longer than 200 characters never matches',
    spec: { kind: 'regex', patterns: ['a'.repeat(201)], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'a'.repeat(201) }),
    expected: false,
  },
  {
    label: 'regex of exactly 200 characters matches',
    spec: { kind: 'regex', patterns: ['a'.repeat(200)], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'a'.repeat(200) }),
    expected: true,
  },
  {
    label: 'unknown kind never matches',
    spec: { kind: 'bogus' as MatchKind, patterns: ['x'], attributes: ['name'] },
    descriptor: makeDescriptor({ name: 'x' }),
    expected: false,
  },
];

describe('compileMatcher matching', () => {
  it.each(cases)('$label', ({ spec, descriptor, expected }) => {
    expect(compileMatcher(spec).test(descriptor)).toBe(expected);
  });

  it('exact does not match a concatenation of attributes', () => {
    const matcher = compileMatcher({ kind: 'exact', patterns: ['username'], attributes: ['name', 'id'] });
    expect(matcher.test(makeDescriptor({ name: 'user', id: 'name' }))).toBe(false);
  });

  it('never throws on malformed specs', () => {
    const descriptor = makeDescriptor({ name: 'x' });
    expect(() =>
      compileMatcher({ kind: 'glob', patterns: ['*(?[+]'], attributes: ['name'] }).test(descriptor),
    ).not.toThrow();
    expect(() =>
      compileMatcher({ kind: 'contains', attributes: ['name'] } as unknown as MatchSpec).test(descriptor),
    ).not.toThrow();
    expect(() =>
      compileMatcher({ kind: 'regex', patterns: [null as unknown as string], attributes: ['name'] }).test(
        descriptor,
      ),
    ).not.toThrow();
  });
});

describe('compileMatcher attribute selection', () => {
  it('tests only the explicit attributes', () => {
    const matcher = compileMatcher(
      { kind: 'contains', patterns: ['email'], attributes: ['name'] },
      ['label'],
    );
    expect(matcher.test(makeDescriptor({ name: 'email', label: 'nickname' }))).toBe(true);
    expect(matcher.test(makeDescriptor({ name: 'other', label: 'email' }))).toBe(false);
  });

  it('uses the fallback attributes when the spec omits them', () => {
    const matcher = compileMatcher({ kind: 'contains', patterns: ['email'] }, ['label']);
    expect(matcher.test(makeDescriptor({ label: 'email' }))).toBe(true);
    expect(matcher.test(makeDescriptor({ name: 'email' }))).toBe(false);
  });

  it('uses the default attributes when neither is provided', () => {
    const matcher = compileMatcher({ kind: 'contains', patterns: ['email'] });
    expect(matcher.test(makeDescriptor({ id: 'email' }))).toBe(true);
    expect(matcher.test(makeDescriptor({ title: 'email' }))).toBe(false);
  });
});

describe('compileMatcher specificity', () => {
  const spec = (
    kind: MatchKind,
    patterns: readonly string[],
    attributes: readonly MatchAttribute[] = ['name'],
  ): MatchSpec => ({ kind, patterns, attributes });

  it('weights id > name > label > class', () => {
    const id = compileMatcher(spec('contains', ['x'], ['id'])).specificity;
    const name = compileMatcher(spec('contains', ['x'], ['name'])).specificity;
    const label = compileMatcher(spec('contains', ['x'], ['label'])).specificity;
    const className = compileMatcher(spec('contains', ['x'], ['class'])).specificity;
    expect(id).toBeGreaterThan(name);
    expect(name).toBeGreaterThan(label);
    expect(label).toBeGreaterThan(className);
  });

  it('uses the maximum weight of the selected attributes', () => {
    expect(compileMatcher(spec('contains', ['x'], ['id', 'type'])).specificity).toBe(41);
    expect(compileMatcher(spec('contains', ['x'], ['type'])).specificity).toBe(4);
  });

  it('weights exact > glob > regex > contains', () => {
    const exact = compileMatcher(spec('exact', ['x'])).specificity;
    const glob = compileMatcher(spec('glob', ['x'])).specificity;
    const regex = compileMatcher(spec('regex', ['x'])).specificity;
    const contains = compileMatcher(spec('contains', ['x'])).specificity;
    expect(exact).toBeGreaterThan(glob);
    expect(glob).toBeGreaterThan(regex);
    expect(regex).toBeGreaterThan(contains);
  });

  it('raises specificity with more patterns', () => {
    const one = compileMatcher(spec('contains', ['x'])).specificity;
    const two = compileMatcher(spec('contains', ['x', 'y'])).specificity;
    expect(two).toBeGreaterThan(one);
  });

  it('adds kind weight and pattern count to the attribute weight', () => {
    expect(compileMatcher(spec('exact', ['a', 'b'], ['name'])).specificity).toBe(62);
  });

  it('falls back to the provided attributes when spec.attributes is omitted', () => {
    expect(compileMatcher({ kind: 'contains', patterns: ['x'] }, ['label']).specificity).toBe(16);
    expect(compileMatcher({ kind: 'contains', patterns: ['x'] }).specificity).toBe(41);
  });

  it('lets explicit attributes override the fallback', () => {
    expect(compileMatcher(spec('contains', ['x'], ['label']), ['id']).specificity).toBe(16);
  });

  it('is finite and non-negative for empty or invalid specs', () => {
    const scores = [
      compileMatcher(spec('contains', [], [])).specificity,
      compileMatcher({ kind: 'bogus' as MatchKind, patterns: ['x'], attributes: ['name'] }).specificity,
      compileMatcher({ kind: 'contains' } as unknown as MatchSpec).specificity,
    ];
    for (const score of scores) {
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });
});
