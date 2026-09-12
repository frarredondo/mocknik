import { describe, expect, it } from 'vitest';
import { field } from './view';
import { chipEditor, disclosure, segmented } from './widgets';

function hiddenValue(root: ParentNode, name: string): string {
  return (field(root, name) as HTMLInputElement).value;
}

function pressEnter(input: HTMLInputElement): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

describe('chipEditor', () => {
  it('renders a canonical hidden input joined by comma-space', () => {
    const root = chipEditor('rule-patterns', ['confirm', 'retype']);
    const canonical = field(root, 'rule-patterns');
    expect(canonical).toBeInstanceOf(HTMLInputElement);
    expect((canonical as HTMLInputElement).type).toBe('hidden');
    expect((canonical as HTMLInputElement).value).toBe('confirm, retype');
  });

  it('renders a visible add input bound to the name', () => {
    const root = chipEditor('rule-patterns', []);
    const input = root.querySelector<HTMLInputElement>('[data-chip-input="rule-patterns"]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input?.type).not.toBe('hidden');
  });

  it('renders one chip per value with a real remove button showing the value', () => {
    const root = chipEditor('rule-attributes', ['name', 'id', 'label']);
    const removes = root.querySelectorAll('[data-chip-remove]');
    expect(removes).toHaveLength(3);
    for (const button of removes) {
      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button.getAttribute('type')).toBe('button');
    }
    expect(root.textContent).toContain('name');
    expect(root.textContent).toContain('id');
    expect(root.textContent).toContain('label');
  });

  it('removes a chip and rewrites the canonical hidden input', () => {
    const root = chipEditor('rule-patterns', ['confirm', 'retype']);
    const retype = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-chip-remove]')).find(
      (b) => b.closest('.chip')?.textContent?.includes('retype'),
    );
    retype?.click();
    expect(hiddenValue(root, 'rule-patterns')).toBe('confirm');
    expect(root.querySelectorAll('[data-chip-remove]')).toHaveLength(1);
  });

  it('appends a trimmed value on Enter and re-renders chips', () => {
    const root = chipEditor('rule-patterns', ['confirm']);
    const input = root.querySelector<HTMLInputElement>('[data-chip-input="rule-patterns"]')!;
    input.value = '  repeat  ';
    pressEnter(input);
    expect(hiddenValue(root, 'rule-patterns')).toBe('confirm, repeat');
    expect(root.querySelectorAll('[data-chip-remove]')).toHaveLength(2);
    expect(input.value).toBe('');
  });

  it('dedupes values already present', () => {
    const root = chipEditor('rule-patterns', ['confirm']);
    const input = root.querySelector<HTMLInputElement>('[data-chip-input="rule-patterns"]')!;
    input.value = 'confirm';
    pressEnter(input);
    expect(hiddenValue(root, 'rule-patterns')).toBe('confirm');
    expect(root.querySelectorAll('[data-chip-remove]')).toHaveLength(1);
  });

  it('ignores empty and whitespace-only input', () => {
    const root = chipEditor('rule-patterns', ['confirm']);
    const input = root.querySelector<HTMLInputElement>('[data-chip-input="rule-patterns"]')!;
    input.value = '   ';
    pressEnter(input);
    expect(hiddenValue(root, 'rule-patterns')).toBe('confirm');
    expect(root.querySelectorAll('[data-chip-remove]')).toHaveLength(1);
  });

  it('keeps the hidden input in sync after a remove and a subsequent add', () => {
    const root = chipEditor('rule-patterns', ['confirm', 'retype']);
    root.querySelector<HTMLButtonElement>('[data-chip-remove]')!.click();
    const input = root.querySelector<HTMLInputElement>('[data-chip-input="rule-patterns"]')!;
    input.value = 'secondary';
    pressEnter(input);
    expect(hiddenValue(root, 'rule-patterns')).toBe('retype, secondary');
  });

  it('adds data-action hooks to the add input and remove buttons when requested', () => {
    const root = chipEditor('rule-patterns', ['confirm'], {
      addAction: 'add-pattern',
      removeAction: 'remove-pattern',
    });
    expect(
      root.querySelector('[data-chip-input="rule-patterns"]')?.getAttribute('data-action'),
    ).toBe('add-pattern');
    expect(root.querySelector('[data-chip-remove]')?.getAttribute('data-action')).toBe(
      'remove-pattern',
    );
  });

  it('omits data-action hooks by default', () => {
    const root = chipEditor('rule-patterns', ['confirm']);
    expect(root.querySelector('[data-chip-input]')?.hasAttribute('data-action')).toBe(false);
    expect(root.querySelector('[data-chip-remove]')?.hasAttribute('data-action')).toBe(false);
  });

  it('sets placeholder text on the add input when requested', () => {
    const root = chipEditor('rule-patterns', [], { placeholder: '+ pattern' });
    expect(root.querySelector('[data-chip-input="rule-patterns"]')?.getAttribute('placeholder')).toBe(
      '+ pattern',
    );
  });
});

