#!/usr/bin/env node
/**
 * Captures the Chrome Web Store listing assets for Mocknik.
 *
 * It serves the fictional demo pages from `store-assets/demo/` on an ephemeral
 * port, launches a persistent Chromium with the built `dist/` extension, seeds
 * settings through the service worker, triggers a real "fill all" via
 * `chrome.tabs.sendMessage`, and screenshots the result at 1280x800.
 *
 * Run through `npm run store:assets` (which builds first).
 */
import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { palette } from '../brand/palette.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '..');
const distDir = path.join(rootDir, 'dist');
const demoDir = path.join(rootDir, 'store-assets', 'demo');
const screenshotsDir = path.join(rootDir, 'store-assets', 'screenshots');
const promoDir = path.join(rootDir, 'store-assets', 'promo');
const iconFile = path.join(rootDir, 'src', 'icons', 'icon-128.png');

const VIEWPORT = Object.freeze({ width: 1280, height: 800 });
const FIXED_EMAIL = 'qa+demo@example.com';
const FIXED_PASSWORD = 'Demo-Pass-42!';
const FILL_TIMEOUT_MS = 20_000;

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const outputs = [];

/* ------------------------------------------------------------- settings --- */

// Mirrors src/domain/settings/defaults.ts. Kept as plain JS so this script
// stays dependency-free and runnable without a TS loader.
const DEFAULT_MATCH_ATTRIBUTES = [
  'type',
  'name',
  'id',
  'label',
  'placeholder',
  'ariaLabel',
  'autocomplete',
];

function builtinRules() {
  return [
    {
      id: 'builtin-confirm-password',
      name: 'Confirm password',
      match: {
        kind: 'contains',
        patterns: ['confirm', 'retype', 'repeat', 'secondary'],
        attributes: ['name', 'id', 'label', 'placeholder'],
      },
      action: 'mirror',
      mirrorSource: 'previous-password',
    },
    {
      id: 'builtin-password',
      name: 'Password',
      match: {
        kind: 'contains',
        patterns: ['password', 'passwd', 'pwd'],
        attributes: ['name', 'id', 'label', 'placeholder'],
      },
      fieldType: 'password',
      options: { mode: 'random', length: 12, charset: 'alnum' },
    },
    {
      id: 'builtin-agree-terms',
      name: 'Agree to terms',
      match: {
        kind: 'contains',
        patterns: ['agree', 'terms', 'accept'],
        attributes: ['name', 'id', 'label'],
      },
      fieldType: 'checkbox',
      options: { checked: 'always' },
    },
    {
      id: 'builtin-captcha',
      name: 'Skip captcha',
      match: {
        kind: 'contains',
        patterns: ['captcha', 'recaptcha'],
        attributes: ['name', 'id', 'label', 'placeholder'],
      },
      action: 'skip',
    },
    {
      id: 'builtin-zip',
      name: 'Zip code',
      match: {
        kind: 'contains',
        patterns: ['zip', 'postal'],
        attributes: ['name', 'id', 'label', 'placeholder'],
      },
      fieldType: 'number',
      options: { min: 10000, max: 99999, decimals: 0 },
    },
  ];
}

function createDefaultSettings() {
  return {
    schemaVersion: 1,
    defaults: { defaultMaxLength: 20, triggerEvents: true },
    match: { attributes: [...DEFAULT_MATCH_ATTRIBUTES] },
    ignore: {
      hidden: true,
      withContent: false,
      types: ['button', 'submit', 'reset', 'file', 'hidden', 'image'],
      domains: [],
    },
    rules: builtinRules(),
    profiles: [],
  };
}

function withRules(base, ...rules) {
  return { ...base, rules: [...base.rules, ...JSON.parse(JSON.stringify(rules))] };
}

const fixedEmailRule = () => ({
  id: 'store-fixed-email',
  name: 'Fixed demo email',
  match: { kind: 'contains', patterns: ['email'], attributes: ['name', 'id', 'label'] },
  fieldType: 'email',
  options: {
    local: 'literal',
    literal: 'qa+demo',
    domain: 'literal',
    domainLiteral: 'example.com',
  },
});

const fixedPasswordRule = () => ({
  id: 'store-fixed-password',
  name: 'Fixed demo password',
  match: {
    kind: 'contains',
    patterns: ['password', 'passwd', 'pwd'],
    attributes: ['name', 'id', 'label'],
  },
  fieldType: 'password',
  options: { mode: 'defined', value: FIXED_PASSWORD },
});

