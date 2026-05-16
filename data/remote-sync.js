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

  // Count rows for a (district, mode) plus how many sit above the given score
  // tuple. Returns { rank, total } where rank is 1-indexed. Tie-breaker mirrors
  // the leaderboard sort: points desc nulls last, then correct desc.
  async function fetchRank(districtId, mode, { points, correct }) {
    if (!isConfigured()) return null;
    try {
      const baseQS = new URLSearchParams({
        city_id: 'eq.stockholm',
        district_id: 'eq.' + (districtId || 'all'),
        mode: 'eq.' + mode,
      });
      const totalRes = await fetch(`${window.SUPABASE_URL}/rest/v1/gatlykta_scores?${baseQS}&select=id`, {
        headers: { ...headers(), 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' },
      });
      const totalRange = totalRes.headers.get('content-range') || '*/0';
      const total = Number(totalRange.split('/')[1]) || 0;

      // Build a "rows that strictly outrank me" filter:
      //   points > mine, OR (points = mine AND correct > mine)
      // PostgREST doesn't accept arbitrary OR with mixed columns easily, so we
      // run two filtered counts and sum them.
      let above = 0;
      if (points != null) {
        const qs1 = new URLSearchParams(baseQS);
        qs1.append('points', `gt.${points}`);
        const r1 = await fetch(`${window.SUPABASE_URL}/rest/v1/gatlykta_scores?${qs1}&select=id`, {
          headers: { ...headers(), 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' },
        });
        above += Number((r1.headers.get('content-range') || '*/0').split('/')[1]) || 0;
        const qs2 = new URLSearchParams(baseQS);
        qs2.append('points', `eq.${points}`);
        qs2.append('correct', `gt.${correct || 0}`);
        const r2 = await fetch(`${window.SUPABASE_URL}/rest/v1/gatlykta_scores?${qs2}&select=id`, {
          headers: { ...headers(), 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' },
        });
        above += Number((r2.headers.get('content-range') || '*/0').split('/')[1]) || 0;
      } else {
        // No points: rank by correct only, treating null points as equal.
        const qs = new URLSearchParams(baseQS);
        qs.append('correct', `gt.${correct || 0}`);
        const r = await fetch(`${window.SUPABASE_URL}/rest/v1/gatlykta_scores?${qs}&select=id`, {
          headers: { ...headers(), 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' },
        });
        above = Number((r.headers.get('content-range') || '*/0').split('/')[1]) || 0;
      }
      return { rank: above + 1, total };
    } catch { return null; }
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
    fetchRank,
  };
})();
