/* global window */
// Gatlykta — low-level map rendering helpers used by LeafletMap.

const MAP_STYLE_PRESETS = {
  sketch:     { grain: 1.00, lineAlpha: 0.78, lineScale: 1.00, block: 1.00, outline: false },
  lithograph: { grain: 1.55, lineAlpha: 0.70, lineScale: 0.88, block: 1.12, outline: false },
  cartoon:    { grain: 0.22, lineAlpha: 0.96, lineScale: 1.46, block: 1.05, outline: true },
  minimalism: { grain: 0.25, lineAlpha: 0.46, lineScale: 0.68, block: 0.82, outline: false },
  popart:     { grain: 0.62, lineAlpha: 0.92, lineScale: 1.24, block: 1.18, outline: true },
};

function getMapStylePreset(mapStyle) {
  return MAP_STYLE_PRESETS[mapStyle] || MAP_STYLE_PRESETS.sketch;
}

function streetStrokeWidth(weight) {
  return weight === 'thick' ? 4.5 : weight === 'medium' ? 3.2 : 2.2;
}

function streetHitWidth(weight) {
  return weight === 'thick' ? 24 : weight === 'medium' ? 20 : 17;
}

function streetWidthBaseFromClass(className = '') {
  return className.includes('thick') ? 4.5 : className.includes('medium') ? 3.2 : 2.2;
}

function hashStreet(id, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < String(id).length; i++) h = Math.imul(h ^ String(id).charCodeAt(i), 16777619);
  return h >>> 0;
}

function jitter(seed, n, amount) {
  if (!amount) return 0;
  const x = Math.sin((seed + n * 1013) * 0.0001) * 10000;
  return (x - Math.floor(x) - 0.5) * amount;
}

function offsetPoint(point, prev, next, seed, n, laneOffset, jitterAmount) {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const side = laneOffset + jitter(seed, n, jitterAmount);
  const along = jitter(seed, n + 211, jitterAmount * 0.35);
  return {
    x: point.x + nx * side + ux * along,
    y: point.y + ny * side + uy * along,
  };
}

function drawScrapeStroke(ctx, pts, progress, seed, width, laneOffset, jitterAmount) {
  if (!pts || pts.length < 2 || progress <= 0) return;
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (len > 0) { segs.push({ i, len }); total += len; }
  }
  if (!total) return;

  const limit = total * Math.max(0, Math.min(1, progress));
  let travelled = 0;
  let started = false;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const seg of segs) {
    if (travelled >= limit) break;
    const a = pts[seg.i - 1];
    const b = pts[seg.i];
    const remaining = limit - travelled;
    const t = Math.min(1, remaining / seg.len);
    const end = t >= 1 ? b : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const start = offsetPoint(a, a, b, seed, seg.i * 3, laneOffset, jitterAmount);
    const stop = offsetPoint(end, a, b, seed, seg.i * 3 + 1, laneOffset, jitterAmount);
    if (!started) { ctx.moveTo(start.x, start.y); started = true; }
    ctx.lineTo(stop.x, stop.y);
    travelled += seg.len;
  }
  if (started) ctx.stroke();
}

// Eraser brush: stamps soft elliptical marks along the street path. Used with
// destination-out composite so each stamp punches a soft hole through the
// paper overlay. Gives a pencil/eraser sweep feel rather than a cartoon scrape.
//
// Takes a list of paths (a street can have several OSM ways) and animates a
// single sweep from one end of the joined sequence to the other rather than
// filling each sub-way in parallel.
//
// - stamps are dense (spacing = brushWidth * 0.22) so coverage is smooth
// - each stamp uses a radial gradient (soft edge)
// - the ellipse is rotated along the street direction with small jitter
// - width and perpendicular offset vary per stamp for handmade feel
function drawEraserBrush(ctx, paths, progress, seed, brushWidth) {
  if (!paths || progress <= 0) return;

  // Flatten all paths into a single sequence of segments. We keep path order
  // intact so the sweep travels from the start of the first way to the end of
  // the last way. Gaps between ways do not get stamps (no bridge), only the
  // real segments.
  const segs = [];
  let total = 0;
  for (const pts of paths) {
    if (!pts || pts.length < 2) continue;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const len = Math.hypot(dx, dy);
      if (len > 0) { segs.push({ a: pts[i - 1], b: pts[i], len }); total += len; }
    }
  }
  if (!total) return;

  const limit = total * Math.max(0, Math.min(1, progress));
  const spacing = Math.max(2, brushWidth * 0.22);

  let traveled = 0;
  let nextStamp = 0;
  let stampIdx = 0;

  for (const seg of segs) {
    if (traveled >= limit) break;
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const angle = Math.atan2(dy, dx);
    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);

    while (nextStamp <= traveled + seg.len && nextStamp <= limit) {
      const t = (nextStamp - traveled) / seg.len;
      const cx = seg.a.x + dx * t;
      const cy = seg.a.y + dy * t;

      const stampW = brushWidth * (1.00 + jitter(seed, stampIdx, 0.18));
      const stampH = brushWidth * 0.42 * (1.00 + jitter(seed, stampIdx + 50, 0.14));
      const stampAngle = angle + jitter(seed, stampIdx + 100, 0.22);
      const offset = jitter(seed, stampIdx + 200, brushWidth * 0.18);

      const px = cx + perpX * offset;
      const py = cy + perpY * offset;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(stampAngle);
      ctx.scale(1, stampH / stampW);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, stampW);
      grad.addColorStop(0,    'rgba(0,0,0,0.55)');
      grad.addColorStop(0.50, 'rgba(0,0,0,0.32)');
      grad.addColorStop(0.85, 'rgba(0,0,0,0.10)');
      grad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, stampW, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      nextStamp += spacing;
      stampIdx += 1;
    }
    traveled += seg.len;
  }
}

Object.assign(window, {
  MAP_STYLE_PRESETS,
  getMapStylePreset,
  streetStrokeWidth,
  streetHitWidth,
  streetWidthBaseFromClass,
  hashStreet,
  jitter,
  drawScrapeStroke,
  drawEraserBrush,
});
