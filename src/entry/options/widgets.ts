import { clear, el } from './view';

/** Optional keyboard/E2E hooks for a {@link chipEditor}'s add and remove controls. */
export interface ChipEditorOptions {
  readonly addAction?: string;
  readonly removeAction?: string;
  /** Values shown as inherited defaults; the hidden input stays empty until edited. */
  readonly inherited?: boolean;
  /** Label for the materialize affordance; default "Customize". */
  readonly overrideLabel?: string;
  /** Placeholder for the add field, e.g. "+ attribute". */
  readonly placeholder?: string;
}

/**
 * A chip editor bound to a canonical hidden input named `name`.
 *
 * In `inherited` mode the passed `values` are shown as muted, non-removable
 * chips while the hidden input stays empty (an empty canonical value means
 * "inherit"). A Customize button, or typing in the add field, materializes the
 * inherited list into the hidden input and switches to the editable editor.
 */
export function chipEditor(
  name: string,
  values: readonly string[],
  options: ChipEditorOptions = {},
): HTMLElement {
  let current = [...values];
  let inherited = options.inherited === true;
  const overrideLabel = options.overrideLabel ?? 'Customize';

  const canonical = el('input', { attrs: { type: 'hidden', 'data-field': name } });
  const list = el('div', { class: 'chip-list' });
  const input = el('input', {
    attrs: {
      type: 'text',
      'data-chip-input': name,
      'aria-label': `Add ${name}`,
      ...(options.placeholder !== undefined ? { placeholder: options.placeholder } : {}),
      ...(options.addAction !== undefined ? { 'data-action': options.addAction } : {}),
    },
  });
  const override = el('button', {
    class: 'chip-override',
    text: overrideLabel,
    attrs: {
      type: 'button',
      'data-action': `override-${name}`,
      'aria-label': `${overrideLabel} ${name}`,
      title: `These are the global match defaults. ${overrideLabel} to edit them for this rule.`,
    },
    on: {
      click: () => {
        inherited = false;
        render();
      },
    },
  });

  const render = (): void => {
    (canonical as HTMLInputElement).value = inherited ? '' : current.join(', ');
    clear(list);
    for (const value of current) {
      const chip = el(
        'span',
        {
          class: inherited ? 'chip chip--inherited' : 'chip',
          attrs: {
            'data-chip': value,
            ...(inherited
              ? {
                  'aria-label': `${value} (global default)`,
                  title: `${value} is a global default, inherited from the global match attributes.`,
                }
              : {}),
          },
        },
        value,
      );
      if (!inherited) {
        chip.append(
          el('button', {
            class: 'chip-remove',
            text: '×',
            attrs: {
              type: 'button',
              'data-chip-remove': value,
              'aria-label': `Remove ${value}`,
              ...(options.removeAction !== undefined
                ? { 'data-action': options.removeAction }
                : {}),
            },
            on: {
              click: () => {
                current = current.filter((item) => item !== value);
                render();
              },
            },
          }),
        );
      }
      list.append(chip);
    }
    override.hidden = !inherited;
  };

  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const value = (input as HTMLInputElement).value.trim();
    if (value === '' || current.includes(value)) return;
    inherited = false;
    current = [...current, value];
    (input as HTMLInputElement).value = '';
    render();
  });

  render();
  return el('div', { class: 'chip-editor' }, canonical, list, input, override);
}

/** Option for {@link segmented}. */
export interface SegmentedOption {
  readonly value: string;
  readonly label: string;
}

/** A radio-group segmented control bound to a canonical hidden input named `name`. */
export function segmented(
  name: string,
  options: readonly SegmentedOption[],
  value: string,
  legend: string,
  radioName: string = name,
): HTMLElement {
  const fieldset = el('fieldset', { class: 'segmented' }, el('legend', { text: legend }));
  const canonical = el('input', { attrs: { type: 'hidden', 'data-field': name } });
  (canonical as HTMLInputElement).value = value;

  for (const option of options) {
    const id = `${radioName}-${option.value}`;
    const radio = el('input', {
      attrs: { type: 'radio', name: radioName, id, value: option.value },
    }) as HTMLInputElement;
    radio.checked = option.value === value;
    fieldset.append(radio, el('label', { attrs: { for: id }, text: option.label }));
  }

  fieldset.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'radio') {
      (canonical as HTMLInputElement).value = target.value;
    }
  });

  return el('div', { class: 'segmented-control' }, canonical, fieldset);
}

/** A <details> disclosure; closed unless `open` is true. */
export function disclosure(summary: string, body: HTMLElement, open = false): HTMLDetailsElement {
  const details = el('details', { class: 'disclosure' }, el('summary', { text: summary })) as HTMLDetailsElement;
  details.open = open;
  details.append(body);
  return details;
}
