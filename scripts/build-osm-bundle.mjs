import { writeFile } from 'node:fs/promises';

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

function inBounds(latlng, bounds) {
  const [[s, w], [n, e]] = bounds;
  return latlng[0] >= s && latlng[0] <= n && latlng[1] >= w && latlng[1] <= e;
}

function classifyDistrict(coords) {
  const counts = {};
  for (const c of coords) {
    for (const d of DISTRICTS) {
      if (inBounds(c, d.bounds)) {
        counts[d.id] = (counts[d.id] || 0) + 1;
        break;
      }
    }
  }
  let best = null, bestN = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) { best = k; bestN = v; }
  }
  return best;
}

function metersBetween(a, b) {
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const aa = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

function processOverpass(json) {
  const ways = (json.elements || []).filter(e => e.type === 'way' && e.geometry && e.tags && e.tags.name);
  const grouped = new Map();
  for (const w of ways) {
    const coords = w.geometry.map(g => [Number(g.lat.toFixed(7)), Number(g.lon.toFixed(7))]);
    const district = classifyDistrict(coords);
    if (!district) continue;
    const hwClass = w.tags.highway;
    const weight = ['primary'].includes(hwClass) ? 'thick'
      : ['secondary'].includes(hwClass) || ['tertiary'].includes(hwClass) ? 'medium' : 'thin';
    const key = `${district}::${w.tags.name}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
        name: w.tags.name,
        aliases: [],
        district,
        weight,
        ways: [],
      });
    }
    const street = grouped.get(key);
    street.ways.push(coords);
    if (weight === 'thick') street.weight = 'thick';
    else if (weight === 'medium' && street.weight === 'thin') street.weight = 'medium';
  }

  const out = [];
  for (const s of grouped.values()) {
    let len = 0;
    for (const way of s.ways) {
      for (let i = 1; i < way.length; i++) len += metersBetween(way[i - 1], way[i]);
    }
    s.lengthMeters = Math.round(len);
    if (len >= 60) out.push(s);
  }

  out.sort((a, b) => b.lengthMeters - a.lengthMeters);
  const ranks = {};
  for (const s of out) {
    s.rank = (ranks[s.district] = (ranks[s.district] || 0));
    ranks[s.district]++;
  }
  return out;
}

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
const streets = processOverpass(json);
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
