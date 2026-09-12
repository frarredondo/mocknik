import { createDefaultSettings } from '../src/domain/settings/defaults';
import { expect, fillViaWorker, seedSettings, test } from './fixtures';
import { fillUntil, gotoFixture } from './helpers';

test('E16 fills 500 inputs within a generous 5 second budget', async ({ worker, page }) => {
  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'perf.html');

  await expect(page.locator('#perf-499')).toBeAttached();
  await fillUntil(worker, page.locator('#perf-0'));

  const started = Date.now();
  await fillViaWorker(worker, 'all');
  const elapsed = Date.now() - started;

  await expect(page.locator('#perf-499')).not.toHaveValue('');
  expect(elapsed).toBeLessThan(5000);
});
