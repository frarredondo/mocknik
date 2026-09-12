import { DEFAULT_MATCH_ATTRIBUTES } from '../types';
import type { FieldRule, Settings } from '../types';

/** Current persisted settings schema version. */
export const CURRENT_SCHEMA = 1;

const BUILTIN_RULES: readonly FieldRule[] = [
  {
    id: 'builtin-confirm-password',
    name: 'Confirm password',
    match: {
      kind: 'contains',
      patterns: ['confirm', 'retype', 'repeat', 'secondary'],
      attributes: ['name', 'id', 'label', 'placeholder'],
    },
    action: 'mirror',
    mirrorSource: 'previous-password',
  },
  {
    id: 'builtin-password',
    name: 'Password',
    match: {
      kind: 'contains',
      patterns: ['password', 'passwd', 'pwd'],
      attributes: ['name', 'id', 'label', 'placeholder'],
    },
    fieldType: 'password',
    options: { mode: 'random', length: 12, charset: 'alnum' },
  },
  {
    id: 'builtin-agree-terms',
    name: 'Agree to terms',
    match: {
      kind: 'contains',
      patterns: ['agree', 'terms', 'accept'],
      attributes: ['name', 'id', 'label'],
    },
    fieldType: 'checkbox',
    options: { checked: 'always' },
  },
  {
    id: 'builtin-captcha',
    name: 'Skip captcha',
    match: {
      kind: 'contains',
      patterns: ['captcha', 'recaptcha'],
      attributes: ['name', 'id', 'label', 'placeholder'],
    },
    action: 'skip',
  },
  {
    id: 'builtin-zip',
    name: 'Zip code',
    match: {
      kind: 'contains',
      patterns: ['zip', 'postal'],
      attributes: ['name', 'id', 'label', 'placeholder'],
    },
    fieldType: 'number',
    options: { min: 10000, max: 99999, decimals: 0 },
  },
];

function cloneRules(rules: readonly FieldRule[]): FieldRule[] {
  if (typeof structuredClone === 'function') {
    return structuredClone(rules) as FieldRule[];
  }
  return JSON.parse(JSON.stringify(rules)) as FieldRule[];
}

/** Creates a fresh, deeply independent default settings object on every call. */
export function createDefaultSettings(): Settings {
  return {
    schemaVersion: CURRENT_SCHEMA,
    defaults: {
      defaultMaxLength: 20,
      triggerEvents: true,
    },
    match: {
      attributes: [...DEFAULT_MATCH_ATTRIBUTES],
    },
    ignore: {
      hidden: true,
      withContent: false,
      types: ['button', 'submit', 'reset', 'file', 'hidden', 'image'],
      domains: [],
    },
    rules: cloneRules(BUILTIN_RULES),
    profiles: [],
  };
}
