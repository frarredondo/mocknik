import type { AnyGeneratorSpec, GeneratorRegistry, GeneratorSpec } from '../ports';
import type { FieldType } from '../types';

/** Creates a generator registry, optionally seeded with specs (last wins). */
export function createRegistry(specs: readonly AnyGeneratorSpec[] = []): GeneratorRegistry {
  const byFieldType = new Map<FieldType, AnyGeneratorSpec>();
  for (const spec of specs) {
    byFieldType.set(spec.fieldType, spec);
  }
  return {
    register<O>(spec: GeneratorSpec<O>): void {
      byFieldType.set(spec.fieldType, spec);
    },
    get(fieldType: FieldType): AnyGeneratorSpec | undefined {
      return byFieldType.get(fieldType);
    },
  };
}