describe('chipEditor inherited mode', () => {
  const values = ['name', 'id', 'label'];

  it('renders the inherited values as muted chips with no remove buttons and an empty hidden input', () => {
    const root = chipEditor('rule-attributes', values, { inherited: true });
    expect(hiddenValue(root, 'rule-attributes')).toBe('');
    for (const value of values) {
      const chip = root.querySelector(`.chip[data-chip="${value}"]`);
      expect(chip).not.toBeNull();
      expect(chip?.classList.contains('chip--inherited')).toBe(true);
      expect(chip?.querySelector('[data-chip-remove]')).toBeNull();
    }
    expect(root.querySelectorAll('[data-chip-remove]')).toHaveLength(0);
  });

  it('offers a Customize button that materializes the inherited values', () => {
    const root = chipEditor('rule-attributes', values, { inherited: true });
    const override = root.querySelector<HTMLButtonElement>(
      '[data-action="override-rule-attributes"]',
    );
    expect(override).toBeInstanceOf(HTMLButtonElement);
    expect(override?.getAttribute('type')).toBe('button');
    expect(override?.textContent).toBe('Customize');
    override?.click();
    expect(hiddenValue(root, 'rule-attributes')).toBe('name, id, label');
    expect(root.querySelectorAll('[data-chip-remove]')).toHaveLength(3);
    expect(root.querySelector('.chip--inherited')).toBeNull();
    expect(override?.hidden).toBe(true);
  });

  it('honours a custom override label', () => {
    const root = chipEditor('rule-attributes', values, {
      inherited: true,
      overrideLabel: 'Override',
    });
    expect(root.querySelector('[data-action="override-rule-attributes"]')?.textContent).toBe(
      'Override',
    );
  });

  it('materializes the inherited values when adding via the add field', () => {
    const root = chipEditor('rule-attributes', values, { inherited: true });
    const input = root.querySelector<HTMLInputElement>('[data-chip-input="rule-attributes"]')!;
    input.value = 'title';
    pressEnter(input);
    expect(hiddenValue(root, 'rule-attributes')).toBe('name, id, label, title');
    expect(root.querySelectorAll('[data-chip-remove]')).toHaveLength(4);
  });

  it('returns the hidden input to empty when every explicit chip is removed', () => {
    const root = chipEditor('rule-attributes', ['name'], { inherited: true });
    root.querySelector<HTMLButtonElement>('[data-action="override-rule-attributes"]')!.click();
    expect(hiddenValue(root, 'rule-attributes')).toBe('name');
    root.querySelector<HTMLButtonElement>('[data-chip-remove]')!.click();
    expect(hiddenValue(root, 'rule-attributes')).toBe('');
  });

  it('gives inherited chips an accessible name explaining they are global defaults', () => {
    const root = chipEditor('rule-attributes', values, { inherited: true });
    const chip = root.querySelector('.chip[data-chip="name"]');
    expect(chip?.getAttribute('aria-label')).toMatch(/default/i);
    expect(chip?.getAttribute('title')).toMatch(/default/i);
  });

  it('keeps the Customize control a focusable button with a discernible name', () => {
    const root = chipEditor('rule-attributes', values, { inherited: true });
    const override = root.querySelector<HTMLButtonElement>(
      '[data-action="override-rule-attributes"]',
    );
    expect(override?.tagName).toBe('BUTTON');
    const name = override?.getAttribute('aria-label') ?? override?.textContent ?? '';
    expect(name.length).toBeGreaterThan(0);
  });
});

