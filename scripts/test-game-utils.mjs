import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Load game-utils.jsx into a Node sandbox via a fake window. The file is plain
// JS that calls Object.assign(window, { ... }) at the bottom; we read it, wrap
// it in a Function, and execute it against a sandbox window so we can pull out
// the helpers without a build step.

const root = fileURLToPath(new URL('../', import.meta.url));
const src = await readFile(join(root, 'game-utils.jsx'), 'utf8');
const sandbox = { window: {}, Math };
new Function('window', 'Math', src)(sandbox.window, Math);

const {
  evaluateGuess,
  matchesGuess,
  streetHint,
  DIFFICULTY_CAPS,
  filterByDifficulty,
  streetsForDistricts,
  pointsForGuess,
  shuffleStreets,
  quizRoundSize,
  normalizeStreet,
  findGuessedStreet,
} = sandbox.window;

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ─────────────── normalizeStreet ───────────────
test('normalizeStreet: lowercases and folds åäö', () => {
  assert.equal(normalizeStreet('Drottninggatan'), 'drottninggatan');
  assert.equal(normalizeStreet('Sveavägen'), 'sveavagen');
  assert.equal(normalizeStreet('Götgatan'), 'gotgatan');
  assert.equal(normalizeStreet('S:t Eriksgatan'), 'st eriksgatan');
});

test('normalizeStreet: handles falsy and whitespace', () => {
  assert.equal(normalizeStreet(''), '');
  assert.equal(normalizeStreet(null), '');
  assert.equal(normalizeStreet('  Karlavägen  '), 'karlavagen');
});

// ─────────────── evaluateGuess ───────────────
const street = { name: 'Drottninggatan', id: 'norrmalm-drottninggatan', district: 'norrmalm' };

test('evaluateGuess: exact match', () => {
  const r = evaluateGuess(street, 'Drottninggatan');
  assert.equal(r.accepted, true);
  assert.equal(r.quality, 'exact');
  assert.equal(r.distance, 0);
});

test('evaluateGuess: case and diacritic insensitive', () => {
  const r = evaluateGuess({ name: 'Sveavägen' }, 'sveavagen');
  assert.equal(r.accepted, true);
  assert.equal(r.quality, 'exact');
});

test('evaluateGuess: empty guess returns empty quality', () => {
  const r = evaluateGuess(street, '   ');
  assert.equal(r.accepted, false);
  assert.equal(r.quality, 'empty');
});

test('evaluateGuess: 1-char typo accepted as fuzzy on longer names', () => {
  const r = evaluateGuess(street, 'Drottinggatan'); // missing one n
  assert.equal(r.accepted, true);
  assert.equal(r.quality, 'fuzzy');
  assert.ok(r.distance <= 2);
});

test('evaluateGuess: completely wrong street rejected', () => {
  const r = evaluateGuess(street, 'Sveavägen');
  assert.equal(r.accepted, false);
  assert.equal(r.quality, 'wrong');
});

test('evaluateGuess: suffix-stripped name accepted', () => {
  // "drottning" should match "drottninggatan" via withoutStreetSuffix
  const r = evaluateGuess(street, 'Drottning');
  assert.equal(r.accepted, true);
});

test('evaluateGuess: aliases are tried', () => {
  const s = { name: 'Storgatan', aliases: ['Stora gatan'] };
  const r = evaluateGuess(s, 'Stora gatan');
  assert.equal(r.accepted, true);
});

test('matchesGuess: thin wrapper around evaluateGuess', () => {
  assert.equal(matchesGuess(street, 'Drottninggatan'), true);
  assert.equal(matchesGuess(street, 'Sveavägen'), false);
});

// ─────────────── pointsForGuess ───────────────
test('pointsForGuess: clean exact gives 100', () => {
  assert.equal(pointsForGuess({ wrongs: 0, hints: 0, quality: 'exact' }), 100);
});

test('pointsForGuess: fuzzy costs 5', () => {
  assert.equal(pointsForGuess({ wrongs: 0, hints: 0, quality: 'fuzzy' }), 95);
});

test('pointsForGuess: 2 wrongs + 1 hint + fuzzy = 45', () => {
  // 100 - 30 - 20 - 5 = 45
  assert.equal(pointsForGuess({ wrongs: 2, hints: 1, quality: 'fuzzy' }), 45);
});

test('pointsForGuess: floor at 35', () => {
  assert.equal(pointsForGuess({ wrongs: 10, hints: 10, quality: 'exact' }), 35);
});

// ─────────────── streetHint ───────────────
test('streetHint: level 1 announces first letter and word count', () => {
  const h = streetHint({ name: 'Sveavägen' }, 1);
  assert.ok(h.includes('S'));
  assert.ok(h.includes('1'));
});

test('streetHint: level 2 returns trivia when available', () => {
  const h = streetHint({ name: 'Drottninggatan' }, 2);
  assert.ok(h.includes('kungliga') || h.includes('Drottninggatan'));
});

test('streetHint: level 2 falls back to suffix info', () => {
  const h = streetHint({ name: 'Wollmar Yxkullsgatan' }, 2);
  assert.ok(h.includes('gatan') || h.includes('bokstäver'));
});

