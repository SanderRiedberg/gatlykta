/* global window, fetch */
// Gatlykta — OSM data fetcher + district polygons.
// Streets are fetched live from Overpass on first load, cached in localStorage.

// Districts inside Stockholm tullarna. Polygons are simplified bounding shapes
// drawn around each district — used to classify a street into a district.
const DISTRICTS = [
  { id: 'gamla-stan',  name: 'Gamla Stan',  nameEn: 'Old Town',
    bounds: [[59.3215, 18.0610], [59.3290, 18.0810]],
    center: [59.3253, 18.0710], zoom: 16 },
  { id: 'norrmalm',    name: 'Norrmalm',    nameEn: 'Norrmalm',
    bounds: [[59.3285, 18.0530], [59.3450, 18.0830]],
    center: [59.3360, 18.0680], zoom: 15 },
  { id: 'ostermalm',   name: 'Östermalm',   nameEn: 'Östermalm',
    bounds: [[59.3300, 18.0740], [59.3530, 18.1170]],
    center: [59.3400, 18.0940], zoom: 14 },
  { id: 'vasastan',    name: 'Vasastan',    nameEn: 'Vasastan',
    bounds: [[59.3380, 18.0220], [59.3550, 18.0760]],
    center: [59.3450, 18.0470], zoom: 14 },
  { id: 'kungsholmen', name: 'Kungsholmen', nameEn: 'Kungsholmen',
    bounds: [[59.3210, 17.9920], [59.3400, 18.0560]],
    center: [59.3310, 18.0230], zoom: 14 },
  { id: 'sodermalm',   name: 'Södermalm',   nameEn: 'Södermalm',
    bounds: [[59.3000, 18.0380], [59.3220, 18.1100]],
    center: [59.3140, 18.0760], zoom: 14 },
];

// Overall bbox covering all districts (inner Stockholm)
const INNER_BBOX = [59.299, 17.990, 59.356, 18.120]; // [south, west, north, east]

// City overview view
const CITY_VIEW = { center: [59.328, 18.054], zoom: 13 };

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

// ─────────────── Process Overpass → STREETS ───────────────
function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[':\.\-,]/g, '').replace(/\s+/g, ' ').trim();
}

function withoutStreetSuffix(s) {
  return s.replace(/(gatan|vagen|brinken|torget|bron|strand|grand|leden|plan|torg|kajen|kaj)$/, '').trim();
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev[j - 2] + 1);
      }
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

function fuzzyLimit(len) {
  if (len < 6) return 0;
  if (len < 10) return 1;
  if (len < 16) return 2;
  return 3;
}

function evaluateGuess(street, guess) {
  const g = normalize(guess);
  if (!g) return { accepted: false, quality: 'empty', distance: Infinity };
  const candidates = [street.name, ...(street.aliases || [])].map(normalize);
  const expanded = candidates.flatMap(c => [c, withoutStreetSuffix(c)]);
  let best = { accepted: false, quality: 'wrong', distance: Infinity, candidate: expanded[0] || '' };
  for (const c of expanded) {
    if (!c) continue;
    if (g === c) return { accepted: true, quality: 'exact', distance: 0, candidate: c };
    const d = editDistance(g, c);
    if (d < best.distance) best = { accepted: false, quality: 'wrong', distance: d, candidate: c };
    const maxLen = Math.max(g.length, c.length);
    const lengthClose = Math.abs(g.length - c.length) <= fuzzyLimit(maxLen);
    if (lengthClose && d <= fuzzyLimit(maxLen)) {
      best = { accepted: true, quality: 'fuzzy', distance: d, candidate: c };
    }
  }
  return best;
}

function matchesGuess(street, guess) {
  return evaluateGuess(street, guess).accepted;
}

const TRIVIA_HINTS = {
  'drottninggatan': 'Namnet hör till Stockholms äldre kungliga gatunamn.',
  'kungsgatan': 'Ett av Stockholms mest centrala öst-västliga stråk.',
  'sveavagen': 'En lång nord-sydlig huvudgata genom Norrmalm och Vasastan.',
  'strandvagen': 'Namnet passar läget: gatan följer vattnet vid Nybroviken.',
  'valhallavagen': 'Namnet anknyter till nordisk mytologi.',
  'karlavagen': 'Ett brett paradstråk på Östermalm.',
  'gotgatan': 'En klassisk huvudgata genom Södermalm.',
  'hornsgatan': 'Ett långt öst-västligt stråk på Södermalm.',
  'ringvagen': 'Namnet antyder gatans bågformade drag runt södra Södermalm.',
  'vasterlanggatan': 'Namnet beskriver läget på västra sidan av Gamla stan.',
  'osterlanggatan': 'Namnet beskriver läget på östra sidan av Gamla stan.',
  'skeppsbron': 'Namnet hänger ihop med kajen och sjöfarten vid Gamla stan.',
};

function maskName(name) {
  return name.split(/\s+/).map(part => {
    if (part.length <= 2) return part[0] + '·'.repeat(Math.max(0, part.length - 1));
    return part[0] + '·'.repeat(Math.max(1, part.length - 2)) + part[part.length - 1];
  }).join(' ');
}

function streetHint(street, level = 1) {
  const name = street.name || '';
  const norm = normalize(name);
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (level <= 1) {
    return `Börjar på ${name[0] || '?'} och har ${words.length} ${words.length === 1 ? 'ord' : 'ord'}.`;
  }
  if (level === 2 && TRIVIA_HINTS[norm]) return TRIVIA_HINTS[norm];
  if (level <= 2) {
    const suffix = name.match(/(gatan|vägen|brinken|torget|bron|strand|gränd|leden|plan|torg|kajen|kaj)$/i);
    return suffix ? `Slutar på "${suffix[0]}".` : `Namnet är ungefär ${name.replace(/\s/g, '').length} bokstäver långt.`;
  }
  return `Mönster: ${maskName(name)}`;
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

const DIFFICULTY_CAPS = { easy: 8, medium: 16, hard: 999 };
function filterByDifficulty(streets, difficulty) {
  const cap = DIFFICULTY_CAPS[difficulty] !== undefined ? DIFFICULTY_CAPS[difficulty] : 999;
  return streets.filter(s => (s.rank == null ? 0 : s.rank) < cap);
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
  DISTRICTS, INNER_BBOX, CITY_VIEW,
  ensureStreets, getLoaded, byDistrict,
  matchesGuess, evaluateGuess, streetHint, normalizeStreet: normalize,
  DIFFICULTY_CAPS, filterByDifficulty, getFallbackStreets,
});
