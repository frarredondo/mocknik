import type { GeneratorSpec } from '../ports';
import { scrambledWord, TLDS } from './words';

/** Generates an https://www.<word>.<tld> url. */
export const urlSpec: GeneratorSpec<undefined> = {
  fieldType: 'url',
  generate: (context) => {
    const word = scrambledWord(context.random, 4, 12).toLowerCase();
    return { kind: 'text', value: `https://www.${word}${context.random.pick(TLDS)}` };
  },
};
