/* global window */
// Gatlykta — local storage abstraction for scoreboards and street mastery.
//
// Today every read/write is localStorage. The API is shaped so a remote sync
// backend (Supabase, Firebase, anything) can be slotted in later without
// changing call sites: each mutation returns the resulting record, every
// read is sync and returns plain data. The remote stubs at the bottom show
// where the eventual network calls would slot in.

(function () {
  const KEYS = {
    PROGRESS: 'gatlykta.progress.v1', // legacy: best-stars per (district, mode)
    SCORES:   'gatlykta.scores.v2',   // detailed: runs + PR per (district, mode)
    MASTERY:  'gatlykta.mastery.v1',  // street-level: 0 needs work, 1 learning, 2 known
  };

  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function scoreKey(districtId, mode) {
    return districtId ? `${districtId}::${mode}` : `all::${mode}`;
  }

  function recordScore({ districtId, mode, points, correct, total, timeSec, stars, when, skipRemote }) {
    if (!mode) return null;
    const all = safeGet(KEYS.SCORES, {});
    const k = scoreKey(districtId, mode);
    const entry = {
      when: when || Date.now(),
      points: Number(points) || 0,
      correct: Number(correct) || 0,
      total: Number(total) || 0,
      timeSec: Number(timeSec) || 0,
      stars: Number(stars) || 0,
    };
    const existing = all[k] || { runs: [], best: null, runsCount: 0 };
    existing.runs.push(entry);
    existing.runsCount = (existing.runsCount || 0) + 1;
    if (existing.runs.length > 50) existing.runs = existing.runs.slice(-50);
    const score = entry.points || (entry.correct * 100 / Math.max(1, entry.total));
    const bestScore = existing.best
      ? (existing.best.points || (existing.best.correct * 100 / Math.max(1, existing.best.total)))
      : -1;
    if (score > bestScore) existing.best = entry;
    all[k] = existing;
    safeSet(KEYS.SCORES, all);
    // Fire-and-forget remote sync if a Supabase backend is configured and the
    // caller wants it. Results screen passes skipRemote so submission is
    // explicit (user picks a name first).
    if (!skipRemote && window.gatlyktaRemoteSync && window.gatlyktaRemoteSync.isConfigured()) {
      try { window.gatlyktaRemoteSync.pushScore({ districtId, mode, points, correct, total, timeSec, stars: entry.stars }); } catch {}
    }
    return existing;
  }

  function getScoresFor(districtId, mode) {
    const all = safeGet(KEYS.SCORES, {});
    return all[scoreKey(districtId, mode)] || { runs: [], best: null, runsCount: 0 };
  }

  function getAllScoresForDistrict(districtId) {
    const all = safeGet(KEYS.SCORES, {});
    const out = {};
    for (const mode of ['fill', 'quiz', 'time', 'learn']) {
      const k = scoreKey(districtId, mode);
      if (all[k]) out[mode] = all[k];
    }
    return out;
  }

  function markStreetMastery(streetId, level) {
    if (!streetId) return null;
    const all = safeGet(KEYS.MASTERY, {});
    const next = { level: Math.max(0, Math.min(2, Number(level) || 0)), when: Date.now() };
    all[streetId] = next;
    safeSet(KEYS.MASTERY, all);
    return next;
  }

  function getMastery(streetId) {
    const all = safeGet(KEYS.MASTERY, {});
    return all[streetId] || { level: 0, when: 0 };
  }

  function getMasteryCounts(streetIds) {
    if (!Array.isArray(streetIds)) return { known: 0, learning: 0, needs: 0, total: 0 };
    const all = safeGet(KEYS.MASTERY, {});
    const out = { known: 0, learning: 0, needs: 0, total: streetIds.length };
    for (const id of streetIds) {
      const m = all[id];
      if (m && m.level === 2) out.known++;
      else if (m && m.level === 1) out.learning++;
      else out.needs++;
    }
    return out;
  }

  // Export everything as plain JSON — ready to ship to a remote backend.
  function exportSnapshot() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: safeGet(KEYS.PROGRESS, {}),
      scores: safeGet(KEYS.SCORES, {}),
      mastery: safeGet(KEYS.MASTERY, {}),
    };
  }

  // Import a snapshot (e.g. fetched from a remote backend or pasted by the
  // user). Merge mode: never overwrite a locally-better score.
  function importSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    if (snapshot.progress) safeSet(KEYS.PROGRESS, { ...safeGet(KEYS.PROGRESS, {}), ...snapshot.progress });
    if (snapshot.mastery) safeSet(KEYS.MASTERY, { ...safeGet(KEYS.MASTERY, {}), ...snapshot.mastery });
    if (snapshot.scores) {
      const local = safeGet(KEYS.SCORES, {});
      for (const [k, remote] of Object.entries(snapshot.scores)) {
        const here = local[k];
        if (!here) { local[k] = remote; continue; }
        const merged = {
          runs: [...(here.runs || []), ...(remote.runs || [])].slice(-50),
          runsCount: Math.max(here.runsCount || 0, remote.runsCount || 0),
          best: here.best,
        };
        const hereScore = here.best ? (here.best.points || 0) : -1;
        const remoteScore = remote.best ? (remote.best.points || 0) : -1;
        merged.best = remoteScore > hereScore ? remote.best : here.best;
        local[k] = merged;
      }
      safeSet(KEYS.SCORES, local);
    }
    return true;
  }

  // ─── Remote sync stubs ──────────────────────────────────────────────
  // Wire these to a real backend (Supabase, Firebase, custom REST) when the
  // app gets accounts. The local-only API above never depends on these.
  //
  // async function pushScoresRemote(userId) { /* POST exportSnapshot() */ }
  // async function fetchLeaderboard(districtId, mode) { /* GET top N */ }

  Object.assign(window, {
    GATLYKTA_STORAGE_KEYS: KEYS,
    recordScore,
    getScoresFor,
    getAllScoresForDistrict,
    markStreetMastery,
    getMastery,
    getMasteryCounts,
    exportSnapshot,
    importSnapshot,
  });
})();
