import { createDefaultSettings } from '../src/domain/settings/defaults';
import type { FieldRule, Settings } from '../src/domain/types';
import { expect, fillViaWorker, seedSettings, test } from './fixtures';
import { fillUntil, gotoFixture } from './helpers';

function settingsWithRules(...rules: readonly FieldRule[]): Settings {
  const base = createDefaultSettings();
  return { ...base, rules: [...base.rules, ...rules] };
}

function emailLiteralSettings(literal: string): Settings {
  return settingsWithRules({
    id: `email-literal-${literal}`,
    name: 'Literal email',
    match: { kind: 'contains', patterns: ['email'], attributes: ['name', 'id', 'label'] },
    fieldType: 'email',
    options: { local: 'literal', literal, domain: 'literal', domainLiteral: 'example.com' },
  });
}

test('E6 email literal override wins over the generator', async ({ worker, page }) => {
  await seedSettings(
    worker,
    settingsWithRules({
      id: 'email-literal',
      name: 'Literal email',
      match: { kind: 'contains', patterns: ['email'], attributes: ['name', 'id', 'label'] },
      fieldType: 'email',
      options: {
        local: 'literal',
        literal: 'qa+demo',
        domain: 'literal',
        domainLiteral: 'example.com',
      },
    }),
  );
  await gotoFixture(page, 'fixture.html');
  await fillUntil(worker, page.locator('#email'));

  await expect(page.locator('#email')).toHaveValue('qa+demo@example.com');
});

test('E7 defined password override and confirm mirror share the exact value', async ({
  worker,
  page,
}) => {
  await seedSettings(
    worker,
    settingsWithRules(
      {
        id: 'password-defined',
        name: 'Password defined',
        match: {
          kind: 'contains',
          patterns: ['password', 'passwd', 'pwd'],
          attributes: ['name', 'id', 'label'],
        },
        fieldType: 'password',
        options: { mode: 'defined', value: 'Pa$$w0rd!' },
      },
      {
        id: 'confirm-mirror',
        name: 'Confirm mirrors',
        match: {
          kind: 'contains',
          patterns: ['confirm', 'retype', 'repeat', 'secondary'],
          attributes: ['name', 'id', 'label'],
        },
        action: 'mirror',
        mirrorSource: 'previous-password',
      },
    ),
  );
  await gotoFixture(page, 'fixture.html');
  await fillUntil(worker, page.locator('#email'));

  await expect(page.locator('#password')).toHaveValue('Pa$$w0rd!');
  await expect(page.locator('#confirm-password')).toHaveValue('Pa$$w0rd!');
});

test('E8 skip rule leaves the notes field empty', async ({ worker, page }) => {
  await seedSettings(
    worker,
    settingsWithRules({
      id: 'skip-notes',
      name: 'Skip notes',
      match: { kind: 'contains', patterns: ['notes'], attributes: ['name', 'id', 'label'] },
      action: 'skip',
    }),
  );
  await gotoFixture(page, 'fixture.html');
  await fillUntil(worker, page.locator('#email'));

  await expect(page.locator('#notes')).toHaveValue('');
});

test('E9 live settings change is picked up without reloading the page', async ({ worker, page }) => {
  await seedSettings(worker, emailLiteralSettings('first'));
  await gotoFixture(page, 'fixture.html');
  await fillUntil(worker, page.locator('#email'));
  await expect(page.locator('#email')).toHaveValue('first@example.com');

  await seedSettings(worker, emailLiteralSettings('second'));

  await expect
    .poll(async () => {
      await fillViaWorker(worker, 'all');
      return page.locator('#email').inputValue();
    })
    .toBe('second@example.com');
});
