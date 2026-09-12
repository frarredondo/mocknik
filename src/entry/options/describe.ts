import type {
  FieldRule,
  FieldType,
  MatchAttribute,
  MatchKind,
  MirrorSource,
  RuleAction,
} from '../../domain/types';

export type RuleBadge = 'regex' | 'literal' | 'template';

export interface RuleDescription {
  readonly attributes: readonly MatchAttribute[];
  readonly kind: MatchKind;
  readonly patterns: readonly string[];
  readonly action: RuleAction;
  readonly fieldType?: FieldType;
  readonly mirrorSource?: MirrorSource;
  /** A warning badge for rules that do not read naturally in the sentence. */
  readonly badge?: RuleBadge;
}

function badgeFor(rule: FieldRule): RuleBadge | undefined {
  if (rule.value?.kind === 'text') return 'literal';
  if (rule.template !== undefined) return 'template';
  if (rule.match.kind === 'regex') return 'regex';
  return undefined;
}

/**
 * Describes a rule for its headline. When the rule omits `match.attributes`,
 * `fallbackAttributes` (the global match settings) are used.
 */
export function describeRule(
  rule: FieldRule,
  fallbackAttributes: readonly MatchAttribute[],
): RuleDescription {
  const badge = badgeFor(rule);

  return {
    attributes: rule.match.attributes ?? fallbackAttributes,
    kind: rule.match.kind,
    patterns: rule.match.patterns ?? [],
    action: rule.action ?? 'fill',
    ...(rule.fieldType !== undefined ? { fieldType: rule.fieldType } : {}),
    ...(rule.mirrorSource !== undefined ? { mirrorSource: rule.mirrorSource } : {}),
    ...(badge !== undefined ? { badge } : {}),
  };
}
