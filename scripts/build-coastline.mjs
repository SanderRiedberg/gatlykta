import { writeFile } from 'node:fs/promises';

// Fetch all place=island/islet polygons inside the inner Stockholm bbox and
// write data/coastline.js. Used by the paper overlay to draw the island
// outlines as a coastline hint — gives natural orientation ("Norr
// Mälarstrand follows the shore on Kungsholmen") without exposing the
// street geometry.

const BBOX = '59.290,17.970,59.365,18.140';

// Skip islands that are too large or too far out to be useful for inner-city
// orientation. They'd clutter the paper without helping.
const SKIP_NAMES = new Set([
  'Lidingö',
  'Södertörn',
  'Stora Essingen',
  'Lilla Essingen',
]);

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

const QUERY = `
[out:json][timeout:60];
(
  relation["place"~"^(island|islet)$"]["name"](${BBOX});
  way["place"~"^(island|islet)$"]["name"](${BBOX});
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

function endpointsMatch(a, b) { return metersBetween(a, b) < 1.0; }

function stitchRing(ways) {
  if (!ways.length) return [];
  const remaining = ways.map(w => w.geometry.map(g => [g.lat, g.lon]));
  let ring = remaining.shift().slice();
  let safety = remaining.length * 4 + 4;
  while (remaining.length && safety-- > 0) {
    const head = ring[0], tail = ring[ring.length - 1];
    let attached = false;
    for (let i = 0; i < remaining.length; i++) {
      const w = remaining[i];
      const ws = w[0], we = w[w.length - 1];
      if (endpointsMatch(tail, ws)) { ring = ring.concat(w.slice(1)); remaining.splice(i, 1); attached = true; break; }
      if (endpointsMatch(tail, we)) { ring = ring.concat(w.slice(0, -1).reverse()); remaining.splice(i, 1); attached = true; break; }
      if (endpointsMatch(head, we)) { ring = w.slice(0, -1).concat(ring); remaining.splice(i, 1); attached = true; break; }
      if (endpointsMatch(head, ws)) { ring = w.slice().reverse().slice(0, -1).concat(ring); remaining.splice(i, 1); attached = true; break; }
    }
    if (!attached) break;
  }
  if (ring.length > 2 && endpointsMatch(ring[0], ring[ring.length - 1])) ring[ring.length - 1] = ring[0];
  return ring;
}

function decimate(points, minDistMeters = 20) {
  if (points.length <= 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1];
    if (metersBetween(last, points[i]) >= minDistMeters) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

function roundCoords(points, precision = 6) {
  return points.map(p => [Number(p[0].toFixed(precision)), Number(p[1].toFixed(precision))]);
}

function polygonAreaSqMeters(ring) {
  // Approximate planar area in m² using equirectangular projection at the
  // ring's mean latitude. Good enough to filter tiny rocks.
  if (ring.length < 3) return 0;
  const meanLat = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cosLat = Math.cos(meanLat * Math.PI / 180);
  const mPerDegLat = 110540;
  const mPerDegLng = 111320 * cosLat;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][1] * mPerDegLng, yi = ring[i][0] * mPerDegLat;
    const xj = ring[j][1] * mPerDegLng, yj = ring[j][0] * mPerDegLat;
    a += xj * yi - xi * yj;
  }
  return Math.abs(a) / 2;
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
          'User-Agent': 'Gatlykta coastline builder',
        },
        body: 'data=' + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
      return await res.json();
    } catch (error) { lastErr = error; }
  }
  throw lastErr || new Error('Overpass unreachable');
}

const json = await fetchOverpass();
const elements = json.elements || [];

const islands = [];

for (const rel of elements.filter(e => e.type === 'relation')) {
  const name = rel.tags && rel.tags.name;
  if (!name || SKIP_NAMES.has(name)) continue;
  const outer = (rel.members || []).filter(m => m.type === 'way' && m.role === 'outer' && Array.isArray(m.geometry));
  if (!outer.length) continue;
  const ring = stitchRing(outer);
  if (ring.length < 4) continue;
  const area = polygonAreaSqMeters(ring);
  if (area < 1500) continue; // skip tiny rocks; <1500m² ≈ 40×40m
  islands.push({ name, points: roundCoords(decimate(ring, 18), 6), area });
}

for (const way of elements.filter(e => e.type === 'way')) {
  const name = way.tags && way.tags.name;
  if (!name || SKIP_NAMES.has(name)) continue;
  if (!Array.isArray(way.geometry) || way.geometry.length < 4) continue;
  // Skip if we already have this island via a relation.
  if (islands.some(i => i.name === name)) continue;
  const ring = way.geometry.map(g => [g.lat, g.lon]);
  const area = polygonAreaSqMeters(ring);
  if (area < 1500) continue;
  islands.push({ name, points: roundCoords(decimate(ring, 18), 6), area });
}

// Sort largest first so the renderer can draw big islands before small ones.
islands.sort((a, b) => b.area - a.area);
for (const i of islands) {
  console.log(`  ${i.name.padEnd(22)}  ${i.points.length.toString().padStart(3)} pts   ${Math.round(i.area).toLocaleString()} m²`);
}

const generated = new Date().toISOString();
// Drop the area before writing — keep the data lean.
const lean = islands.map(({ name, points }) => ({ name, points }));
const text = `/* Generated from OpenStreetMap place=island|islet on ${generated}.
   Do not edit by hand. Run: node scripts/build-coastline.mjs
   Each entry has a closed ring [[lat, lng], ...] for an island visible in
   inner Stockholm. Used by the paper overlay for coastline orientation. */
window.COASTLINE_SOURCE = {
  provider: "OpenStreetMap contributors",
  license: "ODbL",
  generated: ${JSON.stringify(generated)}
};
window.COASTLINE = ${JSON.stringify(lean, null, 2)};
`;

await writeFile('data/coastline.js', text);
console.log(`Wrote ${islands.length} islands to data/coastline.js`);
