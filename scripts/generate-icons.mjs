#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const iconSvgPath = path.resolve(here, '../brand/logo-icon.svg');
const outDir = path.resolve(here, '../src/icons');

// The 128px render is the icon the Chrome Web Store uses. Its artwork is inset
// so it occupies ~76% of the canvas, matching the store guidance of 96x96
// artwork inside a 128x128 image. A faint outer glow keeps the dark mark
// legible on dark backgrounds, as the store guidance recommends.
const RENDERS = [
  { size: 16, inner: 16, glow: false },
  { size: 48, inner: 48, glow: false },
  { size: 128, inner: 108, glow: true },
];

const svg = await readFile(iconSvgPath, 'utf8');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

try {
  for (const { size, inner, glow } of RENDERS) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    const html = `<!doctype html>
<html>
  <head>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${size}px;
        height: ${size}px;
        background: transparent;
        overflow: hidden;
      }
      .wrap {
        width: ${size}px;
        height: ${size}px;
        display: grid;
        place-items: center;
        ${glow ? 'filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.55));' : ''}
      }
      svg { display: block; width: ${inner}px; height: ${inner}px; }
    </style>
  </head>
  <body><div class="wrap">${svg}</div></body>
</html>`;
    await page.setContent(html, { waitUntil: 'load' });
    const buffer = await page.screenshot({ omitBackground: true, type: 'png' });
    await page.close();

    const file = path.join(outDir, `icon-${size}.png`);
    await writeFile(file, buffer);
    console.log(`wrote ${path.relative(process.cwd(), file)} (${size}x${size})`);
  }
} finally {
  await browser.close();
}
