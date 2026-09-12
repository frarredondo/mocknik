import type { FormField } from '../../src/domain/ports';
import type { FieldDescriptor, FieldValue } from '../../src/domain/types';
import { makeDescriptor } from './descriptor';

export interface InMemoryField extends FormField {
  /** The current value. */
  readonly written: () => FieldValue;
  /** Every value passed to `write`, in order. */
  readonly writes: readonly FieldValue[];
}

/** A FormField implementation with no DOM, for fast domain tests. */
export function createInMemoryField(
  descriptor: Partial<FieldDescriptor> = {},
  initial: FieldValue = { kind: 'none' },
): InMemoryField {
  let current = initial;
  const writes: FieldValue[] = [];
  return {
    id: descriptor.id ?? 'field-1',
    descriptor: makeDescriptor(descriptor),
    read: () => current,
    write: (value) => {
      current = value;
      writes.push(value);
    },
    written: () => current,
    writes,
  };
}
