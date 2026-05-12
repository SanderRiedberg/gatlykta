import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Load data/osm-pipeline.js as a CommonJS-style module via sandbox eval.
const root = fileURLToPath(new URL('../', import.meta.url));
const src = await readFile(join(root, 'data/osm-pipeline.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', src)(mod, mod.exports);
const { inBounds, classifyDistrict, metersBetween, highwayWeight, processOverpass } = mod.exports;

const DISTRICTS = [
  { id: 'norrmalm', bounds: [[59.3285, 18.0530], [59.3450, 18.0830]] },
  { id: 'sodermalm', bounds: [[59.3000, 18.0380], [59.3220, 18.1100]] },
];

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ─────────────── inBounds ───────────────
test('inBounds: point inside the rectangle', () => {
  assert.equal(inBounds([59.335, 18.07], [[59.328, 18.053], [59.345, 18.083]]), true);
});

test('inBounds: point outside the rectangle', () => {
  assert.equal(inBounds([59.40, 18.07], [[59.328, 18.053], [59.345, 18.083]]), false);
});

// ─────────────── classifyDistrict ───────────────
test('classifyDistrict: assigns by majority of hits', () => {
  const coords = [
    [59.335, 18.07], // norrmalm
    [59.336, 18.07], // norrmalm
    [59.310, 18.07], // sodermalm
  ];
  assert.equal(classifyDistrict(coords, DISTRICTS), 'norrmalm');
});

test('classifyDistrict: returns null when nothing inside any bounds', () => {
  const coords = [[60.0, 20.0], [60.1, 20.1]];
  assert.equal(classifyDistrict(coords, DISTRICTS), null);
});

// ─────────────── metersBetween ───────────────
test('metersBetween: ~111 km per latitude degree', () => {
  const d = metersBetween([59.0, 18.0], [60.0, 18.0]);
  assert.ok(d > 110000 && d < 112000, `expected ~111km, got ${d}`);
});

// ─────────────── highwayWeight ───────────────
test('highwayWeight maps OSM classes to thick/medium/thin', () => {
  assert.equal(highwayWeight('primary'), 'thick');
  assert.equal(highwayWeight('secondary'), 'medium');
  assert.equal(highwayWeight('tertiary'), 'medium');
  assert.equal(highwayWeight('residential'), 'thin');
  assert.equal(highwayWeight('living_street'), 'thin');
});

// ─────────────── processOverpass ───────────────
// Build a synthetic Overpass response with two ways for the same street so we
// can verify (a) grouping by (district, name), (b) length-based filtering,
// (c) per-district rank, (d) coordinate rounding, (e) weight upgrade.

const norrmalmA = [
  [59.335, 18.070],
  [59.336, 18.070],
  [59.337, 18.070],
];
const norrmalmB = [
  [59.338, 18.071],
  [59.339, 18.071],
];

function way(id, name, highway, geometry) {
  return {
    type: 'way',
    id,
    tags: { name, highway },
    geometry: geometry.map(([lat, lon]) => ({ lat, lon })),
  };
}

test('processOverpass: groups ways with the same name into one street', () => {
  const json = {
    elements: [
      way(1, 'Sveavägen', 'secondary', norrmalmA),
      way(2, 'Sveavägen', 'residential', norrmalmB),
    ],
  };
  const out = processOverpass(json, DISTRICTS);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'Sveavägen');
  assert.equal(out[0].ways.length, 2);
});

test('processOverpass: merges same name across districts into one street', () => {
  // A street whose ways span Norrmalm and Sodermalm should still be one entry
  // (Strandvägen real-world case: OSM splits it across district bounds).
  const norrmalmLong = [];
  for (let i = 0; i < 20; i++) norrmalmLong.push([59.335 + i * 0.0005, 18.070]);
  const sodermalmShort = [];
  for (let i = 0; i < 8; i++) sodermalmShort.push([59.310 + i * 0.0005, 18.070]);
  const json = {
    elements: [
      way(1, 'Långsamma vägen', 'secondary', norrmalmLong),
      way(2, 'Långsamma vägen', 'secondary', sodermalmShort),
    ],
  };
  const out = processOverpass(json, DISTRICTS);
  assert.equal(out.length, 1, 'same name across districts must not duplicate');
  assert.equal(out[0].ways.length, 2);
  assert.equal(out[0].district, 'norrmalm', 'majority of points fall in norrmalm');
});

