import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(root, 'dist');
const watch = process.argv.includes('--watch');

const entries = {
  'content-script': 'src/entry/contentScript.main.ts',
  'service-worker': 'src/entry/serviceWorker.main.ts',
  options: 'src/entry/options/main.ts',
};

/** @returns {import('esbuild').BuildOptions} */
function optionsFor(name, entry) {
  return {
    entryPoints: [path.join(root, entry)],
    outfile: path.join(outdir, `${name}.js`),
    bundle: true,
    format: name === 'service-worker' ? 'esm' : 'iife',
    target: 'chrome120',
    sourcemap: watch ? 'inline' : false,
    logLevel: 'info',
  };
}

async function copyStatic() {
  await mkdir(outdir, { recursive: true });
  await cp(path.join(root, 'src/manifest.json'), path.join(outdir, 'manifest.json'));
  await cp(path.join(root, 'src/options.html'), path.join(outdir, 'options.html'));
  const css = path.join(root, 'src/entry/options/styles.css');
  if (existsSync(css)) await cp(css, path.join(outdir, 'options.css'));
  const icons = path.join(root, 'src/icons');
  if (existsSync(icons)) await cp(icons, path.join(outdir, 'icons'), { recursive: true });
}

async function run() {
  await rm(outdir, { recursive: true, force: true });
  const builds = Object.entries(entries).map(([name, entry]) => ({ name, options: optionsFor(name, entry) }));

  if (watch) {
    for (const { options } of builds) {
      const ctx = await context(options);
      await ctx.watch();
    }
    await copyStatic();
    console.log('watching for changes...');
  } else {
    await Promise.all(builds.map(({ options }) => build(options)));
    await copyStatic();
    console.log('build complete -> dist/');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
