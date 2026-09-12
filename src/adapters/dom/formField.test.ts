import { describe, expect, it, vi } from 'vitest';
import { createDomField } from './formField';

function render(html: string): void {
  document.body.innerHTML = html;
}

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing fixture: ${selector}`);
  }
  return element;
}

function selectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

describe('createDomField', () => {
  it('falls back from id to name to a generic id', () => {
    render('<input name="user" /><input />');
    expect(createDomField(query('[name="user"]'), { triggerEvents: false }).id).toBe('user');
    expect(createDomField(query('input:not([name])'), { triggerEvents: false }).id).toBe('field');
  });

  describe('read', () => {
    it('reads text inputs', () => {
      render('<input value="hello" />');
      const field = createDomField(query('input'), { triggerEvents: false });
      expect(field.read()).toEqual({ kind: 'text', value: 'hello' });
    });

    it('reads checkbox and radio checked state', () => {
      render('<input id="a" type="checkbox" checked /><input id="b" type="radio" />');
      expect(createDomField(query('#a'), { triggerEvents: false }).read()).toEqual({
        kind: 'checked',
        value: true,
      });
      expect(createDomField(query('#b'), { triggerEvents: false }).read()).toEqual({
        kind: 'checked',
        value: false,
      });
    });

    it('reads single select choices', () => {
      render('<select><option value="red">Red</option><option value="blue">Blue</option></select>');
      const field = createDomField(query('select'), { triggerEvents: false });
      expect(field.read()).toEqual({ kind: 'choice', value: 'red' });
    });

    it('reads multiple select choices', () => {
      render(
        '<select multiple><option value="a" selected>A</option><option value="b">B</option><option value="c" selected>C</option></select>',
      );
      const field = createDomField(query('select'), { triggerEvents: false });
      expect(field.read()).toEqual({ kind: 'multiChoice', value: ['a', 'c'] });
    });

    it('reads contenteditable text', () => {
      render('<div contenteditable="true">hello</div>');
      const field = createDomField(query('[contenteditable]'), { triggerEvents: false });
      expect(field.read()).toEqual({ kind: 'text', value: 'hello' });
    });
  });

  describe('write', () => {
    it('writes text through the native setter and fires input, change, blur in order', () => {
      render('<input id="txt" name="txt" type="text" />');
      const element = query<HTMLInputElement>('#txt');
      const setter = vi.spyOn(HTMLInputElement.prototype, 'value', 'set');
      const order: string[] = [];
      element.addEventListener('input', () => order.push('input'));
      element.addEventListener('change', () => order.push('change'));
      element.addEventListener('blur', () => order.push('blur'));
      createDomField(element, { triggerEvents: true }).write({ kind: 'text', value: 'hello' });
      expect(setter).toHaveBeenCalledOnce();
      expect(element.value).toBe('hello');
      expect(order).toEqual(['input', 'change', 'blur']);
    });

    it('dispatches bubbling events', () => {
      render('<div id="wrap"><input id="txt" /></div>');
      const element = query<HTMLInputElement>('#txt');
      const onInput = vi.fn();
      query('#wrap').addEventListener('input', onInput);
      createDomField(element, { triggerEvents: true }).write({ kind: 'text', value: 'x' });
      expect(onInput).toHaveBeenCalledOnce();
    });

    it('writes textarea values', () => {
      render('<textarea name="bio"></textarea>');
      const element = query<HTMLTextAreaElement>('textarea');
      createDomField(element, { triggerEvents: false }).write({ kind: 'text', value: 'bio' });
      expect(element.value).toBe('bio');
    });

    it('fires nothing when triggerEvents is false', () => {
      render('<input id="txt" />');
      const element = query<HTMLInputElement>('#txt');
      const onInput = vi.fn();
      const onChange = vi.fn();
      const onBlur = vi.fn();
      element.addEventListener('input', onInput);
      element.addEventListener('change', onChange);
      element.addEventListener('blur', onBlur);
      createDomField(element, { triggerEvents: false }).write({ kind: 'text', value: 'quiet' });
      expect(element.value).toBe('quiet');
      expect(onInput).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
      expect(onBlur).not.toHaveBeenCalled();
    });

    it('checks a checkbox through click', () => {
      render('<input type="checkbox" name="agree" />');
      const element = query<HTMLInputElement>('input');
      const onClick = vi.fn();
      const onChange = vi.fn();
      element.addEventListener('click', onClick);
      element.addEventListener('change', onChange);
      const field = createDomField(element, { triggerEvents: true });
      field.write({ kind: 'checked', value: true });
      expect(element.checked).toBe(true);
      expect(onClick).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledOnce();
      field.write({ kind: 'checked', value: false });
      expect(element.checked).toBe(false);
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('selects the radio whose value matches a choice', () => {
      render(
        '<input id="a" type="radio" name="g" value="alpha" />' +
          '<input id="b" type="radio" name="g" value="beta" />',
      );
      const first = query<HTMLInputElement>('#a');
      const second = query<HTMLInputElement>('#b');
      createDomField(first, { triggerEvents: true }).write({
        kind: 'choice',
        value: 'beta',
      });
      expect(second.checked).toBe(true);
      expect(first.checked).toBe(false);
    });

    it('selects a radio through click', () => {
      render('<input id="a" type="radio" name="g" value="a" /><input id="b" type="radio" name="g" value="b" />');
      const first = query<HTMLInputElement>('#a');
      const second = query<HTMLInputElement>('#b');
      createDomField(first, { triggerEvents: true }).write({ kind: 'checked', value: true });
      expect(first.checked).toBe(true);
      expect(second.checked).toBe(false);
      createDomField(second, { triggerEvents: true }).write({ kind: 'checked', value: true });
      expect(first.checked).toBe(false);
      expect(second.checked).toBe(true);
    });

    it('selects a single option by value and notifies', () => {
      render('<select name="color"><option value="red">Red</option><option value="blue">Blue</option></select>');
      const element = query<HTMLSelectElement>('select');
      const onChange = vi.fn();
      const onInput = vi.fn();
      element.addEventListener('change', onChange);
      element.addEventListener('input', onInput);
      const field = createDomField(element, { triggerEvents: true });
      field.write({ kind: 'choice', value: 'blue' });
      expect(element.value).toBe('blue');
      expect(onChange).toHaveBeenCalledOnce();
      expect(onInput).toHaveBeenCalledOnce();
    });

    it('selects a select option from a text value', () => {
      render('<select><option value="red">Red</option><option value="blue">Blue</option></select>');
      const element = query<HTMLSelectElement>('select');
      createDomField(element, { triggerEvents: false }).write({ kind: 'text', value: 'blue' });
      expect(element.value).toBe('blue');
    });

    it('ignores unknown or disabled option values', () => {
      render(
        '<select><option value="red">Red</option><option value="green" disabled>Green</option></select>',
      );
      const element = query<HTMLSelectElement>('select');
      const onChange = vi.fn();
      element.addEventListener('change', onChange);
      const field = createDomField(element, { triggerEvents: true });
      field.write({ kind: 'choice', value: 'missing' });
      field.write({ kind: 'choice', value: 'green' });
      expect(element.value).toBe('red');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clears and selects multiple options, skipping disabled ones', () => {
      render(
        '<select multiple name="tags"><option value="a">A</option><option value="b">B</option><option value="c" disabled>C</option></select>',
      );
      const element = query<HTMLSelectElement>('select');
      const field = createDomField(element, { triggerEvents: true });
      field.write({ kind: 'multiChoice', value: ['a', 'c'] });
      expect(selectedValues(element)).toEqual(['a']);
      field.write({ kind: 'multiChoice', value: ['b', 'a'] });
      expect(selectedValues(element)).toEqual(['a', 'b']);
    });

    it('writes contenteditable text and fires input', () => {
      render('<div contenteditable="true">old</div>');
      const element = query('[contenteditable]');
      const onInput = vi.fn();
      element.addEventListener('input', onInput);
      createDomField(element, { triggerEvents: true }).write({ kind: 'text', value: 'new' });
      expect(element.textContent).toBe('new');
      expect(onInput).toHaveBeenCalledOnce();
    });

    it('does nothing for {kind:none}', () => {
      render('<input value="keep" /><select><option value="red">Red</option></select><div contenteditable="true">keep</div>');
      createDomField(query('input'), { triggerEvents: true }).write({ kind: 'none' });
      createDomField(query('select'), { triggerEvents: true }).write({ kind: 'none' });
      createDomField(query('[contenteditable]'), { triggerEvents: true }).write({ kind: 'none' });
      expect(query<HTMLInputElement>('input').value).toBe('keep');
      expect(query<HTMLSelectElement>('select').value).toBe('red');
      expect(query('[contenteditable]').textContent).toBe('keep');
    });
  });
});