describe('segmented', () => {
  const options = [
    { value: 'fill', label: 'Fill' },
    { value: 'skip', label: 'Skip' },
    { value: 'mirror', label: 'Mirror' },
  ];

  it('renders a fieldset with an accessible legend', () => {
    const root = segmented('rule-action', options, 'fill', 'Action');
    const fieldset = root.querySelector('fieldset');
    expect(fieldset).not.toBeNull();
    expect(fieldset?.querySelector('legend')?.textContent).toBe('Action');
  });

  it('renders one radio per option, each with a label', () => {
    const root = segmented('rule-action', options, 'fill', 'Action');
    const radios = root.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(3);
    for (const radio of radios) {
      expect(radio.name).toBe('rule-action');
      expect(root.querySelector(`label[for="${radio.id}"]`)?.textContent).toBe(
        options.find((o) => o.value === radio.value)?.label,
      );
    }
  });

  it('checks exactly the option matching the value', () => {
    const root = segmented('rule-action', options, 'mirror', 'Action');
    const checked = root.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked');
    expect(checked).toHaveLength(1);
    expect(checked[0]?.value).toBe('mirror');
  });

  it('carries the current value in the canonical hidden input', () => {
    const root = segmented('rule-action', options, 'skip', 'Action');
    expect(hiddenValue(root, 'rule-action')).toBe('skip');
  });

  it('updates the hidden input when a radio changes', () => {
    const root = segmented('rule-action', options, 'fill', 'Action');
    const skip = root.querySelector<HTMLInputElement>('input[value="skip"]')!;
    skip.checked = true;
    skip.dispatchEvent(new Event('change', { bubbles: true }));
    expect(hiddenValue(root, 'rule-action')).toBe('skip');
  });

  it('keeps controls with the same field name but different radio names independent', () => {
    const first = segmented('rule-action', options, 'fill', 'Action', 'rule-action-0');
    const second = segmented('rule-action', options, 'skip', 'Action', 'rule-action-1');

    for (const radio of first.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      expect(radio.name).toBe('rule-action-0');
    }
    for (const radio of second.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      expect(radio.name).toBe('rule-action-1');
    }

    expect(hiddenValue(first, 'rule-action')).toBe('fill');
    expect(hiddenValue(second, 'rule-action')).toBe('skip');

    const mirror = first.querySelector<HTMLInputElement>('input[value="mirror"]')!;
    mirror.checked = true;
    mirror.dispatchEvent(new Event('change', { bubbles: true }));

    expect(hiddenValue(first, 'rule-action')).toBe('mirror');
    expect(hiddenValue(second, 'rule-action')).toBe('skip');
  });
});

describe('disclosure', () => {
  it('is closed by default and open when requested', () => {
    const body = document.createElement('div');
    expect(disclosure('Advanced', body).open).toBe(false);
    expect(disclosure('Advanced', body, true).open).toBe(true);
  });

  it('renders the summary text and appends the body', () => {
    const body = document.createElement('div');
    body.textContent = 'body content';
    const details = disclosure('Advanced', body);
    expect(details.querySelector('summary')?.textContent).toBe('Advanced');
    expect(details.querySelector('div')?.textContent).toBe('body content');
  });

  it('keeps data-field controls queryable while closed', () => {
    const body = document.createElement('div');
    body.append(document.createElement('input'));
    body.firstElementChild?.setAttribute('data-field', 'rule-value');
    const details = disclosure('Advanced', body);
    expect(details.open).toBe(false);
    expect(field(details, 'rule-value')).not.toBeNull();
  });
});
