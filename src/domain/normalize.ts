import type { FieldDescriptor, MatchAttribute } from './types';

/** Lowercases the input and strips every character that is not a-z or 0-9. */
export function normalizeToken(raw: string | undefined | null): string {
  if (!raw) {
    return '';
  }
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Returns the raw value of one descriptor attribute; classes are joined by a space. */
export function attributeValue(descriptor: FieldDescriptor, attribute: MatchAttribute): string {
  switch (attribute) {
    case 'name':
      return descriptor.name;
    case 'id':
      return descriptor.id;
    case 'class':
      return descriptor.classes.join(' ');
    case 'label':
      return descriptor.label;
    case 'placeholder':
      return descriptor.placeholder;
    case 'ariaLabel':
      return descriptor.ariaLabel;
    case 'ariaLabelledBy':
      return descriptor.ariaLabelledBy;
    case 'autocomplete':
      return descriptor.autocomplete;
    case 'title':
      return descriptor.title;
    case 'type':
      return descriptor.type;
    default:
      return '';
  }
}

/** Concatenates normalized attribute values, each prefixed with a space. */
export function descriptorHaystack(
  descriptor: FieldDescriptor,
  attributes: readonly MatchAttribute[],
): string {
  let haystack = '';
  for (const attribute of attributes) {
    haystack += ` ${normalizeToken(attributeValue(descriptor, attribute))}`;
  }
  return haystack;
}
