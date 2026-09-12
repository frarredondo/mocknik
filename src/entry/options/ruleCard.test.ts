import { describe, expect, it, vi } from 'vitest';
import { systemClock } from '../../domain/clock';
import { createDefaultRegistry } from '../../domain/generators/defaultRegistry';
import { createRandom } from '../../domain/random';
import { FIELD_TYPES, MATCH_KINDS, RULE_ACTIONS } from '../../domain/types';
import type { FieldRule, MatchAttribute } from '../../domain/types';
import { describeRule } from './describe';
import type { PreviewDeps } from './preview';
import type { RuleCardActions } from './ruleCard';
import { renderRuleCard } from './ruleCard';
import { action, field } from './view';

const registry = createDefaultRegistry();
const fallback: readonly MatchAttribute[] = ['name', 'id', 'label', 'placeholder'];

function deps(): PreviewDeps {
  return {
    registry,
    random: createRandom(0),
    secureRandom: createRandom(0),
    clock: systemClock,
  };
}

function rule(overrides: Partial<FieldRule> = {}): FieldRule {
  return {
    id: 'rule-a',
    name: 'Email address',
    match: { kind: 'contains', patterns: ['email'], attributes: ['name', 'id'] },
    fieldType: 'email',
    ...overrides,
  };
}

function actions(): RuleCardActions {
  return {
    moveUp: vi.fn(),
    moveDown: vi.fn(),
    duplicate: vi.fn(),
    remove: vi.fn(),
  };
}

describe('renderRuleCard — shape', () => {
  it('renders a card root carrying the rule index', () => {
    const card = renderRuleCard(rule(), 2, fallback, deps(), actions());
    expect(card.classList.contains('rule')).toBe(true);
    expect(card.classList.contains('card')).toBe(true);
    expect(card.getAttribute('data-rule-index')).toBe('2');
  });
});

describe('renderRuleCard — canonical fields', () => {
  it('pre-fills a visible name, kind and field type', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const name = field(card, 'rule-name') as HTMLInputElement;
    expect(name.value).toBe('Email address');
    expect(name.type).toBe('text');
    expect(name.hidden).toBe(false);
    expect((field(card, 'rule-kind') as HTMLSelectElement).value).toBe('contains');
    expect((field(card, 'rule-fieldType') as HTMLSelectElement).value).toBe('email');
  });

  it('renders the field type select with a default option followed by every FIELD_TYPES entry', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const select = field(card, 'rule-fieldType') as HTMLSelectElement;
    expect(select.options[0]?.value).toBe('');
    expect(Array.from(select.options).slice(1).map((option) => option.value)).toEqual([
      ...FIELD_TYPES,
    ]);
  });

  it('renders the kind select with every MATCH_KINDS entry', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const select = field(card, 'rule-kind') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual([...MATCH_KINDS]);
  });

  it('gives the inline selects an accessible name', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    expect(field(card, 'rule-kind')?.getAttribute('aria-label')).toBe('Match kind');
    expect(field(card, 'rule-fieldType')?.getAttribute('aria-label')).toBe('Field type');
  });

  it('keeps patterns in a hidden canonical input matching the rule', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const patterns = field(card, 'rule-patterns') as HTMLInputElement;
    expect(patterns.type).toBe('hidden');
    expect(patterns.value).toBe('email');
  });

  it('keeps attributes in a hidden canonical input matching the rule', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const attributes = field(card, 'rule-attributes') as HTMLInputElement;
    expect(attributes.type).toBe('hidden');
    expect(attributes.value).toBe('name, id');
  });

  it('leaves the attribute canonical input empty when the rule omits attributes', () => {
    const card = renderRuleCard(
      rule({ match: { kind: 'contains', patterns: ['x'] } }),
      0,
      fallback,
      deps(),
      actions(),
    );
    expect((field(card, 'rule-attributes') as HTMLInputElement).value).toBe('');
  });

  it('binds the action segmented control to a per-card unique radio group', () => {
    const card = renderRuleCard(rule(), 3, fallback, deps(), actions());
    expect((field(card, 'rule-action') as HTMLInputElement).value).toBe('fill');
    const radios = card.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(RULE_ACTIONS.length);
    for (const radio of radios) expect(radio.name).toBe('rule-action-3');
  });
});

