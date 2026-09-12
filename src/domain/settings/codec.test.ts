import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA, createDefaultSettings } from './defaults';
import { decodeSettings, encodeSettings } from './codec';
import { DEFAULT_MATCH_ATTRIBUTES } from '../types';
import type { DecodeResult } from './codec';
import type { Migration } from './migrations';

interface RawSettings {
  schemaVersion?: unknown;
  defaults?: unknown;
  match?: unknown;
  ignore?: unknown;
  rules?: unknown;
  profiles?: unknown;
  [key: string]: unknown;
}

function validRaw(): RawSettings {
  return {
    schemaVersion: CURRENT_SCHEMA,
    defaults: { defaultMaxLength: 20, triggerEvents: true },
    match: { attributes: [...DEFAULT_MATCH_ATTRIBUTES] },
    ignore: {
      hidden: true,
      withContent: false,
      types: ['button', 'submit', 'reset', 'file', 'hidden', 'image'],
      domains: [],
    },
    rules: [],
    profiles: [],
  };
}

function rawWith(mutate: (raw: RawSettings) => void): RawSettings {
  const raw = validRaw();
  mutate(raw);
  return raw;
}

const validRule = {
  id: 'rule-1',
  name: 'Rule',
  match: { kind: 'contains', patterns: ['foo'], attributes: ['name', 'id'] },
};

function expectFailClosed(raw: unknown): void {
  let result: DecodeResult | undefined;
  expect(() => {
    result = decodeSettings(raw);
  }).not.toThrow();
  expect(result?.ok).toBe(false);
  expect(result?.migrated).toBe(false);
  expect(result?.settings).toEqual(createDefaultSettings());
}

