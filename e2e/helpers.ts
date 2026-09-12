import { expect, type Locator, type Page, type Worker } from '@playwright/test';
import { FIXTURE_URL, fillViaWorker } from './fixtures';
import type { FillScope } from '../src/domain/types';

/** Navigates to a fixture page and makes sure its tab is the active one. */
export async function gotoFixture(page: Page, path: string): Promise<void> {
  await page.goto(`${FIXTURE_URL}/${path}`);
  await page.bringToFront();
}

/**
 * Repeatedly triggers a fill until the sentinel field has a value. This absorbs
 * the race between `page.goto` resolving and the content script being injected,
 * without any fixed sleeps.
 */
export async function fillUntil(
  worker: Worker,
  sentinel: Locator,
  scope: FillScope = 'all',
): Promise<void> {
  await expect
    .poll(
      async () => {
        await fillViaWorker(worker, scope);
        return sentinel.inputValue().catch(() => null);
      },
      { timeout: 10_000 },
    )
    .not.toBe('');
}