const confirmMirrorRule = () => ({
  id: 'store-confirm-mirror',
  name: 'Confirm mirrors password',
  match: {
    kind: 'contains',
    patterns: ['confirm', 'retype', 'repeat', 'secondary'],
    attributes: ['name', 'id', 'label'],
  },
  action: 'mirror',
  mirrorSource: 'previous-password',
});

const newsletterRule = () => ({
  id: 'store-newsletter',
  name: 'Newsletter opt-in',
  match: { kind: 'contains', patterns: ['newsletter'], attributes: ['name', 'id', 'label'] },
  fieldType: 'checkbox',
  options: { checked: 'always' },
});

const addressRule = () => ({
  id: 'store-address-words',
  name: 'Address from words',
  match: { kind: 'contains', patterns: ['address'], attributes: ['name', 'id', 'label'] },
  fieldType: 'text',
  options: { minWords: 2, maxWords: 3 },
});

const cardNumberRule = () => ({
  id: 'store-card-number',
  name: 'Card number digits',
  match: {
    kind: 'contains',
    patterns: ['card'],
    attributes: ['name', 'id', 'label', 'placeholder'],
  },
  fieldType: 'integer',
  options: { min: 4000000000000000, max: 4999999999999999 },
});

const deliveryDateRule = () => ({
  id: 'store-delivery-date',
  name: 'Delivery date soon',
  match: { kind: 'contains', patterns: ['delivery'], attributes: ['name', 'id', 'label'] },
  fieldType: 'date',
  options: { minDaysFromToday: 2, maxDaysFromToday: 7 },
});

/* ------------------------------------------------------------ utilities --- */

function log(message) {
  console.log(message);
}

async function readPngSize(file) {
  const bytes = await readFile(file);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`${file} is not a valid PNG file`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function capture(page, file, expected) {
  await page.screenshot({ path: file, animations: 'disabled' });
  const size = await readPngSize(file);
  if (size.width !== expected.width || size.height !== expected.height) {
    throw new Error(
      `dimension mismatch for ${file}: got ${size.width}x${size.height}, expected ${expected.width}x${expected.height}`,
    );
  }
  outputs.push({ file: path.relative(rootDir, file), width: size.width, height: size.height });
  log(`  wrote ${path.relative(rootDir, file)} (${size.width}x${size.height})`);
}

function startStaticServer(directory) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relative = path.normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    const file = path.join(directory, relative === '' ? 'index.html' : relative);
    if (!file.startsWith(directory) || file.includes('..')) {
      response.writeHead(403).end('forbidden');
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        'content-type': mimeTypes[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, origin: `http://127.0.0.1:${port}` });
    });
  });
}

async function assertBuiltExtension() {
  try {
    await readFile(path.join(distDir, 'manifest.json'));
  } catch {
    throw new Error('dist/manifest.json is missing. Run "npm run build" before capturing.');
  }
}

async function waitForWorker(context) {
  return (
    context.serviceWorkers().find((worker) => worker.url().startsWith('chrome-extension://')) ??
    context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().startsWith('chrome-extension://'),
    })
  );
}

async function openPage(context, url) {
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url, { waitUntil: 'load' });
  await page.bringToFront();
  return page;
}

async function seedSettings(worker, settings) {
  await worker.evaluate(async (value) => {
    await chrome.storage.local.set({ settings: value });
  }, settings);
}

async function sendFill(worker, scope = 'all') {
  await worker.evaluate(async (fillScope) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id != null) {
      await chrome.tabs.sendMessage(tab.id, { type: 'FILL', scope: fillScope });
    }
  }, scope);
}

async function fillUntilValue(worker, page, selector, expected, label) {
  let lastValue = '';
  try {
    await expect
      .poll(
        async () => {
          try {
            await sendFill(worker);
          } catch {
            // The content script may not be listening yet; retry.
          }
          lastValue = await page.locator(selector).inputValue().catch(() => '');
          return lastValue;
        },
        { timeout: FILL_TIMEOUT_MS },
      )
      .toBe(expected);
  } catch {
    throw new Error(`${label}: expected ${selector} to be "${expected}" but got "${lastValue}"`);
  }
}

