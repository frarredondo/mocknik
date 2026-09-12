import { describe, expect, it } from 'vitest';
import { makeDescriptor } from '../../test/fakes/descriptor';
import { attributeValue, descriptorHaystack, normalizeToken } from './normalize';
import type { MatchAttribute } from './types';

describe('normalizeToken', () => {
  it.each([
    ['user_name', 'username'],
    ['E-Mail!', 'email'],
    ['Ünïcode 123', 'ncode123'],
    ['  A B  ', 'ab'],
    ['already-lower_123', 'alreadylower123'],
    ['', ''],
  ] as ReadonlyArray<[string, string]>)('normalizes %j to %j', (raw, expected) => {
    expect(normalizeToken(raw)).toBe(expected);
  });

  it('returns an empty string for undefined and null', () => {
    expect(normalizeToken(undefined)).toBe('');
    expect(normalizeToken(null)).toBe('');
  });
});

describe('attributeValue', () => {
  const descriptor = makeDescriptor({
    name: 'user_name',
    id: 'user-email',
    classes: ['form-control', 'is-invalid'],
    label: 'E-Mail',
    placeholder: 'you@example.com',
    ariaLabel: 'Email address',
    ariaLabelledBy: 'email-label',
    autocomplete: 'email',
    title: 'Your email',
    type: 'email',
  });

  it.each([
    ['name', 'user_name'],
    ['id', 'user-email'],
    ['class', 'form-control is-invalid'],
    ['label', 'E-Mail'],
    ['placeholder', 'you@example.com'],
    ['ariaLabel', 'Email address'],
    ['ariaLabelledBy', 'email-label'],
    ['autocomplete', 'email'],
    ['title', 'Your email'],
    ['type', 'email'],
  ] as ReadonlyArray<[MatchAttribute, string]>)('returns the raw %s value', (attribute, expected) => {
    expect(attributeValue(descriptor, attribute)).toBe(expected);
  });

  it('returns an empty string for empty attributes', () => {
    const empty = makeDescriptor();
    for (const attribute of ['name', 'id', 'class', 'label', 'title'] as const) {
      expect(attributeValue(empty, attribute)).toBe('');
    }
    expect(attributeValue(empty, 'type')).toBe('text');
  });
});

describe('descriptorHaystack', () => {
  it('concatenates normalized values in attribute order', () => {
    const descriptor = makeDescriptor({ name: 'user_name', id: 'E-Mail!' });
    expect(descriptorHaystack(descriptor, ['name', 'id'])).toBe(' username email');
  });

  it('respects the requested order', () => {
    const descriptor = makeDescriptor({ name: 'alpha', label: 'beta' });
    expect(descriptorHaystack(descriptor, ['label', 'name'])).toBe(' beta alpha');
  });

  it('only includes the requested attributes', () => {
    const descriptor = makeDescriptor({ name: 'alpha', id: 'beta', label: 'gamma' });
    const haystack = descriptorHaystack(descriptor, ['name', 'id']);
    expect(haystack).toContain('alpha');
    expect(haystack).toContain('beta');
    expect(haystack).not.toContain('gamma');
  });

  it('returns an empty string when no attributes are selected', () => {
    const descriptor = makeDescriptor({ name: 'alpha' });
    expect(descriptorHaystack(descriptor, [])).toBe('');
  });
});
