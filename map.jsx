/* global React, L, window, DISTRICTS, streetStrokeWidth, streetHitWidth, streetWidthBaseFromClass, getMapStylePreset, hashStreet, jitter, drawScrapeStroke, drawScratchChips */
// Gatlykta — Leaflet-based map with scratch-reveal overlay.

const { useState: useSm, useEffect: useEm, useRef: useRm, useMemo: useMm, useCallback: useCm } = React;

// Leaflet panes z-index plan:
//   tilePane (default 200) — base satellite tiles
//   "paperPane" (350)      — paper overlay covering map (with cut-out mask for revealed streets)
//   overlayPane (400)      — street polylines (drawn dark, on top of paper)
//   "labelPane" (650)      — street labels for solved streets

function LeafletMap({
  streets,                    // array of {id, name, district, ways: [[[lat,lng],...], ...], weight}
  activeDistricts = null,     // null = all loaded
  focusDistrict = null,       // id to zoom into; null = full city view
  streetStates = {},          // streetId → 'solved'|'selected'|'wrong'|'hinted'|'target'
  onStreetClick,
  onStreetHover,
  showLabels = true,
  showSolvedLabels = true,
  showStreetLabels = false,   // (learn mode)
  interactive = true,
  hoveredStreet = null,
  scratch = true,             // scratch-reveal overlay
  mapStyle = 'sketch',         // sketch|lithograph|cartoon|minimalism|popart
  progress = 0,                // 0..1; used for progressive detailing
}) {
  const containerRef = useRm(null);
  const mapRef = useRm(null);
  const polylinesRef = useRm({}); // streetId → [L.Polyline, ...]
  const hitAreasRef = useRm({}); // streetId → [L.Polyline, ...]
  const paperOverlayRef = useRm(null);
  const labelLayerRef = useRm(null);

  // Init map
  useEm(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
      fadeAnimation: false,
      tap: true,
      worldCopyJump: false,
    }).setView(window.CITY_VIEW.center, window.CITY_VIEW.zoom);

    // Satellite tiles — Esri World Imagery (CC, no key)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, minZoom: 11,
      attribution: 'Tiles © Esri',
    }).addTo(map);

    // Create custom panes
    map.createPane('paperPane');
    map.getPane('paperPane').style.zIndex = 350;
    map.getPane('paperPane').style.pointerEvents = 'none';

    map.createPane('labelPane');
    map.getPane('labelPane').style.zIndex = 650;
    map.getPane('labelPane').style.pointerEvents = 'none';

    // Add zoom control bottom-left so it doesn't conflict with HUD
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Custom attribution
    L.control.attribution({ prefix: false, position: 'bottomright' })
      .addAttribution('Esri · OpenStreetMap')
      .addTo(map);

    mapRef.current = map;

    // Initial paper overlay setup — handled by separate effect
    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
  }, []);

  // Build canvas paper overlay
  useEm(() => {
    if (!mapRef.current) return;
    if (paperOverlayRef.current) { paperOverlayRef.current.remove(); paperOverlayRef.current = null; }
    if (!scratch) return;
    const map = mapRef.current;
    const c = document.createElement('canvas');
    c.className = 'scratch-overlay';
    c.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
    (map.getPane('paperPane') || containerRef.current).appendChild(c);
    paperOverlayRef.current = c;
    return () => { if (c.parentNode) c.parentNode.removeChild(c); };
  }, [scratch]);

  // Render street polylines
  useEm(() => {
    if (!mapRef.current || !streets || !streets.length) return;
    const map = mapRef.current;
    // Clear existing
    Object.values(polylinesRef.current).flat().forEach(p => p.remove());
    Object.values(hitAreasRef.current).flat().forEach(p => p.remove());
    polylinesRef.current = {};
    hitAreasRef.current = {};

    for (const s of streets) {
      if (activeDistricts && !activeDistricts.includes(s.district)) continue;
      const lines = [];
      const hitLines = [];
      for (const way of s.ways) {
        const line = L.polyline(way, {
          color: '#1f1a14',
          weight: streetStrokeWidth(s.weight),
          opacity: 0.02,
          lineCap: 'round',
          lineJoin: 'round',
          className: `street-line state-idle ${s.weight}`,
          interactive: false,
          bubblingMouseEvents: false,
        });
        line.addTo(map);
        lines.push(line);

        if (interactive) {
          const hit = L.polyline(way, {
            color: '#000',
            weight: streetHitWidth(s.weight),
            opacity: 0.001,
            lineCap: 'round',
            lineJoin: 'round',
            className: `street-hitarea ${s.weight}`,
            interactive: true,
            bubblingMouseEvents: false,
          });
          hit.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            onStreetClick && onStreetClick(s, ev.originalEvent, ev.latlng);
          });
          hit.on('mouseover', () => onStreetHover && onStreetHover(s));
          hit.on('mouseout',  () => onStreetHover && onStreetHover(null));
          hit.addTo(map);
          hitLines.push(hit);
        }
      }
      polylinesRef.current[s.id] = lines;
      hitAreasRef.current[s.id] = hitLines;
    }
  }, [streets, activeDistricts, interactive]);

  // Update polyline styles per streetStates
  useEm(() => {
    const ref = polylinesRef.current;
    Object.entries(ref).forEach(([id, lines]) => {
      const state = streetStates[id] || 'idle';
      lines.forEach(line => {
        const el = line.getElement();
        if (el) {
          el.classList.remove('state-idle', 'state-solved', 'state-selected', 'state-wrong', 'state-hinted', 'state-target');
          el.classList.add(`state-${state}`);
        }
        if (state === 'solved') {
          line.setStyle({ color: 'var(--solved-ink)', weight: Math.max(line.options.weight, widthBase(line)), opacity: 0.58 });
        } else if (state === 'selected') {
          line.setStyle({ color: 'var(--selected-ink)', weight: widthBase(line) + 1.4, opacity: 0.84 });
        } else if (state === 'target') {
          line.setStyle({ color: 'var(--target-ink)', weight: widthBase(line) + 3.6, opacity: 1.0, dashArray: null });
        } else if (state === 'hinted') {
          line.setStyle({ color: 'var(--warn)', weight: line.options.weight + 0.5, dashArray: '4 6' });
        } else if (state === 'wrong') {
          line.setStyle({ color: 'var(--warn)' });
        } else {
          line.setStyle({ color: '#1f1a14', weight: widthBase(line), dashArray: null, opacity: 0.02 });
        }
      });
    });
  }, [streetStates, streets]);

  function widthBase(line) {
    return streetWidthBaseFromClass(line.options.className || '');
  }

  // Canvas scratch: fill paper, punch holes along solved streets
  useEm(() => {
    if (!scratch || !paperOverlayRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const canvas = paperOverlayRef.current;
    const paperColor = () => (getComputedStyle(document.documentElement).getPropertyValue('--paper-color').trim() || '#f4ebd9');
    const inkColor = () => (getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1f1a14');

    let reveals = {}; // id → 0..1 (animation progress)
    let raf = null;

    const draw = () => {
      const size = map.getSize();
      const dpr = window.devicePixelRatio || 1;
      const padX = size.x;
      const padY = size.y;
      const cssW = size.x + padX * 2;
      const cssH = size.y + padY * 2;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr; canvas.height = cssH * dpr;
        canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      }
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([-padX, -padY]));
      const ctx = canvas.getContext('2d');
      const toCanvasPoint = (latlng) => {
        const p = map.latLngToContainerPoint(latlng);
        return { x: p.x + padX, y: p.y + padY };
      };
      const p = Math.max(0, Math.min(1, progress || 0));
      const style = getMapStylePreset(mapStyle);
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      // Solid paper
      ctx.fillStyle = paperColor();
      ctx.fillRect(0, 0, cssW, cssH);
      // Stable paper grain. Avoid Math.random here; redraws happen during map moves.
      ctx.fillStyle = `rgba(0,0,0,${0.02 + 0.025 * style.grain})`;
      const grainCount = Math.floor(cssW * cssH / (1200 / style.grain));
      for (let i = 0; i < grainCount; i++) {
        const x = (i * 97 + ((i * 17) % 41)) % cssW;
        const y = (i * 193 + ((i * 29) % 53)) % cssH;
        ctx.fillRect(x, y, 1, 1);
      }
      // Sketch ALL streets on paper (so user sees street network)
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const z = map.getZoom();
      const strokeWay = (way, width, color, alpha) => {
        if (way.length < 2) return;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.beginPath();
        const p0 = toCanvasPoint(way[0]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < way.length; i++) {
          const pt = toCanvasPoint(way[i]);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      };
      for (const s of streets) {
        if (activeDistricts && !activeDistricts.includes(s.district)) continue;
        const state = streetStates[s.id] || 'idle';
        // Solved streets we don't sketch — they'll be punched out
        if (state === 'solved' && (reveals[s.id] || 0) >= 1) continue;
        const alpha = (state === 'idle' ? style.lineAlpha : 0.55) * (0.9 + p * 0.1);
        const baseW = s.weight === 'thick' ? 3.2 : s.weight === 'medium' ? 2.2 : 1.4;
        const lineW = baseW * style.lineScale * Math.max(0.7, (z - 12) * 0.35);
        for (const way of s.ways) {
          if (style.outline) strokeWay(way, lineW + 3.2, 'rgba(255,250,232,0.76)', alpha * 0.68);
          strokeWay(way, lineW, inkColor(), alpha);
        }
      }
      ctx.globalAlpha = 1;
      // Punch holes for solved streets (destination-out wipes paper to reveal satellite)
      ctx.globalCompositeOperation = 'destination-out';
      const sw = Math.max(18, 34 - (15 - z) * 3) * style.block;
      for (const s of streets) {
        if (activeDistricts && !activeDistricts.includes(s.district)) continue;
        if ((streetStates[s.id] || 'idle') !== 'solved') continue;
        const prog = reveals[s.id] = Math.min(1, (reveals[s.id] || 0) + 0.075);
        // Reveal like a lottery-ticket scrape: narrow angular strokes, square caps,
        // and small chipped edges instead of a soft watercolor wash.
        for (const pass of [
          { width: sw * 0.58, alpha: 0.72, repeats: 3, jitter: 5, spread: sw * 0.40, speed: 1.18 },
          { width: sw * 0.30, alpha: 0.92, repeats: 7, jitter: 10, spread: sw * 0.88, speed: 1.08 },
          { width: sw * 0.16, alpha: 0.62, repeats: 9, jitter: 17, spread: sw * 1.28, speed: 0.95 },
        ]) {
          ctx.lineCap = 'butt';
          ctx.lineJoin = 'miter';
          ctx.lineWidth = pass.width;
          ctx.globalAlpha = pass.alpha;
          ctx.strokeStyle = '#000';
          for (const way of s.ways) {
            if (way.length < 2) continue;
            const pts = way.map(toCanvasPoint);
            for (let r = 0; r < pass.repeats; r++) {
              const seed = hashStreet(s.id, r);
              const laneBase = pass.repeats === 1 ? 0 : (r / (pass.repeats - 1) - 0.5) * pass.spread;
              const lane = laneBase + jitter(seed, 71, pass.spread * 0.10);
              const revealProgress = Math.min(1, Math.max(0, prog * pass.speed - r * 0.018));
              drawScrapeStroke(ctx, pts, revealProgress, seed, pass.width, lane, pass.jitter);
            }
            if (prog > 0.18) {
              ctx.globalAlpha = 0.42;
              ctx.fillStyle = '#000';
              drawScratchChips(ctx, pts, Math.min(1, prog * 1.18), hashStreet(s.id, 99), sw);
              ctx.globalAlpha = pass.alpha;
            }
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // Continue animating if anything is still revealing
      const animating = Object.entries(streetStates).some(([id, st]) => st === 'solved' && (reveals[id] || 0) < 1);
      if (animating) raf = requestAnimationFrame(draw);
    };

    draw();
    const trigger = () => { if (!raf) raf = requestAnimationFrame(() => { raf = null; draw(); }); };
    map.on('drag dragend move zoom moveend zoomend resize viewreset', trigger);
    return () => { try { map.off('drag dragend move zoom moveend zoomend resize viewreset', trigger); } catch {} if (raf) cancelAnimationFrame(raf); };
  }, [scratch, streetStates, streets, activeDistricts, mapStyle, progress]);

  // Render labels for solved/hovered streets
  useEm(() => {
    const map = mapRef.current;
    if (!map) return;
    if (labelLayerRef.current) { labelLayerRef.current.remove(); labelLayerRef.current = null; }
    const layer = L.layerGroup([], { pane: 'labelPane' });
    for (const s of streets) {
      if (activeDistricts && !activeDistricts.includes(s.district)) continue;
      const state = streetStates[s.id] || 'idle';
      const isHovered = hoveredStreet && hoveredStreet.id === s.id;
      const show = (state === 'solved' && showSolvedLabels) || (showStreetLabels && isHovered);
      if (!show) continue;
      // Pick midpoint of longest way
      const longest = [...s.ways].sort((a, b) => b.length - a.length)[0];
      if (!longest || longest.length < 2) continue;
      const mid = longest[Math.floor(longest.length / 2)];
      const tone = state === 'solved' ? 'solved' : 'hovered';
      const m = L.marker(mid, {
        pane: 'labelPane',
        interactive: false,
        icon: L.divIcon({
          className: `street-label ${tone}`,
          html: `<span>${s.name}</span>`,
          iconSize: null,
        }),
      });
      m.addTo(layer);
    }
    layer.addTo(map);
    labelLayerRef.current = layer;
  }, [streets, streetStates, hoveredStreet, showSolvedLabels, showStreetLabels, activeDistricts]);

  // District labels
  useEm(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup([], { pane: 'labelPane' });
    if (showLabels) {
      for (const d of DISTRICTS) {
        if (activeDistricts && !activeDistricts.includes(d.id)) continue;
        const m = L.marker(d.center, {
          pane: 'labelPane',
          interactive: false,
          icon: L.divIcon({
            className: 'district-leaflet-label',
            html: `<span>${d.name}</span>`,
          }),
        });
        m.addTo(layer);
      }
    }
    layer.addTo(map);
    return () => { layer.remove(); };
  }, [showLabels, activeDistricts]);

  // Focus / zoom into a district
  useEm(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focusDistrict) {
      const d = DISTRICTS.find(x => x.id === focusDistrict);
      if (d) map.flyToBounds(d.bounds, { padding: [40, 40], duration: 0.8, maxZoom: 16 });
    } else {
      map.flyTo(window.CITY_VIEW.center, window.CITY_VIEW.zoom, { duration: 0.8 });
    }
  }, [focusDistrict]);

  // Resize handling
  useEm(() => {
    const map = mapRef.current; if (!map) return;
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    let ro = null;
    if (window.ResizeObserver && containerRef.current) {
      ro = new ResizeObserver(() => { try { map.invalidateSize(); } catch {} });
      ro.observe(containerRef.current);
    }
    // Force an initial invalidate after layout settles
    const t1 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 60);
    const t2 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 300);
    return () => { window.removeEventListener('resize', onResize); if (ro) ro.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Map style + progressive detailing
  useEm(() => {
    if (!containerRef.current) return;
    containerRef.current.setAttribute('data-map-style', mapStyle || 'sketch');
    const p = Math.max(0, Math.min(1, progress || 0));
    containerRef.current.style.setProperty('--style-progress', String(p));
  }, [mapStyle, progress]);

  return (
    <div ref={containerRef} className="leaflet-host" style={{ width: '100%', height: '100%', background: 'var(--bg-2)' }} />
  );
}

window.LeafletMap = LeafletMap;
