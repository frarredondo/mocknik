import type { Settings } from '../../domain/types';
import { el } from './view';

/** Callbacks the global panel raises; the controller owns export/import. */
export interface GlobalPanelHandlers {
  onExport(): void;
  onImport(event: Event): void;
}

function textControl(name: string, value: string): HTMLInputElement {
  return el('input', {
    class: 'control',
    attrs: { 'data-field': name, type: 'text', value },
  }) as HTMLInputElement;
}

function textAreaControl(name: string, value: string): HTMLTextAreaElement {
  return el('textarea', {
    class: 'control options',
    attrs: { 'data-field': name, rows: '4', spellcheck: 'false' },
    text: value,
  }) as HTMLTextAreaElement;
}

function checkboxField(name: string, label: string, checked: boolean): HTMLElement {
  const control = el('input', {
    attrs: { 'data-field': name, type: 'checkbox' },
  }) as HTMLInputElement;
  control.checked = checked;
  return el('label', { class: 'checkbox' }, control, el('span', { text: label }));
}

function formRow(label: string, control: HTMLElement): HTMLElement {
  return el(
    'label',
    { class: 'field-row' },
    el('span', { class: 'field-label', text: label }),
    control,
  );
}

function renderGeneral(state: Settings): HTMLElement {
  const maxLength = el('input', {
    class: 'control',
    attrs: {
      'data-field': 'defaultMaxLength',
      type: 'number',
      min: '1',
      step: '1',
      value: String(state.defaults.defaultMaxLength),
    },
  });

  return el(
    'section',
    { class: 'section', attrs: { 'data-section': 'general' } },
    el('h2', { text: 'General' }),
    formRow('Default max length', maxLength),
    checkboxField(
      'triggerEvents',
      'Dispatch input, change, and blur events after filling',
      state.defaults.triggerEvents,
    ),
    el('h3', { text: 'Ignore' }),
    checkboxField(
      'ignoreWithContent',
      'Skip fields that already contain a value',
      state.ignore.withContent,
    ),
    checkboxField('ignoreHidden', 'Skip hidden fields', state.ignore.hidden),
    formRow(
      'Ignored types (comma separated)',
      textControl('ignoredTypes', state.ignore.types.join(', ')),
    ),
    formRow(
      'Ignored domains (one per line)',
      textAreaControl('ignoredDomains', state.ignore.domains.join('\n')),
    ),
    el('h3', { text: 'Matching' }),
    formRow(
      'Match attributes (comma separated)',
      textControl('matchAttributes', state.match.attributes.join(', ')),
    ),
  );
}

function renderBackup(handlers: GlobalPanelHandlers): HTMLElement {
  const importInput = el('input', {
    class: 'control',
    attrs: { 'data-field': 'importFile', type: 'file', accept: '.json,application/json' },
    on: { change: (event) => handlers.onImport(event) },
  });

  return el(
    'section',
    { class: 'section', attrs: { 'data-section': 'backup' } },
    el('h2', { text: 'Backup' }),
    formRow(
      'Export',
      el(
        'div',
        { class: 'stack' },
        el('textarea', {
          class: 'control options',
          attrs: { 'data-field': 'exportOutput', rows: '8', spellcheck: 'false', readonly: 'true' },
        }),
        el('button', {
          text: 'Export to JSON',
          attrs: { type: 'button', 'data-action': 'export' },
          on: { click: () => handlers.onExport() },
        }),
      ),
    ),
    formRow('Import', importInput),
  );
}

/** Renders the collapsed `Defaults & matching` panel (General + Backup). */
export function renderGlobalPanel(state: Settings, handlers: GlobalPanelHandlers): HTMLElement {
  const details = el('details', { class: 'panel' }) as HTMLDetailsElement;
  details.open = false;
  details.append(
    el(
      'summary',
      {},
      el('span', { text: 'Defaults & matching' }),
      el('span', { class: 'hint', text: 'General · Ignore · Matching · Backup' }),
    ),
    el('div', { class: 'panel-body' }, renderGeneral(state), renderBackup(handlers)),
  );
  return details;
}
