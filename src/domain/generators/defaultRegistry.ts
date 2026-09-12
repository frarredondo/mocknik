import { FIELD_TYPES } from '../types';
import type { AnyGeneratorSpec, GeneratorRegistry } from '../ports';
import { createRegistry } from './registry';
import { paragraphSpec, textSpec } from './text';
import { firstNameSpec, fullNameSpec, lastNameSpec, usernameSpec } from './name';
import { emailSpec } from './email';
import { passwordSpec } from './password';
import { telephoneSpec } from './phone';
import { integerSpec, numberSpec } from './number';
import { dateSpec, timeSpec } from './date';
import { urlSpec } from './url';
import { colorSpec } from './color';
import { searchSpec } from './search';
import { choiceSpec, multiChoiceSpec } from './choice';
import { checkboxSpec } from './checkbox';

/** Registers every built-in generator, one per supported FieldType. */
export function createDefaultRegistry(): GeneratorRegistry {
  const registry = createRegistry();
  const specs: readonly AnyGeneratorSpec[] = [
    textSpec,
    paragraphSpec,
    firstNameSpec,
    lastNameSpec,
    fullNameSpec,
    usernameSpec,
    emailSpec,
    passwordSpec,
    telephoneSpec,
    numberSpec,
    integerSpec,
    dateSpec,
    timeSpec,
    urlSpec,
    colorSpec,
    searchSpec,
    choiceSpec,
    multiChoiceSpec,
    checkboxSpec,
  ];
  for (const spec of specs) registry.register(spec);
  return registry;
}

/** Every supported FieldType must have exactly one generator. */
export function missingGeneratorTypes(registry: GeneratorRegistry): readonly string[] {
  return FIELD_TYPES.filter((type) => registry.get(type) === undefined);
}
