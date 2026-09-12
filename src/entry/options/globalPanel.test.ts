import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSettings } from '../../domain/settings/defaults';
import type { Settings } from '../../domain/types';
import type { GlobalPanelHandlers } from './globalPanel';
import { renderGlobalPanel } from './globalPanel';
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
  };
}

function handlers(): GlobalPanelHandlers {
  return { onExport: vi.fn(), onImport: vi.fn() };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('renderGlobalPanel', () => {
  it('renders a single details collapsed by default', () => {
    const panel = renderGlobalPanel(createDefaultSettings(), handlers());
    expect(panel).toBeInstanceOf(HTMLDetailsElement);
    expect((panel as HTMLDetailsElement).open).toBe(false);
    expect(panel.querySelectorAll('details')).toHaveLength(0);
  });

  it('digests as "Defaults & matching"', () => {
    const panel = renderGlobalPanel(createDefaultSettings(), handlers());
    expect(panel.querySelector('summary')?.textContent).toContain('Defaults & matching');
  });

  it('wraps the general and backup sections', () => {
    const panel = renderGlobalPanel(createDefaultSettings(), handlers());
    expect(panel.querySelector('[data-section="general"]')).not.toBeNull();
    expect(panel.querySelector('[data-section="backup"]')).not.toBeNull();
  });

  it('pre-fills every general control with the current settings', () => {
    const panel = renderGlobalPanel(customSettings(), handlers());

    const maxLength = field(panel, 'defaultMaxLength') as HTMLInputElement;
    expect(maxLength.type).toBe('number');
    expect(maxLength.value).toBe('33');

    expect((field(panel, 'triggerEvents') as HTMLInputElement).type).toBe('checkbox');
    expect((field(panel, 'triggerEvents') as HTMLInputElement).checked).toBe(false);
    expect((field(panel, 'ignoreWithContent') as HTMLInputElement).checked).toBe(true);
    expect((field(panel, 'ignoreHidden') as HTMLInputElement).checked).toBe(false);
    expect((field(panel, 'ignoredTypes') as HTMLInputElement).value).toBe('button, submit');
    expect((field(panel, 'ignoredDomains') as HTMLTextAreaElement).value).toBe(
      'example.com\nother.test',
    );
    expect((field(panel, 'matchAttributes') as HTMLInputElement).value).toBe('name, id');
  });

  it('pre-fills controls from the defaults', () => {
    const defaults = createDefaultSettings();
    const panel = renderGlobalPanel(defaults, handlers());
    expect((field(panel, 'defaultMaxLength') as HTMLInputElement).value).toBe(
      String(defaults.defaults.defaultMaxLength),
    );
    expect((field(panel, 'triggerEvents') as HTMLInputElement).checked).toBe(
      defaults.defaults.triggerEvents,
    );
    expect((field(panel, 'ignoreHidden') as HTMLInputElement).checked).toBe(defaults.ignore.hidden);
    expect((field(panel, 'ignoredTypes') as HTMLInputElement).value).toBe(
      defaults.ignore.types.join(', '),
    );
    expect((field(panel, 'matchAttributes') as HTMLInputElement).value).toBe(
      defaults.match.attributes.join(', '),
    );
  });

  it('renders an export textarea and a wired export button', () => {
    const callbacks = handlers();
    const panel = renderGlobalPanel(createDefaultSettings(), callbacks);
    expect(field(panel, 'exportOutput')).toBeInstanceOf(HTMLTextAreaElement);
    action(panel, 'export')?.click();
    expect(callbacks.onExport).toHaveBeenCalledOnce();
  });

  it('renders a file input whose change calls onImport', () => {
    const callbacks = handlers();
    const panel = renderGlobalPanel(createDefaultSettings(), callbacks);
    const input = field(panel, 'importFile') as HTMLInputElement;
    expect(input.type).toBe('file');
    input.dispatchEvent(new Event('change'));
    expect(callbacks.onImport).toHaveBeenCalledOnce();
    expect((callbacks.onImport as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBeInstanceOf(
      Event,
    );
  });

  it('keeps its data-field controls queryable while the panel is closed', () => {
    const panel = renderGlobalPanel(createDefaultSettings(), handlers());
    expect((panel as HTMLDetailsElement).open).toBe(false);
    expect(field(panel, 'defaultMaxLength')).not.toBeNull();
    expect(field(panel, 'matchAttributes')).not.toBeNull();
    expect(field(panel, 'exportOutput')).not.toBeNull();
    expect(field(panel, 'importFile')).not.toBeNull();
  });
});
