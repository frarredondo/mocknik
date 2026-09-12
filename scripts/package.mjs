#!/usr/bin/env node
/**
 * Packages the built extension into a Chrome Web Store submission ZIP.
 *
 * Requires `npm run build` first. Writes `release/mocknik-v<version>.zip` with
 * manifest.json at the root, which is what the developer dashboard expects.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const distDir = path.join(root, 'dist');
const outDir = path.join(root, 'release');

let manifest;
try {
  manifest = JSON.parse(await readFile(path.join(distDir, 'manifest.json'), 'utf8'));
} catch {
  console.error('dist/manifest.json is missing. Run "npm run build" first.');
  process.exit(1);
}

const version = manifest.version;
const outFile = path.join(outDir, `mocknik-v${version}.zip`);

await mkdir(outDir, { recursive: true });
await rm(outFile, { force: true });

const entries = await readdir(distDir);
try {
  execFileSync('zip', ['-r', '-q', outFile, ...entries], { cwd: distDir });
} catch (error) {
  console.error('Failed to run the "zip" command. Install zip and retry.');
  if (error instanceof Error) console.error(error.message);
  process.exit(1);
}

const { size } = await stat(outFile);
console.log(`wrote ${path.relative(root, outFile)} (${(size / 1024).toFixed(1)} KB)`);
console.log(`name: ${JSON.stringify(manifest.name)}`);
console.log(`version: ${version}`);
