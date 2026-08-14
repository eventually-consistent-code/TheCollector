#!/usr/bin/env node

/**
 * Purpose: Pull the kennymkchan/funko-pop-data dataset (MIT, deprecated
 * upstream Feb 2026 but stable) and trim it to what the funko adapter
 * searches on — title + primary series. Re-run only if upstream ever moves;
 * output is committed at src/metadata/data/funko.json.
 * Author(s): John Reed
 */

// Imports

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Constants

const SOURCE_URL =
  'https://raw.githubusercontent.com/kennymkchan/funko-pop-data/master/funko_pop.json';
const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '../src/metadata/data/funko.json');

// Main

console.log('fetching funko dataset...');
const response = await fetch(SOURCE_URL);
if (!response.ok) {
  console.error(`fetch failed: ${response.status}`);
  process.exit(1);
}
const data = await response.json();

console.log(`trimming ${data.length} entries...`);
// Keep it tiny: t = title, s = primary series. Image URLs are hobbydb
// hotlinks we do not want to depend on.
const trimmed = data.map((entry) => ({
  t: entry.title ?? '',
  s: (entry.series ?? [])[0] ?? '',
}));

writeFileSync(OUT_FILE, JSON.stringify(trimmed));
console.log(`saved ${trimmed.length} pops to ${OUT_FILE}`);
console.log('done.');
