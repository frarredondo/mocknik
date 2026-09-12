import { createDefaultSettings } from '../src/domain/settings/defaults';
import { expect, fillViaWorker, seedSettings, test } from './fixtures';
import { fillUntil, gotoFixture } from './helpers';

test('E2 fill all gives every supported field a plausible value', async ({ worker, page }) => {
  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'fixture.html');
  await fillUntil(worker, page.locator('#email'));

  await expect(page.locator('#email')).toHaveValue(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);

  const password = await page.locator('#password').inputValue();
  expect(password.length).toBeGreaterThan(0);
  await expect(page.locator('#confirm-password')).toHaveValue(password);

  const quantity = Number(await page.locator('#quantity').inputValue());
  expect(quantity).toBeGreaterThanOrEqual(5);
  expect(quantity).toBeLessThanOrEqual(20);

  await expect(page.locator('#start-date')).toHaveValue(/^2020-\d\d-\d\d$/);
  await expect(page.locator('#website')).toHaveValue(/^https:\/\//);
  await expect(page.locator('#color')).toHaveValue(/^#[0-9a-f]{6}$/);

  await expect(page.locator('#country')).not.toHaveValue('');
  const selectedLanguages = await page
    .locator('#languages')
    .evaluate((element) => (element as HTMLSelectElement).selectedOptions.length);
  expect(selectedLanguages).toBeGreaterThan(0);

  await expect(page.locator('input[name="choice"]:checked')).toHaveCount(1);
  await expect(page.locator('#agree')).toBeChecked();

  const bio = (await page.locator('#bio').textContent()) ?? '';
  expect(bio.trim().length).toBeGreaterThan(0);
});

test('E3 disabled, readonly, hidden, file and button fields are untouched', async ({
  worker,
  page,
}) => {
  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'fixture.html');
  await fillUntil(worker, page.locator('#email'));

  await expect(page.locator('#disabled')).toHaveValue('');
  await expect(page.locator('#readonly')).toHaveValue('preset');
  await expect(page.locator('#hidden-field')).toHaveValue('');
  await expect(page.locator('#upload')).toHaveValue('');
  await expect(page.locator('#button')).toHaveText('Do not fill');
});

test('E5 maxlength is respected', async ({ worker, page }) => {
  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'fixture.html');
  await fillUntil(worker, page.locator('#email'));

  const notes = await page.locator('#notes').inputValue();
  expect(notes.length).toBeGreaterThan(0);
  expect(notes.length).toBeLessThanOrEqual(5);
});

test('E12 iframe fields are filled', async ({ worker, page }) => {
  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'frame.html');
  const innerEmail = page.frameLocator('#inner').locator('#email');
  await fillUntil(worker, innerEmail);
  await expect(innerEmail).toHaveValue(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
});

test('E10 focused scope fills only the focused field', async ({ worker, page }) => {
  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'forms.html');
  await page.locator('#form-a-field').focus();
  await fillUntil(worker, page.locator('#form-a-field'), 'focused');

  await expect(page.locator('#form-a-field')).not.toHaveValue('');
  await expect(page.locator('#form-b-field')).toHaveValue('');
});

test('E11 form scope fills only the fields of the focused form', async ({ worker, page }) => {
  await seedSettings(worker, createDefaultSettings());
  await gotoFixture(page, 'forms.html');
  await page.locator('#form-a-field').focus();
  await fillUntil(worker, page.locator('#form-a-field'), 'form');

  await expect(page.locator('#form-a-field')).not.toHaveValue('');
  await expect(page.locator('#form-b-field')).toHaveValue('');
});
