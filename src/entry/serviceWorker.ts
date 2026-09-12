import { createAction } from '../adapters/chrome/action';
import type { ChromeActionLike } from '../adapters/chrome/action';
import { createCommands } from '../adapters/chrome/commands';
import type { ChromeCommandsLike } from '../adapters/chrome/commands';
import { createContextMenus } from '../adapters/chrome/contextMenu';
import type { ChromeContextMenusLike } from '../adapters/chrome/contextMenu';
import { createChromeMessageBus } from '../adapters/chrome/messageBus';
import type { ChromeMessageBus, ChromeRuntimeLike } from '../adapters/chrome/messageBus';
import { createChromeStorageRepository } from '../adapters/chrome/storageRepository';
import type { ChromeStorageLike } from '../adapters/chrome/storageRepository';
import { createChromeTabs } from '../adapters/chrome/tabs';
import type { ChromeTabsAdapter, ChromeTabsLike } from '../adapters/chrome/tabs';
import type { SettingsRepository } from '../domain/ports';
import { createDefaultSettings } from '../domain/settings/defaults';
import type { FillScope, Settings } from '../domain/types';

/** The service-worker object graph, built once at startup. */
export interface ServiceWorkerContainer {
  readonly storage: SettingsRepository;
  readonly bus: ChromeMessageBus;
  readonly tabs: ChromeTabsAdapter;
  readonly ready: Promise<void>;
  getSettings(): Settings;
  dispatchFill(scope: FillScope): Promise<void>;
}

/** Builds the service worker and wires menus, commands, toolbar, and messaging. */
export function startServiceWorker(chromeApi: typeof chrome): ServiceWorkerContainer {
  let settings = createDefaultSettings();
  const storage = createChromeStorageRepository(
    chromeApi.storage as unknown as ChromeStorageLike,
  );
  const bus = createChromeMessageBus(chromeApi.runtime as unknown as ChromeRuntimeLike);
  const tabs = createChromeTabs(chromeApi.tabs as unknown as ChromeTabsLike);

  const getSettings = (): Settings => settings;

  const broadcast = async (next: Settings): Promise<void> => {
    const tabIds = await tabs.allTabIds();
    await Promise.all(
      tabIds.map((tabId) => tabs.sendToTab(tabId, { type: 'SETTINGS_CHANGED', settings: next })),
    );
  };

  const dispatchFill = async (scope: FillScope): Promise<void> => {
    const tabId = await tabs.activeTabId();
    if (tabId === undefined) return;
    await tabs.sendToTab(tabId, { type: 'FILL', scope });
  };

  const ready = storage
    .load()
    .then((loaded) => {
      settings = loaded;
      return broadcast(loaded);
    })
    .catch(() => undefined);

  storage.subscribe((next) => {
    settings = next;
    void broadcast(next);
  });

  bus.respond('GET_SETTINGS', () => getSettings());

  createContextMenus(chromeApi.contextMenus as unknown as ChromeContextMenusLike, (scope) => {
    void dispatchFill(scope);
  }).rebuild(true);

  createCommands(chromeApi.commands as unknown as ChromeCommandsLike, (scope) => {
    void dispatchFill(scope);
  });

  createAction(chromeApi.action as unknown as ChromeActionLike, () => {
    void dispatchFill('all');
  });

  return { storage, bus, tabs, ready, getSettings, dispatchFill };
}
