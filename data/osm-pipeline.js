// Gatlykta — shared OSM pipeline.
// Used by the live Overpass fetch in data/osm.js and by the static bundler
// in scripts/build-osm-bundle.mjs. Pure data transforms; no fetch, no DOM,
// no window-coupling beyond the dual-export at the bottom.

(function () {
  function inBounds(latlng, bounds) {
    const [[s, w], [n, e]] = bounds;
    return latlng[0] >= s && latlng[0] <= n && latlng[1] >= w && latlng[1] <= e;
  }

  // Pick a district id by majority of coordinate hits. Returns null if no
  // coordinate falls inside any district.
  function classifyDistrict(coords, districts) {
    const counts = {};
    for (const c of coords) {
      for (const d of districts) {
        if (inBounds(c, d.bounds)) { counts[d.id] = (counts[d.id] || 0) + 1; break; }
      }
    }
    let best = null;
    let bestN = 0;
    for (const [k, v] of Object.entries(counts)) {
      if (v > bestN) { best = k; bestN = v; }
    }
    return best;
  }

  function metersBetween(a, b) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const aa = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(aa));
  }

  function highwayWeight(hwClass) {
    if (hwClass === 'primary') return 'thick';
    if (hwClass === 'secondary' || hwClass === 'tertiary') return 'medium';
    return 'thin';
  }

  // Process raw Overpass JSON into Gatlykta street entities.
  // Each unique `name` becomes one street, even if its ways cross district
  // bounds (Strandvägen sits on both Norrmalm and Östermalm in OSM). The
  // primary district is chosen by majority of way-point hits across all
  // ways for that name. id is `${primaryDistrict}-${slug(name)}`, rank is
  // per-district (0 = longest/most prominent).
  //
  // Options:
  //   minLengthMeters: drop streets shorter than this (default 60)
  //   coordPrecision: round lat/lon to N decimals (used by the bundler to
  //                   shrink the JSON; live fetch leaves this undefined)
  function processOverpass(json, districts, options = {}) {
    const minLength = options.minLengthMeters != null ? options.minLengthMeters : 60;
    const coordPrecision = options.coordPrecision;

    const ways = (json.elements || []).filter(e =>
      e.type === 'way' && e.geometry && e.tags && e.tags.name);

    const grouped = new Map();
    for (const w of ways) {
      const coords = w.geometry.map(g => coordPrecision != null
        ? [Number(g.lat.toFixed(coordPrecision)), Number(g.lon.toFixed(coordPrecision))]
        : [g.lat, g.lon]);

      // Count district hits across all coordinates of this way. Skip the way
      // entirely if no coordinate falls in any of our districts.
      const hits = {};
      for (const c of coords) {
        for (const d of districts) {
          if (inBounds(c, d.bounds)) { hits[d.id] = (hits[d.id] || 0) + 1; break; }
        }
      }
      if (Object.keys(hits).length === 0) continue;

      const weight = highwayWeight(w.tags.highway);
      const key = w.tags.name;
      if (!grouped.has(key)) {
        grouped.set(key, {
          name: w.tags.name,
          aliases: [],
          weight,
          ways: [],
          districtHits: {},
        });
      }
      const street = grouped.get(key);
      street.ways.push(coords);
      for (const [d, n] of Object.entries(hits)) {
        street.districtHits[d] = (street.districtHits[d] || 0) + n;
      }
      if (weight === 'thick') street.weight = 'thick';
      else if (weight === 'medium' && street.weight === 'thin') street.weight = 'medium';
    }

    const out = [];
    for (const s of grouped.values()) {
      let primaryDistrict = null;
      let bestN = 0;
      for (const [d, n] of Object.entries(s.districtHits)) {
        if (n > bestN) { primaryDistrict = d; bestN = n; }
      }
      if (!primaryDistrict) continue;

      let len = 0;
      for (const way of s.ways) {
        for (let i = 1; i < way.length; i++) len += metersBetween(way[i - 1], way[i]);
      }
      const lengthMeters = Math.round(len);
      if (len < minLength) continue;

      const id = `${primaryDistrict}::${s.name}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      out.push({
        id,
        name: s.name,
        aliases: s.aliases,
        district: primaryDistrict,
        weight: s.weight,
        ways: s.ways,
        lengthMeters,
      });
    }

    out.sort((a, b) => b.lengthMeters - a.lengthMeters);

    const ranks = {};
    return out.map(s => {
      const rank = (ranks[s.district] || 0);
      ranks[s.district] = rank + 1;
      return { ...s, rank };
    });
  }

  const api = { inBounds, classifyDistrict, metersBetween, highwayWeight, processOverpass };
  if (typeof window !== 'undefined') Object.assign(window, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
