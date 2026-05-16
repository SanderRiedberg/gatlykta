/* global React, window */
// Gatlykta — Time attack mode. 90 seconds to name as many streets as possible.

(function () {
  const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM, useCallback: useC } = React;
  const {
    streetsForDistricts,
    HudPill, Toast, formatTime,
    LeafletMap, GuessPop,
  } = window;

  function TimeMode({ t, streets, districtIds, focusDistrict, difficulty, mapStyle, timeLimit, onFinish, onQuit }) {
    const LIMIT = Number(timeLimit) > 0 ? Number(timeLimit) : 90;
    const active = useM(() => streetsForDistricts(streets, districtIds, difficulty), [streets, districtIds, difficulty]);
    const [solvedIds, setSolvedIds] = useS(() => new Set());
    const [wrongMap, setWrongMap] = useS({});
    const [selected, setSelected] = useS(null);
    const [popPos, setPopPos] = useS(null);
    const [feedback, setFeedback] = useS(null);
    const [streak, setStreak] = useS(0);
    const [bestStreak, setBestStreak] = useS(0);
    const [, force] = useS(0);
    const startRef = useR(Date.now());
    const wrapRef = useR(null);
    const inputRef = useR(null);
    const doneRef = useR(false);
    useE(() => { const id = setInterval(() => force(x => x + 1), 250); return () => clearInterval(id); }, []);
    useE(() => { if (selected && inputRef.current) inputRef.current.focus(); }, [selected]);

    const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
    const remaining = Math.max(0, LIMIT - elapsed);

    useE(() => {
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        setTimeout(() => onFinish({ mode: 'time', total: active.length, correct: solvedIds.size, missed: active.length - solvedIds.size, time: LIMIT, bestStreak, solvedIds: [...solvedIds], revealedIds: [] }), 200);
      }
    }, [remaining, solvedIds, bestStreak, active.length, onFinish]);

    const states = useM(() => { const o = {}; solvedIds.forEach(id => o[id] = 'solved'); if (selected) o[selected.street.id] = 'selected'; return o; }, [solvedIds, selected]);

    const handleClick = useC((street, evt) => {
      if (solvedIds.has(street.id) || remaining <= 0) return;
      const rect = wrapRef.current.getBoundingClientRect();
      setSelected({ street }); setPopPos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
    }, [solvedIds, remaining]);

    const handleCorrect = useC(() => {
      const n = new Set(solvedIds); n.add(selected.street.id); setSolvedIds(n);
      setStreak(s => { const v = s + 1; setBestStreak(b => Math.max(b, v)); return v; });
      setSelected(null); setPopPos(null);
      setFeedback({ tone: 'ok', text: t('feedback.correct') });
      if (n.size >= active.length && !doneRef.current) {
        doneRef.current = true;
        const elapsedNow = Math.floor((Date.now() - startRef.current) / 1000);
        setTimeout(() => onFinish({ mode: 'time', total: active.length, correct: n.size, missed: 0, time: elapsedNow, bestStreak: Math.max(bestStreak, streak + 1), solvedIds: [...n], revealedIds: [] }), 600);
      }
    }, [selected, solvedIds, t, active.length, onFinish, bestStreak, streak]);

    const handleWrong = useC(() => { setWrongMap(m => ({ ...m, [selected.street.id]: (m[selected.street.id] || 0) + 1 })); setStreak(0); setFeedback({ tone: 'warn', text: t('feedback.wrong') }); }, [selected, t]);

    return (
      <div className="game-page">
        <div className="game-hud">
          <div className="hud-left">
            <button className="btn ghost small" onClick={onQuit}>← {t('app.quit')}</button>
            <div><div className="hud-mode"><em>{t('mode.time')}</em></div><div className="hud-area">{districtIds ? districtIds.length : 'alla'} {t('app.districts')}</div></div>
          </div>
          <div className="hud-center">
            <span className="hud-pill" style={{ borderColor: remaining <= 15 ? 'var(--warn)' : '' }}>
              <span className="k">{t('hud.time')}</span>
              <span className="v big" style={{ color: remaining <= 15 ? 'var(--warn)' : '' }}>{formatTime(remaining)}</span>
            </span>
          </div>
          <div className="hud-right">
            <HudPill k={t('hud.score')} v={solvedIds.size} />
            <HudPill k={t('hud.streak')} v={streak} />
          </div>
        </div>
        <div className="map-stage" ref={wrapRef}>
          <LeafletMap streets={active} activeDistricts={districtIds} focusDistrict={focusDistrict} streetStates={states} onStreetClick={handleClick} showLabels showSolvedLabels mapStyle={mapStyle} progress={active.length ? solvedIds.size/active.length : 0} />
          {selected && popPos && (
            <GuessPop t={t} pos={popPos} street={selected.street} wrongCount={wrongMap[selected.street.id] || 0}
              onCorrect={handleCorrect} onWrong={handleWrong}
              onClose={() => { setSelected(null); setPopPos(null); }}
              onReveal={() => { setSelected(null); setPopPos(null); }} inputRef={inputRef} />
          )}
          {feedback && (<Toast tone={feedback.tone} onDone={() => setFeedback(null)} ttl={900}>{feedback.text}</Toast>)}
        </div>
      </div>
    );
  }

  window.TimeMode = TimeMode;
})();
