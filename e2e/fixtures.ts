import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Worker,
} from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../dist');

export const test = base.extend<{
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${dist}`,
        `--load-extension=${dist}`,
      ],
    });
    await use(context);
    await context.close();
  },
  worker: async ({ context }, use) => {
    const worker =
      context.serviceWorkers().find((w) => w.url().startsWith('chrome-extension://')) ??
      (await context.waitForEvent('serviceworker', {
        predicate: (w) => w.url().startsWith('chrome-extension://'),
      }));
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
});

export { expect };

export async function seedSettings(worker: Worker, settings: unknown): Promise<void> {
  await worker.evaluate(async (value) => {
    await chrome.storage.local.set({ settings: value });
  }, settings);
}

export async function readStoredSettings(worker: Worker): Promise<unknown> {
  return worker.evaluate(async () => {
    const result = await chrome.storage.local.get('settings');
    return result['settings'];
  });
}

export async function fillViaWorker(
  worker: Worker,
  scope: 'all' | 'form' | 'focused' = 'all',
): Promise<void> {
  await worker.evaluate(async (value) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id != null) {
      await chrome.tabs.sendMessage(tab.id, { type: 'FILL', scope: value });
    }
  }, scope);
}

export const FIXTURE_URL = 'http://localhost:4173';
