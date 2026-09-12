import { test, expect } from './fixtures';

test('E1 extension loads and the service worker is reachable', async ({ worker }) => {
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  expect(manifest.name).toBe('Mocknik — Fake Form Filler');
});

test('fixture server serves the smoke page', async ({ page }) => {
  await page.goto('http://localhost:4173/fixture.html');
  await expect(page.locator('h1')).toHaveText('Fixture');
});
