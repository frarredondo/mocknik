import type { FieldRule } from '../../domain/types';

/**
 * True when the rule should be shown for `query`. An empty/whitespace query
 * matches everything. Case-insensitive.
 */
export function matchesFilter(rule: FieldRule, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;

  const haystack: readonly (string | undefined)[] = [
    rule.name,
    ...rule.match.patterns,
    rule.match.kind,
    ...(rule.match.attributes ?? []),
    rule.action ?? 'fill',
    rule.fieldType,
    rule.mirrorSource,
  ];

  return haystack.some((value) => value !== undefined && value.toLowerCase().includes(needle));
}
