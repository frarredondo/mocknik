import { systemClock } from '../../domain/clock';
import { createDefaultRegistry } from '../../domain/generators/defaultRegistry';
import type { SettingsRepository } from '../../domain/ports';
import { systemRandom } from '../../domain/random';
import { decodeSettings, encodeSettings } from '../../domain/settings/codec';
import { createDefaultSettings } from '../../domain/settings/defaults';
import { MATCH_ATTRIBUTES } from '../../domain/types';
import type { FieldRule, MatchAttribute, Settings } from '../../domain/types';
import { matchesFilter } from './filter';
import { renderGlobalPanel } from './globalPanel';
import type { PreviewDeps } from './preview';
import type { RuleCardActions } from './ruleCard';
import { renderRuleCard } from './ruleCard';
import { clear, el, field } from './view';

/** Controller for the options page. */
export interface OptionsApp {
  mount(): Promise<void>;
  getSettings(): Settings;
}

interface ReadResult {
  readonly settings: Settings;
  readonly errors: readonly string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMatchAttribute(value: string): value is MatchAttribute {
  return (MATCH_ATTRIBUTES as readonly string[]).includes(value);
}

function splitCommas(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** Builds the composition-root preview deps used when callers omit them. */
export function defaultPreviewDeps(): PreviewDeps {
  return {
    registry: createDefaultRegistry(),
    random: systemRandom,
    secureRandom: systemRandom,
    clock: systemClock,
  };
}

/** Creates the options page app bound to `root` and `repository`. */
export function createOptionsApp(
  root: HTMLElement,
  repository: SettingsRepository,
  deps?: PreviewDeps,
): OptionsApp {
  const previewDeps = deps ?? defaultPreviewDeps();
  let state: Settings = createDefaultSettings();
  let filterQuery = '';

  function requireInput(scope: ParentNode, name: string): HTMLInputElement {
    const node = field(scope, name);
    if (!(node instanceof HTMLInputElement)) throw new Error(`missing input: ${name}`);
    return node;
  }

  function requireTextArea(scope: ParentNode, name: string): HTMLTextAreaElement {
    const node = field(scope, name);
    if (!(node instanceof HTMLTextAreaElement)) throw new Error(`missing textarea: ${name}`);
    return node;
  }

  function requireSelect(scope: ParentNode, name: string): HTMLSelectElement {
    const node = field(scope, name);
    if (!(node instanceof HTMLSelectElement)) throw new Error(`missing select: ${name}`);
    return node;
  }

  function parseOptions(
    text: string,
    previous: Readonly<Record<string, unknown>> | undefined,
    label: string,
    errors: string[],
  ): Readonly<Record<string, unknown>> | undefined {
    const trimmed = text.trim();
    if (trimmed.length === 0) return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      errors.push(`${label}: options is not valid JSON.`);
      return previous;
    }
    if (!isPlainObject(parsed)) {
      errors.push(`${label}: options must be a JSON object.`);
      return previous;
    }
    if (Object.keys(parsed).length === 0 && previous === undefined) return undefined;
    return parsed;
  }

  function readRule(row: HTMLElement, index: number, errors: string[]): FieldRule {
    const previous = state.rules[index];
    const label = (name: string) => `Rule ${name || index + 1}`;

    const name = requireInput(row, 'rule-name').value.trim();
    if (name.length === 0) errors.push(`Rule ${index + 1} needs a name.`);

    const kind = requireSelect(row, 'rule-kind').value as FieldRule['match']['kind'];
    const patterns = splitCommas(requireInput(row, 'rule-patterns').value);
    if (patterns.length === 0) errors.push(`${label(name)} needs at least one pattern.`);

    const attributes = splitCommas(requireInput(row, 'rule-attributes').value);
    for (const attribute of attributes) {
      if (!isMatchAttribute(attribute)) {
        errors.push(`${label(name)}: unknown attribute "${attribute}".`);
      }
    }

    const actionSelection = requireInput(row, 'rule-action').value;
    const actionValue =
      actionSelection === 'fill' && previous?.action === undefined
        ? undefined
        : (actionSelection as FieldRule['action']);

    const fieldTypeSelection = requireSelect(row, 'rule-fieldType').value;

    const value = requireInput(row, 'rule-value').value;
    const template = requireInput(row, 'rule-template').value.trim();
    const options = parseOptions(
      requireTextArea(row, 'rule-options').value,
      previous?.options,
      label(name),
      errors,
    );

    return {
      ...previous,
      id: previous?.id ?? crypto.randomUUID(),
      name,
      match: {
        kind,
        patterns,
        ...(attributes.length > 0 ? { attributes: attributes as MatchAttribute[] } : {}),
      },
      action: actionValue,
      fieldType: fieldTypeSelection === '' ? undefined : (fieldTypeSelection as FieldRule['fieldType']),
      value: value.length > 0 ? { kind: 'text', value } : undefined,
      template: template.length > 0 ? template : undefined,
      options,
    };
  }

  function readSettings(): ReadResult {
    const errors: string[] = [];

    const defaultMaxLength = Number(requireInput(root, 'defaultMaxLength').value);
    if (!(defaultMaxLength > 0)) {
      errors.push('Default max length must be greater than 0.');
    }

    const matchAttributes = splitCommas(requireInput(root, 'matchAttributes').value);
    if (matchAttributes.length === 0) {
      errors.push('At least one match attribute is required.');
    }
    for (const attribute of matchAttributes) {
      if (!isMatchAttribute(attribute)) {
        errors.push(`Unknown match attribute "${attribute}".`);
      }
    }

    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-rule-index]'));
    const rules = rows.map((row, index) => readRule(row, index, errors));

    const next: Settings = {
      ...state,
      defaults: {
        ...state.defaults,
        defaultMaxLength,
        triggerEvents: requireInput(root, 'triggerEvents').checked,
      },
      match: {
        attributes: matchAttributes as MatchAttribute[],
      },
      ignore: {
        ...state.ignore,
        hidden: requireInput(root, 'ignoreHidden').checked,
        withContent: requireInput(root, 'ignoreWithContent').checked,
        types: splitCommas(requireInput(root, 'ignoredTypes').value),
        domains: splitLines(requireTextArea(root, 'ignoredDomains').value),
      },
      rules,
    };

    return { settings: next, errors };
  }

