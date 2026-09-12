import { createDefaultSettings } from '../src/domain/settings/defaults';
import { FIXTURE_URL, expect, seedSettings, test } from './fixtures';
import { fillUntil, gotoFixture } from './helpers';

test('E14 a fill issues no network requests from the extension', async ({
  context,
  worker,
  page,
}) => {
  const extensionRequests: string[] = [];
  context.on('request', (request) => {
    const url = request.url();
    if (!/^https?:/.test(url)) return;
    if (url.startsWith(FIXTURE_URL)) return;
    const fromServiceWorker = request.serviceWorker() !== null;
    let fromExtensionFrame = false;
    try {
      fromExtensionFrame = request.frame().url().startsWith('chrome-extension://');
    } catch {
      fromExtensionFrame = false;
    }
    if (fromServiceWorker || fromExtensionFrame) {
      extensionRequests.push(url);
    }
  });

  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'fixture.html');
  await fillUntil(worker, page.locator('#email'));

  await expect.poll(() => extensionRequests.length).toBe(0);
  expect(extensionRequests).toEqual([]);
});
