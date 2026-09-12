import { classify } from './classify';
import { compileMatcher } from './matcher';
import type {
  AnyGeneratorSpec,
  Clock,
  FormField,
  GeneratorRegistry,
  RandomSource,
} from './ports';
import { expandTemplate } from './templates';
import type {
  FieldDescriptor,
  FieldResolution,
  FieldRule,
  FieldType,
  FieldValue,
  RuleAction,
  RuleLayer,
  Settings,
} from './types';

/**
 * Wraps the flat settings rules in a single `global` layer, injecting the
 * global match attributes into rules that do not declare their own.
 */
export function layersFromSettings(settings: Settings): RuleLayer[] {
  return [
    {
      id: 'global',
      rules: settings.rules.map((rule) =>
        rule.match.attributes
          ? rule
          : { ...rule, match: { ...rule.match, attributes: settings.match.attributes } },
      ),
    },
  ];
}

function safeClassify(field: FormField): FieldType {
  try {
    return classify(field.descriptor);
  } catch {
    return 'text';
  }
}

/** Picks the best matching rule per layer; ties go to the last declared rule. */
function collectWinners(descriptor: FieldDescriptor, layers: readonly RuleLayer[]): FieldRule[] {
  const winners: FieldRule[] = [];
  for (const layer of layers) {
    let best: FieldRule | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const rule of layer.rules) {
      let matches = false;
      let score = Number.NEGATIVE_INFINITY;
      try {
        const matcher = compileMatcher(rule.match);
        matches = matcher.test(descriptor);
        score = matcher.specificity + (rule.specificity ?? 0);
      } catch {
        matches = false;
      }
      if (matches && score >= bestScore) {
        best = rule;
        bestScore = score;
      }
    }
    if (best !== undefined) {
      winners.push(best);
    }
  }
  return winners;
}

/** Shallow-merges winner options from least-specific to most-specific. */
function mergeOptions(winners: readonly FieldRule[]): Record<string, unknown> {
  let merged: Record<string, unknown> = {};
  for (let index = winners.length - 1; index >= 0; index -= 1) {
    const options = winners[index]?.options;
    if (options !== undefined) {
      merged = { ...merged, ...options };
    }
  }
  return merged;
}

function generateValue(
  field: FormField,
  fieldType: FieldType,
  registry: GeneratorRegistry,
  random: RandomSource,
  secureRandom: RandomSource,
  clock: Clock,
  rawOptions: Record<string, unknown>,
): FieldValue {
  let spec: AnyGeneratorSpec | undefined;
  try {
    spec = registry.get(fieldType);
  } catch {
    spec = undefined;
  }
  if (spec === undefined) {
    return { kind: 'none' };
  }
  try {
    const options = spec.parseOptions ? spec.parseOptions(rawOptions) : undefined;
    return spec.generate({ descriptor: field.descriptor, fieldType, random, secureRandom, clock }, options);
  } catch {
    return { kind: 'none' };
  }
}

function resolveFieldInternal(
  field: FormField,
  layers: readonly RuleLayer[],
  registry: GeneratorRegistry,
  random: RandomSource,
  secureRandom: RandomSource,
  clock: Clock,
): FieldResolution {
  const baselineType = safeClassify(field);
  const winners = collectWinners(field.descriptor, layers);
  const trace = winners.map((winner) => winner.id);
  const primary = winners[0];
  const action: RuleAction = primary?.action ?? 'fill';
  const fieldType: FieldType = primary?.fieldType ?? baselineType;

  if (action === 'skip') {
    return { fieldType, action, value: { kind: 'none' }, trace };
  }

  if (action === 'mirror') {
    return {
      fieldType,
      action,
      value: { kind: 'none' },
      mirrorSource: primary?.mirrorSource ?? 'previous-text',
      trace,
    };
  }

  if (primary?.value !== undefined) {
    return { fieldType, action, value: primary.value, trace };
  }

  if (primary?.template !== undefined) {
    try {
      const value = expandTemplate(random, primary.template);
      return { fieldType, action, value: { kind: 'text', value }, trace };
    } catch {
      return { fieldType, action, value: { kind: 'none' }, trace };
    }
  }

  const value = generateValue(field, fieldType, registry, random, secureRandom, clock, mergeOptions(winners));
  return { fieldType, action, value, trace };
}

/**
 * Resolves one field against the rule layers, most-specific-first. Total and
 * deterministic: malformed rules, generators and templates never throw.
 */
export function resolveField(
  field: FormField,
  layers: readonly RuleLayer[],
  registry: GeneratorRegistry,
  random: RandomSource,
  secureRandom: RandomSource,
  clock: Clock,
): FieldResolution {
  try {
    return resolveFieldInternal(field, layers, registry, random, secureRandom, clock);
  } catch {
    return { fieldType: 'text', action: 'fill', value: { kind: 'none' }, trace: [] };
  }
}
