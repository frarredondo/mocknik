import type { GeneratorSpec } from '../ports';

/** Options for the checkbox generator. */
export interface CheckboxOptions {
  checked?: 'random' | 'always' | 'never';
}

function parseCheckboxOptions(raw: unknown): CheckboxOptions | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const checked = (raw as Record<string, unknown>)['checked'];
  if (checked === undefined) {
    return {};
  }
  if (checked === 'random' || checked === 'always' || checked === 'never') {
    return { checked };
  }
  return undefined;
}

/** Generates a checked state, random by default. */
export const checkboxSpec: GeneratorSpec<CheckboxOptions> = {
  fieldType: 'checkbox',
  parseOptions: parseCheckboxOptions,
  generate(context, options) {
    const mode = options?.checked ?? 'random';
    if (mode === 'always') {
      return { kind: 'checked', value: true };
    }
    if (mode === 'never') {
      return { kind: 'checked', value: false };
    }
    return { kind: 'checked', value: context.random.bool() };
  },
};
