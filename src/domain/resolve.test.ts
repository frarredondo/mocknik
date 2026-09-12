import { describe, expect, it } from 'vitest';
import { createInMemoryField } from '../../test/fakes/inMemoryField';
import { createRegistry } from './generators/registry';
import type { Clock, FormField, GeneratorSpec } from './ports';
import { createRandom } from './random';
import { layersFromSettings, resolveField } from './resolve';
import type { FieldResolution, FieldRule, RuleLayer, Settings } from './types';

const clock: Clock = { now: () => new Date('2024-01-01T00:00:00.000Z') };

const textSpec: GeneratorSpec<undefined> = {
  fieldType: 'text',
  generate: () => ({ kind: 'text', value: 'generated-text' }),
};

const emailSpec: GeneratorSpec<undefined> = {
  fieldType: 'email',
  generate: () => ({ kind: 'text', value: 'generated@example.com' }),
};

interface NumberOptions {
  readonly digits?: number;
  readonly min?: number;
  readonly type?: string;
}

const numberSpec: GeneratorSpec<NumberOptions> = {
  fieldType: 'number',
  parseOptions: (raw) => (typeof raw === 'object' && raw !== null ? (raw as NumberOptions) : undefined),
  generate: (_context, options) => ({
    kind: 'text',
    value: `num:${options?.digits ?? 0}:${options?.min ?? 0}:${options?.type ?? 'none'}`,
  }),
};

const registry = createRegistry([textSpec, emailSpec, numberSpec]);

function makeRule(id: string, patterns: readonly string[], overrides: Partial<FieldRule> = {}): FieldRule {
  return {
    id,
    name: id,
    match: { kind: 'contains', patterns, attributes: ['name'] },
    ...overrides,
  };
}

function resolve(field: FormField, layers: readonly RuleLayer[]): FieldResolution {
  return resolveField(field, layers, registry, createRandom(11), createRandom(22), clock);
}

describe('resolveField value sources', () => {
  it('prefers a literal value over template and generator', () => {
    const field = createInMemoryField({ name: 'email' });
    const layers: RuleLayer[] = [
      {
        id: 'layer',
        rules: [
          makeRule('literal', ['email'], {
            fieldType: 'email',
            template: 'VVVV',
            value: { kind: 'text', value: 'literal' },
          }),
        ],
      },
    ];
    const result = resolve(field, layers);
    expect(result.value).toEqual({ kind: 'text', value: 'literal' });
  });

  it('expands the template when no literal value is set', () => {
    const field = createInMemoryField({ name: 'email' });
    const layers: RuleLayer[] = [
      { id: 'layer', rules: [makeRule('template', ['email'], { fieldType: 'email', template: 'VVVV' })] },
    ];
    const result = resolve(field, layers);
    expect(result.value.kind).toBe('text');
    if (result.value.kind === 'text') {
      expect(result.value.value).toMatch(/^[AEIOU]{4}$/);
    }
  });

  it('falls back to the generator when neither value nor template is set', () => {
    const field = createInMemoryField({ name: 'email' });
    const layers: RuleLayer[] = [
      { id: 'layer', rules: [makeRule('generator', ['email'], { fieldType: 'email' })] },
    ];
    const result = resolve(field, layers);
    expect(result.value).toEqual({ kind: 'text', value: 'generated@example.com' });
  });

  it('returns none when no generator is registered', () => {
    const field = createInMemoryField({ name: 'color' });
    const result = resolve(field, []);
    expect(result).toEqual({
      fieldType: 'color',
      action: 'fill',
      value: { kind: 'none' },
      trace: [],
    });
  });
});

describe('resolveField actions', () => {
  it('returns skip with no value', () => {
    const field = createInMemoryField({ name: 'email' });
    const layers: RuleLayer[] = [
      { id: 'layer', rules: [makeRule('skip', ['email'], { action: 'skip', fieldType: 'email' })] },
    ];
    const result = resolve(field, layers);
    expect(result.fieldType).toBe('email');
    expect(result.action).toBe('skip');
    expect(result.value).toEqual({ kind: 'none' });
    expect(result.trace).toEqual(['skip']);
  });

  it('defaults mirror to previous-text', () => {
    const field = createInMemoryField({ name: 'confirm' });
    const layers: RuleLayer[] = [
      { id: 'layer', rules: [makeRule('mirror', ['confirm'], { action: 'mirror' })] },
    ];
    const result = resolve(field, layers);
    expect(result.action).toBe('mirror');
    expect(result.mirrorSource).toBe('previous-text');
    expect(result.value).toEqual({ kind: 'none' });
  });

  it('honours an explicit mirror source', () => {
    const field = createInMemoryField({ name: 'confirm' });
    const layers: RuleLayer[] = [
      {
        id: 'layer',
        rules: [makeRule('mirror', ['confirm'], { action: 'mirror', mirrorSource: 'previous-password' })],
      },
    ];
    const result = resolve(field, layers);
    expect(result.mirrorSource).toBe('previous-password');
  });

  it('overrides the classified field type', () => {
    const field = createInMemoryField({ name: 'user_field' });
    const layers: RuleLayer[] = [
      { id: 'layer', rules: [makeRule('typed', ['user_field'], { fieldType: 'email' })] },
    ];
    const result = resolve(field, layers);
    expect(result.fieldType).toBe('email');
    expect(result.value).toEqual({ kind: 'text', value: 'generated@example.com' });
  });
});

