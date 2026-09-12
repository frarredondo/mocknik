import type { FieldRule, FieldType, MatchAttribute, RuleAction } from '../../domain/types';
import { FIELD_TYPES, MATCH_KINDS, RULE_ACTIONS } from '../../domain/types';
import { describeRule } from './describe';
import type { PreviewDeps } from './preview';
import { previewRule } from './preview';
import { el, field } from './view';
import type { SegmentedOption } from './widgets';
import { chipEditor, disclosure, segmented } from './widgets';

/** Callbacks the card raises; the controller owns the rule list. */
export interface RuleCardActions {
  moveUp(): void;
  moveDown(): void;
  duplicate(): void;
  remove(): void;
}

const ACTION_OPTIONS: readonly SegmentedOption[] = RULE_ACTIONS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

function option(value: string, label: string): HTMLOptionElement {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  return node;
}

function selectControl(
  name: string,
  values: readonly string[],
  value: string,
  label: string,
  emptyLabel?: string,
): HTMLSelectElement {
  const control = el('select', {
    class: 'control',
    attrs: { 'data-field': name, 'aria-label': label },
  }) as HTMLSelectElement;
  if (emptyLabel !== undefined) control.append(option('', emptyLabel));
  for (const candidate of values) control.append(option(candidate, candidate));
  control.value = value;
  return control;
}

function textControl(name: string, value: string, label: string): HTMLInputElement {
  return el('input', {
    class: 'control',
    attrs: { 'data-field': name, type: 'text', value, 'aria-label': label },
  }) as HTMLInputElement;
}

function textAreaControl(name: string, value: string): HTMLTextAreaElement {
  return el('textarea', {
    class: 'control options',
    attrs: { 'data-field': name, rows: '4', spellcheck: 'false' },
    text: value,
  }) as HTMLTextAreaElement;
}

function formRow(label: string, control: HTMLElement): HTMLElement {
  return el(
    'label',
    { class: 'field-row' },
    el('span', { class: 'field-label', text: label }),
    control,
  );
}

/**
 * Renders one rule as a card: headline sentence, canonical controls, live
 * example, advanced overrides, and reorder/duplicate/delete actions.
 */
