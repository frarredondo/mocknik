import { describe, expect, it, vi } from 'vitest';
import { createChromeFake } from '../../../test/fakes/chrome';
import { createChromeTabs, type ChromeTabsLike } from './tabs';

describe('createChromeTabs.allTabIds', () => {
  it('returns every real tab id', async () => {
    const fake = createChromeFake();
    fake.tabs.query = vi.fn(async () => [{ id: 1 }, { id: 7 }, {}]);
    const tabs = createChromeTabs(fake.tabs as unknown as ChromeTabsLike);

    await expect(tabs.allTabIds()).resolves.toEqual([1, 7]);
  });

  it('returns an empty list when there are no tabs', async () => {
    const fake = createChromeFake();
    fake.tabs.query = vi.fn(async () => []);
    const tabs = createChromeTabs(fake.tabs as unknown as ChromeTabsLike);

    await expect(tabs.allTabIds()).resolves.toEqual([]);
  });
});
