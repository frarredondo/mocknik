import type { BrowserContext, Page } from '@playwright/test';
import { createDefaultSettings } from '../src/domain/settings/defaults';
import { DEFAULT_MATCH_ATTRIBUTES } from '../src/domain/types';
import type { FieldRule, Settings } from '../src/domain/types';
import { expect, seedSettings, test } from './fixtures';

function settingsWithRules(...rules: readonly FieldRule[]): Settings {
  const base = createDefaultSettings();
  return { ...base, rules: [...rules] };
}

async function openOptions(context: BrowserContext, extensionId: string): Promise<Page> {
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
  await optionsPage.bringToFront();
  return optionsPage;
}

interface PageGeometry {
  rootWidth: number;
  innerWidth: number;
  scrollWidth: number;
  rem: number;
}

async function measureGeometry(page: Page): Promise<PageGeometry> {
  return page.evaluate(() => {
    const root = document.querySelector('#root');
    const rect = root?.getBoundingClientRect();
    return {
      rootWidth: rect?.width ?? -1,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
    };
  });
}

test('E9b options defaults persist across a page reload', async ({ context, extensionId }) => {
  const optionsPage = await openOptions(context, extensionId);

  await optionsPage.locator('details.panel > summary').click();
  const maxLength = optionsPage.locator('[data-field="defaultMaxLength"]');
  await maxLength.fill('7');
  await optionsPage.locator('[data-action="save"]').click();
  await expect(optionsPage.locator('[data-field="status"]')).toContainText('Saved');

  await optionsPage.reload();
  await optionsPage.locator('details.panel > summary').click();
  await expect(optionsPage.locator('[data-field="defaultMaxLength"]')).toHaveValue('7');
  await optionsPage.close();
});

