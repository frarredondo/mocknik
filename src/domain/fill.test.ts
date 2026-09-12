import { describe, expect, it } from 'vitest';
import { makeDescriptor } from '../../test/fakes/descriptor';
import { createInMemoryField } from '../../test/fakes/inMemoryField';
import { fill } from './fill';
import { createRegistry } from './generators/registry';
import type { Clock, FormField, FormScanner, GeneratorSpec } from './ports';
import { createRandom } from './random';
import type { FieldRule, Settings } from './types';

const clock: Clock = { now: () => new Date('2024-01-01T00:00:00.000Z') };

const textSpec: GeneratorSpec<undefined> = {
  fieldType: 'text',
  generate: () => ({ kind: 'text', value: 'generated-text' }),
};

const passwordSpec: GeneratorSpec<undefined> = {
  fieldType: 'password',
  generate: () => ({ kind: 'text', value: 's3cret' }),
};

interface ZipOptions {
  readonly digits?: number;
}

const zipSpec: GeneratorSpec<ZipOptions> = {
  fieldType: 'number',
  parseOptions: (raw) => (typeof raw === 'object' && raw !== null ? (raw as ZipOptions) : undefined),
  generate: (context, options) => {
    const digits = options?.digits ?? 3;
    const value = context.random.int(0, 10 ** digits - 1);
    return { kind: 'text', value: String(value).padStart(digits, '0') };
  },
};

function makeRule(id: string, patterns: readonly string[], overrides: Partial<FieldRule> = {}): FieldRule {
  return {
    id,
    name: id,
    match: { kind: 'contains', patterns, attributes: ['name'] },
    ...overrides,
  };
}

function makeSettings(rules: readonly FieldRule[]): Settings {
  return {
    schemaVersion: 1,
    defaults: { defaultMaxLength: 100, triggerEvents: false },
    match: { attributes: ['name', 'id', 'label'] },
    ignore: { hidden: false, withContent: false, types: [], domains: [] },
    rules,
    profiles: [],
  };
}

function scannerFor(fields: readonly FormField[]): FormScanner {
  return { select: () => [...fields] };
}

function deps(settings: Settings, fields: readonly FormField[]) {
  return {
    scanner: scannerFor(fields),
    registry: createRegistry([textSpec, passwordSpec, zipSpec]),
    random: createRandom(5),
    secureRandom: createRandom(6),
    clock,
    settings,
  };
}

describe('fill', () => {
  it('fills matching fields and leaves others to the classifier and generator', () => {
    const email = createInMemoryField({ name: 'email' });
    const plain = createInMemoryField({ name: 'notes' });
    const settings = makeSettings([
      makeRule('email-rule', ['email'], { value: { kind: 'text', value: 'rule@example.com' } }),
    ]);

    const report = fill('all', deps(settings, [email, plain]));

    expect(email.written()).toEqual({ kind: 'text', value: 'rule@example.com' });
    expect(plain.written()).toEqual({ kind: 'text', value: 'generated-text' });
    expect(report).toEqual({ filled: 2, skipped: 0, errors: 0 });
  });

  it('counts skipped fields without writing a value', () => {
    const skipme = createInMemoryField({ name: 'skipme' });
    const other = createInMemoryField({ name: 'other' });
    const settings = makeSettings([makeRule('skip-rule', ['skipme'], { action: 'skip' })]);

    const report = fill('all', deps(settings, [skipme, other]));

    expect(skipme.writes).toHaveLength(0);
    expect(other.written()).toEqual({ kind: 'text', value: 'generated-text' });
    expect(report).toEqual({ filled: 1, skipped: 1, errors: 0 });
  });

  it('mirrors the last password into a mirror-source password field', () => {
    const password = createInMemoryField({ name: 'password' });
    const confirm = createInMemoryField({ name: 'confirm' });
    const settings = makeSettings([
      makeRule('password-rule', ['password'], { fieldType: 'password' }),
      makeRule('confirm-rule', ['confirm'], { action: 'mirror', mirrorSource: 'previous-password' }),
    ]);

    const report = fill('all', deps(settings, [password, confirm]));

    expect(password.written()).toEqual({ kind: 'text', value: 's3cret' });
    expect(confirm.written()).toEqual({ kind: 'text', value: 's3cret' });
    expect(report).toEqual({ filled: 2, skipped: 0, errors: 0 });
  });

  it('mirrors the previous text by default', () => {
    const first = createInMemoryField({ name: 'first' });
    const confirm = createInMemoryField({ name: 'confirm' });
    const settings = makeSettings([
      makeRule('first-rule', ['first'], { value: { kind: 'text', value: 'Alice' } }),
      makeRule('confirm-rule', ['confirm'], { action: 'mirror' }),
    ]);

    const report = fill('all', deps(settings, [first, confirm]));

    expect(confirm.written()).toEqual({ kind: 'text', value: 'Alice' });
    expect(report).toEqual({ filled: 2, skipped: 0, errors: 0 });
  });

  it('skips a mirror when there is no previous value and writes nothing', () => {
    const confirm = createInMemoryField({ name: 'confirm' });
    const settings = makeSettings([makeRule('confirm-rule', ['confirm'], { action: 'mirror' })]);

    const report = fill('all', deps(settings, [confirm]));

    expect(confirm.writes).toHaveLength(0);
    expect(report).toEqual({ filled: 0, skipped: 1, errors: 0 });
  });

  it('counts write failures and keeps going with the remaining fields', () => {
    const failing: FormField = {
      id: 'failing',
      descriptor: makeDescriptor({ name: 'email' }),
      read: () => ({ kind: 'none' }),
      write: () => {
        throw new Error('write failure');
      },
    };
    const ok = createInMemoryField({ name: 'email' });
    const settings = makeSettings([
      makeRule('email-rule', ['email'], { value: { kind: 'text', value: 'rule@example.com' } }),
    ]);

    const report = fill('all', deps(settings, [failing, ok]));

    expect(ok.written()).toEqual({ kind: 'text', value: 'rule@example.com' });
    expect(report).toEqual({ filled: 1, skipped: 0, errors: 1 });
  });

  it('reports totals across filled, skipped and errored fields', () => {
    const email = createInMemoryField({ name: 'email' });
    const skipme = createInMemoryField({ name: 'skipme' });
    const confirm = createInMemoryField({ name: 'confirm' });
    const settings = makeSettings([
      makeRule('email-rule', ['email'], { value: { kind: 'text', value: 'rule@example.com' } }),
      makeRule('skip-rule', ['skipme'], { action: 'skip' }),
      makeRule('confirm-rule', ['confirm'], { action: 'mirror' }),
    ]);

    const report = fill('all', deps(settings, [confirm, skipme, email]));

    expect(report).toEqual({ filled: 1, skipped: 2, errors: 0 });
  });

  it('flows rule options from settings into the generator', () => {
    const zip = createInMemoryField({ name: 'zip' });
    const settings = makeSettings([makeRule('zip-rule', ['zip'], { options: { digits: 5 } })]);

    const report = fill('all', deps(settings, [zip]));

    const written = zip.written();
    expect(written.kind).toBe('text');
    if (written.kind === 'text') {
      expect(written.value).toMatch(/^\d{5}$/);
    }
    expect(report).toEqual({ filled: 1, skipped: 0, errors: 0 });
  });
});
