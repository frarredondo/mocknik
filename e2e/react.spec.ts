import { createDefaultSettings } from '../src/domain/settings/defaults';
import { expect, seedSettings, test } from './fixtures';
import { fillUntil, gotoFixture } from './helpers';

test('E13 controlled input state updates and both inputs are filled', async ({ worker, page }) => {
  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'react-controlled.html');

  const controlled = page.locator('#controlled');
  await fillUntil(worker, controlled);

  const value = await controlled.inputValue();
  expect(value.length).toBeGreaterThan(0);
  await expect
    .poll(() => page.locator('#container').getAttribute('data-state'))
    .toBe(value);
  await expect(page.locator('#uncontrolled')).not.toHaveValue('');
});
