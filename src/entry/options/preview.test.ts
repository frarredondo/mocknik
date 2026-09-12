import { describe, expect, it } from 'vitest';
import { systemClock } from '../../domain/clock';
import { createDefaultRegistry } from '../../domain/generators/defaultRegistry';
import { createRandom } from '../../domain/random';
import { expandTemplate } from '../../domain/templates';
import type { FieldDescriptor, FieldRule, FieldType } from '../../domain/types';
import type { PreviewDeps } from './preview';
import { previewRule, previewSeed } from './preview';

const registry = createDefaultRegistry();

function deps(seed = 0): PreviewDeps {
  return {
    registry,
    random: createRandom(seed),
    secureRandom: createRandom(seed),
    clock: systemClock,
  };
}

function rule(overrides: Partial<FieldRule> = {}): FieldRule {
  return {
    id: 'rule-email',
    name: 'Email',
    match: { kind: 'contains', patterns: ['email'] },
    ...overrides,
  };
}

const descriptor: FieldDescriptor = {
  tag: 'input',
  type: 'email',
  name: 'email',
  id: 'email',
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

describe('previewSeed', () => {
  it('is stable for the same id and differs between ids', () => {
    expect(previewSeed(rule({ id: 'alpha' }))).toBe(previewSeed(rule({ id: 'alpha' })));
    expect(previewSeed(rule({ id: 'alpha' }))).not.toBe(previewSeed(rule({ id: 'beta' })));
  });

  it('never throws for a sparse rule', () => {
    expect(() => previewSeed({ id: 'x' } as FieldRule)).not.toThrow();
    expect(() => previewSeed({} as FieldRule)).not.toThrow();
  });
});

describe('previewRule — explanations', () => {
  it('explains skip', () => {
    expect(previewRule(rule({ action: 'skip' }), deps())).toEqual({
      kind: 'explanation',
      text: 'Leaves the field untouched — no value is written.',
    });
  });

  it('explains mirror from a previous password field', () => {
    expect(previewRule(rule({ action: 'mirror', mirrorSource: 'previous-password' }), deps())).toEqual(
      {
        kind: 'explanation',
        text: 'Copies whatever was typed into the previous password field.',
      },
    );
  });

  it('explains mirror from a previous text field when unset or explicit', () => {
    const expected = {
      kind: 'explanation',
      text: 'Copies whatever was typed into the previous text field.',
    };
    expect(previewRule(rule({ action: 'mirror' }), deps())).toEqual(expected);
    expect(previewRule(rule({ action: 'mirror', mirrorSource: 'previous-text' }), deps())).toEqual(
      expected,
    );
  });
});

describe('previewRule — fill precedence', () => {
  it('generates a value for an email field with a Generated note', () => {
    const preview = previewRule(rule({ fieldType: 'email' }), deps());
    expect(preview.kind).toBe('value');
    expect(preview.text).toMatch(/\S+@\S+\.\S+/);
    expect(preview.note).toBe('Generated email');
  });

  it('prefers a literal value over template and generator', () => {
    const preview = previewRule(
      rule({
        fieldType: 'email',
        template: 'llll',
        value: { kind: 'text', value: 'literal@example.com' },
      }),
      deps(),
    );
    expect(preview).toEqual({ kind: 'value', text: 'literal@example.com', note: 'Literal value' });
  });

  it('describes a non-text literal value', () => {
    const preview = previewRule(rule({ value: { kind: 'checked', value: true } }), deps());
    expect(preview.kind).toBe('explanation');
    expect(preview.note).toBe('Literal value');
    expect(preview.text.toLowerCase()).toContain('checked');
  });

  it('prefers a template over the generator and expands it deterministically', () => {
    const target = rule({ fieldType: 'email', template: 'llll-xxxx' });
    const first = previewRule(target, deps(1));
    const second = previewRule(target, deps(999));
    expect(first).toEqual({
      kind: 'value',
      text: expandTemplate(createRandom(previewSeed(target)), 'llll-xxxx'),
      note: 'From template',
    });
    expect(second.text).toBe(first.text);
  });

  it('falls back to generator defaults when options are malformed', () => {
    const preview = previewRule(
      rule({ fieldType: 'email', options: { local: 42, literal: 'ok' } }),
      deps(),
    );
    expect(preview.kind).toBe('value');
    expect(preview.text).toMatch(/\S+@\S+\.\S+/);
    expect(preview.note).toBe('Generated email');
  });

  it('honours well-formed generator options', () => {
    const preview = previewRule(
      rule({ fieldType: 'email', options: { local: 'literal', literal: 'bob' } }),
      deps(),
    );
    expect(preview.kind).toBe('value');
    expect(preview.text.startsWith('bob@')).toBe(true);
  });

  it('defaults a missing fieldType to text with an inferred note', () => {
    const preview = previewRule(rule(), deps());
    expect(preview.kind).toBe('value');
    expect(preview.text.length).toBeGreaterThan(0);
    expect(preview.note).toContain('inferred');
  });

  it('returns a graceful explanation for a non-text generator value', () => {
    const preview = previewRule(rule({ fieldType: 'choice' }), deps());
    expect(preview.kind).toBe('explanation');
    expect(preview.text).toContain('choice');
    expect(preview.text).toContain('field options');
  });
});

describe('previewRule — totality', () => {
  it('never throws for sparse or unknown rules and never emits undefined text', () => {
    for (const sparse of [
      { id: 'sparse' } as FieldRule,
      { id: '' } as FieldRule,
      rule({ fieldType: 'bogus' as FieldType }),
      rule({ options: null as unknown as Record<string, unknown> }),
      rule({ template: undefined, value: undefined, action: undefined }),
    ]) {
      let preview: ReturnType<typeof previewRule> | undefined;
      expect(() => {
        preview = previewRule(sparse, deps());
      }).not.toThrow();
      expect(typeof preview?.text).toBe('string');
      expect(preview?.text).toBeTruthy();
    }
  });
});

describe('previewRule — parity with the live generator', () => {
  it('produces exactly what the registry generator produces for the same seed', () => {
    const target = rule({ fieldType: 'email' });
    const seed = previewSeed(target);
    const spec = registry.get('email');
    expect(spec).toBeDefined();
    if (spec === undefined) return;

    const generated = spec.generate(
      {
        descriptor,
        fieldType: 'email',
        random: createRandom(seed),
        secureRandom: createRandom(seed),
        clock: systemClock,
      },
      spec.parseOptions?.(target.options),
    );

    const preview = previewRule(target, {
      registry,
      random: createRandom(seed),
      secureRandom: createRandom(seed),
      clock: systemClock,
    });

    expect(generated.kind).toBe('text');
    expect(preview.kind).toBe('value');
    expect(preview.text).toBe(generated.kind === 'text' ? generated.value : '');
  });
});
