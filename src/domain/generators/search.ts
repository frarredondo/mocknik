import type { GeneratorSpec } from '../ports';
import { LOREM_WORDS } from './words';

/** Generates a single punctuation-free lorem word. */
export const searchSpec: GeneratorSpec<undefined> = {
  fieldType: 'search',
  generate: (context) => ({ kind: 'text', value: context.random.pick(LOREM_WORDS) }),
};
