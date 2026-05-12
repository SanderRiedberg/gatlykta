import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

// Load the shared pipeline via a sandboxed eval so we don't need a build step.
// data/osm-pipeline.js is dual-context (window + module.exports).
const pipelineSrc = await readFile(join(root, 'data/osm-pipeline.js'), 'utf8');
const pipelineModule = { exports: {} };
new Function('module', 'exports', pipelineSrc)(pipelineModule, pipelineModule.exports);
const { processOverpass } = pipelineModule.exports;

// Load the district polygons the same way; the file just assigns to window.
const polygonsSrc = await readFile(join(root, 'data/district-polygons.js'), 'utf8');
const polygonsWindow = {};
new Function('window', polygonsSrc)(polygonsWindow);
const DISTRICT_POLYGONS = polygonsWindow.DISTRICT_POLYGONS || {};

const DISTRICTS = [
  { id: 'gamla-stan', bounds: [[59.3215, 18.0610], [59.3290, 18.0810]] },
  { id: 'norrmalm', bounds: [[59.3285, 18.0530], [59.3450, 18.0830]] },
  { id: 'ostermalm', bounds: [[59.3300, 18.0740], [59.3530, 18.1170]] },
  { id: 'vasastan', bounds: [[59.3380, 18.0220], [59.3550, 18.0760]] },
  { id: 'kungsholmen', bounds: [[59.3210, 17.9920], [59.3400, 18.0560]] },
  { id: 'sodermalm', bounds: [[59.3000, 18.0380], [59.3220, 18.1100]] },
];

const INNER_BBOX = [59.299, 17.990, 59.356, 18.120];
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

async function fetchOverpass() {
  const [s, w, n, e] = INNER_BBOX;
  const query = `
    [out:json][timeout:60];
    (
      way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|pedestrian)$"]["name"](${s},${w},${n},${e});
    );
    out geom;
  `;

  let lastErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Gatlykta prototype data bundler (https://github.com/SanderRiedberg/gatlykta)',
        },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
      return await res.json();
    } catch (error) {
      lastErr = error;
    }
  }
  throw lastErr || new Error('Overpass unreachable');
}

const json = await fetchOverpass();
const streets = processOverpass(json, DISTRICTS, { coordPrecision: 7, polygons: DISTRICT_POLYGONS });
if (streets.length < 80) throw new Error(`Too few bundled streets: ${streets.length}`);

const generated = new Date().toISOString();
const text = `/* Generated from OpenStreetMap via Overpass on ${generated}.
   Do not edit by hand. Run: node scripts/build-osm-bundle.mjs */
window.FALLBACK_STREETS_SOURCE = {
  provider: "OpenStreetMap contributors",
  license: "ODbL",
  generated: ${JSON.stringify(generated)},
  bbox: ${JSON.stringify(INNER_BBOX)}
};
window.FALLBACK_STREETS = ${JSON.stringify(streets)};
`;

await writeFile('data/fallback-streets.js', text);
console.log(`Wrote ${streets.length} OSM streets to data/fallback-streets.js`);
