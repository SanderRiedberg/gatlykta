/* global L, window, DISTRICTS */
// Gatlykta — Leaflet setup and map lifecycle helpers.

function createGatlyktaMap(container) {
  const map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    preferCanvas: false,
    zoomAnimation: false,
    markerZoomAnimation: false,
    fadeAnimation: false,
    tap: true,
    worldCopyJump: false,
  }).setView(window.CITY_VIEW.center, window.CITY_VIEW.zoom);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    minZoom: 11,
    attribution: 'Tiles © Esri',
  }).addTo(map);

  map.createPane('paperPane');
  map.getPane('paperPane').style.zIndex = 350;
  map.getPane('paperPane').style.pointerEvents = 'none';

  map.createPane('labelPane');
  map.getPane('labelPane').style.zIndex = 650;
  map.getPane('labelPane').style.pointerEvents = 'none';

  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  L.control.attribution({ prefix: false, position: 'bottomright' })
    .addAttribution('Esri · OpenStreetMap')
    .addTo(map);

  return map;
}

function focusGatlyktaMap(map, focusDistrict) {
  if (!map) return;
  if (focusDistrict) {
    const district = DISTRICTS.find(x => x.id === focusDistrict);
    if (district) map.flyToBounds(district.bounds, { padding: [40, 40], duration: 0.8, maxZoom: 16 });
  } else {
    map.flyTo(window.CITY_VIEW.center, window.CITY_VIEW.zoom, { duration: 0.8 });
  }
}

// Fly to a single street so it's centred and fully visible. Used by Quiz so
// each new prompt frames the target rather than leaving the player on
// whatever they zoomed into last round. No-op if the street has no geometry.
function focusGatlyktaStreet(map, street) {
  if (!map || !street || !Array.isArray(street.ways) || !street.ways.length) return;
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
  for (const way of street.ways) {
    for (const [lat, lng] of way) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
    }
  }
  if (!isFinite(south)) return;
  map.flyToBounds([[south, west], [north, east]], {
    padding: [80, 80],
    duration: 0.55,
    maxZoom: 17,
  });
}

function attachGatlyktaResizeHandling(map, container) {
  if (!map) return () => {};
  const onResize = () => map.invalidateSize();
  window.addEventListener('resize', onResize);

  let ro = null;
  if (window.ResizeObserver && container) {
    ro = new ResizeObserver(() => { try { map.invalidateSize(); } catch {} });
    ro.observe(container);
  }

  const t1 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 60);
  const t2 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 300);

  return () => {
    window.removeEventListener('resize', onResize);
    if (ro) ro.disconnect();
    clearTimeout(t1);
    clearTimeout(t2);
  };
}

function applyGatlyktaMapStyle(container, mapStyle, progress) {
  if (!container) return;
  container.setAttribute('data-map-style', mapStyle || 'sketch');
  const p = Math.max(0, Math.min(1, progress || 0));
  container.style.setProperty('--style-progress', String(p));
}

Object.assign(window, {
  createGatlyktaMap,
  focusGatlyktaMap,
  focusGatlyktaStreet,
  attachGatlyktaResizeHandling,
  applyGatlyktaMapStyle,
});