describe('renderRuleCard — preview', () => {
  function preview(card: HTMLElement): HTMLElement {
    const node = field(card, 'rule-preview');
    expect(node).not.toBeNull();
    return node as HTMLElement;
  }

  it('is a polite live region with a generated example for a fill rule', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    expect(preview(card).getAttribute('aria-live')).toBe('polite');
    expect(preview(card).textContent).toMatch(/\S+@\S+\.\S+/);
  });

  it('explains a skip rule', () => {
    const card = renderRuleCard(
      rule({ action: 'skip', fieldType: undefined }),
      0,
      fallback,
      deps(),
      actions(),
    );
    expect(preview(card).textContent).toMatch(/untouched/i);
  });

  it('explains a mirror rule', () => {
    const card = renderRuleCard(
      rule({ action: 'mirror', mirrorSource: 'previous-password', fieldType: undefined }),
      0,
      fallback,
      deps(),
      actions(),
    );
    expect(preview(card).textContent).toMatch(/password/i);
  });

  it('recomputes when the action changes', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const skip = card.querySelector<HTMLInputElement>('input[value="skip"]') as HTMLInputElement;
    skip.checked = true;
    skip.dispatchEvent(new Event('change', { bubbles: true }));
    expect(preview(card).textContent).toMatch(/untouched/i);
  });

  it('recomputes when the field type changes', () => {
    const card = renderRuleCard(rule({ fieldType: 'text' }), 0, fallback, deps(), actions());
    const select = field(card, 'rule-fieldType') as HTMLSelectElement;
    select.value = 'email';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(preview(card).textContent).toMatch(/\S+@\S+\.\S+/);
  });

  it('recomputes when the literal value changes', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const value = field(card, 'rule-value') as HTMLInputElement;
    value.value = 'literal@example.com';
    value.dispatchEvent(new Event('input', { bubbles: true }));
    expect(preview(card).textContent).toBe('literal@example.com');
  });

  it('recomputes when the template changes', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const template = field(card, 'rule-template') as HTMLInputElement;
    template.value = '[n]ote';
    template.dispatchEvent(new Event('input', { bubbles: true }));
    expect(preview(card).textContent).toBe('note');
  });

  it('recomputes when the options change', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const options = field(card, 'rule-options') as HTMLTextAreaElement;
    options.value = JSON.stringify({ local: 'literal', literal: 'bob' });
    options.dispatchEvent(new Event('input', { bubbles: true }));
    expect(preview(card).textContent?.startsWith('bob@')).toBe(true);
  });
});

describe('renderRuleCard — Advanced', () => {
  it('is closed by default with queryable value/template/options controls', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const details = card.querySelector('details');
    expect(details).toBeInstanceOf(HTMLDetailsElement);
    expect((details as HTMLDetailsElement).open).toBe(false);
    expect(field(card, 'rule-value')).not.toBeNull();
    expect(field(card, 'rule-template')).not.toBeNull();
    expect(field(card, 'rule-options')).not.toBeNull();
  });

  it('pre-fills the advanced controls from the rule', () => {
    const card = renderRuleCard(
      rule({ value: { kind: 'text', value: 'fixed' }, template: 'user-####', options: { level: 3 } }),
      0,
      fallback,
      deps(),
      actions(),
    );
    expect((field(card, 'rule-value') as HTMLInputElement).value).toBe('fixed');
    expect((field(card, 'rule-template') as HTMLInputElement).value).toBe('user-####');
    expect((field(card, 'rule-options') as HTMLTextAreaElement).value).toBe(
      JSON.stringify({ level: 3 }, null, 2),
    );
  });

  it('renders the options textarea as an empty object when options are unset', () => {
    const card = renderRuleCard(rule({ options: undefined }), 0, fallback, deps(), actions());
    expect((field(card, 'rule-options') as HTMLTextAreaElement).value).toBe(
      JSON.stringify({}, null, 2),
    );
  });
});

describe('renderRuleCard — badge', () => {
  it('badges a regex rule', () => {
    const card = renderRuleCard(
      rule({ match: { kind: 'regex', patterns: ['^a$'] } }),
      0,
      fallback,
      deps(),
      actions(),
    );
    expect(card.querySelector('[data-badge="regex"]')).not.toBeNull();
  });

  it('badges a literal value', () => {
    const card = renderRuleCard(
      rule({ value: { kind: 'text', value: 'x' } }),
      0,
      fallback,
      deps(),
      actions(),
    );
    expect(card.querySelector('[data-badge="literal"]')).not.toBeNull();
  });

  it('badges a template', () => {
    const card = renderRuleCard(rule({ template: 'llll' }), 0, fallback, deps(), actions());
    expect(card.querySelector('[data-badge="template"]')).not.toBeNull();
  });

  it('renders no badge for a plain rule', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    expect(card.querySelector('[data-badge]')).toBeNull();
  });
});

describe('renderRuleCard — move boundaries', () => {
  it('disables move up on the first card', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    expect(action(card, 'move-rule-up')?.hasAttribute('disabled')).toBe(true);
  });

  it('disables move down on the last card when the total is known', () => {
    const card = renderRuleCard(rule(), 2, fallback, deps(), actions(), 3);
    expect(action(card, 'move-rule-down')?.hasAttribute('disabled')).toBe(true);
    expect(action(card, 'move-rule-up')?.hasAttribute('disabled')).toBe(false);
  });

  it('leaves both move buttons enabled in the middle', () => {
    const card = renderRuleCard(rule(), 1, fallback, deps(), actions(), 3);
    expect(action(card, 'move-rule-up')?.hasAttribute('disabled')).toBe(false);
    expect(action(card, 'move-rule-down')?.hasAttribute('disabled')).toBe(false);
  });
});

