import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeSettings } from '../../domain/settings/codec';
import { createDefaultSettings } from '../../domain/settings/defaults';
import type { SettingsRepository } from '../../domain/ports';
import { FIELD_TYPES, MATCH_KINDS, RULE_ACTIONS } from '../../domain/types';
import type { Settings } from '../../domain/types';
import { createOptionsApp } from './index';
import type { OptionsApp } from './index';
import { action, field } from './view';

function customSettings(): Settings {
  const base = createDefaultSettings();
  return {
    ...base,
    defaults: { ...base.defaults, defaultMaxLength: 33, triggerEvents: false },
    ignore: {
      ...base.ignore,
      hidden: false,
      withContent: true,
      types: ['button', 'submit'],
      domains: ['example.com', 'other.test'],
    },
    match: { attributes: ['name', 'id'] },
    rules: [
      {
        id: 'rule-a',
        name: 'Alpha',
        match: { kind: 'contains', patterns: ['alpha', 'first'], attributes: ['name'] },
        action: 'fill',
        fieldType: 'email',
        value: { kind: 'text', value: 'literal' },
        options: { mode: 'random' },
      },
      {
        id: 'rule-b',
        name: 'Beta',
        match: { kind: 'exact', patterns: ['beta'] },
        action: 'skip',
      },
    ],
  };
}

function createFakeRepository(initial: Settings) {
  const save = vi.fn(async (_settings: Settings): Promise<void> => {});
  const repository: SettingsRepository = {
    load: async () => initial,
    save,
    subscribe: () => () => {},
  };
  return { repository, save };
}

async function mount(initial: Settings = customSettings()) {
  const root = document.createElement('div');
  document.body.append(root);
  const { repository, save } = createFakeRepository(initial);
  const app: OptionsApp = createOptionsApp(root, repository);
  await app.mount();
  return { app, root, save };
}

async function mountWithFakeFile(contents: string) {
  const mounted = await mount();
  const input = field(mounted.root, 'importFile') as HTMLInputElement;
  const file = { text: async () => contents };
  Object.defineProperty(input, 'files', { value: [file] });
  input.dispatchEvent(new Event('change'));
  return mounted;
}

