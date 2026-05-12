/* global window, fetch, DISTRICTS, INNER_BBOX, processOverpass */
// Gatlykta — OSM data fetcher + cache.
// Streets are fetched live from Overpass on first load, cached in localStorage.
// The pure transform that turns Overpass JSON into Gatlykta street entities
// lives in data/osm-pipeline.js (shared with scripts/build-osm-bundle.mjs).

// ─────────────── Overpass fetch + cache ───────────────
const CACHE_KEY = 'gatlykta.osm.v4';
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

function loadCachedOSM() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj.timestamp || (Date.now() - obj.timestamp) > CACHE_TTL) return null;
    if (!Array.isArray(obj.data)) return null;
    if (obj.data.length && obj.data[0].rank == null) return withRanks(obj.data);
    return obj.data;
  } catch { return null; }
}
function saveCachedOSM(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data })); } catch {}
}

function withRanks(data) {
  const ranks = {};
  return data.map(s => {
    const next = s.rank == null ? { ...s, rank: (ranks[s.district] || 0) } : s;
    ranks[s.district] = (ranks[s.district] || 0) + 1;
    return next;
  });
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
    const streets = processOverpass(json, DISTRICTS, { polygons: window.DISTRICT_POLYGONS });
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
