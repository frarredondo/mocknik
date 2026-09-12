import { describe, expect, it, vi } from 'vitest';
import { createChromeFake } from '../../../test/fakes/chrome';
import { createChromeTabs } from './tabs';
import type { ChromeTabsLike } from './tabs';

describe('createChromeTabs', () => {
  it('returns the first active tab id', async () => {
    const chrome = createChromeFake();
    chrome.tabs.query.mockResolvedValue([{ id: 4 }, { id: 9 }]);
    const tabs = createChromeTabs(chrome.tabs as unknown as ChromeTabsLike);

    await expect(tabs.activeTabId()).resolves.toBe(4);
    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, lastFocusedWindow: true });
  });

  it('returns undefined when there is no active tab', async () => {
    const chrome = createChromeFake();
    const tabs = createChromeTabs(chrome.tabs as unknown as ChromeTabsLike);

    await expect(tabs.activeTabId()).resolves.toBeUndefined();
  });

  it('sendToTab forwards the message', async () => {
    const chrome = createChromeFake();
    const tabs = createChromeTabs(chrome.tabs as unknown as ChromeTabsLike);

    await tabs.sendToTab(7, { type: 'FILL', scope: 'form' });

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      7,
      { type: 'FILL', scope: 'form' },
      expect.any(Function),
    );
  });

  it('sendToTab resolves when the receiver is missing', async () => {
    const chrome = createChromeFake();
    chrome.tabs.sendMessage.mockImplementation(() => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    });
    const tabs = createChromeTabs(chrome.tabs as unknown as ChromeTabsLike);

    await expect(tabs.sendToTab(7, { type: 'GET_SETTINGS' })).resolves.toBeUndefined();
  });
});
