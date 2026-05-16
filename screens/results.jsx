/* global React, window, DISTRICTS */
// Gatlykta — end-of-round results screen with grand reveal cascade,
// count-up stats, trivia, solved/missed lists and share/play-again actions.

(function () {
  const { useState: useS, useEffect: useE, useMemo: useM, useCallback: useC } = React;
  const {
    TopBar, Stars, Toast, LeafletMap,
    calculateStars, formatTime, recordResult,
  } = window;

  function Results({ t, result, districtIds, streets, difficulty, mapStyle, lang, onPlayAgain, onPickArea, onHome }) {
    const stars = useM(() => calculateStars({ correct: result.correct, total: result.total, timeSec: result.time, mode: result.mode }), [result]);
    const allStreetsActive = useM(() => {
      if (result.roundIds && result.roundIds.length) {
        const byId = new Map(streets.map(s => [s.id, s]));
        return result.roundIds.map(id => byId.get(id)).filter(Boolean);
      }
      const set = districtIds ? new Set(districtIds) : null;
      const inDist = streets.filter(s => !set || set.has(s.district));
      return window.filterByDifficulty ? window.filterByDifficulty(inDist, difficulty) : inDist;
    }, [streets, districtIds, difficulty, result]);

    const solvedSet = useM(() => new Set(result.solvedIds || []), [result.solvedIds]);
    const solvedItems = useM(() => allStreetsActive.filter(s => solvedSet.has(s.id)), [allStreetsActive, solvedSet]);
    const missedItems = useM(() => allStreetsActive.filter(s => !solvedSet.has(s.id)), [allStreetsActive, solvedSet]);

    // Sort: solved first (so they reveal first in the cascade), then missed.
    const revealOrder = useM(() => [...solvedItems, ...missedItems], [solvedItems, missedItems]);

    // Grand reveal cascade: 0 → all streets over ~2.2s, easing for the last ones
    // to slow down a touch. Each street then runs its own eraser-brush animation
    // inside LeafletMap (~280ms), so the overall effect is a wave from one end
    // of the area to the other.
    const [revealedCount, setRevealedCount] = useS(0);
    useE(() => {
      if (!revealOrder.length) { setRevealedCount(0); return; }
      let raf;
      const startedAt = Date.now();
      const duration = Math.min(2400, 600 + revealOrder.length * 35);
      const tick = () => {
        const t = Math.min(1, (Date.now() - startedAt) / duration);
        const eased = 1 - Math.pow(1 - t, 2.4);
        setRevealedCount(Math.floor(eased * revealOrder.length));
        if (t < 1) raf = requestAnimationFrame(tick); else setRevealedCount(revealOrder.length);
      };
      tick();
      return () => { if (raf) cancelAnimationFrame(raf); };
    }, [revealOrder]);

    const states = useM(() => {
      const o = {};
      for (let i = 0; i < revealedCount && i < revealOrder.length; i++) {
        const s = revealOrder[i];
        o[s.id] = solvedSet.has(s.id) ? 'solved' : 'hinted';
      }
      return o;
    }, [revealedCount, revealOrder, solvedSet]);

    // Count-up animation for the stat numbers
    const [statT, setStatT] = useS(0);
    useE(() => {
      let raf;
      const startedAt = Date.now();
      const duration = 900;
      const tick = () => {
        const t = Math.min(1, (Date.now() - startedAt) / duration);
        setStatT(1 - Math.pow(1 - t, 2));
        if (t < 1) raf = requestAnimationFrame(tick); else setStatT(1);
      };
      tick();
      return () => { if (raf) cancelAnimationFrame(raf); };
    }, []);
    const showCorrect = Math.round((result.correct || 0) * statT);
    const showPoints = result.points != null ? Math.round(result.points * statT) : null;
    const showStreak = Math.round((result.bestStreak || 0) * statT);

    const areaName = useM(() => {
      if (!districtIds || districtIds.length === 0) return t('area.all');
      if (districtIds.length === 1) {
        const d = DISTRICTS.find(x => x.id === districtIds[0]);
        return d ? d.name : '';
      }
      return districtIds.map(id => (DISTRICTS.find(d => d.id === id) || {}).name).filter(Boolean).join(' + ');
    }, [districtIds, t]);

    const triviaItems = useM(() => {
      if (!window.triviaForStreet || !window.triviaForDistrict) return { district: null, streets: [] };
      const lng = lang || 'sv';
      const single = districtIds && districtIds.length === 1 ? districtIds[0] : null;
      const districtText = single ? window.triviaForDistrict(single, lng) : null;
      const districtName = single ? (DISTRICTS.find(d => d.id === single) || {}).name : '';
      const candidates = (solvedItems.length ? solvedItems : missedItems);
      const matches = [];
      for (const s of candidates) {
        const text = window.triviaForStreet(s.name, lng);
        if (text) matches.push({ name: s.name, text });
        if (matches.length >= 3) break;
      }
      return { district: districtText, districtName, streets: matches };
    }, [districtIds, solvedItems, missedItems, lang]);

    const [flash, setFlash] = useS(null);
    const handleShare = useC(async () => {
      const modeName = t(`mode.${result.mode}`);
      const url = window.location.origin + window.location.pathname;
      const summary = `Gatlykta · ${modeName} · ${areaName}: ${result.correct}/${result.total} (${stars}/3★)`;
      if (navigator.share) {
        try { await navigator.share({ title: 'Gatlykta', text: summary, url }); return; }
        catch { /* user cancelled or unsupported target */ }
      }
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(`${summary} — ${url}`);
          setFlash({ tone: 'ok', text: t('results.shared') });
          return;
        } catch { /* fall through */ }
      }
      setFlash({ tone: 'warn', text: t('results.share_unavailable') });
    }, [t, result, areaName, stars]);

    useE(() => {
      if (districtIds) districtIds.forEach(id => recordResult(id, result.mode, stars));
      // Detailed scoreboard: one record per round per primary district.
      // For "all districts" rounds we record under the synthetic id 'all'.
      if (window.recordScore) {
        const targetIds = districtIds && districtIds.length ? districtIds : [null];
        for (const id of targetIds) {
          window.recordScore({
            districtId: id || 'all',
            mode: result.mode,
            points: result.points,
            correct: result.correct,
            total: result.total,
            timeSec: result.time,
            stars,
          });
        }
      }
    }, []);

    return (
      <div className="page">
        <TopBar t={t} onHome={onHome} right={<button className="btn-link" onClick={onHome}>{t('results.home')}</button>} />
        <div className="results-page">
          <div className="results-left">
            <div className="eyebrow">{t(`mode.${result.mode}`)} · {areaName}</div>
            <h1>{stars >= 3 ? <em>{t('results.amazing')}</em> : stars >= 2 ? t('results.well_done') : stars >= 1 ? t('results.not_bad') : t('results.keep_trying')}</h1>
            <div className="results-stars"><Stars count={stars} big /></div>
            <div className="results-summary">
              <div className="stat"><div className="k">{t('results.correct')}</div><div className="v">{showCorrect} <span className="unit">/ {result.total}</span></div></div>
              {showPoints != null && <div className="stat"><div className="k">{t('hud.points')}</div><div className="v">{showPoints}</div></div>}
              <div className="stat"><div className="k">{t('results.time')}</div><div className="v">{formatTime(result.time)}</div></div>
              <div className="stat"><div className="k">{t('results.streak')}</div><div className="v">{showStreak}</div></div>
            </div>
            {solvedItems.length > 0 && (
              <>
                <div className="eyebrow">{t('results.list_solved')} · {solvedItems.length}</div>
                <div className="results-streets">
                  {solvedItems.map(s => <span key={s.id} className="chip ok">{s.name}</span>)}
                </div>
              </>
            )}
            {missedItems.length > 0 && (
              <>
                <div className="eyebrow">{t('results.list_missed')} · {missedItems.length}</div>
                <div className="results-streets">
                  {missedItems.map(s => <span key={s.id} className="chip miss">{s.name}</span>)}
                </div>
              </>
            )}
            {(triviaItems.district || triviaItems.streets.length > 0) && (
              <div className="results-trivia">
                <div className="eyebrow">{t('trivia.heading')}</div>
                {triviaItems.district && (
                  <div className="trivia-card district">
                    <div className="trivia-where">{triviaItems.districtName}</div>
                    <p>{triviaItems.district}</p>
                  </div>
                )}
                {triviaItems.streets.map((tr, i) => (
                  <div key={i} className="trivia-card">
                    <div className="trivia-where">{tr.name}</div>
                    <p>{tr.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="actions-row" style={{ marginTop: 28 }}>
              <button className="btn" onClick={onPlayAgain}>↻ {t('results.again')}</button>
              <button className="btn ghost" onClick={onPickArea}>{t('results.pick_area')}</button>
              <button className="btn ghost" onClick={onHome}>{t('results.try_another')}</button>
              <button className="btn ghost" onClick={handleShare}>↗ {t('results.share')}</button>
            </div>
          </div>
          <div className="results-right">
            <div className="map-preview">
              <LeafletMap streets={streets} activeDistricts={districtIds} focusDistrict={districtIds && districtIds.length === 1 ? districtIds[0] : null} streetStates={states} interactive={false} showLabels showSolvedLabels scratch mapStyle={mapStyle} progress={revealOrder.length ? revealedCount / revealOrder.length : 1} />
            </div>
          </div>
        </div>
        {flash && (<Toast tone={flash.tone} onDone={() => setFlash(null)} ttl={2200}>{flash.text}</Toast>)}
      </div>
    );
  }

  window.Results = Results;
})();
