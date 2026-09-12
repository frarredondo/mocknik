import { describe, expect, it } from 'vitest';
import { toDescriptor } from './descriptor';

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

describe('toDescriptor', () => {
  it('reads every known attribute from an input', () => {
    render(
      '<input id="email" name="user_email" type="EMAIL" placeholder="you@example.com" aria-label="Email address" aria-labelledby="lbl help" autocomplete="email" title="Email me" pattern=".+" class="alpha beta" required disabled />',
    );
    const descriptor = toDescriptor(query('input'));
    expect(descriptor.tag).toBe('input');
    expect(descriptor.type).toBe('email');
    expect(descriptor.name).toBe('user_email');
    expect(descriptor.id).toBe('email');
    expect(descriptor.classes).toEqual(['alpha', 'beta']);
    expect(descriptor.placeholder).toBe('you@example.com');
    expect(descriptor.ariaLabel).toBe('Email address');
    expect(descriptor.ariaLabelledBy).toBe('lbl help');
    expect(descriptor.autocomplete).toBe('email');
    expect(descriptor.title).toBe('Email me');
    expect(descriptor.pattern).toBe('.+');
    expect(descriptor.required).toBe(true);
    expect(descriptor.disabled).toBe(true);
  });

  it('uses empty strings for absent attributes', () => {
    render('<input />');
    const descriptor = toDescriptor(query('input'));
    expect(descriptor.name).toBe('');
    expect(descriptor.id).toBe('');
    expect(descriptor.placeholder).toBe('');
    expect(descriptor.ariaLabel).toBe('');
    expect(descriptor.ariaLabelledBy).toBe('');
    expect(descriptor.autocomplete).toBe('');
    expect(descriptor.title).toBe('');
    expect(descriptor.pattern).toBe('');
    expect(descriptor.type).toBe('');
    expect(descriptor.required).toBe(false);
    expect(descriptor.disabled).toBe(false);
  });

  it('reads the label text from a label[for] element', () => {
    render('<label for="nick">  Nickname  </label><input id="nick" name="nick" />');
    expect(toDescriptor(query('#nick')).label).toBe('Nickname');
  });

  it('reads the label text from a wrapping label', () => {
    render('<label>Full name <input id="full" name="full" /></label>');
    expect(toDescriptor(query('#full')).label).toBe('Full name');
  });

  it('reports readonly only for inputs and textareas', () => {
    render('<input id="a" readonly /><textarea id="b" readonly></textarea><div id="c"></div>');
    expect(toDescriptor(query('#a')).readonly).toBe(true);
    expect(toDescriptor(query('#b')).readonly).toBe(true);
    expect(toDescriptor(query('#c')).readonly).toBe(false);
  });

  it('marks hidden inputs as hidden', () => {
    render('<input id="token" type="hidden" name="token" />');
    expect(toDescriptor(query('#token')).hidden).toBe(true);
  });

  it('marks visible fields as not hidden', () => {
    render('<input id="name" type="text" name="name" />');
    expect(toDescriptor(query('#name')).hidden).toBe(false);
  });

  it('marks style-hidden fields as hidden', () => {
    render('<input id="a" type="text" style="display: none" /><input id="b" type="text" style="visibility: hidden" />');
    expect(toDescriptor(query('#a')).hidden).toBe(true);
    expect(toDescriptor(query('#b')).hidden).toBe(true);
  });

  it('reports maxLength only when the element accepts one', () => {
    render('<input id="a" maxlength="12" /><input id="b" />');
    expect(toDescriptor(query('#a')).maxLength).toBe(12);
    expect(toDescriptor(query('#b')).maxLength).toBeUndefined();
  });

  it('reports min, max, step and multiple when present', () => {
    render('<input id="num" type="number" min="1" max="10" step="2" />');
    const descriptor = toDescriptor(query('#num'));
    expect(descriptor.min).toBe('1');
    expect(descriptor.max).toBe('10');
    expect(descriptor.step).toBe('2');
    expect(descriptor.multiple).toBeUndefined();
  });

  it('reports multiple for file inputs', () => {
    render('<input id="files" type="file" multiple />');
    expect(toDescriptor(query('#files')).multiple).toBe(true);
  });

  it('collects select options in order', () => {
    render(
      '<select id="color" name="color" multiple><option value="red" selected>Red</option><option value="green" disabled>Green</option><option>Blue</option></select>',
    );
    const descriptor = toDescriptor(query('#color'));
    expect(descriptor.tag).toBe('select');
    expect(descriptor.multiple).toBe(true);
    expect(descriptor.options).toEqual([
      { value: 'red', label: 'Red', disabled: false },
      { value: 'green', label: 'Green', disabled: true },
      { value: 'Blue', label: 'Blue', disabled: false },
    ]);
  });

  it('collects options for a radio group by name', () => {
    render(
      '<label><input id="a" type="radio" name="g" value="alpha" /> Alpha</label>' +
        '<label><input id="b" type="radio" name="g" value="beta" disabled /> Beta</label>' +
        '<input id="c" type="radio" name="h" value="gamma" />',
    );
    expect(toDescriptor(query('#a')).options).toEqual([
      { value: 'alpha', label: 'Alpha', disabled: false },
      { value: 'beta', label: 'Beta', disabled: true },
    ]);
    expect(toDescriptor(query('#c')).options).toEqual([
      { value: 'gamma', label: '', disabled: false },
    ]);
  });

  it('detects contenteditable elements as their own tag', () => {
    render(
      '<div id="a" contenteditable="true"></div><div id="b" contenteditable="false"></div><p id="c" contenteditable></p>',
    );
    expect(toDescriptor(query('#a')).tag).toBe('contenteditable');
    expect(toDescriptor(query('#b')).tag).toBe('div');
    expect(toDescriptor(query('#c')).tag).toBe('contenteditable');
  });
});
