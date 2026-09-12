import type { GenerationContext, GeneratorSpec } from '../ports';
import type { FieldValue } from '../types';

/** Options for the choice and multiChoice generators. */
export interface ChoiceOptions {
  list?: readonly string[];
}

function parseChoiceOptions(raw: unknown): ChoiceOptions | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const list = (raw as Record<string, unknown>)['list'];
  if (list === undefined) {
    return {};
  }
  if (!Array.isArray(list) || !list.every((item) => typeof item === 'string')) {
    return undefined;
  }
  return { list };
}

function candidates(context: GenerationContext, options: ChoiceOptions): readonly string[] {
  if (options.list !== undefined && options.list.length > 0) {
    return options.list;
  }
  const descriptorOptions = context.descriptor.options ?? [];
  return descriptorOptions
    .filter((option) => !option.disabled)
    .map((option) => option.value);
}

function generateChoice(context: GenerationContext, options: ChoiceOptions): FieldValue {
  const values = candidates(context, options ?? {});
  if (values.length === 0) {
    return { kind: 'none' };
  }
  return { kind: 'choice', value: context.random.pick(values) };
}

function generateMultiChoice(context: GenerationContext, options: ChoiceOptions): FieldValue {
  const unique = [...new Set(candidates(context, options ?? {}))];
  if (unique.length === 0) {
    return { kind: 'none' };
  }
  const size = context.random.int(1, unique.length);
  const remaining = [...unique];
  const picked: string[] = [];
  for (let index = 0; index < size; index += 1) {
    const chosen = context.random.int(0, remaining.length - 1);
    const [value] = remaining.splice(chosen, 1);
    if (value !== undefined) {
      picked.push(value);
    }
  }
  return { kind: 'multiChoice', value: picked };
}

/** Generates one value from candidate options. */
export const choiceSpec: GeneratorSpec<ChoiceOptions> = {
  fieldType: 'choice',
  parseOptions: parseChoiceOptions,
  generate: generateChoice,
};

/** Generates a unique non-empty subset of candidate options. */
export const multiChoiceSpec: GeneratorSpec<ChoiceOptions> = {
  fieldType: 'multiChoice',
  parseOptions: parseChoiceOptions,
  generate: generateMultiChoice,
};
