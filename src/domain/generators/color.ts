import type { GeneratorSpec } from '../ports';

/** Generates a lowercase six-digit hex color. */
export const colorSpec: GeneratorSpec<undefined> = {
  fieldType: 'color',
  generate: (context) => {
    const hex = context.random.int(0, 0xffffff).toString(16).padStart(6, '0');
    return { kind: 'text', value: `#${hex}` };
  },
};
