import type { FieldDescriptor } from '../../src/domain/types';

const BASE: FieldDescriptor = {
  tag: 'input',
  type: 'text',
  name: '',
  id: '',
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

/** Builds a complete FieldDescriptor for tests. */
export function makeDescriptor(partial: Partial<FieldDescriptor> = {}): FieldDescriptor {
  return { ...BASE, ...partial };
}
