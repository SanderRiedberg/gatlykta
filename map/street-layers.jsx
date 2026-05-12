/* global L, window, streetStrokeWidth, streetHitWidth, streetWidthBaseFromClass */
// Gatlykta — street polyline and hit-area layer helpers.

function clearStreetLayers(polylinesRef, hitAreasRef) {
  Object.values(polylinesRef.current).flat().forEach(p => p.remove());
  Object.values(hitAreasRef.current).flat().forEach(p => p.remove());
  polylinesRef.current = {};
  hitAreasRef.current = {};
}

function renderStreetLayers({ map, streets, activeDistricts, interactive, onStreetClick, onStreetHover, polylinesRef, hitAreasRef }) {
  if (!map || !streets || !streets.length) return;

  clearStreetLayers(polylinesRef, hitAreasRef);

  for (const street of streets) {
    if (activeDistricts && !activeDistricts.includes(street.district)) continue;
    const lines = [];
    const hitLines = [];

    for (const way of street.ways) {
      const line = L.polyline(way, {
        color: '#1f1a14',
        weight: streetStrokeWidth(street.weight),
        opacity: 0.02,
        lineCap: 'round',
        lineJoin: 'round',
        className: `street-line state-idle ${street.weight}`,
        interactive: false,
        bubblingMouseEvents: false,
      });
      line.addTo(map);
      lines.push(line);

      if (interactive) {
        const hit = L.polyline(way, {
          color: '#000',
          weight: streetHitWidth(street.weight),
          opacity: 0.001,
          lineCap: 'round',
          lineJoin: 'round',
          className: `street-hitarea ${street.weight}`,
          interactive: true,
          bubblingMouseEvents: false,
        });
        hit.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          onStreetClick && onStreetClick(street, ev.originalEvent, ev.latlng);
        });
        hit.on('mouseover', () => onStreetHover && onStreetHover(street));
        hit.on('mouseout', () => onStreetHover && onStreetHover(null));
        hit.addTo(map);
        hitLines.push(hit);
      }
    }

    polylinesRef.current[street.id] = lines;
    hitAreasRef.current[street.id] = hitLines;
  }
}

function updateStreetLayerStyles(polylinesRef, streetStates) {
  Object.entries(polylinesRef.current).forEach(([id, lines]) => {
    const state = streetStates[id] || 'idle';
    lines.forEach(line => {
      const el = line.getElement();
      if (el) {
        el.classList.remove('state-idle', 'state-solved', 'state-selected', 'state-wrong', 'state-hinted', 'state-target');
        el.classList.add(`state-${state}`);
      }
      const baseWidth = streetWidthBaseFromClass(line.options.className || '');
      if (state === 'solved') {
        line.setStyle({ color: 'var(--solved-ink)', weight: Math.max(line.options.weight, baseWidth), opacity: 0.58 });
      } else if (state === 'selected') {
        line.setStyle({ color: 'var(--selected-ink)', weight: baseWidth + 1.4, opacity: 0.84 });
      } else if (state === 'target') {
        line.setStyle({ color: 'var(--target-ink)', weight: baseWidth + 3.6, opacity: 1.0, dashArray: null });
      } else if (state === 'hinted') {
        line.setStyle({ color: 'var(--warn)', weight: line.options.weight + 0.5, dashArray: '4 6' });
      } else if (state === 'wrong') {
        line.setStyle({ color: 'var(--warn)' });
      } else {
        line.setStyle({ color: '#1f1a14', weight: baseWidth, dashArray: null, opacity: 0.02 });
      }
    });
  });
}

Object.assign(window, {
  clearStreetLayers,
  renderStreetLayers,
  updateStreetLayerStyles,
});
