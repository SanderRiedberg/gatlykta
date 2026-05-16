/* global React, window, DISTRICTS */
// Gatlykta — Profile / overall stats screen.

(function () {
  const { useState: useS, useMemo: useM, useRef: useR, useCallback: useC } = React;
  const { TopBar, Stars, formatTime } = window;

  function Profile({ t, streets, onBack }) {
    const overall = useM(() => {
      const ids = streets.map(s => s.id);
      return window.getMasteryCounts ? window.getMasteryCounts(ids)
        : { known: 0, learning: 0, needs: ids.length, total: ids.length };
    }, [streets]);

    const perDistrict = useM(() => {
      return DISTRICTS.map(d => {
        const ids = streets.filter(s => s.district === d.id).map(s => s.id);
        const counts = window.getMasteryCounts ? window.getMasteryCounts(ids)
          : { known: 0, learning: 0, needs: ids.length, total: ids.length };
        const scores = window.getAllScoresForDistrict ? window.getAllScoresForDistrict(d.id) : {};
        return { district: d, counts, scores };
      });
    }, [streets]);

    const recentRuns = useM(() => {
      if (!window.GATLYKTA_STORAGE_KEYS) return [];
      try {
        const raw = localStorage.getItem(window.GATLYKTA_STORAGE_KEYS.SCORES);
        const all = raw ? JSON.parse(raw) : {};
        const flat = [];
        for (const [key, data] of Object.entries(all)) {
          const [districtId, mode] = key.split('::');
          for (const r of (data.runs || [])) flat.push({ ...r, districtId, mode });
        }
        return flat.sort((a, b) => b.when - a.when).slice(0, 10);
      } catch { return []; }
    }, [streets]);

    const fileInput = useR(null);
    const [flashMsg, setFlashMsg] = useS(null);

    const handleExport = useC(() => {
      if (!window.exportSnapshot) return;
      const snap = window.exportSnapshot();
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gatlykta-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, []);

    const handleImport = useC((event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (window.importSnapshot && window.importSnapshot(data)) {
            setFlashMsg(t('profile.import_done'));
            setTimeout(() => window.location.reload(), 800);
          } else {
            setFlashMsg(t('profile.import_error'));
          }
        } catch {
          setFlashMsg(t('profile.import_error'));
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }, [t]);

    const handleClear = useC(() => {
      if (!window.confirm(t('profile.clear_confirm'))) return;
      try {
        const keys = window.GATLYKTA_STORAGE_KEYS || {};
        for (const k of Object.values(keys)) localStorage.removeItem(k);
      } catch {}
      window.location.reload();
    }, [t]);

    const districtName = (id) => (DISTRICTS.find(d => d.id === id) || {}).name || id;

    return (
      <div className="page">
        <TopBar t={t} onHome={onBack} right={<button className="btn-link" onClick={onBack}>← {t('app.back')}</button>} />
        <div className="profile-page">
          <div className="eyebrow">{t('profile.title')}</div>
          <h1>{t('profile.overview')}</h1>

          <div className="profile-summary">
            <div className="stat"><div className="k">{t('learn.known_label')}</div><div className="v">{overall.known} <span className="unit">/ {overall.total}</span></div></div>
            <div className="stat"><div className="k">{t('learn.review_label')}</div><div className="v">{overall.learning}</div></div>
            <div className="stat"><div className="k">{t('profile.streets_total')}</div><div className="v">{overall.total}</div></div>
          </div>

          <div className="eyebrow" style={{ marginTop: 24 }}>{t('profile.per_district')}</div>
          <div className="profile-districts">
            {perDistrict.map(({ district, counts, scores }) => {
              const pct = counts.total ? Math.round(counts.known / counts.total * 100) : 0;
              const hasScores = Object.keys(scores).length > 0;
              return (
                <div key={district.id} className="profile-district">
                  <div className="head">
                    <span className="name">{district.name}</span>
                    <span className="meta">{counts.known}/{counts.total} · {pct}%</span>
                  </div>
                  <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                  {hasScores && (
                    <div className="modes">
                      {['fill', 'quiz', 'time', 'learn'].map(mode => {
                        const s = scores[mode];
                        if (!s || !s.best) return null;
                        const b = s.best;
                        const value = b.points ? `${b.points}p` : `${b.correct}/${b.total}`;
                        return (
                          <span key={mode} className="mode-tag">
                            <em>{t(`mode.${mode}`)}</em> {value}
                            {b.stars > 0 && <Stars count={b.stars} />}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {recentRuns.length > 0 && (
            <>
              <div className="eyebrow" style={{ marginTop: 24 }}>{t('profile.recent_runs')}</div>
              <ol className="recent-runs">
                {recentRuns.map((r, i) => (
                  <li key={i}>
                    <span className="when">{new Date(r.when).toLocaleDateString()}</span>
                    <span className="where">{districtName(r.districtId)} · <em>{t(`mode.${r.mode}`)}</em></span>
                    <span className="score">
                      {r.points ? `${r.points}p · ` : ''}
                      {r.correct}/{r.total}
                      {r.timeSec ? ` · ${formatTime(r.timeSec)}` : ''}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="profile-actions">
            <button className="btn ghost" onClick={handleExport}>↓ {t('profile.export')}</button>
            <button className="btn ghost" onClick={() => fileInput.current && fileInput.current.click()}>↑ {t('profile.import')}</button>
            <button className="btn ghost danger" onClick={handleClear}>{t('profile.clear')}</button>
            <input ref={fileInput} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImport} />
          </div>
          {flashMsg && <div className="profile-flash">{flashMsg}</div>}
        </div>
      </div>
    );
  }

  window.Profile = Profile;
})();