describe('encodeSettings', () => {
  it('returns a JSON-safe deep copy preserving the schema version', () => {
    const settings = createDefaultSettings();
    const encoded = encodeSettings(settings) as {
      schemaVersion: number;
      defaults: { defaultMaxLength: number };
      rules: unknown[];
    };
    expect(encoded).toEqual(settings);
    expect(encoded).not.toBe(settings);
    expect(encoded.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(encoded.rules).not.toBe(settings.rules);
    encoded.defaults.defaultMaxLength = 999;
    expect(settings.defaults.defaultMaxLength).toBe(20);
    expect(JSON.parse(JSON.stringify(encoded))).toEqual({
      ...settings,
      defaults: { ...settings.defaults, defaultMaxLength: 999 },
    });
  });
});

describe('decodeSettings', () => {
  it('round-trips default settings without migrating', () => {
    const settings = createDefaultSettings();
    const decoded = decodeSettings(encodeSettings(settings));
    expect(decoded.ok).toBe(true);
    expect(decoded.migrated).toBe(false);
    expect(decoded.settings).toEqual(settings);
  });

  it('accepts a fully populated valid rule and profile', () => {
    const raw = rawWith((value) => {
      value.rules = [
        {
          ...validRule,
          action: 'fill',
          fieldType: 'email',
          value: { kind: 'text', value: 'user@example.com' },
          template: 'abc',
          options: { min: 1 },
          specificity: 3,
          mirrorSource: 'previous-text',
        },
        { id: 'r2', name: 'Skip', match: { kind: 'regex', patterns: ['^x+$'] }, action: 'skip' },
      ];
      value.profiles = [{ id: 'p1', name: 'Profile', urlMatch: 'https://*', enabled: true, rules: [] }];
    });
    const decoded = decodeSettings(raw);
    expect(decoded.ok).toBe(true);
    expect(decoded.migrated).toBe(false);
    expect(decoded.settings.rules).toHaveLength(2);
  });

  it('accepts every field value kind', () => {
    const values: readonly unknown[] = [
      { kind: 'text', value: 'hello' },
      { kind: 'checked', value: true },
      { kind: 'choice', value: 'a' },
      { kind: 'multiChoice', value: ['a', 'b'] },
      { kind: 'none' },
    ];
    for (const value of values) {
      const raw = rawWith((settings) => {
        settings.rules = [{ ...validRule, value }];
      });
      expect(decodeSettings(raw).ok).toBe(true);
    }
  });

  it('ignores unknown top-level fields', () => {
    const decoded = decodeSettings(rawWith((raw) => { raw.future = { anything: true }; }));
    expect(decoded.ok).toBe(true);
  });

  it('ignores unknown keys inside nested settings objects', () => {
    const decoded = decodeSettings(rawWith((raw) => {
      (raw.defaults as Record<string, unknown>).future = 'yes';
      (raw.match as Record<string, unknown>).future = 1;
      (raw.ignore as Record<string, unknown>).future = true;
    }));
    expect(decoded.ok).toBe(true);
  });

  it('fails closed for non-objects', () => {
    for (const raw of [null, undefined, 0, 42, 'settings', true, false, [], [validRaw()], () => undefined]) {
      expectFailClosed(raw);
    }
  });

  it('fails closed for a missing, non-numeric or out-of-range schemaVersion', () => {
    expectFailClosed({});
    expectFailClosed(rawWith((raw) => { raw.schemaVersion = '1'; }));
    expectFailClosed(rawWith((raw) => { raw.schemaVersion = undefined; }));
    expectFailClosed(rawWith((raw) => { raw.schemaVersion = Number.NaN; }));
    expectFailClosed(rawWith((raw) => { raw.schemaVersion = Number.POSITIVE_INFINITY; }));
    expectFailClosed(rawWith((raw) => { raw.schemaVersion = -1; }));
    expectFailClosed(rawWith((raw) => { raw.schemaVersion = CURRENT_SCHEMA + 1; }));
  });

  it('fails closed for version 0 without migrations', () => {
    expectFailClosed(rawWith((raw) => { raw.schemaVersion = 0; }));
  });

  const invalidNested: readonly (readonly [string, unknown])[] = [
    ['missing defaults', rawWith((raw) => { raw.defaults = undefined; })],
    ['defaults null', rawWith((raw) => { raw.defaults = null; })],
    ['defaults defaultMaxLength zero', rawWith((raw) => {
      (raw.defaults as Record<string, unknown>).defaultMaxLength = 0;
    })],
    ['defaults defaultMaxLength negative', rawWith((raw) => {
      (raw.defaults as Record<string, unknown>).defaultMaxLength = -5;
    })],
    ['defaults defaultMaxLength non-number', rawWith((raw) => {
      (raw.defaults as Record<string, unknown>).defaultMaxLength = '20';
    })],
    ['defaults triggerEvents non-boolean', rawWith((raw) => {
      (raw.defaults as Record<string, unknown>).triggerEvents = 1;
    })],
    ['missing match', rawWith((raw) => { raw.match = undefined; })],
    ['match attributes empty', rawWith((raw) => {
      (raw.match as Record<string, unknown>).attributes = [];
    })],
    ['match attributes non-array', rawWith((raw) => {
      (raw.match as Record<string, unknown>).attributes = 'name';
    })],
    ['match attributes invalid entry', rawWith((raw) => {
      (raw.match as Record<string, unknown>).attributes = ['name', 'nope'];
    })],
    ['missing ignore', rawWith((raw) => { raw.ignore = undefined; })],
    ['ignore hidden non-boolean', rawWith((raw) => {
      (raw.ignore as Record<string, unknown>).hidden = 'yes';
    })],
    ['ignore withContent non-boolean', rawWith((raw) => {
      (raw.ignore as Record<string, unknown>).withContent = 'no';
    })],
    ['ignore types non-array', rawWith((raw) => {
      (raw.ignore as Record<string, unknown>).types = 'hidden';
    })],
    ['ignore types non-string entry', rawWith((raw) => {
      (raw.ignore as Record<string, unknown>).types = [1];
    })],
    ['ignore domains non-string entry', rawWith((raw) => {
      (raw.ignore as Record<string, unknown>).domains = [null];
    })],
    ['profiles non-array', rawWith((raw) => { raw.profiles = {}; })],
    ['profile missing fields', rawWith((raw) => { raw.profiles = [{ id: 'p1' }]; })],
    ['profile enabled non-boolean', rawWith((raw) => {
      raw.profiles = [{ id: 'p1', name: 'P', urlMatch: '*', enabled: 'yes', rules: [] }];
    })],
    ['profile rules non-array', rawWith((raw) => {
      raw.profiles = [{ id: 'p1', name: 'P', urlMatch: '*', enabled: true, rules: {} }];
    })],
    ['rules non-array', rawWith((raw) => { raw.rules = {}; })],
    ['rule non-object', rawWith((raw) => { raw.rules = ['nope']; })],
    ['rule missing id', rawWith((raw) => {
      raw.rules = [{ name: 'Rule', match: { kind: 'contains', patterns: ['foo'] } }];
    })],
    ['rule non-string name', rawWith((raw) => {
      raw.rules = [{ ...validRule, name: 7 }];
    })],
    ['rule missing match', rawWith((raw) => {
      raw.rules = [{ id: 'r', name: 'Rule' }];
    })],
    ['rule match null', rawWith((raw) => {
      raw.rules = [{ ...validRule, match: null }];
    })],
    ['rule match kind invalid', rawWith((raw) => {
      raw.rules = [{ ...validRule, match: { kind: 'fuzzy', patterns: ['foo'] } }];
    })],
    ['rule match patterns empty', rawWith((raw) => {
      raw.rules = [{ ...validRule, match: { kind: 'contains', patterns: [] } }];
    })],
    ['rule match patterns non-string entry', rawWith((raw) => {
      raw.rules = [{ ...validRule, match: { kind: 'contains', patterns: [1] } }];
    })],
    ['rule match attributes invalid entry', rawWith((raw) => {
      raw.rules = [{ ...validRule, match: { kind: 'contains', patterns: ['foo'], attributes: ['nope'] } }];
    })],
    ['rule action invalid', rawWith((raw) => {
      raw.rules = [{ ...validRule, action: 'destroy' }];
    })],
    ['rule fieldType invalid', rawWith((raw) => {
      raw.rules = [{ ...validRule, fieldType: 'wibble' }];
    })],
    ['rule value missing payload', rawWith((raw) => {
      raw.rules = [{ ...validRule, value: { kind: 'text' } }];
    })],
    ['rule value wrong payload', rawWith((raw) => {
      raw.rules = [{ ...validRule, value: { kind: 'checked', value: 'yes' } }];
    })],
    ['rule value invalid kind', rawWith((raw) => {
      raw.rules = [{ ...validRule, value: { kind: 'wibble' } }];
    })],
    ['rule value multiChoice non-string entry', rawWith((raw) => {
      raw.rules = [{ ...validRule, value: { kind: 'multiChoice', value: [1] } }];
    })],
    ['rule template non-string', rawWith((raw) => {
      raw.rules = [{ ...validRule, template: 42 }];
    })],
    ['rule options array', rawWith((raw) => {
      raw.rules = [{ ...validRule, options: [] }];
    })],
    ['rule options null', rawWith((raw) => {
      raw.rules = [{ ...validRule, options: null }];
    })],
    ['rule specificity non-number', rawWith((raw) => {
      raw.rules = [{ ...validRule, specificity: 'high' }];
    })],
    ['rule mirrorSource invalid', rawWith((raw) => {
      raw.rules = [{ ...validRule, mirrorSource: 'previous-nope' }];
    })],
  ];

  for (const [label, raw] of invalidNested) {
    it(`fails closed for ${label}`, () => {
      expectFailClosed(raw);
    });
  }

  it('fails closed instead of dropping an invalid rule', () => {
    const raw = rawWith((value) => {
      value.rules = [validRule, { id: 'bad', name: 'Bad', match: { kind: 'contains', patterns: [] } }];
    });
    expectFailClosed(raw);
  });

  it('migrates a version 0 blob through an injected migration', () => {
    const legacy = rawWith((raw) => {
      raw.schemaVersion = 0;
    });
    const migration: Migration = {
      to: 1,
      migrate: (previous) => ({ ...(previous as Record<string, unknown>), schemaVersion: 1, migratedBy: 'test' }),
    };
    const decoded = decodeSettings(legacy, [migration]);
    expect(decoded.ok).toBe(true);
    expect(decoded.migrated).toBe(true);
    expect(decoded.settings.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(decoded.settings.profiles).toEqual([]);
    expect((decoded.settings as unknown as Record<string, unknown>).migratedBy).toBe('test');
  });

  it('fails closed when a migration throws', () => {
    const legacy = rawWith((raw) => {
      raw.schemaVersion = 0;
    });
    const migration: Migration = {
      to: 1,
      migrate: () => {
        throw new Error('boom');
      },
    };
    const result = decodeSettings(legacy, [migration]);
    expect(result.ok).toBe(false);
    expect(result.migrated).toBe(false);
    expect(result.settings).toEqual(createDefaultSettings());
  });

  it('fails closed when a migration produces an invalid blob', () => {
    const legacy = rawWith((raw) => {
      raw.schemaVersion = 0;
    });
    const migration: Migration = {
      to: 1,
      migrate: () => ({ schemaVersion: 1 }),
    };
    const result = decodeSettings(legacy, [migration]);
    expect(result.ok).toBe(false);
    expect(result.migrated).toBe(false);
    expect(result.settings).toEqual(createDefaultSettings());
  });

  it('uses the shipped migrations when none are injected', () => {
    const decoded = decodeSettings(validRaw());
    expect(decoded.ok).toBe(true);
    expect(decoded.migrated).toBe(false);
  });
});
