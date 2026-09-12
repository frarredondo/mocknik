import { describe, expect, it, vi } from 'vitest';
import { createChromeFake } from '../../../test/fakes/chrome';
import { MENU_IDS, createContextMenus } from './contextMenu';
import type { ChromeContextMenusLike } from './contextMenu';

describe('createContextMenus', () => {
  it('creates three items when enabled', () => {
    const chrome = createChromeFake();
    createContextMenus(chrome.contextMenus as unknown as ChromeContextMenusLike, vi.fn()).rebuild(true);

    expect(chrome.contextMenus.removeAll).toHaveBeenCalledOnce();
    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(3);
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: MENU_IDS.all,
      title: 'Fill all inputs',
      contexts: ['page', 'editable'],
    });
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: MENU_IDS.form,
      title: 'Fill this form',
      contexts: ['editable'],
    });
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: MENU_IDS.input,
      title: 'Fill this input',
      contexts: ['editable'],
    });
  });

  it('only removes when disabled', () => {
    const chrome = createChromeFake();
    createContextMenus(chrome.contextMenus as unknown as ChromeContextMenusLike, vi.fn()).rebuild(false);

    expect(chrome.contextMenus.removeAll).toHaveBeenCalledOnce();
    expect(chrome.contextMenus.create).not.toHaveBeenCalled();
  });

  it('maps clicks to scopes and ignores unknown items', () => {
    const chrome = createChromeFake();
    const onScope = vi.fn();
    createContextMenus(chrome.contextMenus as unknown as ChromeContextMenusLike, onScope);

    chrome.contextMenus.onClicked.emit({ menuItemId: MENU_IDS.all });
    chrome.contextMenus.onClicked.emit({ menuItemId: MENU_IDS.form });
    chrome.contextMenus.onClicked.emit({ menuItemId: MENU_IDS.input });
    chrome.contextMenus.onClicked.emit({ menuItemId: 'other' });
    chrome.contextMenus.onClicked.emit({});

    expect(onScope.mock.calls).toEqual([['all'], ['form'], ['focused']]);
  });

  it('removes before creating on every rebuild', () => {
    const chrome = createChromeFake();
    const menus = createContextMenus(chrome.contextMenus as unknown as ChromeContextMenusLike, vi.fn());
    menus.rebuild(true);
    menus.rebuild(true);

    expect(chrome.contextMenus.removeAll).toHaveBeenCalledTimes(2);
    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(6);
    const removeOrder = vi.mocked(chrome.contextMenus.removeAll).mock.invocationCallOrder;
    const createOrder = vi.mocked(chrome.contextMenus.create).mock.invocationCallOrder;
    expect(removeOrder).toHaveLength(2);
    expect(createOrder).toHaveLength(6);
    expect(removeOrder[0] ?? 0).toBeLessThan(createOrder[0] ?? 0);
  });
});
