import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA, createDefaultSettings } from './defaults';
import {
  DEFAULT_MATCH_ATTRIBUTES,
  FIELD_TYPES,
  MATCH_KINDS,
  MIRROR_SOURCES,
  RULE_ACTIONS,
} from '../types';
import type { FieldRule, MatchAttribute } from '../types';

interface MutableSettings {
  schemaVersion: number;
  defaults: { defaultMaxLength: number; triggerEvents: boolean };
  match: { attributes: MatchAttribute[] };
  ignore: { hidden: boolean; withContent: boolean; types: string[]; domains: string[] };
  rules: FieldRule[];
  profiles: unknown[];
}

function mutable(settings: ReturnType<typeof createDefaultSettings>): MutableSettings {
  return settings as unknown as MutableSettings;
}

describe('createDefaultSettings', () => {
  it('returns the current schema version and default settings', () => {
    const settings = createDefaultSettings();
    expect(settings.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(settings.defaults).toEqual({
      defaultMaxLength: 20,
      triggerEvents: true,
    });
    expect(settings.match.attributes).toEqual([...DEFAULT_MATCH_ATTRIBUTES]);
    expect(settings.ignore).toEqual({
      hidden: true,
      withContent: false,
      types: ['button', 'submit', 'reset', 'file', 'hidden', 'image'],
      domains: [],
    });
    expect(settings.profiles).toEqual([]);
    expect(settings.rules.length).toBeGreaterThan(0);
  });

  it('ships the built-in rules in stable order with stable ids', () => {
    const ids = createDefaultSettings().rules.map((rule) => rule.id);
    expect(ids).toEqual([
      'builtin-confirm-password',
      'builtin-password',
      'builtin-agree-terms',
      'builtin-captcha',
      'builtin-zip',
    ]);
    expect(createDefaultSettings().rules.map((rule) => rule.id)).toEqual(ids);
  });

  it('gives every rule a unique id', () => {
    const ids = createDefaultSettings().rules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces structurally valid rules', () => {
    for (const rule of createDefaultSettings().rules) {
      expect(rule.id.length).toBeGreaterThan(0);
      expect(rule.name.length).toBeGreaterThan(0);
      expect(MATCH_KINDS).toContain(rule.match.kind);
      expect(rule.match.patterns.length).toBeGreaterThan(0);
      for (const pattern of rule.match.patterns) {
        expect(typeof pattern).toBe('string');
      }
      if (rule.action !== undefined) {
        expect(RULE_ACTIONS).toContain(rule.action);
      }
      if (rule.fieldType !== undefined) {
        expect(FIELD_TYPES).toContain(rule.fieldType);
      }
      if (rule.mirrorSource !== undefined) {
        expect(MIRROR_SOURCES).toContain(rule.mirrorSource);
      }
    }
  });

  it('declares the confirm-password rule before the password rule', () => {
    const rules = createDefaultSettings().rules;
    const confirm = rules.find((rule) => rule.id === 'builtin-confirm-password');
    const password = rules.find((rule) => rule.id === 'builtin-password');
    expect(confirm?.action).toBe('mirror');
    expect(confirm?.mirrorSource).toBe('previous-password');
    expect(confirm?.match.patterns).toEqual(['confirm', 'retype', 'repeat', 'secondary']);
    expect(password?.fieldType).toBe('password');
    expect(password?.options).toEqual({ mode: 'random', length: 12, charset: 'alnum' });
    expect(rules.indexOf(confirm as FieldRule)).toBeLessThan(rules.indexOf(password as FieldRule));
  });

  it('declares the agree-terms, captcha and zip rules', () => {
    const rules = createDefaultSettings().rules;
    const agree = rules.find((rule) => rule.id === 'builtin-agree-terms');
    const captcha = rules.find((rule) => rule.id === 'builtin-captcha');
    const zip = rules.find((rule) => rule.id === 'builtin-zip');
    expect(agree?.fieldType).toBe('checkbox');
    expect(agree?.options).toEqual({ checked: 'always' });
    expect(captcha?.action).toBe('skip');
    expect(captcha?.match.patterns).toEqual(['captcha', 'recaptcha']);
    expect(zip?.fieldType).toBe('number');
    expect(zip?.options).toEqual({ min: 10000, max: 99999, decimals: 0 });
  });

  it('copies the default match attributes instead of sharing them', () => {
    const settings = createDefaultSettings();
    expect(settings.match.attributes).not.toBe(DEFAULT_MATCH_ATTRIBUTES);
    mutable(settings).match.attributes.push('class');
    expect(DEFAULT_MATCH_ATTRIBUTES).not.toContain('class');
  });

  it('returns independent objects on every call', () => {
    const first = mutable(createDefaultSettings());
    const second = createDefaultSettings();
    first.defaults.defaultMaxLength = 99;
    first.match.attributes.push('class');
    first.ignore.types.push('custom');
    first.rules.push({
      id: 'extra',
      name: 'Extra',
      match: { kind: 'contains', patterns: ['x'] },
    });
    const firstRule = first.rules[0];
    expect(firstRule).toBeDefined();
    (firstRule?.match.patterns as string[]).push('mutated');
    (firstRule?.match.attributes as MatchAttribute[] | undefined)?.push('class');

    expect(second).toEqual(createDefaultSettings());
    expect(first.rules.map((rule) => rule.id)).not.toEqual(second.rules.map((rule) => rule.id));
  });
});