test('E15 add rule, save, export and import round trip', async ({ context, extensionId }) => {
  const optionsPage = await openOptions(context, extensionId);

  await optionsPage.locator('[data-action="add-rule"]').click();
  const newRule = optionsPage.locator('[data-rule-index]').last();
  await newRule.locator('[data-field="rule-name"]').fill('Fixed email');
  await newRule.locator('[data-field="rule-kind"]').selectOption('contains');

  const patternInput = newRule.locator('[data-chip-input="rule-patterns"]');
  await patternInput.fill('email');
  await patternInput.press('Enter');
  await expect(newRule.locator('.chip[data-chip="email"]')).toBeVisible();

  await newRule.locator('[data-field="rule-fieldType"]').selectOption('email');
  await newRule.locator('details.disclosure > summary').click();
  await newRule.locator('[data-field="rule-options"]').fill(
    JSON.stringify({
      local: 'literal',
      literal: 'fixed',
      domain: 'literal',
      domainLiteral: 'example.com',
    }),
  );

  await optionsPage.locator('[data-action="save"]').click();
  await expect(optionsPage.locator('[data-field="status"]')).toContainText('Saved');

  await optionsPage.locator('details.panel > summary').click();
  await optionsPage.locator('[data-action="export"]').click();
  const exportText = await optionsPage.locator('[data-field="exportOutput"]').inputValue();
  const exported = JSON.parse(exportText) as { rules: Array<{ name: string }> };
  expect(exported.rules.some((rule) => rule.name === 'Fixed email')).toBe(true);

  const imported = {
    ...exported,
    rules: exported.rules.map((rule) =>
      rule.name === 'Fixed email' ? { ...rule, name: 'Imported email' } : rule,
    ),
  };
  await optionsPage.locator('[data-field="importFile"]').setInputFiles({
    name: 'settings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(optionsPage.locator('[data-field="status"]')).toContainText('Imported');
  await expect(newRule.locator('[data-field="rule-name"]')).toHaveValue('Imported email');

  await optionsPage.locator('[data-action="save"]').click();
  await expect(optionsPage.locator('[data-field="status"]')).toContainText('Saved');
  await optionsPage.reload();
  await expect(
    optionsPage.locator('[data-rule-index]').last().locator('[data-field="rule-name"]'),
  ).toHaveValue('Imported email');
  await optionsPage.close();
});

test('E-VB1 the preview shows generated values and skip sentences', async ({
  context,
  extensionId,
  worker,
}) => {
  await seedSettings(
    worker,
    settingsWithRules(
      {
        id: 'vb-email',
        name: 'VB email',
        match: { kind: 'contains', patterns: ['email'], attributes: ['name', 'id'] },
        fieldType: 'email',
      },
      {
        id: 'vb-captcha',
        name: 'VB captcha',
        match: { kind: 'contains', patterns: ['captcha'], attributes: ['name', 'id'] },
        action: 'skip',
      },
    ),
  );

  const optionsPage = await openOptions(context, extensionId);
  await expect(
    optionsPage.locator('[data-rule-index="0"] [data-field="rule-preview"]'),
  ).toHaveText(/\S+@\S+\.\S+/);
  await expect(
    optionsPage.locator('[data-rule-index="1"] [data-field="rule-preview"]'),
  ).toContainText('untouched');
  await optionsPage.close();
});

test('E-VB2 switching a card action to skip updates its preview', async ({
  context,
  extensionId,
  worker,
}) => {
  await seedSettings(
    worker,
    settingsWithRules({
      id: 'vb-toggle',
      name: 'VB toggle',
      match: { kind: 'contains', patterns: ['toggle'], attributes: ['name', 'id'] },
      fieldType: 'email',
    }),
  );

  const optionsPage = await openOptions(context, extensionId);
  const card = optionsPage.locator('[data-rule-index="0"]');
  const preview = card.locator('[data-field="rule-preview"]');
  await expect(preview).toHaveText(/\S+@\S+\.\S+/);

  await card.locator('.segmented label', { hasText: 'Skip' }).click();
  await expect(preview).toContainText('untouched');
  await optionsPage.close();
});

test('E-VB3 the filter reports a count and hides non-matching cards', async ({
  context,
  extensionId,
  worker,
}) => {
  await seedSettings(
    worker,
    settingsWithRules(
      {
        id: 'vb-alpha',
        name: 'Alpha',
        match: { kind: 'contains', patterns: ['alpha'], attributes: ['name', 'id'] },
      },
      {
        id: 'vb-beta',
        name: 'Beta',
        match: { kind: 'contains', patterns: ['beta'], attributes: ['name', 'id'] },
      },
    ),
  );

  const optionsPage = await openOptions(context, extensionId);
  const count = optionsPage.locator('[data-field="rule-count"]');
  await expect(count).toHaveText('Showing 2 of 2 rules');

  await optionsPage.locator('[data-field="rule-filter"]').fill('beta');
  await expect(count).toHaveText('Showing 1 of 2 rules');
  await expect(optionsPage.locator('[data-rule-index="0"]')).toBeHidden();
  await expect(optionsPage.locator('[data-rule-index="1"]')).toBeVisible();
  await optionsPage.close();
});

test('E-VB4 the global panel is collapsed on load and works when opened', async ({
  context,
  extensionId,
}) => {
  const optionsPage = await openOptions(context, extensionId);
  const panel = optionsPage.locator('details.panel');
  await expect(panel).not.toHaveAttribute('open', '');
  await expect(optionsPage.locator('[data-field="defaultMaxLength"]')).toBeHidden();

  await optionsPage.locator('details.panel > summary').click();
  await expect(panel).toHaveAttribute('open', '');
  await optionsPage.locator('[data-field="defaultMaxLength"]').fill('9');
  await expect(optionsPage.locator('[data-field="defaultMaxLength"]')).toHaveValue('9');
  await optionsPage.close();
});

test('E-VB5 the options page fills a wide viewport without narrow overflow', async ({
  context,
  extensionId,
}) => {
  const optionsPage = await openOptions(context, extensionId);

  await optionsPage.setViewportSize({ width: 1600, height: 900 });
  const box = await optionsPage.locator('#root').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(1500);
  expect(box!.x).toBeLessThan(40);

  await optionsPage.setViewportSize({ width: 420, height: 800 });
  expect(
    await optionsPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await optionsPage.close();
});

test('E-VB6 the options page reflows live as the viewport is cycled', async ({
  context,
  extensionId,
}) => {
  const optionsPage = await openOptions(context, extensionId);
  const tolerance = 1;

  const resizeAndMeasure = async (width: number, height: number) => {
    await optionsPage.setViewportSize({ width, height });
    const geometry = await measureGeometry(optionsPage);
    expect(geometry.rootWidth).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth + 1);
    expect(
      Math.abs(geometry.rootWidth - (geometry.innerWidth - 2 * geometry.rem)),
    ).toBeLessThanOrEqual(tolerance);
    return geometry;
  };

  const wide = await resizeAndMeasure(1600, 900);
  const mid = await resizeAndMeasure(1000, 900);
  const narrow = await resizeAndMeasure(700, 900);
  const tiny = await resizeAndMeasure(420, 800);

  expect(mid.rootWidth).toBeLessThan(wide.rootWidth);
  expect(narrow.rootWidth).toBeLessThan(mid.rootWidth);
  expect(tiny.rootWidth).toBeLessThan(narrow.rootWidth);

  const wideAgain = await resizeAndMeasure(1600, 900);
  expect(Math.abs(wideAgain.rootWidth - wide.rootWidth)).toBeLessThanOrEqual(tolerance);

  await optionsPage.close();
});

test('E-VB7 an inherited-attributes rule shows the global chips and can be overridden', async ({
  context,
  extensionId,
  worker,
}) => {
  await seedSettings(
    worker,
    settingsWithRules(
      {
        id: 'vb-inherit',
        name: 'Inherited attrs',
        match: { kind: 'contains', patterns: ['email'] },
        fieldType: 'email',
      },
      {
        id: 'vb-literal',
        name: 'Literal value',
        match: { kind: 'contains', patterns: ['code'] },
        value: { kind: 'text', value: 'fixed-123' },
      },
    ),
  );

  const optionsPage = await openOptions(context, extensionId);
  const card = optionsPage.locator('[data-rule-index="0"]');
  const editor = card.locator('.chip-editor:has([data-field="rule-attributes"])');

  // The rule inherits the global attributes: they render as chips, no empty slot.
  for (const attribute of DEFAULT_MATCH_ATTRIBUTES) {
    await expect(editor.locator(`.chip[data-chip="${attribute}"]`)).toBeVisible();
  }
  await expect(editor.locator('.chip')).toHaveCount(DEFAULT_MATCH_ATTRIBUTES.length);
  await expect(editor.locator('.chip--inherited')).toHaveCount(DEFAULT_MATCH_ATTRIBUTES.length);
  await expect(editor.locator('[data-chip-remove]')).toHaveCount(0);
  await expect(card.locator('[data-field="rule-attributes"]')).toHaveValue('');

  // The literal-value rule keeps its Example and note.
  const literalCard = optionsPage.locator('[data-rule-index="1"]');
  await expect(literalCard.locator('[data-field="rule-preview"]')).toHaveText('fixed-123');
  await expect(literalCard.locator('.example__note')).toHaveText('Literal value');

  // Customize materializes the inherited list and makes the chips editable.
  await card.locator('[data-action="override-rule-attributes"]').click();
  await expect(card.locator('[data-field="rule-attributes"]')).toHaveValue(
    DEFAULT_MATCH_ATTRIBUTES.join(', '),
  );
  await expect(editor.locator('[data-chip-remove]')).toHaveCount(DEFAULT_MATCH_ATTRIBUTES.length);

  // Removing one attribute leaves an explicit override (no longer inherited).
  await editor.locator('[data-chip-remove]').first().click();
  const explicit = DEFAULT_MATCH_ATTRIBUTES.slice(1);
  await expect(card.locator('[data-field="rule-attributes"]')).toHaveValue(explicit.join(', '));

  // Save and reload: the explicit override persists.
  await optionsPage.locator('[data-action="save"]').click();
  await expect(optionsPage.locator('[data-field="status"]')).toContainText('Saved');
  await optionsPage.reload();

  const reloaded = optionsPage.locator('[data-rule-index="0"]');
  const reloadedEditor = reloaded.locator('.chip-editor:has([data-field="rule-attributes"])');
  await expect(reloaded.locator('[data-field="rule-attributes"]')).toHaveValue(explicit.join(', '));
  await expect(reloadedEditor.locator('.chip--inherited')).toHaveCount(0);
  await expect(reloadedEditor.locator('[data-chip-remove]')).toHaveCount(explicit.length);
  await optionsPage.close();
});