describe('renderRuleCard — actions', () => {
  it('wires every action button to its callback', () => {
    const handlers = actions();
    const card = renderRuleCard(rule(), 1, fallback, deps(), handlers, 3);

    action(card, 'move-rule-up')?.click();
    action(card, 'move-rule-down')?.click();
    action(card, 'duplicate-rule')?.click();
    action(card, 'delete-rule')?.click();

    expect(handlers.moveUp).toHaveBeenCalledOnce();
    expect(handlers.moveDown).toHaveBeenCalledOnce();
    expect(handlers.duplicate).toHaveBeenCalledOnce();
    expect(handlers.remove).toHaveBeenCalledOnce();
  });
});

describe('renderRuleCard — chip action hooks', () => {
  it('exposes add/remove hooks for patterns and attributes', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const patternsEditor = card
      .querySelector('[data-chip-input="rule-patterns"]')
      ?.closest('.chip-editor');
    const attributesEditor = card
      .querySelector('[data-chip-input="rule-attributes"]')
      ?.closest('.chip-editor');

    expect(
      card.querySelector('[data-chip-input="rule-patterns"]')?.getAttribute('data-action'),
    ).toBe('add-pattern');
    expect(
      card.querySelector('[data-chip-input="rule-attributes"]')?.getAttribute('data-action'),
    ).toBe('add-attribute');
    expect(patternsEditor?.querySelector('[data-chip-remove]')?.getAttribute('data-action')).toBe(
      'remove-pattern',
    );
    expect(
      attributesEditor?.querySelector('[data-chip-remove]')?.getAttribute('data-action'),
    ).toBe('remove-attribute');
  });
});

describe('renderRuleCard — inherited attributes', () => {
  function attributesEditor(card: HTMLElement): HTMLElement {
    return card
      .querySelector('[data-field="rule-attributes"]')!
      .closest('.chip-editor') as HTMLElement;
  }

  function chipValues(editor: HTMLElement): (string | null)[] {
    return Array.from(editor.querySelectorAll('.chip[data-chip]')).map((chip) =>
      chip.getAttribute('data-chip'),
    );
  }

  it('shows the fallback attributes as muted, non-removable chips when the rule omits attributes', () => {
    const card = renderRuleCard(
      rule({ match: { kind: 'contains', patterns: ['x'] } }),
      0,
      fallback,
      deps(),
      actions(),
    );
    const editor = attributesEditor(card);
    expect(chipValues(editor)).toEqual([...fallback]);
    for (const chip of editor.querySelectorAll('.chip[data-chip]')) {
      expect(chip.classList.contains('chip--inherited')).toBe(true);
    }
    expect(editor.querySelectorAll('[data-chip-remove]')).toHaveLength(0);
    expect((field(card, 'rule-attributes') as HTMLInputElement).value).toBe('');
  });

  it('offers a Customize control in inherited mode', () => {
    const card = renderRuleCard(
      rule({ match: { kind: 'contains', patterns: ['x'] } }),
      0,
      fallback,
      deps(),
      actions(),
    );
    const override = action(card, 'override-rule-attributes');
    expect(override).not.toBeNull();
    expect(override?.hasAttribute('hidden')).toBe(false);
  });

  it('materializes the inherited fallback when Customize is clicked', () => {
    const card = renderRuleCard(
      rule({ match: { kind: 'contains', patterns: ['x'] } }),
      0,
      fallback,
      deps(),
      actions(),
    );
    action(card, 'override-rule-attributes')?.click();
    expect((field(card, 'rule-attributes') as HTMLInputElement).value).toBe(fallback.join(', '));
    expect(attributesEditor(card).querySelectorAll('[data-chip-remove]')).toHaveLength(
      fallback.length,
    );
  });

  it('shows editable, removable chips and a populated input when attributes are explicit', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    const editor = attributesEditor(card);
    expect((field(card, 'rule-attributes') as HTMLInputElement).value).toBe('name, id');
    expect(editor.querySelectorAll('[data-chip-remove]')).toHaveLength(2);
    expect(editor.querySelector('.chip--inherited')).toBeNull();
    expect(action(card, 'override-rule-attributes')?.hidden).toBe(true);
  });

  it('renders exactly the attribute set describeRule reports', () => {
    const source = rule({ match: { kind: 'contains', patterns: ['x'] } });
    const card = renderRuleCard(source, 0, fallback, deps(), actions());
    expect(chipValues(attributesEditor(card))).toEqual([...describeRule(source, fallback).attributes]);
  });

  it('sets placeholders on the pattern and attribute add fields', () => {
    const card = renderRuleCard(rule(), 0, fallback, deps(), actions());
    expect(
      card.querySelector('[data-chip-input="rule-patterns"]')?.getAttribute('placeholder'),
    ).toBe('+ pattern');
    expect(
      card.querySelector('[data-chip-input="rule-attributes"]')?.getAttribute('placeholder'),
    ).toBe('+ attribute');
  });
});
