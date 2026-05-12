/* global window, fetch, DISTRICTS, INNER_BBOX */
// Gatlykta — OSM data fetcher + district polygons.
// Streets are fetched live from Overpass on first load, cached in localStorage.

// ─────────────── District classification ───────────────
function inBounds(latlng, bounds) {
  const [[s, w], [n, e]] = bounds;
  return latlng[0] >= s && latlng[0] <= n && latlng[1] >= w && latlng[1] <= e;
}

function classifyDistrict(coords) {
  // coords: [[lat, lng], ...] of a way
  // Returns district id by majority of points; null if none.
  const counts = {};
  for (const c of coords) {
    for (const d of DISTRICTS) {
      if (inBounds(c, d.bounds)) { counts[d.id] = (counts[d.id] || 0) + 1; break; }
    }
  }
  let best = null, bestN = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) { best = k; bestN = v; }
  }
  return best;
}

// ─────────────── Overpass fetch + cache ───────────────
const CACHE_KEY = 'gatlykta.osm.v4';
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

function loadCachedOSM() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj.timestamp || (Date.now() - obj.timestamp) > CACHE_TTL) return null;
    const data = obj.data;
    if (data && data.length && data[0].rank == null) {
      const ranks = {};
      for (const s of data) { s.rank = (ranks[s.district] = (ranks[s.district] || 0)); ranks[s.district]++; }
    }
    return data;
  } catch { return null; }
}
function saveCachedOSM(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data })); } catch {}
}

function withRanks(data) {
  const ranks = {};
  for (const s of data) {
    if (s.rank == null) s.rank = (ranks[s.district] = (ranks[s.district] || 0));
    ranks[s.district] = (ranks[s.district] || 0) + 1;
  }
  return data;
}

function getFallbackStreets() {
  const fallback = window.FALLBACK_STREETS;
  if (!fallback || !fallback.length) return null;
  return withRanks(JSON.parse(JSON.stringify(fallback)));
}

function shouldForceFallback() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has('fallback') || localStorage.getItem('gatlykta.useFallback') === '1';
  } catch {
    return false;
  }
}

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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error('Overpass ' + res.status);
      const json = await res.json();
      return json;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Overpass unreachable');
}

function processOverpass(json) {
  // Group ways by (name + district). Each (name, district) → one street entity
  // with a list of way geometries (clickable separately or as one).
  const ways = (json.elements || []).filter(e => e.type === 'way' && e.geometry && e.tags && e.tags.name);
  const grouped = new Map();
  for (const w of ways) {
    const coords = w.geometry.map(g => [g.lat, g.lon]);
    const district = classifyDistrict(coords);
    if (!district) continue;
    const hwClass = w.tags.highway;
    const weight = ['primary'].includes(hwClass) ? 'thick'
                 : ['secondary'].includes(hwClass) ? 'medium'
                 : ['tertiary'].includes(hwClass) ? 'medium' : 'thin';
    const key = `${district}::${w.tags.name}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
        name: w.tags.name,
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
  // Filter out very short streets (alleys, fragments) — sum length per group
  function metersBetween(a, b) {
    const R = 6371000, toRad = x => x * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
    const aa = Math.sin(dLat/2)**2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(aa));
  }
  const out = [];
  for (const s of grouped.values()) {
    let len = 0;
    for (const w of s.ways) for (let i = 1; i < w.length; i++) len += metersBetween(w[i-1], w[i]);
    s.lengthMeters = Math.round(len);
    if (len < 60) continue; // skip tiny ways
    out.push(s);
  }
  // Sort by length desc. Difficulty is applied later from per-district rank:
  // easy/medium take the most prominent streets, hard keeps the full OSM set.
  out.sort((a, b) => b.lengthMeters - a.lengthMeters);
  // Compute per-district rank (0 = most prominent / longest)
  const ranks = {};
  for (const s of out) { s.rank = (ranks[s.district] = (ranks[s.district] || 0)); ranks[s.district]++; }
  return out;
}

// ─────────────── Loader ───────────────
let _LOADED = null;
async function ensureStreets(onProgress) {
  if (_LOADED) return _LOADED;
  if (shouldForceFallback()) {
    onProgress && onProgress({ stage: 'fallback' });
    _LOADED = getFallbackStreets() || [];
    return _LOADED;
  }
  const cached = loadCachedOSM();
  if (cached) { _LOADED = cached; return cached; }
  try {
    onProgress && onProgress({ stage: 'fetching' });
    const json = await fetchOverpass();
    onProgress && onProgress({ stage: 'processing' });
    const streets = processOverpass(json);
    _LOADED = streets;
    saveCachedOSM(streets);
    return streets;
  } catch (error) {
    const fallback = getFallbackStreets();
    if (!fallback) throw error;
    onProgress && onProgress({ stage: 'fallback' });
    _LOADED = fallback;
    return fallback;
  }
}

function getLoaded() { return _LOADED || []; }
function byDistrict(districtId) { return (_LOADED || []).filter(s => s.district === districtId); }

Object.assign(window, {
  ensureStreets, getLoaded, byDistrict,
  getFallbackStreets,
});