async function fillUntil(worker, page, selector, label) {
  let lastValue = '';
  try {
    await expect
      .poll(
        async () => {
          try {
            await sendFill(worker);
          } catch {
            // The content script may not be listening yet; retry.
          }
          lastValue = await page.locator(selector).inputValue().catch(() => '');
          return lastValue;
        },
        { timeout: FILL_TIMEOUT_MS },
      )
      .not.toBe('');
  } catch {
    throw new Error(`${label}: ${selector} was never filled (last value "${lastValue}")`);
  }
}

async function assertFilled(page, selectors, label) {
  const missing = [];
  for (const selector of selectors) {
    const value = await page.locator(selector).inputValue().catch(() => null);
    if (value === null || value.trim() === '') missing.push(selector);
  }
  if (missing.length > 0) {
    throw new Error(
      `${label}: these fields are still empty after "fill all": ${missing.join(', ')}. This is a product bug, not an asset problem.`,
    );
  }
}

async function assertChecked(page, selector, label) {
  if (!(await page.locator(selector).isChecked())) {
    throw new Error(`${label}: expected ${selector} to be checked after "fill all"`);
  }
}

async function addCaption(page, text) {
  await page.addStyleTag({
    content: `
      .aff-caption {
        position: fixed;
        right: 28px;
        bottom: 28px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px 20px 12px 15px;
        border-radius: 999px;
        background: ${palette.prussianBlue}F0;
        color: ${palette.white};
        font: 600 17px/1 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
        letter-spacing: -0.01em;
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.32);
      }
      .aff-caption .aff-caption-tick {
        width: 21px;
        height: 21px;
        border-radius: 50%;
        background: ${palette.orange};
        position: relative;
        flex: none;
      }
      .aff-caption .aff-caption-tick::after {
        content: '';
        position: absolute;
        left: 8px;
        top: 4px;
        width: 4px;
        height: 9px;
        border-right: 2px solid ${palette.prussianBlue};
        border-bottom: 2px solid ${palette.prussianBlue};
        transform: rotate(45deg);
      }
    `,
  });
  await page.evaluate((caption) => {
    const node = document.createElement('div');
    node.className = 'aff-caption';
    const tick = document.createElement('span');
    tick.className = 'aff-caption-tick';
    node.append(tick, document.createTextNode(caption));
    document.body.append(node);
  }, text);
}

/* --------------------------------------------------------------- promos --- */