export function renderRuleCard(
  rule: FieldRule,
  index: number,
  fallbackAttributes: readonly MatchAttribute[],
  deps: PreviewDeps,
  actions: RuleCardActions,
  total?: number,
): HTMLElement {
  const described = describeRule(rule, fallbackAttributes);
  const action = described.action;

  const nameInput = textControl('rule-name', rule.name, 'Rule name');
  const kindSelect = selectControl('rule-kind', MATCH_KINDS, rule.match.kind, 'Match kind');
  const fieldTypeSelect = selectControl(
    'rule-fieldType',
    FIELD_TYPES,
    rule.fieldType ?? '',
    'Field type',
    '(default)',
  );
  const patternsEditor = chipEditor('rule-patterns', rule.match.patterns ?? [], {
    addAction: 'add-pattern',
    removeAction: 'remove-pattern',
    placeholder: '+ pattern',
  });
  const attributesEditor = chipEditor('rule-attributes', described.attributes, {
    addAction: 'add-attribute',
    removeAction: 'remove-attribute',
    placeholder: '+ attribute',
    inherited: rule.match.attributes === undefined,
  });
  const actionEditor = segmented(
    'rule-action',
    ACTION_OPTIONS,
    action,
    'Action',
    `rule-action-${index}`,
  );

  const valueInput = textControl(
    'rule-value',
    rule.value?.kind === 'text' ? rule.value.value : '',
    'Literal value',
  );
  const templateInput = textControl('rule-template', rule.template ?? '', 'Template');
  const optionsArea = textAreaControl('rule-options', JSON.stringify(rule.options ?? {}, null, 2));
  const advanced = disclosure(
    'Advanced',
    el(
      'div',
      { class: 'adv-grid' },
      formRow('Literal value', valueInput),
      formRow('Template', templateInput),
      formRow('Options (JSON)', optionsArea),
    ),
  );

  const previewEl = el('span', {
    class: 'example__value',
    attrs: { 'data-field': 'rule-preview', 'aria-live': 'polite' },
  });
  const previewNote = el('span', { class: 'example__note' });

  let draft: FieldRule = rule;
  const refresh = (): void => {
    const preview = previewRule(draft, deps);
    previewEl.textContent = preview.text;
    previewNote.textContent = preview.note ?? '';
  };
  refresh();

  actionEditor.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'radio') {
      draft = { ...draft, action: target.value as RuleAction };
      refresh();
    }
  });

  fieldTypeSelect.addEventListener('change', () => {
    draft = {
      ...draft,
      fieldType: fieldTypeSelect.value === '' ? undefined : (fieldTypeSelect.value as FieldType),
    };
    refresh();
  });

  valueInput.addEventListener('input', () => {
    draft = {
      ...draft,
      value: valueInput.value.length > 0 ? { kind: 'text', value: valueInput.value } : undefined,
    };
    refresh();
  });

  templateInput.addEventListener('input', () => {
    const trimmed = templateInput.value.trim();
    draft = { ...draft, template: trimmed.length > 0 ? trimmed : undefined };
    refresh();
  });

  optionsArea.addEventListener('input', () => {
    const raw = optionsArea.value.trim();
    if (raw.length === 0) {
      draft = { ...draft, options: undefined };
    } else {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          draft = { ...draft, options: parsed as Readonly<Record<string, unknown>> };
        }
      } catch {
        /* keep the last valid options while the JSON is mid-edit */
      }
    }
    refresh();
  });

  const sentence = el('div', { class: 'sentence' });
  sentence.append(
    el('span', { class: 'kw', text: 'IF' }),
    el('span', { text: 'a field whose' }),
    attributesEditor,
    kindSelect,
    patternsEditor,
    el('span', { class: 'arrow', text: '→' }),
    el('span', { class: 'kw then', text: 'THEN' }),
    actionEditor,
  );
  if (action === 'mirror') {
    const source =
      described.mirrorSource === 'previous-password' ? 'previous password' : 'previous text';
    sentence.append(el('span', { text: `the value of the ${source} field, as a` }));
  } else if (action === 'skip') {
    sentence.append(el('span', { text: 'this field (type:' }));
  } else {
    sentence.append(el('span', { text: 'a' }));
  }
  sentence.append(fieldTypeSelect, el('span', { text: action === 'skip' ? ')' : 'field' }));

  const moveUp = el('button', {
    class: 'icon',
    text: 'Move up',
    attrs: { type: 'button', 'data-action': 'move-rule-up' },
    on: { click: () => actions.moveUp() },
  });
  if (index === 0) moveUp.setAttribute('disabled', '');

  const moveDown = el('button', {
    class: 'icon',
    text: 'Move down',
    attrs: { type: 'button', 'data-action': 'move-rule-down' },
    on: { click: () => actions.moveDown() },
  });
  if (total !== undefined && index >= total - 1) moveDown.setAttribute('disabled', '');

  const header = el(
    'header',
    { class: 'rule-header card__top' },
    el('span', { class: 'rule-index card__num', text: `#${index + 1}` }),
    nameInput,
  );
  if (described.badge !== undefined) {
    header.append(
      el('span', { class: 'badge', attrs: { 'data-badge': described.badge }, text: described.badge }),
    );
  }
  header.append(
    el(
      'div',
      { class: 'rule-actions card__tools' },
      moveUp,
      moveDown,
      el('button', {
        class: 'ghost',
        text: 'Duplicate',
        attrs: { type: 'button', 'data-action': 'duplicate-rule' },
        on: { click: () => actions.duplicate() },
      }),
      el('button', {
        class: 'danger',
        text: 'Delete',
        attrs: { type: 'button', 'data-action': 'delete-rule' },
        on: { click: () => actions.remove() },
      }),
    ),
  );

  return el(
    'div',
    { class: 'rule card', attrs: { 'data-rule-index': String(index) } },
    header,
    el(
      'div',
      { class: 'rule-body card__body' },
      sentence,
      el('div', { class: 'example' }, el('span', { class: 'example__tag', text: 'Example' }), previewEl, previewNote),
      advanced,
    ),
  );
}