  function showStatus(message: string, isError: boolean): void {
    const status = field(root, 'status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
    status.classList.toggle('success', !isError);
  }

  function focusRuleName(index: number): void {
    const card = root.querySelector<HTMLElement>(`[data-rule-index="${index}"]`);
    if (!card || card.hidden) return;
    const name = field(card, 'rule-name');
    if (name instanceof HTMLInputElement) name.focus();
  }

  function actionsFor(index: number): RuleCardActions {
    return {
      moveUp: () => moveRule(index, -1),
      moveDown: () => moveRule(index, 1),
      duplicate: () => duplicateRule(index),
      remove: () => deleteRule(index),
    };
  }

  function applyFilter(): void {
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-rule-index]'));
    let shown = 0;
    for (const card of cards) {
      const index = Number(card.dataset['ruleIndex']);
      const rule = state.rules[index];
      const visible = rule !== undefined && matchesFilter(rule, filterQuery);
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    const count = field(root, 'rule-count');
    if (count) {
      const plural = state.rules.length === 1 ? 'rule' : 'rules';
      count.textContent = `Showing ${shown} of ${state.rules.length} ${plural}`;
    }
  }

  function handleFilter(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    filterQuery = target.value;
    applyFilter();
  }

  function renderRules(): HTMLElement {
    const section = el('section', {
      class: 'section rules',
      attrs: { 'data-section': 'rules' },
    });

    const filterInput = el('input', {
      class: 'control filter',
      attrs: {
        'data-field': 'rule-filter',
        type: 'search',
        placeholder: 'Filter by name, pattern, or action…',
        'aria-label': 'Filter rules by name, pattern, or action',
        value: filterQuery,
      },
      on: { input: handleFilter },
    });
    const count = el('span', {
      class: 'count',
      attrs: { 'data-field': 'rule-count', role: 'status', 'aria-live': 'polite' },
    });

    section.append(
      el(
        'div',
        { class: 'rules-bar' },
        el('h2', { text: 'Rules' }),
        el(
          'div',
          { class: 'bar-end' },
          el('label', { class: 'search' }, filterInput),
          count,
        ),
      ),
      el('p', { class: 'muted', text: 'Rules are evaluated most-specific first.' }),
    );

    const list = el('div', { class: 'cards' });
    state.rules.forEach((rule, index) => {
      list.append(
        renderRuleCard(
          rule,
          index,
          state.match.attributes,
          previewDeps,
          actionsFor(index),
          state.rules.length,
        ),
      );
    });
    list.append(
      el('button', {
        class: 'add-card',
        text: '+ Add rule',
        attrs: { type: 'button', 'data-action': 'add-rule' },
        on: { click: addRule },
      }),
    );
    section.append(list);

    return section;
  }

  function renderFooter(): HTMLElement {
    return el(
      'footer',
      { class: 'footer' },
      el(
        'div',
        { class: 'actions' },
        el('button', {
          class: 'primary',
          text: 'Save',
          attrs: { type: 'button', 'data-action': 'save' },
          on: { click: () => void handleSave() },
        }),
        el('button', {
          text: 'Reset to defaults',
          attrs: { type: 'button', 'data-action': 'reset' },
          on: { click: handleReset },
        }),
      ),
      el('span', {
        class: 'status',
        attrs: { 'data-field': 'status', role: 'status', 'aria-live': 'polite' },
      }),
    );
  }

  function render(): void {
    clear(root);
    root.append(
      el(
        'header',
        { class: 'page-header' },
        el('h1', { text: 'Mocknik' }),
        el('p', {
          class: 'muted',
          text: 'Match, fill, or ignore form fields. Rules read top to bottom, most specific first.',
        }),
      ),
      renderGlobalPanel(state, {
        onExport: handleExport,
        onImport: (event) => void handleImport(event),
      }),
      renderRules(),
      renderFooter(),
    );
    applyFilter();
  }

  function addRule(): void {
    const { settings: current } = readSettings();
    const rule: FieldRule = {
      id: crypto.randomUUID(),
      name: 'New rule',
      match: { kind: 'contains', patterns: [] },
    };
    state = { ...current, rules: [...current.rules, rule] };
    render();
    focusRuleName(state.rules.length - 1);
  }

  function deleteRule(index: number): void {
    const { settings: current } = readSettings();
    const rules = current.rules.filter((_rule, ruleIndex) => ruleIndex !== index);
    state = { ...current, rules };
    render();
    const next = Math.min(index, rules.length - 1);
    if (next >= 0) focusRuleName(next);
  }

  function duplicateRule(index: number): void {
    const { settings: current } = readSettings();
    const source = current.rules[index];
    if (!source) return;
    const copy: FieldRule = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} copy`,
      match: { ...source.match, patterns: [...source.match.patterns] },
    };
    const rules = [...current.rules];
    rules.splice(index + 1, 0, copy);
    state = { ...current, rules };
    render();
    focusRuleName(index + 1);
  }

  function moveRule(index: number, delta: -1 | 1): void {
    const { settings: current } = readSettings();
    const rules = [...current.rules];
    const target = index + delta;
    const rule = rules[index];
    const other = rules[target];
    if (!rule || !other) return;
    rules[index] = other;
    rules[target] = rule;
    state = { ...current, rules };
    render();
  }

  async function handleSave(): Promise<void> {
    const { settings: next, errors } = readSettings();
    if (errors.length > 0) {
      showStatus(errors.join(' '), true);
      return;
    }
    try {
      await repository.save(next);
    } catch {
      showStatus('Save failed: could not write settings.', true);
      return;
    }
    state = next;
    render();
    showStatus('Saved', false);
  }

  function handleReset(): void {
    state = createDefaultSettings();
    filterQuery = '';
    render();
    showStatus('Defaults restored. Press Save to persist them.', false);
  }

  function handleExport(): void {
    let output: HTMLTextAreaElement;
    const existing = field(root, 'exportOutput');
    if (existing instanceof HTMLTextAreaElement) {
      output = existing;
    } else {
      output = el('textarea', {
        class: 'control options',
        attrs: { 'data-field': 'exportOutput', rows: '8', spellcheck: 'false', readonly: 'true' },
      }) as HTMLTextAreaElement;
      root.append(output);
    }
    output.value = JSON.stringify(encodeSettings(state), null, 2);
    output.focus();
    output.select();
  }

  async function readFileText(file: File): Promise<string> {
    if (typeof file.text === 'function') return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
      reader.readAsText(file);
    });
  }

  async function handleImport(event: Event): Promise<void> {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    if (!file) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFileText(file));
    } catch {
      showStatus('Import failed: could not read the file.', true);
      return;
    }

    const decoded = decodeSettings(parsed);
    if (!decoded.ok) {
      showStatus('Import failed: not a valid settings file.', true);
      return;
    }

    state = decoded.settings;
    filterQuery = '';
    render();
    showStatus('Imported settings. Press Save to persist them.', false);
  }

  return {
    async mount() {
      state = await repository.load();
      render();
    },
    getSettings() {
      return state;
    },
  };
}
