/* global React, window */
// Gatlykta — Fill in mode. Click a street, type the name, scratch the map.

(function () {
  const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM, useCallback: useC } = React;
  const {
    streetHint, streetsForDistricts, pointsForGuess,
    HudPill, Toast, formatTime,
    LeafletMap, GuessPop,
  } = window;

  function FillMode({ t, streets, districtIds, focusDistrict, difficulty, mapStyle, onFinish, onQuit }) {
    const active = useM(() => streetsForDistricts(streets, districtIds, difficulty), [streets, districtIds, difficulty]);
    const [solvedIds, setSolvedIds] = useS(() => new Set());
    const [wrongMap, setWrongMap] = useS({});
    const [hintMap, setHintMap] = useS({});
    const [revealedIds, setRevealedIds] = useS(() => new Set());
    const [selected, setSelected] = useS(null);
    const [popPos, setPopPos] = useS(null);
    const [feedback, setFeedback] = useS(null);
    const [streak, setStreak] = useS(0);
    const [bestStreak, setBestStreak] = useS(0);
    const [points, setPoints] = useS(0);
    const [startTime] = useS(() => Date.now());
    const wrapRef = useR(null);
    const inputRef = useR(null);
    const [, force] = useS(0);
    useE(() => { const id = setInterval(() => force(t => t + 1), 1000); return () => clearInterval(id); }, []);
    useE(() => { if (selected && inputRef.current) inputRef.current.focus(); }, [selected]);

    const total = active.length;
    const solved = solvedIds.size;
    const completed = solvedIds.size + revealedIds.size;

    const streetStates = useM(() => {
      const o = {};
      solvedIds.forEach(id => o[id] = 'solved');
      revealedIds.forEach(id => { if (!solvedIds.has(id)) o[id] = 'hinted'; });
      if (selected) o[selected.street.id] = 'selected';
      return o;
    }, [solvedIds, revealedIds, selected]);

    const handleStreetClick = useC((street, evt) => {
      if (solvedIds.has(street.id)) return;
      const rect = wrapRef.current.getBoundingClientRect();
      setSelected({ street });
      setPopPos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
    }, [solvedIds]);

    const currentHint = selected
      ? streetHint(selected.street, hintMap[selected.street.id] || 0)
      : null;

    const handleCorrect = useC((_, match = { quality: 'exact' }) => {
      if (!selected) return;
      const wrongs = wrongMap[selected.street.id] || 0;
      const hints = hintMap[selected.street.id] || 0;
      const gained = pointsForGuess({ wrongs, hints, quality: match.quality });
      const nextPoints = points + gained;
      const next = new Set(solvedIds); next.add(selected.street.id);
      const nextRevealed = new Set(revealedIds); nextRevealed.delete(selected.street.id);
      setSolvedIds(next);
      setRevealedIds(nextRevealed);
      setPoints(nextPoints);
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n; });
      setSelected(null); setPopPos(null);
      const text = match.quality === 'fuzzy' ? `${t('feedback.nearly')} +${gained}` : `${t('feedback.correct')} +${gained}`;
      setFeedback({ tone: 'ok', text });
      if (next.size + nextRevealed.size >= total) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setTimeout(() => onFinish({ mode: 'fill', total, correct: next.size, missed: total - next.size, time: elapsed, bestStreak: Math.max(bestStreak, streak + 1), points: nextPoints, solvedIds: [...next], revealedIds: [...nextRevealed] }), 700);
      }
    }, [selected, wrongMap, hintMap, points, solvedIds, total, t, onFinish, bestStreak, streak, startTime, revealedIds]);

    const handleWrong = useC(() => {
      if (!selected) return;
      const nextWrong = (wrongMap[selected.street.id] || 0) + 1;
      setWrongMap(m => ({ ...m, [selected.street.id]: nextWrong }));
      setStreak(0);
      if (nextWrong >= 2 && !hintMap[selected.street.id]) {
        setHintMap(m => ({ ...m, [selected.street.id]: 1 }));
        setFeedback({ tone: 'warn', text: `${t('app.hint')}: ${streetHint(selected.street, 1)}` });
      } else {
        setFeedback({ tone: 'warn', text: t('feedback.wrong') });
      }
    }, [selected, wrongMap, hintMap, t]);

    const handleHint = useC(() => {
      if (!selected) return;
      const current = hintMap[selected.street.id] || 0;
      const nextLevel = Math.min(3, current + 1);
      setHintMap(m => ({ ...m, [selected.street.id]: nextLevel }));
      setFeedback({ tone: 'default', text: `${t('app.hint')}: ${streetHint(selected.street, nextLevel)}` });
    }, [selected, hintMap, t]);

    const handleReveal = useC(() => {
      if (!selected) return;
      const next = new Set(revealedIds); next.add(selected.street.id);
      setRevealedIds(next);
      setStreak(0);
      setFeedback({ tone: 'default', text: `${t('feedback.revealed')} ${selected.street.name}` });
      const id = selected.street.id;
      if (solvedIds.size + next.size >= total) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setTimeout(() => onFinish({ mode: 'fill', total, correct: solvedIds.size, missed: total - solvedIds.size, time: elapsed, bestStreak, points, solvedIds: [...solvedIds], revealedIds: [...next] }), 900);
      } else {
        setTimeout(() => { setSelected(s => (s && s.street.id === id) ? null : s); setPopPos(null); }, 1100);
      }
    }, [selected, revealedIds, t, solvedIds, total, startTime, onFinish, bestStreak, points]);

    return (
      <div className="game-page">
        <div className="game-hud">
          <div className="hud-left">
            <button className="btn ghost small" onClick={onQuit}>← {t('app.quit')}</button>
            <div><div className="hud-mode">{t('mode.fill')}</div><div className="hud-area">{districtIds ? districtIds.length : 'alla'} {t('app.districts')}</div></div>
          </div>
          <div className="hud-center hud-progress">
            <HudPill k={t('hud.score')} v={`${solved}/${total}`} />
            <div className="bar"><i style={{ width: `${total ? (completed/total)*100 : 0}%` }}/></div>
            <HudPill k={t('hud.streak')} v={streak} />
            <HudPill k={t('hud.points')} v={points} />
          </div>
          <div className="hud-right">
            <HudPill k={t('hud.time')} v={formatTime(Math.floor((Date.now() - startTime) / 1000))} />
          </div>
        </div>
        <div className="map-stage" ref={wrapRef}>
          <LeafletMap streets={active} activeDistricts={districtIds} focusDistrict={focusDistrict} streetStates={streetStates} onStreetClick={handleStreetClick} showLabels showSolvedLabels mapStyle={mapStyle} progress={total ? completed/total : 0} />
          {selected && popPos && (
            <GuessPop t={t} pos={popPos} street={selected.street} wrongCount={wrongMap[selected.street.id] || 0}
              hint={hintMap[selected.street.id] ? currentHint : null} onHint={handleHint}
              onCorrect={handleCorrect} onWrong={handleWrong}
              onClose={() => { setSelected(null); setPopPos(null); }} onReveal={handleReveal} inputRef={inputRef} />
          )}
          {feedback && (<Toast tone={feedback.tone} onDone={() => setFeedback(null)}>{feedback.text}</Toast>)}
        </div>
      </div>
    );
  }

  window.FillMode = FillMode;
})();
