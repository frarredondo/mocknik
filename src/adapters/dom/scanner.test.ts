import { describe, expect, it, vi } from 'vitest';
import type { IgnoreSettings } from '../../domain/types';
import { createDomScanner } from './scanner';

function ignore(partial: Partial<IgnoreSettings> = {}): IgnoreSettings {
  return { hidden: false, withContent: false, types: [], domains: [], ...partial };
}

function scanner(settings: IgnoreSettings = ignore()): ReturnType<typeof createDomScanner> {
  return createDomScanner(document, { getIgnore: () => settings });
}

function render(html: string): void {
  document.body.innerHTML = html;
}

function focus(selector: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`missing fixture: ${selector}`);
  }
  element.focus();
}

describe('createDomScanner', () => {
  it('selects every form control for the all scope', () => {
    render(
      '<input name="a" /><textarea name="b"></textarea><select name="c"><option value="x">X</option></select><div contenteditable="true"></div>',
    );
    const fields = scanner().select('all');
    expect(fields).toHaveLength(4);
    expect(fields.map((field) => field.descriptor.tag)).toEqual([
      'input',
      'textarea',
      'select',
      'contenteditable',
    ]);
    expect(fields[2]?.descriptor.options).toEqual([{ value: 'x', label: 'X', disabled: false }]);
  });

  it('assigns stable unique ids per scan', () => {
    render('<input name="a" /><input name="b" />');
    const first = scanner()
      .select('all')
      .map((field) => field.id);
    const second = scanner()
      .select('all')
      .map((field) => field.id);
    expect(first).toEqual(['field-0', 'field-1']);
    expect(second).toEqual(first);
  });

  it('selects only the fields of the form containing the active element', () => {
    render('<form id="one"><input name="a" /><input name="b" /></form><form id="two"><input name="c" /></form>');
    focus('#one input');
    const fields = scanner().select('form');
    expect(fields.map((field) => field.descriptor.name)).toEqual(['a', 'b']);
  });

  it('returns no fields for the form scope when the active element is outside a form', () => {
    render('<form><input name="a" /></form><input id="outside" name="b" />');
    focus('#outside');
    expect(scanner().select('form')).toEqual([]);
  });

  it('selects only the active element for the focused scope', () => {
    render('<input name="a" /><input id="b" name="b" />');
    focus('#b');
    const fields = scanner().select('focused');
    expect(fields).toHaveLength(1);
    expect(fields[0]?.descriptor.name).toBe('b');
  });

  it('returns no fields for the focused scope when the active element is not a form control', () => {
    render('<input name="a" /><div id="plain"></div>');
    expect(scanner().select('focused')).toEqual([]);
  });

  it('excludes disabled and readonly controls', () => {
    render(
      '<input name="a" /><input name="b" disabled /><input name="c" readonly /><textarea name="d" readonly></textarea>',
    );
    expect(scanner()
      .select('all')
      .map((field) => field.descriptor.name)).toEqual(['a']);
  });

  it('excludes ignored types by descriptor type and by tag', () => {
    render(
      '<input type="checkbox" name="a" /><input type="text" name="b" /><select name="c"><option value="x">X</option></select><div contenteditable="true" name="d"></div>',
    );
    const fields = scanner(ignore({ types: ['checkbox', 'select', 'contenteditable'] })).select('all');
    expect(fields.map((field) => field.descriptor.name)).toEqual(['b']);
  });

  it('excludes hidden fields only when ignore.hidden is set', () => {
    render('<input type="hidden" name="a" /><input name="b" />');
    expect(scanner().select('all')).toHaveLength(2);
    expect(scanner(ignore({ hidden: true }))
      .select('all')
      .map((field) => field.descriptor.name)).toEqual(['b']);
  });

  it('excludes fields that already have content when ignore.withContent is set', () => {
    render(
      '<input name="a" value="taken" /><input name="b" value="" /><textarea name="c">text</textarea><select name="d"><option value="x" selected>X</option></select>',
    );
    const fields = scanner(ignore({ withContent: true })).select('all');
    expect(fields.map((field) => field.descriptor.name)).toEqual(['b']);
  });

  it('excludes checked checkboxes and checked radio groups when ignore.withContent is set', () => {
    render(
      '<input type="checkbox" name="a" checked /><input type="checkbox" name="b" /><input type="radio" name="g" value="1" /><input type="radio" name="g" value="2" checked />',
    );
    const fields = scanner(ignore({ withContent: true })).select('all');
    expect(fields.map((field) => field.descriptor.name)).toEqual(['b']);
  });

  it('yields one field per radio group', () => {
    render(
      '<input type="radio" id="r1" name="g" value="1" /><input type="radio" id="r2" name="g" value="2" /><input type="radio" id="r3" name="h" value="3" />',
    );
    const fields = scanner().select('all');
    expect(fields).toHaveLength(2);
    expect(fields.map((field) => field.descriptor.id)).toEqual(['r1', 'r3']);
  });

  it('creates fields that dispatch events when written', () => {
    render('<input name="a" />');
    const field = scanner().select('all')[0];
    const onInput = vi.fn();
    document.querySelector('input')?.addEventListener('input', onInput);
    field?.write({ kind: 'text', value: 'x' });
    expect(onInput).toHaveBeenCalledOnce();
  });
});
