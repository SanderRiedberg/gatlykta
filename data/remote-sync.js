/* global window, fetch */
// Gatlykta — optional Supabase sync. Reads window.SUPABASE_URL and
// window.SUPABASE_ANON_KEY from a config script that the user drops into
// data/remote-config.js (gitignored). When those aren't set, every call
// here is a fast no-op so the rest of the app keeps working local-only.

(function () {
  const CLIENT_ID_KEY = 'gatlykta.client_id';
  const PLAYER_NAME_KEY = 'gatlykta.player_name';

  function isConfigured() {
    return !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
  }

  function clientId() {
    let id = null;
    try { id = localStorage.getItem(CLIENT_ID_KEY); } catch {}
    if (!id) {
      id = 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      try { localStorage.setItem(CLIENT_ID_KEY, id); } catch {}
    }
    return id;
  }

  function playerName() {
    try { return localStorage.getItem(PLAYER_NAME_KEY); } catch { return null; }
  }
  function setPlayerName(name) {
    try { localStorage.setItem(PLAYER_NAME_KEY, String(name || '').slice(0, 64)); } catch {}
  }

  function headers() {
    return {
      'apikey': window.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
  }

  async function pushScore({ districtId, mode, points, correct, total, timeSec, stars }) {
    if (!isConfigured()) return false;
    try {
      const res = await fetch(`${window.SUPABASE_URL}/rest/v1/gatlykta_scores`, {
        method: 'POST',
        headers: { ...headers(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          client_id: clientId(),
          player_name: playerName(),
          city_id: 'stockholm',
          district_id: districtId || 'all',
          mode,
          points: points != null ? Number(points) : null,
          correct: Number(correct) || 0,
          total: Number(total) || 0,
          time_seconds: timeSec != null ? Number(timeSec) : null,
          stars: Number(stars) || 0,
        }),
      });
      return res.ok;
    } catch { return false; }
  }

  async function fetchLeaderboard(districtId, mode, limit = 10) {
    if (!isConfigured()) return null;
    try {
      const params = new URLSearchParams({
        select: 'player_name,points,correct,total,time_seconds,stars,created_at',
        city_id: 'eq.stockholm',
        district_id: 'eq.' + (districtId || 'all'),
        mode: 'eq.' + mode,
        order: 'points.desc.nullslast,correct.desc,created_at.desc',
        limit: String(limit),
      });
      const res = await fetch(`${window.SUPABASE_URL}/rest/v1/gatlykta_scores?${params}`, {
        headers: headers(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  window.gatlyktaRemoteSync = {
    isConfigured,
    clientId,
    playerName,
    setPlayerName,
    pushScore,
    fetchLeaderboard,
  };
})();
