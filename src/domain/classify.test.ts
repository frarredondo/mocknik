import { describe, expect, it } from 'vitest';
import { makeDescriptor } from '../../test/fakes/descriptor';
import type { FieldDescriptor, FieldType } from './types';
import { classify } from './classify';

function expectType(partial: Partial<FieldDescriptor>, expected: FieldType): void {
  expect(classify(makeDescriptor(partial))).toBe(expected);
}

const EXPLICIT_TYPE_CASES: Array<[string, FieldType]> = [
  ['email', 'email'],
  ['password', 'password'],
  ['tel', 'telephone'],
  ['url', 'url'],
  ['number', 'number'],
  ['range', 'number'],
  ['date', 'date'],
  ['time', 'time'],
  ['datetime-local', 'date'],
  ['month', 'date'],
  ['week', 'date'],
  ['color', 'color'],
  ['search', 'search'],
  ['checkbox', 'checkbox'],
  ['radio', 'choice'],
  ['EMAIL', 'email'],
];

const AUTOCOMPLETE_CASES: Array<[string, FieldType]> = [
  ['email', 'email'],
  ['EMAIL', 'email'],
  ['tel', 'telephone'],
  ['given-name', 'firstName'],
  ['family-name', 'lastName'],
  ['name', 'fullName'],
  ['username', 'username'],
  ['street-address', 'text'],
  ['postal-code', 'number'],
  ['organization', 'text'],
  ['cc-name', 'fullName'],
  ['cc-given-name', 'firstName'],
  ['cc-family-name', 'lastName'],
  ['section-blue email', 'email'],
  ['shipping postal-code', 'number'],
];

const KEYWORD_CASES: Array<[Partial<FieldDescriptor>, FieldType]> = [
  [{ name: 'first_name' }, 'firstName'],
  [{ id: 'firstName' }, 'firstName'],
  [{ label: 'First Name' }, 'firstName'],
  [{ placeholder: 'firstname' }, 'firstName'],
  [{ ariaLabel: 'first name' }, 'firstName'],
  [{ name: 'last_name' }, 'lastName'],
  [{ name: 'surname' }, 'lastName'],
  [{ name: 'second_name' }, 'lastName'],
  [{ name: 'fullname' }, 'fullName'],
  [{ label: 'Full Name' }, 'fullName'],
  [{ name: 'user_name' }, 'username'],
  [{ name: 'userid' }, 'username'],
  [{ label: 'Login' }, 'username'],
  [{ name: 'email' }, 'email'],
  [{ name: 'user_email' }, 'email'],
  [{ name: 'e-mail' }, 'email'],
  [{ name: 'password' }, 'password'],
  [{ name: 'passwd' }, 'password'],
  [{ name: 'pwd' }, 'password'],
  [{ name: 'phone' }, 'telephone'],
  [{ name: 'fax_number' }, 'telephone'],
  [{ name: 'mobile' }, 'telephone'],
  [{ name: 'telephone' }, 'telephone'],
  [{ name: 'zip_code' }, 'number'],
  [{ name: 'postal_code' }, 'number'],
  [{ name: 'company' }, 'text'],
  [{ name: 'organisation' }, 'text'],
  [{ name: 'organization' }, 'text'],
  [{ name: 'website' }, 'url'],
  [{ name: 'homepage' }, 'url'],
  [{ name: 'profile_url' }, 'url'],
  [{ name: 'dob' }, 'date'],
  [{ name: 'date_of_birth' }, 'date'],
  [{ name: 'birthday' }, 'date'],
  [{ name: 'amount' }, 'number'],
  [{ name: 'qty' }, 'number'],
  [{ name: 'quantity' }, 'number'],
  [{ name: 'price' }, 'number'],
  [{ name: 'income' }, 'number'],
  [{ name: 'search_query' }, 'search'],
  [{ name: 'color' }, 'color'],
  [{ name: 'favourite_colour' }, 'color'],
];

describe('classify', () => {
  describe('explicit type', () => {
    for (const [type, expected] of EXPLICIT_TYPE_CASES) {
      it(`maps type=${type} to ${expected}`, () => {
        expectType({ type }, expected);
      });
    }

    it('maps an unknown type to text', () => {
      expectType({ type: 'button' }, 'text');
    });
  });

  describe('autocomplete', () => {
    for (const [autocomplete, expected] of AUTOCOMPLETE_CASES) {
      it(`maps autocomplete=${autocomplete} to ${expected}`, () => {
        expectType({ type: 'text', autocomplete }, expected);
      });
    }

    it('ignores an unknown autocomplete token', () => {
      expectType({ type: 'text', autocomplete: 'off' }, 'text');
    });
  });

  describe('keywords', () => {
    for (const [partial, expected] of KEYWORD_CASES) {
      const marker = partial.name ?? partial.id ?? partial.label ?? partial.placeholder ?? '';
      it(`maps ${marker} to ${expected}`, () => {
        expectType({ type: 'text', ...partial }, expected);
      });
    }
  });

  describe('precedence', () => {
    it('lets the explicit type beat keywords', () => {
      expectType({ type: 'email', name: 'first_name' }, 'email');
    });

    it('lets the explicit type beat autocomplete', () => {
      expectType({ type: 'email', autocomplete: 'family-name' }, 'email');
    });

    it('lets autocomplete beat keywords', () => {
      expectType({ type: 'text', name: 'first_name', autocomplete: 'family-name' }, 'lastName');
    });

    it('lets keywords beat the tag fallback', () => {
      expectType({ tag: 'textarea', type: '', name: 'email' }, 'email');
    });
  });

  describe('fallbacks', () => {
    it('maps textarea to paragraph', () => {
      expectType({ tag: 'textarea', type: '' }, 'paragraph');
    });

    it('maps contenteditable to paragraph', () => {
      expectType({ tag: 'contenteditable', type: '' }, 'paragraph');
    });

    it('maps select to choice', () => {
      expectType({ tag: 'select', type: '' }, 'choice');
    });

    it('maps a plain input to text', () => {
      expectType({}, 'text');
    });
  });
});
