/* global React, window */
// Gatlykta — shared visual components

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─────────────── Brand mark — a small "street lamp" glyph ───────────────
function BrandMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* lamp head */}
      <path d="M 10 4 L 22 4 L 20 11 L 12 11 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* post */}
      <line x1="16" y1="11" x2="16" y2="27" stroke="currentColor" strokeWidth="1.4" />
      {/* base */}
      <line x1="11" y1="27" x2="21" y2="27" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* glow */}
      <circle cx="16" cy="7.5" r="1.4" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

// ─────────────── Star ───────────────
function Star({ filled = false, big = false }) {
  return (
    <svg className={`star ${filled ? 'filled' : ''} ${big ? 'big' : ''}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 L14.5 9 L22 9.5 L16.3 14.3 L18.2 22 L12 17.8 L5.8 22 L7.7 14.3 L2 9.5 L9.5 9 Z"
        stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  );
}

function Stars({ count = 0, max = 3, big = false }) {
  return (
    <span className="stars" aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} filled={i < count} big={big} />
      ))}
    </span>
  );
}

// ─────────────── HUD pill ───────────────
function HudPill({ k, v, big = false }) {
  return (
    <span className="hud-pill">
      <span className="k">{k}</span>
      <span className={`v ${big ? 'big' : ''}`}>{v}</span>
    </span>
  );
}

// ─────────────── Toast ───────────────
function Toast({ tone = 'default', children, onDone, ttl = 1400 }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    if (!onDoneRef.current) return;
    const t = setTimeout(() => {
      if (onDoneRef.current) onDoneRef.current();
    }, ttl);
    return () => clearTimeout(t);
  }, [children, tone, ttl]);
  return <div className={`toast ${tone}`}>{children}</div>;
}

// ─────────────── Top bar ───────────────
function TopBar({ t, onHome, right }) {
  return (
    <div className="topbar">
      <button className="brand" onClick={onHome}>
        <span className="brand-mark"><BrandMark /></span>
        <span>Gatlykta</span>
      </button>
      <div className="topbar-right">{right}</div>
    </div>
  );
}

// ─────────────── Helpers ───────────────
function formatTime(secs) {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function calculateStars({ correct, total, timeSec, mode }) {
  const acc = correct / Math.max(1, total);
  if (mode === 'time') {
    // Stars in time mode: based on count
    if (correct >= 18) return 3;
    if (correct >= 12) return 2;
    if (correct >= 6) return 1;
    return 0;
  }
  if (mode === 'learn') return 3;
  // fill / quiz
  if (acc >= 0.95) return 3;
  if (acc >= 0.75) return 2;
  if (acc >= 0.5) return 1;
  return 0;
}

// Persist progress in localStorage
const PROGRESS_KEY = 'gatlykta.progress.v1';
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch {}
}
function recordResult(districtId, modeId, stars) {
  const p = loadProgress();
  const key = `${districtId}.${modeId}`;
  if (!p[key] || p[key] < stars) p[key] = stars;
  saveProgress(p);
  return p;
}
function bestStars(districtId) {
  const p = loadProgress();
  const keys = ['fill', 'quiz', 'time', 'learn'].map(m => `${districtId}.${m}`);
  return keys.reduce((a, k) => Math.max(a, p[k] || 0), 0);
}

Object.assign(window, {
  BrandMark, Star, Stars, HudPill, Toast, TopBar,
  formatTime, calculateStars,
  loadProgress, saveProgress, recordResult, bestStars,
});