function smallTileHtml(iconUri) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; }
      body {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(120% 150% at 6% -12%, color-mix(in srgb, ${palette.prussianBlue} 78%, ${palette.white}) 0%, ${palette.prussianBlue} 54%, ${palette.black} 100%);
        font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
        color: ${palette.white};
      }
      body::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(380px 200px at 92% 112%, ${palette.orange}59, transparent 70%);
      }
      .card {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 0 34px;
        text-align: center;
      }
      .icon { width: 58px; height: 58px; border-radius: 16px; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45); }
      h1 { font-size: 30px; line-height: 1.1; letter-spacing: -0.02em; }
      p { font-size: 17px; line-height: 1.35; color: ${palette.alabaster}; }
      .pill {
        margin-top: 3px;
        padding: 5px 12px;
        border: 1px solid ${palette.orange}80;
        border-radius: 999px;
        color: ${palette.orange};
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <img class="icon" src="${iconUri}" alt="" />
      <h1>Mocknik</h1>
      <p>Fake data. Real progress.</p>
      <span class="pill">Chrome extension</span>
    </div>
  </body>
</html>`;
}

function marqueeHtml(iconUri) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; }
      body {
        position: relative;
        display: flex;
        align-items: center;
        padding: 0 84px;
        background: radial-gradient(110% 160% at 0% -20%, color-mix(in srgb, ${palette.prussianBlue} 76%, ${palette.white}) 0%, ${palette.prussianBlue} 50%, ${palette.black} 100%);
        font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
        color: ${palette.white};
      }
      body::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(620px 380px at 96% 120%, ${palette.orange}4D, transparent 72%);
      }
      .wrap {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 440px;
        align-items: center;
        gap: 70px;
        width: 100%;
      }
      .icon { width: 70px; height: 70px; border-radius: 16px; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45); }
      h1 { margin-top: 22px; font-size: 54px; line-height: 1.05; letter-spacing: -0.025em; }
      .value-prop { margin-top: 14px; font-size: 22px; line-height: 1.35; color: ${palette.alabaster}; }
      .pills { display: flex; gap: 10px; margin-top: 24px; }
      .pill {
        padding: 8px 14px;
        border: 1px solid ${palette.orange}73;
        border-radius: 999px;
        color: ${palette.orange};
        font-size: 13px;
        font-weight: 600;
      }
      .mock {
        position: relative;
        padding: 26px;
        background: ${palette.white};
        border-radius: 16px;
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.45);
        color: ${palette.prussianBlue};
      }
      .mock h2 {
        margin-bottom: 18px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: ${palette.prussianBlue}B3;
      }
      .row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
      .row span { font-size: 11.5px; font-weight: 600; color: ${palette.prussianBlue}B3; }
      .bar {
        display: flex;
        align-items: center;
        height: 36px;
        padding: 0 11px;
        border: 1px solid ${palette.alabaster};
        border-radius: 8px;
        background: ${palette.white};
        font-size: 13.5px;
        color: ${palette.prussianBlue};
      }
      .row.accent .bar { border-color: ${palette.orange}; color: ${palette.prussianBlue}; font-weight: 600; }
      .cta {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 40px;
        margin-top: 4px;
        border-radius: 8px;
        background: ${palette.orange};
        color: ${palette.prussianBlue};
        font-size: 13.5px;
        font-weight: 700;
      }
      .check {
        position: absolute;
        top: -16px;
        right: -16px;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: ${palette.orange};
        box-shadow: 0 12px 26px rgba(252, 163, 17, 0.45);
      }
      .check::after {
        content: '';
        position: absolute;
        left: 16px;
        top: 10px;
        width: 11px;
        height: 20px;
        border-right: 3px solid ${palette.prussianBlue};
        border-bottom: 3px solid ${palette.prussianBlue};
        transform: rotate(45deg);
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div>
        <img class="icon" src="${iconUri}" alt="" />
        <h1>Mocknik</h1>
        <p class="value-prop">Fake data. Real progress.</p>
        <div class="pills">
          <span class="pill">One-click fill</span>
          <span class="pill">Custom overrides</span>
          <span class="pill">Works everywhere</span>
        </div>
      </div>
      <div class="mock">
        <div class="check"></div>
        <h2>Create an Account</h2>
        <div class="row">
          <span>Full Name</span>
          <div class="bar">Alex Carter</div>
        </div>
        <div class="row">
          <span>Email</span>
          <div class="bar">alex.carter@example.com</div>
        </div>
        <div class="row accent">
          <span>Address</span>
          <div class="bar">123 Maple Ave, San Francisco, CA 94107</div>
        </div>
        <div class="cta">Fill with Mock Data</div>
      </div>
    </div>
  </body>
</html>`;
}

async function capturePromos(context, iconUri) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 440, height: 280 });
    await page.setContent(smallTileHtml(iconUri), { waitUntil: 'load' });
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((image) =>
          image.complete ? undefined : image.decode().catch(() => undefined),
        ),
      ),
    );
    await capture(page, path.join(promoDir, 'small-tile-440x280.png'), {
      width: 440,
      height: 280,
    });

    await page.setViewportSize({ width: 1400, height: 560 });
    await page.setContent(marqueeHtml(iconUri), { waitUntil: 'load' });
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((image) =>
          image.complete ? undefined : image.decode().catch(() => undefined),
        ),
      ),
    );
    await capture(page, path.join(promoDir, 'marquee-1400x560.png'), {
      width: 1400,
      height: 560,
    });
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ main --- */

