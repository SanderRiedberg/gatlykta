import { writeFile } from 'node:fs/promises';

// Build data/district-polygons.js by fetching admin_level=10 boundary
// relations from OpenStreetMap, stitching their outer ways into closed
// rings, and decimating to ~25m point spacing.
//
// Maps OSM names to Gatlykta district ids:
//   Gamla stan   → gamla-stan
//   Norrmalm     → norrmalm
//   Östermalm    → ostermalm
//   Vasastaden   → vasastan      (alt_name in OSM)
//   Kungsholmen  → kungsholmen
//   Södermalm    → sodermalm

const NAME_TO_ID = {
  'Gamla stan': 'gamla-stan',
  'Norrmalm': 'norrmalm',
  'Östermalm': 'ostermalm',
  'Vasastaden': 'vasastan',
  'Kungsholmen': 'kungsholmen',
  'Södermalm': 'sodermalm',
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

const QUERY = `
[out:json][timeout:60];
(
  relation["boundary"="administrative"]["admin_level"="10"]
    ["name"~"^(Norrmalm|Östermalm|Vasastaden|Kungsholmen|Södermalm|Gamla stan)$"]
    (59.290,17.970,59.360,18.140);
);
out geom;
`;

function metersBetween(a, b) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const aa = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

function endpointsMatch(a, b) {
  return metersBetween(a, b) < 1.0;
}

// Stitch outer way members into one ring. Members may be in arbitrary order
// and orientation. Returns a single closed ring (first === last) or the
// longest stitched chain if we couldn't fully close.
function stitchRing(ways) {
  if (!ways.length) return [];
  const remaining = ways.map(w => w.geometry.map(g => [g.lat, g.lon]));
  let ring = remaining.shift().slice();

  let safety = remaining.length * 4 + 4;
  while (remaining.length && safety-- > 0) {
    const head = ring[0];
    const tail = ring[ring.length - 1];
    let attached = false;
    for (let i = 0; i < remaining.length; i++) {
      const w = remaining[i];
      const wStart = w[0];
      const wEnd = w[w.length - 1];
      if (endpointsMatch(tail, wStart)) {
        ring = ring.concat(w.slice(1));
        remaining.splice(i, 1); attached = true; break;
      }
      if (endpointsMatch(tail, wEnd)) {
        ring = ring.concat(w.slice(0, -1).reverse());
        remaining.splice(i, 1); attached = true; break;
      }
      if (endpointsMatch(head, wEnd)) {
        ring = w.slice(0, -1).concat(ring);
        remaining.splice(i, 1); attached = true; break;
      }
      if (endpointsMatch(head, wStart)) {
        ring = w.slice().reverse().slice(0, -1).concat(ring);
        remaining.splice(i, 1); attached = true; break;
      }
    }
    if (!attached) break; // disconnected segment — keep what we have
  }
  // Close the ring if its endpoints meet.
  if (ring.length > 2 && endpointsMatch(ring[0], ring[ring.length - 1])) {
    ring[ring.length - 1] = ring[0];
  }
  return ring;
}

// Decimate adjacent points that sit within `minDistMeters` of each other.
// Always keep first and last point.
function decimate(points, minDistMeters = 25) {
  if (points.length <= 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1];
    if (metersBetween(last, points[i]) >= minDistMeters) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

// Round each lat/lng to 6 decimals (~11cm precision; enough for visual frames).
function roundCoords(points, precision = 6) {
  return points.map(p => [Number(p[0].toFixed(precision)), Number(p[1].toFixed(precision))]);
}

async function fetchOverpass() {
  let lastErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Gatlykta district polygon builder (https://github.com/SanderRiedberg/gatlykta)',
        },
        body: 'data=' + encodeURIComponent(QUERY),
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
const relations = (json.elements || []).filter(e => e.type === 'relation');

const polygons = {};
for (const rel of relations) {
  const osmName = rel.tags && rel.tags.name;
  const districtId = NAME_TO_ID[osmName];
  if (!districtId) continue;
  const outerWays = (rel.members || [])
    .filter(m => m.type === 'way' && m.role === 'outer' && Array.isArray(m.geometry));
  if (!outerWays.length) {
    console.warn(`  ! ${osmName}: no outer ways`);
    continue;
  }
  const ring = stitchRing(outerWays);
  const closed = ring.length > 2 && endpointsMatch(ring[0], ring[ring.length - 1]);
  const decimated = roundCoords(decimate(ring, 25), 6);
  polygons[districtId] = decimated;
  console.log(`  ${districtId.padEnd(13)} ← ${osmName}: ${outerWays.length} ways, ${ring.length}→${decimated.length} pts, ${closed ? 'closed' : 'OPEN'}`);
}

for (const id of Object.values(NAME_TO_ID)) {
  if (!polygons[id]) console.warn(`  ! Missing polygon for ${id}`);
}

const generated = new Date().toISOString();
const text = `/* Generated from OpenStreetMap admin_level=10 boundaries on ${generated}.
   Do not edit by hand. Run: node scripts/build-district-polygons.mjs
   Each polygon is a closed ring [[lat, lng], ...]. */
window.DISTRICT_POLYGONS_SOURCE = {
  provider: "OpenStreetMap contributors",
  license: "ODbL",
  generated: ${JSON.stringify(generated)},
  admin_level: 10
};
window.DISTRICT_POLYGONS = ${JSON.stringify(polygons, null, 2)};
`;

await writeFile('data/district-polygons.js', text);
console.log(`Wrote ${Object.keys(polygons).length} district polygons to data/district-polygons.js`);
