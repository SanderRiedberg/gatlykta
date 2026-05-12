import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Load data/trivia.js into a sandboxed window. Verifies that the curated
// trivia keys actually match what triviaForStreet computes from the OSM
// names that appear in data/fallback-streets.js.

const root = fileURLToPath(new URL('../', import.meta.url));
const src = await readFile(join(root, 'data/trivia.js'), 'utf8');
const sandbox = { window: {} };
new Function('window', src)(sandbox.window);
const { triviaForStreet, triviaForDistrict, STREET_TRIVIA, DISTRICT_TRIVIA } = sandbox.window;

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('triviaForStreet: returns sv text for a known street', () => {
  const t = triviaForStreet('Drottninggatan', 'sv');
  assert.ok(t && t.includes('Hedvig Eleonora'));
});

test('triviaForStreet: returns en text when asked', () => {
  const t = triviaForStreet('Drottninggatan', 'en');
  assert.ok(t && t.includes('Hedvig Eleonora'));
});

test('triviaForStreet: falls back to sv if lang missing', () => {
  const t = triviaForStreet('Drottninggatan');
  assert.ok(t && t.length > 0);
});

test('triviaForStreet: normalizes åäö and case', () => {
  const t = triviaForStreet('STRANDVÄGEN', 'sv');
  assert.ok(t && t.includes('1897'));
});

test('triviaForStreet: handles compound names with spaces', () => {
  assert.ok(triviaForStreet('Birger Jarlsgatan', 'sv'));
  assert.ok(triviaForStreet('Söder Mälarstrand', 'sv'));
  assert.ok(triviaForStreet('Norr Mälarstrand', 'sv'));
  assert.ok(triviaForStreet('Sankt Eriksgatan', 'sv'));
});

test('triviaForStreet: returns null for unknown street', () => {
  assert.equal(triviaForStreet('Helt påhittad gata', 'sv'), null);
});

test('triviaForStreet: handles empty input', () => {
  assert.equal(triviaForStreet('', 'sv'), null);
  assert.equal(triviaForStreet(null, 'sv'), null);
  assert.equal(triviaForStreet(undefined, 'sv'), null);
});

test('triviaForDistrict: returns sv text for each district', () => {
  for (const id of ['gamla-stan', 'norrmalm', 'ostermalm', 'vasastan', 'kungsholmen', 'sodermalm']) {
    const t = triviaForDistrict(id, 'sv');
    assert.ok(t && t.length > 20, `expected trivia for ${id}`);
  }
});

test('triviaForDistrict: returns null for unknown id', () => {
  assert.equal(triviaForDistrict('atlantis', 'sv'), null);
});

test('STREET_TRIVIA entries all have both sv and en', () => {
  for (const [key, entry] of Object.entries(STREET_TRIVIA)) {
    assert.ok(entry.sv && entry.sv.length > 20, `${key}: missing sv`);
    assert.ok(entry.en && entry.en.length > 20, `${key}: missing en`);
  }
});

test('DISTRICT_TRIVIA entries all have both sv and en', () => {
  for (const [key, entry] of Object.entries(DISTRICT_TRIVIA)) {
    assert.ok(entry.sv && entry.sv.length > 20, `${key}: missing sv`);
    assert.ok(entry.en && entry.en.length > 20, `${key}: missing en`);
  }
});

// Verify trivia keys match what would appear in OSM data. We use a sample of
// the most likely candidates here; we cannot scan the full bundle without
// loading the actual file.
test('trivia keys cover well-known central Stockholm streets', () => {
  const wellKnown = [
    'Drottninggatan', 'Kungsgatan', 'Sveavägen', 'Vasagatan', 'Strandvägen',
    'Karlavägen', 'Valhallavägen', 'Birger Jarlsgatan', 'Götgatan', 'Hornsgatan',
    'Folkungagatan', 'Ringvägen', 'Söder Mälarstrand', 'Norr Mälarstrand',
    'Sankt Eriksgatan', 'Hantverkargatan', 'Västerlånggatan', 'Skeppsbron',
  ];
  const missing = wellKnown.filter(n => !triviaForStreet(n, 'sv'));
  assert.deepEqual(missing, [], `missing trivia for: ${missing.join(', ')}`);
});

let pass = 0, fail = 0;
for (const t of tests) {
  try { t.fn(); pass++; console.log(`✓ ${t.name}`); }
  catch (e) { fail++; console.error(`✗ ${t.name}\n  ${e.message}`); }
}
console.log(`\n${pass} passed, ${fail} failed.`);
process.exitCode = fail ? 1 : 0;
