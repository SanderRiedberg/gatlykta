import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

function fail(message) {
  console.error(`Static check failed: ${message}`);
  process.exitCode = 1;
}

const html = await readFile(join(root, 'index.html'), 'utf8');
const localScripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
  .map(match => match[1])
  .filter(src => !/^https?:\/\//.test(src));

for (const src of localScripts) {
  try {
    await access(join(root, src));
  } catch {
    fail(`index.html references missing script: ${src}`);
  }
}

for (const expected of [
  'data/city-stockholm.js',
  'game-utils.jsx',
  'data/osm-pipeline.js',
  'data/osm.js',
  'map-rendering.jsx',
  'map.jsx',
  'modes/guess-pop.jsx',
  'modes/fill.jsx',
  'modes/quiz.jsx',
  'modes/time.jsx',
  'modes/learn.jsx',
]) {
  if (!localScripts.includes(expected)) {
    fail(`index.html no longer loads expected script: ${expected}`);
  }
}

const fallback = await readFile(join(root, 'data/fallback-streets.js'), 'utf8');
const streetCount = (fallback.match(/"id":/g) || []).length;
if (streetCount < 80) {
  fail(`fallback street bundle looks too small: ${streetCount} streets`);
}

if (!process.exitCode) {
  console.log(`Static check passed: ${localScripts.length} local scripts, ${streetCount} bundled streets.`);
}
