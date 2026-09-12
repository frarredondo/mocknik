import { descriptorHaystack } from './normalize';
import { DEFAULT_MATCH_ATTRIBUTES } from './types';
import type { FieldDescriptor, FieldType } from './types';

const EXPLICIT_TYPES: Readonly<Record<string, FieldType>> = {
  email: 'email',
  password: 'password',
  tel: 'telephone',
  url: 'url',
  number: 'number',
  range: 'number',
  date: 'date',
  time: 'time',
  'datetime-local': 'date',
  month: 'date',
  week: 'date',
  color: 'color',
  search: 'search',
  checkbox: 'checkbox',
  radio: 'choice',
};

const AUTOCOMPLETE_TYPES: readonly (readonly [string, FieldType])[] = [
  ['email', 'email'],
  ['tel', 'telephone'],
  ['given-name', 'firstName'],
  ['family-name', 'lastName'],
  ['name', 'fullName'],
  ['username', 'username'],
  ['street-address', 'text'],
  ['postal-code', 'number'],
  ['organization', 'text'],
];

const KEYWORD_RULES: readonly { readonly type: FieldType; readonly keyword: string }[] = [
  { type: 'firstName', keyword: 'firstname' },
  { type: 'lastName', keyword: 'lastname' },
  { type: 'lastName', keyword: 'surname' },
  { type: 'lastName', keyword: 'secondname' },
  { type: 'fullName', keyword: 'fullname' },
  { type: 'username', keyword: 'username' },
  { type: 'username', keyword: 'userid' },
  { type: 'username', keyword: 'login' },
  { type: 'email', keyword: 'email' },
  { type: 'password', keyword: 'password' },
  { type: 'password', keyword: 'passwd' },
  { type: 'password', keyword: 'pwd' },
  { type: 'telephone', keyword: 'phone' },
  { type: 'telephone', keyword: 'fax' },
  { type: 'telephone', keyword: 'mobile' },
  { type: 'telephone', keyword: 'telephone' },
  { type: 'number', keyword: 'zip' },
  { type: 'number', keyword: 'postal' },
  { type: 'text', keyword: 'company' },
  { type: 'text', keyword: 'organisation' },
  { type: 'text', keyword: 'organization' },
  { type: 'url', keyword: 'website' },
  { type: 'url', keyword: 'homepage' },
  { type: 'url', keyword: 'url' },
  { type: 'date', keyword: 'dob' },
  { type: 'date', keyword: 'birth' },
  { type: 'date', keyword: 'date' },
  { type: 'number', keyword: 'amount' },
  { type: 'number', keyword: 'qty' },
  { type: 'number', keyword: 'quantity' },
  { type: 'number', keyword: 'price' },
  { type: 'number', keyword: 'income' },
  { type: 'search', keyword: 'search' },
  { type: 'color', keyword: 'color' },
  { type: 'color', keyword: 'colour' },
];

function autocompleteType(autocomplete: string): FieldType | undefined {
  const tokens = autocomplete
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  for (const [key, type] of AUTOCOMPLETE_TYPES) {
    if (tokens.some((token) => token === key || token.endsWith(`-${key}`))) {
      return type;
    }
  }
  return undefined;
}

/** Derives the baseline field type for a descriptor. */
export function classify(descriptor: FieldDescriptor): FieldType {
  const explicit = EXPLICIT_TYPES[descriptor.type.toLowerCase()];
  if (explicit !== undefined) {
    return explicit;
  }

  const autocomplete = autocompleteType(descriptor.autocomplete);
  if (autocomplete !== undefined) {
    return autocomplete;
  }

  const haystack = descriptorHaystack(descriptor, DEFAULT_MATCH_ATTRIBUTES);
  for (const rule of KEYWORD_RULES) {
    if (haystack.includes(rule.keyword)) {
      return rule.type;
    }
  }

  const tag = descriptor.tag.toLowerCase();
  if (tag === 'textarea' || tag === 'contenteditable') {
    return 'paragraph';
  }
  if (tag === 'select') {
    return 'choice';
  }
  return 'text';
}
