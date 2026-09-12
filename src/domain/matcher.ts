import type { FieldDescriptor, MatchAttribute, MatchKind, MatchSpec, Matcher } from './types';
import { DEFAULT_MATCH_ATTRIBUTES } from './types';
import { attributeValue, descriptorHaystack, normalizeToken } from './normalize';

const ATTRIBUTE_WEIGHTS: Readonly<Record<MatchAttribute, number>> = {
  id: 40,
  name: 30,
  autocomplete: 25,
  ariaLabel: 20,
  ariaLabelledBy: 18,
  label: 15,
  placeholder: 12,
  title: 6,
  class: 4,
  type: 3,
};

const KIND_WEIGHTS: Readonly<Record<MatchKind, number>> = {
  exact: 30,
  glob: 20,
  regex: 10,
  contains: 0,
};

const MAX_REGEX_LENGTH = 200;

function escapeRegex(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(pattern: string): RegExp | undefined {
  try {
    const translated = escapeRegex(pattern).replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^(?:${translated})$`, 'i');
  } catch {
    return undefined;
  }
}

function compileRegex(pattern: string): RegExp | undefined {
  if (pattern.length > MAX_REGEX_LENGTH) {
    return undefined;
  }
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return undefined;
  }
}

function attributeList(value: unknown): readonly MatchAttribute[] | undefined {
  return Array.isArray(value) ? (value as readonly MatchAttribute[]) : undefined;
}

/**
 * Compiles a match specification into a descriptor predicate plus its
 * specificity score: max selected-attribute weight + kind weight + pattern count.
 */
export function compileMatcher(
  spec: MatchSpec,
  fallbackAttributes?: readonly MatchAttribute[],
): Matcher {
  const attributes =
    attributeList(spec.attributes) ?? attributeList(fallbackAttributes) ?? DEFAULT_MATCH_ATTRIBUTES;
  const rawPatterns: readonly unknown[] = Array.isArray(spec.patterns) ? spec.patterns : [];
  const patterns = rawPatterns.filter((pattern): pattern is string => typeof pattern === 'string');

  const normalizedPatterns = patterns
    .map((pattern) => normalizeToken(pattern))
    .filter((pattern) => pattern.length > 0);
  const globPatterns = patterns
    .map(globToRegExp)
    .filter((regex): regex is RegExp => regex !== undefined);
  const regexPatterns = patterns
    .map(compileRegex)
    .filter((regex): regex is RegExp => regex !== undefined);

  const rawValues = (descriptor: FieldDescriptor): string[] =>
    attributes.map((attribute) => attributeValue(descriptor, attribute));

  const normalizedValues = (descriptor: FieldDescriptor): string[] =>
    rawValues(descriptor).map((value) => normalizeToken(value));

  const test = (descriptor: FieldDescriptor): boolean => {
    switch (spec.kind) {
      case 'contains': {
        const haystack = descriptorHaystack(descriptor, attributes);
        return normalizedPatterns.some((pattern) => haystack.includes(pattern));
      }
      case 'exact': {
        const values = normalizedValues(descriptor);
        return normalizedPatterns.some((pattern) => values.includes(pattern));
      }
      case 'glob': {
        const values = normalizedValues(descriptor);
        return globPatterns.some((regex) => values.some((value) => regex.test(value)));
      }
      case 'regex': {
        const haystack = rawValues(descriptor).join(' ');
        return regexPatterns.some((regex) => regex.test(haystack));
      }
      default:
        return false;
    }
  };

  const maxAttributeWeight = attributes.reduce(
    (max, attribute) => Math.max(max, ATTRIBUTE_WEIGHTS[attribute] ?? 0),
    0,
  );

  return {
    test,
    specificity: maxAttributeWeight + (KIND_WEIGHTS[spec.kind] ?? 0) + patterns.length,
  };
}
