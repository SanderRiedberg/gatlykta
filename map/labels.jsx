/* global L, window, DISTRICTS */
// Gatlykta — Leaflet label layer helpers.

function renderStreetLabels({ map, layerRef, streets, activeDistricts, streetStates, hoveredStreet, showSolvedLabels, showStreetLabels }) {
  if (!map) return;
  if (layerRef.current) { layerRef.current.remove(); layerRef.current = null; }

  const layer = L.layerGroup([], { pane: 'labelPane' });
  for (const street of streets) {
    if (activeDistricts && !activeDistricts.includes(street.district)) continue;
    const state = streetStates[street.id] || 'idle';
    const isHovered = hoveredStreet && hoveredStreet.id === street.id;
    const show = (state === 'solved' && showSolvedLabels) || (showStreetLabels && isHovered);
    if (!show) continue;

    const longest = [...street.ways].sort((a, b) => b.length - a.length)[0];
    if (!longest || longest.length < 2) continue;
    const mid = longest[Math.floor(longest.length / 2)];
    const tone = state === 'solved' ? 'solved' : 'hovered';
    const marker = L.marker(mid, {
      pane: 'labelPane',
      interactive: false,
      icon: L.divIcon({
        className: `street-label ${tone}`,
        html: `<span>${street.name}</span>`,
        iconSize: null,
      }),
    });
    marker.addTo(layer);
  }

  layer.addTo(map);
  layerRef.current = layer;
}

function renderDistrictLabels({ map, showLabels, activeDistricts }) {
  if (!map) return () => {};
  const layer = L.layerGroup([], { pane: 'labelPane' });
  if (showLabels) {
    for (const district of DISTRICTS) {
      if (activeDistricts && !activeDistricts.includes(district.id)) continue;
      const marker = L.marker(district.center, {
        pane: 'labelPane',
        interactive: false,
        icon: L.divIcon({
          className: 'district-leaflet-label',
          html: `<span>${district.name}</span>`,
        }),
      });
      marker.addTo(layer);
    }
  }
  layer.addTo(map);
  return () => { layer.remove(); };
}

Object.assign(window, {
  renderStreetLabels,
  renderDistrictLabels,
});