async function main() {
  await assertBuiltExtension();
  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(promoDir, { recursive: true });

  const iconUri = `data:image/png;base64,${(await readFile(iconFile)).toString('base64')}`;
  const staticServer = await startStaticServer(demoDir);
  let context;
  try {
    log(`demo server listening on ${staticServer.origin}`);
    context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
      ],
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });
    const worker = await waitForWorker(context);
    const extensionId = new URL(worker.url()).host;
    log(`extension id: ${extensionId}`);

    /* 01 - fill all on the signup page. */
    log('capturing 01-fill-all-1280x800.png');
    await seedSettings(worker, withRules(createDefaultSettings(), newsletterRule()));
    const signup = await openPage(context, `${staticServer.origin}/signup.html`);
    await fillUntil(worker, signup, '#email', 'Screenshot 01');
    await assertFilled(
      signup,
      [
        '#first-name',
        '#last-name',
        '#email',
        '#password',
        '#confirm-password',
        '#phone',
        '#date-of-birth',
        '#country',
      ],
      'Screenshot 01',
    );
    await assertChecked(signup, '#terms', 'Screenshot 01');
    await assertChecked(signup, '#newsletter', 'Screenshot 01');
    await addCaption(signup, 'One click. Every field.');
    await capture(signup, path.join(screenshotsDir, '01-fill-all-1280x800.png'), VIEWPORT);

    /* 02 - configured overrides on the signup page. */
    log('capturing 02-overrides-1280x800.png');
    await seedSettings(
      worker,
      withRules(
        createDefaultSettings(),
        fixedEmailRule(),
        fixedPasswordRule(),
        confirmMirrorRule(),
        newsletterRule(),
      ),
    );
    const overrides = await openPage(context, `${staticServer.origin}/signup.html`);
    await fillUntilValue(worker, overrides, '#email', FIXED_EMAIL, 'Screenshot 02');
    const passwordValue = await overrides.locator('#password').inputValue();
    const confirmValue = await overrides.locator('#confirm-password').inputValue();
    if (passwordValue !== FIXED_PASSWORD) {
      throw new Error(
        `Screenshot 02: password override not applied (got "${passwordValue}", expected "${FIXED_PASSWORD}")`,
      );
    }
    if (confirmValue !== FIXED_PASSWORD) {
      throw new Error(
        `Screenshot 02: confirm password does not mirror the override (got "${confirmValue}")`,
      );
    }
    await overrides.locator('[data-reveal="password"]').click();
    await overrides.locator('[data-reveal="confirm-password"]').click();
    await expect(overrides.locator('#password')).toHaveAttribute('type', 'text');
    await expect(overrides.locator('#confirm-password')).toHaveAttribute('type', 'text');
    await assertChecked(overrides, '#newsletter', 'Screenshot 02');
    await addCaption(overrides, 'Overrides: fixed email, mirrored password.');
    await capture(overrides, path.join(screenshotsDir, '02-overrides-1280x800.png'), VIEWPORT);
    await signup.close();
    await overrides.close();

    /* 03 - options page with the override rules. */
    log('capturing 03-options-1280x800.png');
    const optionsPage = await context.newPage();
    await optionsPage.emulateMedia({ colorScheme: 'light' });
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`, {
      waitUntil: 'load',
    });
    const emailRuleRow = optionsPage.locator('[data-rule-index="5"]');
    await emailRuleRow.waitFor({ state: 'visible' });
    await expect(emailRuleRow.locator('[data-field="rule-name"]')).toHaveValue('Fixed demo email');
    await emailRuleRow.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await optionsPage.evaluate(() => window.scrollBy(0, -58));
    await optionsPage.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))),
    );
    await capture(optionsPage, path.join(screenshotsDir, '03-options-1280x800.png'), VIEWPORT);
    await optionsPage.close();

    /* 04 - checkout page after a fill. */
    log('capturing 04-checkout-1280x800.png');
    await seedSettings(
      worker,
      withRules(
        createDefaultSettings(),
        addressRule(),
        cardNumberRule(),
        deliveryDateRule(),
      ),
    );
    const checkout = await openPage(context, `${staticServer.origin}/checkout.html`);
    await fillUntil(worker, checkout, '#full-name', 'Screenshot 04');
    await assertFilled(
      checkout,
      [
        '#full-name',
        '#email',
        '#address',
        '#city',
        '#zip',
        '#quantity',
        '#delivery-date',
        '#card-number',
        '#notes',
      ],
      'Screenshot 04',
    );
    await capture(checkout, path.join(screenshotsDir, '04-checkout-1280x800.png'), VIEWPORT);
    await checkout.close();

    /* Promo images. */
    log('capturing promo images');
    await capturePromos(context, iconUri);

    log('');
    log(`${outputs.length} store assets written:`);
    for (const output of outputs) {
      log(`  ${output.file} (${output.width}x${output.height})`);
    }
  } finally {
    if (context !== undefined) {
      await context.close();
    }
    await new Promise((resolve) => staticServer.server.close(resolve));
  }
}

main().catch((error) => {
  console.error('');
  console.error(`store asset capture failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
