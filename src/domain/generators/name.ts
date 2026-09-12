import type { GeneratorSpec } from '../ports';
import { FIRST_NAMES, LAST_NAMES, scrambledWord } from './words';

export const firstNameSpec: GeneratorSpec<undefined> = {
  fieldType: 'firstName',
  generate: (context) => ({ kind: 'text', value: context.random.pick(FIRST_NAMES) }),
};

export const lastNameSpec: GeneratorSpec<undefined> = {
  fieldType: 'lastName',
  generate: (context) => ({ kind: 'text', value: context.random.pick(LAST_NAMES) }),
};

export const fullNameSpec: GeneratorSpec<undefined> = {
  fieldType: 'fullName',
  generate: (context) => {
    const first = context.random.pick(FIRST_NAMES);
    const last = context.random.pick(LAST_NAMES);
    return { kind: 'text', value: `${first} ${last}` };
  },
};

export const usernameSpec: GeneratorSpec<undefined> = {
  fieldType: 'username',
  generate: (context) => ({
    kind: 'text',
    value: scrambledWord(context.random, 5, 10).toLowerCase(),
  }),
};
