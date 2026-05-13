/* global L, window, getMapStylePreset, hashStreet, drawEraserBrush */
// Gatlykta — canvas paper/scratch overlay for the Leaflet map.

function createScratchOverlay(map, container) {
  if (!map) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'scratch-overlay';
  canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  (map.getPane('paperPane') || container).appendChild(canvas);
  return canvas;
}

function removeScratchOverlay(canvas) {
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
}

function attachScratchOverlay({ map, canvas, streets, activeDistricts, streetStates, mapStyle, progress }) {
  if (!map || !canvas) return () => {};
  const paperColor = () => (getComputedStyle(document.documentElement).getPropertyValue('--paper-color').trim() || '#f4ebd9');
  const inkColor = () => (getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1f1a14');

  let reveals = {};
  let raf = null;

  const draw = () => {
    const size = map.getSize();
    const dpr = window.devicePixelRatio || 1;
    const padX = size.x;
    const padY = size.y;
    const cssW = size.x + padX * 2;
    const cssH = size.y + padY * 2;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
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

    ctx.fillStyle = paperColor();
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.fillStyle = `rgba(0,0,0,${0.02 + 0.025 * style.grain})`;
    const grainCount = Math.floor(cssW * cssH / (1200 / style.grain));
    for (let i = 0; i < grainCount; i++) {
      const x = (i * 97 + ((i * 17) % 41)) % cssW;
      const y = (i * 193 + ((i * 29) % 53)) % cssH;
      ctx.fillRect(x, y, 1, 1);
    }

    drawCoastline(ctx, toCanvasPoint, inkColor());
    drawStreetSketch(ctx, { streets, activeDistricts, streetStates, reveals, style, progress: p, zoom: map.getZoom(), toCanvasPoint, inkColor: inkColor() });
    drawSolvedReveals(ctx, { streets, activeDistricts, streetStates, reveals, style, zoom: map.getZoom(), toCanvasPoint });

    ctx.restore();

    const animating = Object.entries(streetStates).some(([id, state]) => state === 'solved' && (reveals[id] || 0) < 1);
    if (animating) raf = requestAnimationFrame(draw);
  };

  draw();

  let zooming = false;
  const trigger = () => {
    if (zooming) return;
    if (!raf) raf = requestAnimationFrame(() => { raf = null; draw(); });
  };
  const onZoomStart = () => { zooming = true; canvas.style.opacity = '0'; };
  const onZoomEnd = () => {
    zooming = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    draw();
    canvas.style.opacity = '1';
  };

  map.on('drag dragend move moveend resize viewreset', trigger);
  map.on('zoomstart', onZoomStart);
  map.on('zoomend', onZoomEnd);

  return () => {
    try {
      map.off('drag dragend move moveend resize viewreset', trigger);
      map.off('zoomstart', onZoomStart);
      map.off('zoomend', onZoomEnd);
    } catch {}
    if (raf) cancelAnimationFrame(raf);
  };
}

// Trace the shoreline of every visible island as a solid thin line on the
// paper. Stockholm's geography is islands and water, so a coastline reads as
// natural orientation — Norr Mälarstrand follows the north shore of
// Kungsholmen, Hornsgatan crosses Södermalm east-west — without exposing the
// street network. Falls back gracefully when window.COASTLINE isn't loaded.
function drawCoastline(ctx, toCanvasPoint, inkColor) {
  const islands = window.COASTLINE || [];
  if (!islands.length) return;
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 0.9;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const island of islands) {
    const pts = island.points;
    if (!pts || pts.length < 3) continue;
    ctx.beginPath();
    const p0 = toCanvasPoint(pts[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) {
      const p = toCanvasPoint(pts[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawStreetSketch(ctx, { streets, activeDistricts, streetStates, reveals, style, progress, zoom, toCanvasPoint, inkColor }) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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

  for (const street of streets) {
    if (activeDistricts && !activeDistricts.includes(street.district)) continue;
    const state = streetStates[street.id] || 'idle';
    if (state === 'solved' && (reveals[street.id] || 0) >= 1) continue;
    const alpha = (state === 'idle' ? style.lineAlpha : 0.55) * (0.9 + progress * 0.1);
    const baseW = street.weight === 'thick' ? 3.2 : street.weight === 'medium' ? 2.2 : 1.4;
    const lineW = baseW * style.lineScale * Math.max(0.7, (zoom - 12) * 0.35);
    for (const way of street.ways) {
      if (style.outline) strokeWay(way, lineW + 3.2, 'rgba(255,250,232,0.76)', alpha * 0.68);
      strokeWay(way, lineW, inkColor, alpha);
    }
  }
  ctx.globalAlpha = 1;
}

function drawSolvedReveals(ctx, { streets, activeDistricts, streetStates, reveals, style, zoom, toCanvasPoint }) {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 1;
  const brushWidth = Math.max(14, 26 - (15 - zoom) * 2.4) * style.block;
  for (const street of streets) {
    if (activeDistricts && !activeDistricts.includes(street.district)) continue;
    if ((streetStates[street.id] || 'idle') !== 'solved') continue;
    const prog = reveals[street.id] = Math.min(1, (reveals[street.id] || 0) + 0.06);
    const paths = street.ways
      .filter(way => way && way.length >= 2)
      .map(way => way.map(toCanvasPoint));
    if (paths.length) drawEraserBrush(ctx, paths, prog, hashStreet(street.id), brushWidth);
  }
}

Object.assign(window, {
  createScratchOverlay,
  removeScratchOverlay,
  attachScratchOverlay,
});