test('streetHint: level 3 returns a masked pattern', () => {
  const h = streetHint({ name: 'Drottninggatan' }, 3);
  assert.ok(h.startsWith('Mönster:'));
  assert.ok(h.includes('D'));
  assert.ok(h.includes('n'));
});

// ─────────────── DIFFICULTY_CAPS / filterByDifficulty ───────────────
test('DIFFICULTY_CAPS exposes expected thresholds', () => {
  assert.equal(DIFFICULTY_CAPS.easy, 8);
  assert.equal(DIFFICULTY_CAPS.medium, 16);
  assert.equal(DIFFICULTY_CAPS.hard, 999);
});

test('filterByDifficulty: easy keeps only rank<8', () => {
  const streets = Array.from({ length: 20 }, (_, i) => ({ rank: i }));
  assert.equal(filterByDifficulty(streets, 'easy').length, 8);
  assert.equal(filterByDifficulty(streets, 'medium').length, 16);
  assert.equal(filterByDifficulty(streets, 'hard').length, 20);
});

test('filterByDifficulty: missing rank treated as 0 (always included)', () => {
  const streets = [{ name: 'x' }, { rank: 100 }];
  assert.equal(filterByDifficulty(streets, 'easy').length, 1);
});

// ─────────────── streetsForDistricts ───────────────
test('streetsForDistricts: null districtIds returns all (filtered by diff)', () => {
  const streets = [
    { district: 'norrmalm', rank: 0 },
    { district: 'sodermalm', rank: 5 },
    { district: 'sodermalm', rank: 50 },
  ];
  assert.equal(streetsForDistricts(streets, null, 'easy').length, 2);
  assert.equal(streetsForDistricts(streets, null, 'hard').length, 3);
});

test('streetsForDistricts: filters by district set', () => {
  const streets = [
    { district: 'norrmalm', rank: 0 },
    { district: 'sodermalm', rank: 0 },
  ];
  assert.equal(streetsForDistricts(streets, ['norrmalm'], 'easy').length, 1);
});

// ─────────────── quizRoundSize ───────────────
test('quizRoundSize: caps each difficulty', () => {
  assert.equal(quizRoundSize('easy', 200), 14);
  assert.equal(quizRoundSize('medium', 200), 24);
  assert.equal(quizRoundSize('hard', 200), 40);
});

test('quizRoundSize: returns total when smaller than cap', () => {
  assert.equal(quizRoundSize('hard', 8), 8);
});

// ─────────────── findGuessedStreet ───────────────
const sodermalmStreets = [
  { id: 'sod-skanegatan', name: 'Skånegatan', district: 'sodermalm' },
  { id: 'sod-ostgotagatan', name: 'Östgötagatan', district: 'sodermalm' },
  { id: 'sod-folkungagatan', name: 'Folkungagatan', district: 'sodermalm' },
  { id: 'sod-bondegatan', name: 'Bondegatan', district: 'sodermalm' },
];

test('findGuessedStreet: returns the exact match when guess is correct', () => {
  const r = findGuessedStreet('Skånegatan', sodermalmStreets);
  assert.ok(r);
  assert.equal(r.street.id, 'sod-skanegatan');
  assert.equal(r.quality, 'exact');
});

test('findGuessedStreet: returns the fuzzy-close street when guess is near', () => {
  // "Skånegatn" missing one letter
  const r = findGuessedStreet('Skånegatn', sodermalmStreets);
  assert.ok(r);
  assert.equal(r.street.id, 'sod-skanegatan');
});

test('findGuessedStreet: distinguishes between parallel streets', () => {
  // User typed Östgötagatan when target was Skånegatan — UI should know which
  const r = findGuessedStreet('Östgötagatan', sodermalmStreets);
  assert.ok(r);
  assert.equal(r.street.id, 'sod-ostgotagatan');
});

test('findGuessedStreet: returns null when nothing is fuzzy-close', () => {
  assert.equal(findGuessedStreet('Drottninggatan', sodermalmStreets), null);
});

test('findGuessedStreet: handles empty input and empty streets', () => {
  assert.equal(findGuessedStreet('', sodermalmStreets), null);
  assert.equal(findGuessedStreet('Skånegatan', []), null);
  assert.equal(findGuessedStreet('Skånegatan', null), null);
});

// ─────────────── shuffleStreets ───────────────
test('shuffleStreets: returns same set, does not mutate input', () => {
  const input = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const snapshot = input.map(s => s.id);
  const out = shuffleStreets(input);
  assert.equal(out.length, input.length);
  assert.deepEqual(input.map(s => s.id), snapshot);
  const outIds = out.map(s => s.id).sort();
  assert.deepEqual(outIds, ['a', 'b', 'c', 'd']);
});

// ─────────────── Runner ───────────────
let pass = 0;
let fail = 0;
for (const t of tests) {
  try {
    t.fn();
    pass += 1;
    console.log(`✓ ${t.name}`);
  } catch (e) {
    fail += 1;
    console.error(`✗ ${t.name}`);
    console.error(`  ${e.message}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed.`);
process.exitCode = fail ? 1 : 0;
