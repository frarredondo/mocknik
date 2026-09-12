import type { AppMessage } from '../../domain/messages';

/** Minimal structural view of `chrome.tabs`. */
export interface ChromeTabsLike {
  query(info: {
    active?: boolean;
    lastFocusedWindow?: boolean;
  }): Promise<Array<{ id?: number }>>;
  sendMessage(tabId: number, message: unknown, callback?: () => void): void;
}

/** Tab lookup and targeted messaging for the service worker. */
export interface ChromeTabsAdapter {
  activeTabId(): Promise<number | undefined>;
  allTabIds(): Promise<number[]>;
  sendToTab(tabId: number, message: AppMessage): Promise<void>;
}

/** Builds the tabs adapter over a tabs-like namespace. */
export function createChromeTabs(tabs: ChromeTabsLike): ChromeTabsAdapter {
  return {
    async activeTabId() {
      const results = await tabs.query({ active: true, lastFocusedWindow: true });
      return results[0]?.id;
    },
    async allTabIds() {
      const results = await tabs.query({});
      return results
        .map((tab) => tab.id)
        .filter((id): id is number => typeof id === 'number');
    },
    sendToTab(tabId, message) {
      return new Promise((resolve) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          resolve();
        };
        try {
          const outcome = tabs.sendMessage(tabId, message, finish) as unknown;
          if (outcome instanceof Promise) {
            outcome.then(finish, finish);
          }
        } catch {
          finish();
        }
      });
    },
  };
}
