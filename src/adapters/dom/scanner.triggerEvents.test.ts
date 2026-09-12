import { describe, expect, it, vi } from 'vitest';
import type { IgnoreSettings } from '../../domain/types';
import { createDomScanner } from './scanner';

const ignore: IgnoreSettings = { hidden: false, withContent: false, types: [], domains: [] };

describe('createDomScanner trigger events', () => {
  it('does not dispatch events when getTriggerEvents returns false', () => {
    document.body.innerHTML = '<input id="a" type="text" />';
    const element = document.getElementById('a') as HTMLInputElement;
    const onInput = vi.fn();
    element.addEventListener('input', onInput);

    const scanner = createDomScanner(document, {
      getIgnore: () => ignore,
      getTriggerEvents: () => false,
    });
    const [field] = scanner.select('all');
    field?.write({ kind: 'text', value: 'x' });

    expect(element.value).toBe('x');
    expect(onInput).not.toHaveBeenCalled();
  });

  it('dispatches events by default when no getTriggerEvents is given', () => {
    document.body.innerHTML = '<input id="b" type="text" />';
    const element = document.getElementById('b') as HTMLInputElement;
    const onInput = vi.fn();
    element.addEventListener('input', onInput);

    const scanner = createDomScanner(document, { getIgnore: () => ignore });
    const [field] = scanner.select('all');
    field?.write({ kind: 'text', value: 'y' });

    expect(onInput).toHaveBeenCalledOnce();
  });
});
