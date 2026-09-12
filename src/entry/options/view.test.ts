import { describe, expect, it, vi } from 'vitest';
import { action, clear, el, field } from './view';

describe('el', () => {
  it('creates an element with tag, class, id, and text', () => {
    const node = el('p', { class: 'note', id: 'hint', text: 'Hello' });
    expect(node.tagName).toBe('P');
    expect(node.className).toBe('note');
    expect(node.id).toBe('hint');
    expect(node.textContent).toBe('Hello');
  });

  it('sets text without interpreting HTML', () => {
    const node = el('p', { text: '<b>bold</b>' });
    expect(node.textContent).toBe('<b>bold</b>');
    expect(node.querySelector('b')).toBeNull();
    expect(node.innerHTML).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('applies arbitrary attributes', () => {
    const node = el('input', { attrs: { type: 'number', min: '1', 'data-field': 'count' } });
    expect(node.getAttribute('type')).toBe('number');
    expect(node.getAttribute('min')).toBe('1');
    expect(node.getAttribute('data-field')).toBe('count');
  });

  it('registers event listeners', () => {
    const listener = vi.fn();
    const node = el('button', { on: { click: listener } });
    node.click();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('appends children and skips null, undefined, and false', () => {
    const node = el('div', undefined, 'a', null, undefined, false, el('span', { text: 'b' }));
    expect(node.childNodes).toHaveLength(2);
    expect(node.textContent).toBe('ab');
  });

  it('works without props', () => {
    expect(el('hr').tagName).toBe('HR');
  });
});

describe('clear', () => {
  it('removes all children', () => {
    const node = el('div', undefined, el('span'), 'text');
    clear(node);
    expect(node.childNodes).toHaveLength(0);
  });
});

describe('field and action', () => {
  it('finds elements by data-field and data-action', () => {
    const root = el(
      'div',
      undefined,
      el('input', { attrs: { 'data-field': 'name' } }),
      el('button', { attrs: { 'data-action': 'save' } }),
    );
    expect(field(root, 'name')?.tagName).toBe('INPUT');
    expect(action(root, 'save')?.tagName).toBe('BUTTON');
  });

  it('returns null when the element is absent', () => {
    const root = el('div');
    expect(field(root, 'nope')).toBeNull();
    expect(action(root, 'nope')).toBeNull();
  });

  it('searches descendants only, not the root itself', () => {
    const root = el('div', undefined, el('div', { attrs: { 'data-field': 'x' } }));
    const inner = field(root, 'x');
    expect(inner).not.toBeNull();
    expect(field(inner as HTMLElement, 'x')).toBeNull();
  });
});