function statusText(root: HTMLElement): string {
  return field(root, 'status')?.textContent ?? '';
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createOptionsApp', () => {
  it('mounts sections and current values', async () => {
    const { root } = await mount();

    expect(root.querySelector('h1')?.textContent).toBe('Mocknik');
    expect(root.querySelector('[data-section="general"]')).not.toBeNull();
    expect(root.querySelector('[data-section="rules"]')).not.toBeNull();
    expect(root.querySelector('[data-section="backup"]')).not.toBeNull();

    expect((field(root, 'defaultMaxLength') as HTMLInputElement).value).toBe('33');
    expect((field(root, 'triggerEvents') as HTMLInputElement).checked).toBe(false);
    expect((field(root, 'ignoreWithContent') as HTMLInputElement).checked).toBe(true);
    expect((field(root, 'ignoreHidden') as HTMLInputElement).checked).toBe(false);
    expect((field(root, 'ignoredTypes') as HTMLInputElement).value).toBe('button, submit');
    expect((field(root, 'ignoredDomains') as HTMLTextAreaElement).value).toBe(
      'example.com\nother.test',
    );
    expect((field(root, 'matchAttributes') as HTMLInputElement).value).toBe('name, id');

    const rows = root.querySelectorAll<HTMLElement>('[data-rule-index]');
    expect(rows).toHaveLength(2);

    const first = rows[0] as HTMLElement;
    expect((field(first, 'rule-name') as HTMLInputElement).value).toBe('Alpha');
    expect((field(first, 'rule-kind') as HTMLSelectElement).value).toBe('contains');
    expect((field(first, 'rule-patterns') as HTMLInputElement).value).toBe('alpha, first');
    expect((field(first, 'rule-attributes') as HTMLInputElement).value).toBe('name');
    expect((field(first, 'rule-action') as HTMLInputElement).value).toBe('fill');
    expect((field(first, 'rule-fieldType') as HTMLSelectElement).value).toBe('email');
    expect((field(first, 'rule-value') as HTMLInputElement).value).toBe('literal');
    expect((field(first, 'rule-template') as HTMLInputElement).value).toBe('');
    expect((field(first, 'rule-options') as HTMLTextAreaElement).value).toBe(
      JSON.stringify({ mode: 'random' }, null, 2),
    );

    const kindSelect = field(first, 'rule-kind') as HTMLSelectElement;
    expect(Array.from(kindSelect.options).map((option) => option.value)).toEqual([...MATCH_KINDS]);
    const actionInput = field(first, 'rule-action') as HTMLInputElement;
    expect(actionInput.type).toBe('hidden');
    const actionRadios = Array.from(
      first.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    );
    expect(actionRadios.map((radio) => radio.value)).toEqual([...RULE_ACTIONS]);
    expect(actionRadios.find((radio) => radio.checked)?.value).toBe('fill');
    const fieldTypeSelect = field(first, 'rule-fieldType') as HTMLSelectElement;
    expect(fieldTypeSelect.options[0]?.value).toBe('');
    expect(Array.from(fieldTypeSelect.options).slice(1).map((option) => option.value)).toEqual([
      ...FIELD_TYPES,
    ]);
  });

  it('saves edits from the general section', async () => {
    const { app, root, save } = await mount();

    (field(root, 'defaultMaxLength') as HTMLInputElement).value = '42';
    (field(root, 'triggerEvents') as HTMLInputElement).checked = true;
    (field(root, 'ignoreWithContent') as HTMLInputElement).checked = true;
    (field(root, 'ignoreHidden') as HTMLInputElement).checked = false;
    (field(root, 'ignoredTypes') as HTMLInputElement).value = 'button, hidden';
    (field(root, 'ignoredDomains') as HTMLTextAreaElement).value = 'a.test\nb.test';
    (field(root, 'matchAttributes') as HTMLInputElement).value = 'name, placeholder';

    action(root, 'save')?.click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());

    const saved = save.mock.calls[0]?.[0];
    expect(saved?.defaults.defaultMaxLength).toBe(42);
    expect(saved?.defaults.triggerEvents).toBe(true);
    expect(saved?.ignore.withContent).toBe(true);
    expect(saved?.ignore.hidden).toBe(false);
    expect(saved?.ignore.types).toEqual(['button', 'hidden']);
    expect(saved?.ignore.domains).toEqual(['a.test', 'b.test']);
    expect(saved?.match.attributes).toEqual(['name', 'placeholder']);
    expect(app.getSettings().defaults.defaultMaxLength).toBe(42);
    await vi.waitFor(() => expect(statusText(root)).toContain('Saved'));
  });

  it('saves edits from a rule row', async () => {
    const { root, save } = await mount();
    const row = root.querySelector<HTMLElement>('[data-rule-index="0"]') as HTMLElement;

    (field(row, 'rule-name') as HTMLInputElement).value = 'Renamed';
    (field(row, 'rule-kind') as HTMLSelectElement).value = 'glob';
    (field(row, 'rule-patterns') as HTMLInputElement).value = 'one, two';
    (field(row, 'rule-attributes') as HTMLInputElement).value = '';
    (field(row, 'rule-action') as HTMLSelectElement).value = 'mirror';
    (field(row, 'rule-fieldType') as HTMLSelectElement).value = 'username';
    (field(row, 'rule-value') as HTMLInputElement).value = 'fixed';
    (field(row, 'rule-template') as HTMLInputElement).value = 'user-####';
    (field(row, 'rule-options') as HTMLTextAreaElement).value = '{ "level": 3 }';

    action(root, 'save')?.click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());

    const rule = save.mock.calls[0]?.[0]?.rules[0];
    expect(rule?.name).toBe('Renamed');
    expect(rule?.match.kind).toBe('glob');
    expect(rule?.match.patterns).toEqual(['one', 'two']);
    expect(rule?.match.attributes).toBeUndefined();
    expect(rule?.action).toBe('mirror');
    expect(rule?.fieldType).toBe('username');
    expect(rule?.value).toEqual({ kind: 'text', value: 'fixed' });
    expect(rule?.template).toBe('user-####');
    expect(rule?.options).toEqual({ level: 3 });
  });

  it('blocks save and reports an error when the max length is not positive', async () => {
    const { root, save } = await mount();

    (field(root, 'defaultMaxLength') as HTMLInputElement).value = '0';
    action(root, 'save')?.click();

    await vi.waitFor(() => expect(statusText(root)).not.toBe(''));
    expect(save).not.toHaveBeenCalled();
  });

  it('blocks save when the options are not valid JSON', async () => {
    const { root, save } = await mount();
    const row = root.querySelector<HTMLElement>('[data-rule-index="0"]') as HTMLElement;

    (field(row, 'rule-options') as HTMLTextAreaElement).value = '{ nope';
    action(root, 'save')?.click();

    await vi.waitFor(() => expect(statusText(root)).toMatch(/json/i));
    expect(save).not.toHaveBeenCalled();
  });

  it('blocks save when the options are not a plain object', async () => {
    const { root, save } = await mount();
    const row = root.querySelector<HTMLElement>('[data-rule-index="0"]') as HTMLElement;

    (field(row, 'rule-options') as HTMLTextAreaElement).value = '["nope"]';
    action(root, 'save')?.click();

    await vi.waitFor(() => expect(statusText(root)).toMatch(/object/i));
    expect(save).not.toHaveBeenCalled();
  });

  it('blocks save when the rule name is empty', async () => {
    const { root, save } = await mount();
    const row = root.querySelector<HTMLElement>('[data-rule-index="0"]') as HTMLElement;

    (field(row, 'rule-name') as HTMLInputElement).value = '   ';
    action(root, 'save')?.click();

    await vi.waitFor(() => expect(statusText(root)).toMatch(/name/i));
    expect(save).not.toHaveBeenCalled();
  });

  it('blocks save when a rule has no patterns', async () => {
    const { root, save } = await mount();
    const row = root.querySelector<HTMLElement>('[data-rule-index="0"]') as HTMLElement;

    (field(row, 'rule-patterns') as HTMLInputElement).value = ' , ';
    action(root, 'save')?.click();

    await vi.waitFor(() => expect(statusText(root)).toMatch(/pattern/i));
    expect(save).not.toHaveBeenCalled();
  });

  it('blocks save when a rule attribute is unknown', async () => {
    const { root, save } = await mount();
    const row = root.querySelector<HTMLElement>('[data-rule-index="0"]') as HTMLElement;

    (field(row, 'rule-attributes') as HTMLInputElement).value = 'name, nope';
    action(root, 'save')?.click();

    await vi.waitFor(() => expect(statusText(root)).toMatch(/nope/));
    expect(save).not.toHaveBeenCalled();
  });

  it('blocks save when match attributes are empty', async () => {
    const { root, save } = await mount();

    (field(root, 'matchAttributes') as HTMLInputElement).value = '';
    action(root, 'save')?.click();

    await vi.waitFor(() => expect(statusText(root)).toMatch(/match attribute/i));
    expect(save).not.toHaveBeenCalled();
  });

  it('blocks save when a match attribute is unknown', async () => {
    const { root, save } = await mount();

    (field(root, 'matchAttributes') as HTMLInputElement).value = 'name, nope';
    action(root, 'save')?.click();

    await vi.waitFor(() => expect(statusText(root)).toMatch(/nope/));
    expect(save).not.toHaveBeenCalled();
  });

  it('adds a rule', async () => {
    const { root } = await mount();

    action(root, 'add-rule')?.click();

    const rows = root.querySelectorAll<HTMLElement>('[data-rule-index]');
    expect(rows).toHaveLength(3);
    const added = rows[2] as HTMLElement;
    expect((field(added, 'rule-name') as HTMLInputElement).value).toBe('New rule');
    expect((field(added, 'rule-kind') as HTMLSelectElement).value).toBe('contains');
    expect((field(added, 'rule-options') as HTMLTextAreaElement).value).toBe('{}');
  });

  it('deletes a rule', async () => {
    const { root } = await mount();
    const row = root.querySelector<HTMLElement>('[data-rule-index="0"]') as HTMLElement;

    action(row, 'delete-rule')?.click();

    const rows = root.querySelectorAll<HTMLElement>('[data-rule-index]');
    expect(rows).toHaveLength(1);
    expect((field(rows[0] as HTMLElement, 'rule-name') as HTMLInputElement).value).toBe('Beta');
  });

  it('moves a rule up and down', async () => {
    const { root } = await mount();

    const second = root.querySelector<HTMLElement>('[data-rule-index="1"]') as HTMLElement;
    action(second, 'move-rule-up')?.click();

    let rows = root.querySelectorAll<HTMLElement>('[data-rule-index]');
    expect((field(rows[0] as HTMLElement, 'rule-name') as HTMLInputElement).value).toBe('Beta');

    action(rows[0] as HTMLElement, 'move-rule-down')?.click();

    rows = root.querySelectorAll<HTMLElement>('[data-rule-index]');
    expect((field(rows[0] as HTMLElement, 'rule-name') as HTMLInputElement).value).toBe('Alpha');
  });

  it('filters the rule list, reports the count, and still saves every rule', async () => {
    const { root, save } = await mount();

    const count = field(root, 'rule-count');
    expect(count?.textContent).toBe('Showing 2 of 2 rules');

    const filter = field(root, 'rule-filter') as HTMLInputElement;
    filter.value = 'beta';
    filter.dispatchEvent(new Event('input', { bubbles: true }));

    expect(field(root, 'rule-count')?.textContent).toBe('Showing 1 of 2 rules');
    const rows = root.querySelectorAll<HTMLElement>('[data-rule-index]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.hidden).toBe(true);
    expect(rows[1]?.hidden).toBe(false);

    action(root, 'save')?.click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0]?.[0]?.rules).toHaveLength(2);
  });

  it('duplicates a rule with a copy name, a fresh id, and moves focus to it', async () => {
    const { app, root } = await mount();
    const first = root.querySelector<HTMLElement>('[data-rule-index="0"]') as HTMLElement;

    action(first, 'duplicate-rule')?.click();

    const rows = root.querySelectorAll<HTMLElement>('[data-rule-index]');
    expect(rows).toHaveLength(3);
    expect((field(rows[1] as HTMLElement, 'rule-name') as HTMLInputElement).value).toBe('Alpha copy');
    expect((field(rows[2] as HTMLElement, 'rule-name') as HTMLInputElement).value).toBe('Beta');

    const rules = app.getSettings().rules;
    expect(rules[1]?.name).toBe('Alpha copy');
    expect(rules[1]?.id).not.toBe(rules[0]?.id);
    expect(document.activeElement).toBe(field(rows[1] as HTMLElement, 'rule-name'));
  });

  it('mounts with only a root and repository (default preview deps)', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const { repository } = createFakeRepository(customSettings());
    const app: OptionsApp = createOptionsApp(root, repository);
    await app.mount();

    expect(root.querySelectorAll('[data-rule-index]')).toHaveLength(2);
    const preview = field(root, 'rule-preview');
    expect(preview).not.toBeNull();
    expect(preview?.textContent).not.toBe('');
  });

  it('exports parseable JSON equal to the settings', async () => {
    const initial = customSettings();
    const { root } = await mount(initial);

    action(root, 'export')?.click();

    const output = field(root, 'exportOutput') as HTMLTextAreaElement;
    expect(output).toBeInstanceOf(HTMLTextAreaElement);
    expect(JSON.parse(output.value)).toEqual(encodeSettings(initial));
  });

  it('applies a valid import without saving', async () => {
    const initial = customSettings();
    const imported: Settings = {
      ...initial,
      defaults: { ...initial.defaults, defaultMaxLength: 77 },
    };
    const { root, save } = await mountWithFakeFile(JSON.stringify(encodeSettings(imported)));

    await vi.waitFor(() =>
      expect((field(root, 'defaultMaxLength') as HTMLInputElement).value).toBe('77'),
    );
    expect(save).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(statusText(root)).toMatch(/save/i));
  });

  it('rejects an import whose JSON is malformed', async () => {
    const { root, save } = await mountWithFakeFile('{ not json');

    await vi.waitFor(() => expect(statusText(root)).toMatch(/import/i));
    expect((field(root, 'defaultMaxLength') as HTMLInputElement).value).toBe('33');
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects an import that fails decoding', async () => {
    const { root, save } = await mountWithFakeFile('{"schemaVersion": 1}');

    await vi.waitFor(() => expect(statusText(root)).toMatch(/import/i));
    expect((field(root, 'defaultMaxLength') as HTMLInputElement).value).toBe('33');
    expect(save).not.toHaveBeenCalled();
  });

  it('resets the form to defaults without saving', async () => {
    const { app, root, save } = await mount();

    (field(root, 'defaultMaxLength') as HTMLInputElement).value = '99';
    action(root, 'reset')?.click();

    const defaults = createDefaultSettings();
    expect((field(root, 'defaultMaxLength') as HTMLInputElement).value).toBe(
      String(defaults.defaults.defaultMaxLength),
    );
    expect((field(root, 'ignoredTypes') as HTMLInputElement).value).toBe(
      defaults.ignore.types.join(', '),
    );
    expect((field(root, 'matchAttributes') as HTMLInputElement).value).toBe(
      defaults.match.attributes.join(', '),
    );
    expect(save).not.toHaveBeenCalled();
    expect(app.getSettings()).toEqual(defaults);
    expect(statusText(root)).toMatch(/save/i);
  });
});