describe('resolveField layers', () => {
  it('lets the first matching layer supply action and field type', () => {
    const field = createInMemoryField({ name: 'email' });
    const layers: RuleLayer[] = [
      { id: 'field', rules: [makeRule('field-rule', ['email'])] },
      {
        id: 'profile',
        rules: [makeRule('profile-rule', ['email'], { action: 'skip', fieldType: 'username' })],
      },
    ];
    const result = resolve(field, layers);
    expect(result.action).toBe('fill');
    expect(result.fieldType).toBe('email');
    expect(result.trace).toEqual(['field-rule', 'profile-rule']);
  });

  it('collects winners from every matching layer in order', () => {
    const field = createInMemoryField({ name: 'email' });
    const layers: RuleLayer[] = [
      { id: 'a', rules: [makeRule('a1', ['email'])] },
      { id: 'b', rules: [makeRule('b1', ['email'])] },
    ];
    expect(resolve(field, layers).trace).toEqual(['a1', 'b1']);
  });

  it('omits non-matching layers from the trace', () => {
    const field = createInMemoryField({ name: 'email' });
    const layers: RuleLayer[] = [
      { id: 'a', rules: [makeRule('a1', ['email'])] },
      { id: 'b', rules: [makeRule('b1', ['nope'])] },
      { id: 'c', rules: [makeRule('c1', ['email'])] },
    ];
    expect(resolve(field, layers).trace).toEqual(['a1', 'c1']);
  });

  it('breaks ties in favour of the last declared rule', () => {
    const field = createInMemoryField({ name: 'email' });
    const layers: RuleLayer[] = [
      {
        id: 'layer',
        rules: [
          makeRule('first', ['email'], { value: { kind: 'text', value: 'first' } }),
          makeRule('second', ['email'], { value: { kind: 'text', value: 'second' } }),
        ],
      },
    ];
    expect(resolve(field, layers).value).toEqual({ kind: 'text', value: 'second' });
  });

  it('merges options from least-specific to most-specific', () => {
    const field = createInMemoryField({ name: 'zip' });
    const layers: RuleLayer[] = [
      { id: 'field', rules: [makeRule('field-rule', ['zip'], { options: { min: 1 } })] },
      {
        id: 'profile',
        rules: [makeRule('profile-rule', ['zip'], { options: { type: 'number', min: 9 } })],
      },
    ];
    const result = resolve(field, layers);
    expect(result.fieldType).toBe('number');
    expect(result.value).toEqual({ kind: 'text', value: 'num:0:1:number' });
  });

  it('passes an empty options object when no winner has options', () => {
    const field = createInMemoryField({ name: 'zip' });
    const layers: RuleLayer[] = [{ id: 'field', rules: [makeRule('field-rule', ['zip'])] }];
    expect(resolve(field, layers).value).toEqual({ kind: 'text', value: 'num:0:0:none' });
  });
});

describe('resolveField robustness', () => {
  it('uses the classified type and generator defaults when nothing matches', () => {
    const field = createInMemoryField({ name: 'email' });
    const result = resolve(field, []);
    expect(result).toEqual({
      fieldType: 'email',
      action: 'fill',
      value: { kind: 'text', value: 'generated@example.com' },
      trace: [],
    });
  });

  it('never throws when a generator throws', () => {
    const throwing = createRegistry([
      {
        fieldType: 'email',
        generate: () => {
          throw new Error('boom');
        },
      },
    ]);
    const field = createInMemoryField({ name: 'email' });
    const outcome = resolveField(field, [], throwing, createRandom(1), createRandom(2), clock);
    expect(outcome.value).toEqual({ kind: 'none' });
  });
});

describe('layersFromSettings', () => {
  it('creates one global layer that injects match attributes', () => {
    const inherited: FieldRule = {
      id: 'inherited',
      name: 'inherited',
      match: { kind: 'contains', patterns: ['email'] },
    };
    const explicit = makeRule('explicit', ['email'], {
      match: { kind: 'exact', patterns: ['email'], attributes: ['id'] },
    });
    const settings: Settings = {
      schemaVersion: 1,
      defaults: { defaultMaxLength: 120, triggerEvents: true },
      match: { attributes: ['label', 'name'] },
      ignore: { hidden: true, withContent: false, types: [], domains: [] },
      rules: [inherited, explicit],
      profiles: [],
    };

    const layers = layersFromSettings(settings);
    expect(layers).toHaveLength(1);
    expect(layers[0]?.id).toBe('global');
    expect(layers[0]?.rules).toHaveLength(2);
    expect(layers[0]?.rules[0]?.match.attributes).toEqual(['label', 'name']);
    expect(layers[0]?.rules[0]).not.toBe(inherited);
    expect(layers[0]?.rules[1]).toBe(explicit);
  });
});
