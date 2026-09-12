import type { Clock, GeneratorRegistry, RandomSource } from '../../domain/ports';
import { createRandom } from '../../domain/random';
import { expandTemplate } from '../../domain/templates';
import type { FieldDescriptor, FieldRule, FieldType, FieldValue } from '../../domain/types';

export interface PreviewDeps {
  readonly registry: GeneratorRegistry;
  readonly random: RandomSource;
  readonly secureRandom: RandomSource;
  readonly clock: Clock;
}

export interface RulePreview {
  readonly kind: 'value' | 'explanation';
  readonly text: string;
  readonly note?: string;
}

const SKIP_TEXT = 'Leaves the field untouched — no value is written.';

const MIRROR_TEXT: Readonly<Record<'previous-text' | 'previous-password', string>> = {
  'previous-password': 'Copies whatever was typed into the previous password field.',
  'previous-text': 'Copies whatever was typed into the previous text field.',
};

const FALLBACK: RulePreview = {
  kind: 'explanation',
  text: 'No example is available for this rule.',
};

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Stable per-rule seed so a rule's example does not change between renders. */
export function previewSeed(rule: FieldRule): number {
  const id = rule !== null && typeof rule === 'object' && typeof rule.id === 'string' ? rule.id : '';
  let hash = FNV_OFFSET;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash ^ id.charCodeAt(index)) >>> 0;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

function syntheticDescriptor(rule: FieldRule, fieldType: FieldType): FieldDescriptor {
  return {
    tag: 'input',
    type: fieldType,
    name: typeof rule.name === 'string' ? rule.name : '',
    id: typeof rule.id === 'string' ? rule.id : '',
    classes: [],
    label: '',
    placeholder: '',
    ariaLabel: '',
    ariaLabelledBy: '',
    autocomplete: '',
    title: '',
    pattern: '',
    required: false,
    disabled: false,
    readonly: false,
    hidden: false,
  };
}

function literalPreview(value: FieldValue): RulePreview {
  switch (value.kind) {
    case 'text':
      return { kind: 'value', text: value.value, note: 'Literal value' };
    case 'checked':
      return {
        kind: 'explanation',
        text: value.value ? 'Always checked.' : 'Always unchecked.',
        note: 'Literal value',
      };
    case 'choice':
      return { kind: 'explanation', text: `Literal choice: ${value.value}`, note: 'Literal value' };
    case 'multiChoice':
      return {
        kind: 'explanation',
        text: `Literal choices: ${value.value.join(', ')}`,
        note: 'Literal value',
      };
    default:
      return { kind: 'explanation', text: 'No literal value is written.', note: 'Literal value' };
  }
}

function templatePreview(template: string, random: RandomSource): RulePreview {
  try {
    return { kind: 'value', text: expandTemplate(random, template), note: 'From template' };
  } catch {
    return { kind: 'explanation', text: 'Could not expand the template.', note: 'From template' };
  }
}

function generatedPreview(
  value: FieldValue,
  fieldType: FieldType,
  note: string,
): RulePreview {
  if (value.kind === 'text') {
    return { kind: 'value', text: value.value, note };
  }
  if (value.kind === 'checked') {
    return {
      kind: 'explanation',
      text: value.value ? 'Checks the checkbox.' : 'Leaves the checkbox unchecked.',
      note,
    };
  }
  return { kind: 'explanation', text: `${note} (needs field options)`, note };
}

function generatorPreview(rule: FieldRule, deps: PreviewDeps, seed: number): RulePreview {
  const explicit = rule.fieldType;
  const fieldType: FieldType = explicit ?? 'text';
  const note =
    explicit === undefined ? `Generated ${fieldType} (inferred)` : `Generated ${fieldType}`;
  const spec = deps.registry.get(fieldType);
  if (spec === undefined) {
    return { kind: 'explanation', text: `No generator is available for ${fieldType}.`, note };
  }
  const options = spec.parseOptions ? spec.parseOptions(rule.options) : undefined;
  const value = spec.generate(
    {
      descriptor: syntheticDescriptor(rule, fieldType),
      fieldType,
      random: createRandom(seed),
      secureRandom: createRandom(seed ^ 0x9e3779b9),
      clock: deps.clock,
    },
    options,
  );
  return generatedPreview(value, fieldType, note);
}

function previewInternal(rule: FieldRule, deps: PreviewDeps): RulePreview {
  const action = rule.action ?? 'fill';

  if (action === 'skip') {
    return { kind: 'explanation', text: SKIP_TEXT };
  }
  if (action === 'mirror') {
    return {
      kind: 'explanation',
      text: MIRROR_TEXT[rule.mirrorSource === 'previous-password' ? 'previous-password' : 'previous-text'],
    };
  }
  if (rule.value !== undefined) {
    return literalPreview(rule.value);
  }
  if (typeof rule.template === 'string') {
    return templatePreview(rule.template, createRandom(previewSeed(rule)));
  }
  return generatorPreview(rule, deps, previewSeed(rule));
}

/** Builds the example line for a rule. Total: never throws. */
export function previewRule(rule: FieldRule, deps: PreviewDeps): RulePreview {
  try {
    return previewInternal(rule, deps);
  } catch {
    return FALLBACK;
  }
}
