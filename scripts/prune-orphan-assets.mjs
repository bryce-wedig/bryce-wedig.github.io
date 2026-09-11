#!/usr/bin/env node
/**
 * Deletes optimized-away originals from dist/_astro.
 *
 * Astro emits the full-size source of every processed image even when the built
 * pages only ever link to the generated variants, so a 5 MB headshot ships
 * alongside the 11 kB WebP nobody replaced it with. This removes any image in
 * dist/_astro whose filename appears nowhere else in the build.
 *
 *   node scripts/prune-orphan-assets.mjs
 */

import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(DIST, '_astro');
const IMAGE_EXT = /\.(png|jpe?g|gif|tiff?|avif|webp|svg)$/i;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const all = await walk(DIST);
const candidates = all.filter((f) => f.startsWith(ASSETS + path.sep) && IMAGE_EXT.test(f));

// Anything that isn't a candidate could cite one, so scan every other built file.
const haystack = (
  await Promise.all(all.filter((f) => !candidates.includes(f)).map((f) => readFile(f, 'utf8').catch(() => '')))
).join('\n');

let removed = 0;
let bytes = 0;

for (const file of candidates) {
  const name = path.basename(file);
  if (haystack.includes(name)) continue;
  bytes += (await stat(file)).size;
  await unlink(file);
  removed += 1;
}

const mb = (bytes / 1024 / 1024).toFixed(1);
console.log(
  removed > 0
    ? `pruned ${removed} unreferenced image${removed === 1 ? '' : 's'} from dist/_astro (${mb} MB)`
    : 'no unreferenced images in dist/_astro',
);