test('processOverpass: weight upgrades from thin to medium when any way is bigger', () => {
  const json = {
    elements: [
      way(1, 'Sveavägen', 'residential', norrmalmA),
      way(2, 'Sveavägen', 'secondary', norrmalmB),
    ],
  };
  const out = processOverpass(json, DISTRICTS);
  assert.equal(out[0].weight, 'medium');
});

test('processOverpass: weight upgrades to thick when any way is primary', () => {
  const json = {
    elements: [
      way(1, 'Sveavägen', 'secondary', norrmalmA),
      way(2, 'Sveavägen', 'primary', norrmalmB),
    ],
  };
  const out = processOverpass(json, DISTRICTS);
  assert.equal(out[0].weight, 'thick');
});

test('processOverpass: drops streets shorter than minLengthMeters', () => {
  const shortWay = [[59.335, 18.070], [59.3351, 18.0700]]; // ~ a few meters
  const json = {
    elements: [
      way(1, 'Tiny gränd', 'residential', shortWay),
      way(2, 'Sveavägen', 'secondary', norrmalmA),
    ],
  };
  const out = processOverpass(json, DISTRICTS);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'Sveavägen');
});

test('processOverpass: returns per-district rank sorted by length desc', () => {
  const longA = [];
  for (let i = 0; i < 30; i++) longA.push([59.335 + i * 0.0005, 18.070]);
  const longB = [];
  for (let i = 0; i < 10; i++) longB.push([59.335 + i * 0.0005, 18.075]);
  const json = {
    elements: [
      way(1, 'Långgatan', 'secondary', longA),
      way(2, 'Mediumgatan', 'secondary', longB),
    ],
  };
  const out = processOverpass(json, DISTRICTS);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'Långgatan');
  assert.equal(out[0].rank, 0);
  assert.equal(out[1].rank, 1);
});

test('processOverpass: coordPrecision rounds lat/lon when specified', () => {
  const json = {
    elements: [
      way(1, 'Sveavägen', 'secondary', [
        [59.33512345678, 18.07012345678],
        [59.33612345678, 18.07012345678],
        [59.33712345678, 18.07012345678],
      ]),
    ],
  };
  const out = processOverpass(json, DISTRICTS, { coordPrecision: 7 });
  const firstCoord = out[0].ways[0][0];
  assert.equal(firstCoord[0].toString().split('.')[1].length <= 7, true);
});

test('processOverpass: drops ways outside any district', () => {
  const outsideCoords = [[60.0, 20.0], [60.001, 20.001], [60.002, 20.002]];
  const json = {
    elements: [
      way(1, 'Far away road', 'secondary', outsideCoords),
      way(2, 'Sveavägen', 'secondary', norrmalmA),
    ],
  };
  const out = processOverpass(json, DISTRICTS);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'Sveavägen');
});

test('processOverpass: skips ways without name tag', () => {
  const json = {
    elements: [
      { type: 'way', id: 1, tags: { highway: 'secondary' }, geometry: norrmalmA.map(([lat, lon]) => ({ lat, lon })) },
      way(2, 'Sveavägen', 'secondary', norrmalmA),
    ],
  };
  const out = processOverpass(json, DISTRICTS);
  assert.equal(out.length, 1);
});

test('processOverpass: result entries are fresh objects (no shared identity)', () => {
  const json = {
    elements: [way(1, 'Sveavägen', 'secondary', norrmalmA)],
  };
  const out1 = processOverpass(json, DISTRICTS);
  const out2 = processOverpass(json, DISTRICTS);
  assert.notEqual(out1[0], out2[0]);
  assert.equal(out1[0].name, out2[0].name);
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
