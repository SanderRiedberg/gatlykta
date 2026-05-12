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

function drawScratchChips(ctx, pts, progress, seed, sw) {
  if (!pts || pts.length < 2 || progress <= 0) return;
  let total = 0;
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (len > 0) { segs.push({ i, len }); total += len; }
  }
  const limit = total * Math.max(0, Math.min(1, progress));
  const spacing = Math.max(16, sw * 0.62);
  let nextChip = spacing * 0.45;
  let travelled = 0;
  for (const seg of segs) {
    const a = pts[seg.i - 1];
    const b = pts[seg.i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const angle = Math.atan2(dy, dx);
    while (travelled + seg.len >= nextChip && nextChip <= limit) {
      const t = (nextChip - travelled) / seg.len;
      const base = { x: a.x + dx * t, y: a.y + dy * t };
      const side = jitter(seed, Math.round(nextChip), sw * 0.95);
      const chip = offsetPoint(base, a, b, seed, Math.round(nextChip) + 17, side, sw * 0.20);
      const w = Math.max(4, sw * (0.12 + Math.abs(jitter(seed, nextChip + 3, 0.08))));
      const h = Math.max(2, sw * (0.045 + Math.abs(jitter(seed, nextChip + 5, 0.04))));
      ctx.save();
      ctx.translate(chip.x, chip.y);
      ctx.rotate(angle + jitter(seed, nextChip + 9, 0.9));
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
      nextChip += spacing + Math.abs(jitter(seed, nextChip + 13, spacing * 0.45));
    }
    travelled += seg.len;
    if (travelled > limit) break;
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
  drawScratchChips,
});
