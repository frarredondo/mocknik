import { vi } from 'vitest';
import { createEvent } from './chromeEvents';
import { createStorageArea } from './chromeStorage';

/**
 * A hand-rolled fake of the `chrome` namespace used by the extension.
 * Installed on `globalThis` by `test/setup-chrome.ts` for integration tests,
 * and passed explicitly to adapter factories in DOM tests.
 */
export function createChromeFake() {
  return {
    storage: {
      local: createStorageArea(),
      sync: createStorageArea(),
      onChanged: createEvent(),
    },
    runtime: {
      id: 'test-extension-id',
      getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
      getManifest: () => ({ manifest_version: 3, name: 'Mocknik — Fake Form Filler', version: '0.1.0' }),
      sendMessage: vi.fn(async () => undefined),
      onMessage: createEvent(),
      onInstalled: createEvent(),
      lastError: undefined as { message?: string } | undefined,
    },
    contextMenus: {
      create: vi.fn(),
      remove: vi.fn(),
      removeAll: vi.fn(),
      onClicked: createEvent(),
    },
    tabs: {
      query: vi.fn(async () => [] as unknown[]),
      sendMessage: vi.fn(async () => undefined),
      onUpdated: createEvent(),
    },
    action: {
      setBadgeText: vi.fn(async () => undefined),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
      setTitle: vi.fn(async () => undefined),
      onClicked: createEvent(),
    },
    commands: {
      onCommand: createEvent(),
    },
    scripting: {
      executeScript: vi.fn(async () => [] as unknown[]),
    },
  };
}

export type ChromeFake = ReturnType<typeof createChromeFake>;
