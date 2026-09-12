import { describe, expect, it, vi } from 'vitest';
import { createChromeFake } from '../../../test/fakes/chrome';
import { createAction } from './action';
import type { ChromeActionLike } from './action';

describe('createAction', () => {
  it('invokes the fill-all callback when the action is clicked', () => {
    const chrome = createChromeFake();
    const onFillAll = vi.fn();
    createAction(chrome.action as unknown as ChromeActionLike, onFillAll);

    chrome.action.onClicked.emit({ id: 3, url: 'https://example.com' });

    expect(onFillAll).toHaveBeenCalledOnce();
    expect(onFillAll).toHaveBeenCalledWith();
  });

  it('ignores the tab argument passed by the browser', () => {
    const chrome = createChromeFake();
    const onFillAll = vi.fn();
    createAction(chrome.action as unknown as ChromeActionLike, onFillAll);

    chrome.action.onClicked.emit(undefined);

    expect(onFillAll).toHaveBeenCalledOnce();
  });
});
