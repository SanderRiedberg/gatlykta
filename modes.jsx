/* global React, window, DISTRICTS, matchesGuess, evaluateGuess, streetHint */
// Gatlykta — game modes. Map data passed in via prop `streets` (loaded OSM).
const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM, useCallback: useC } = React;

function streetsForDistricts(streets, districtIds, difficulty) {
  let s = streets;
  if (districtIds) { const set = new Set(districtIds); s = s.filter(x => set.has(x.district)); }
  return window.filterByDifficulty ? window.filterByDifficulty(s, difficulty || 'hard') : s;
}

// ─────────────── Guess popover ───────────────
function GuessPop({ t, pos, street, wrongCount, hint, onHint, onCorrect, onWrong, onClose, onReveal, inputRef }) {
  const [val, setVal] = useS('');
  const [shake, setShake] = useS(false);
  const submit = (e) => {
    e && e.preventDefault();
    if (!val.trim()) return;
    const result = window.evaluateGuess ? evaluateGuess(street, val) : { accepted: matchesGuess(street, val), quality: 'exact' };
    if (result.accepted) {
      onCorrect(val, result);
    } else {
      setShake(true); setTimeout(() => setShake(false), 350);
      onWrong(val, result); setVal('');
    }
  };
  return (
    <form className={`guess-pop ${shake ? 'wrong' : ''}`} style={{ left: pos.x, top: pos.y }} onSubmit={submit}>
      <div className="row">
        <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} placeholder={t('app.guessing')} spellCheck={false} autoComplete="off" />
        <button type="submit" className="btn small" disabled={!val.trim()}>↵</button>
      </div>
      {hint && <div className="hint-box">{hint}</div>}
      <div className="helper">
        <button type="button" onClick={onClose}>esc</button>
        {wrongCount >= 2 && <button type="button" onClick={onHint}>{t('app.hint')}</button>}
        <button type="button" onClick={onReveal}>{wrongCount >= 1 ? t('app.reveal') : t('app.skip')}</button>
      </div>
    </form>
  );
}

function pointsForGuess({ wrongs = 0, hints = 0, quality = 'exact' }) {
  return Math.max(35, 100 - wrongs * 15 - hints * 20 - (quality === 'fuzzy' ? 5 : 0));
}

// ════════════════════════════════════════════════════════════════════
// FILL-IN
// ════════════════════════════════════════════════════════════════════
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
        {feedback && (<Toast key={feedback.text + Math.random()} tone={feedback.tone} onDone={() => setFeedback(null)}>{feedback.text}</Toast>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// QUIZ
// ════════════════════════════════════════════════════════════════════
function QuizMode({ t, streets, districtIds, focusDistrict, difficulty, mapStyle, onFinish, onQuit }) {
  const active = useM(() => streetsForDistricts(streets, districtIds, difficulty), [streets, districtIds, difficulty]);
  const queue = useM(() => [...active].sort(() => Math.random() - 0.5).slice(0, Math.min(active.length, 14)), [active]);
  const [idx, setIdx] = useS(0);
  const [answerMode, setAnswerMode] = useS('type');
  const [answer, setAnswer] = useS('');
  const [solvedIds, setSolvedIds] = useS(() => new Set());
  const [missedIds, setMissedIds] = useS(() => new Set());
  const [streak, setStreak] = useS(0);
  const [bestStreak, setBestStreak] = useS(0);
  const [tries, setTries] = useS(0);
  const [shake, setShake] = useS(false);
  const [listening, setListening] = useS(false);
  const [flash, setFlash] = useS(null);
  const [startTime] = useS(() => Date.now());
  const [, force] = useS(0);
  const inputRef = useR(null);
  const speechRef = useR(null);
  useE(() => { const id = setInterval(() => force(t => t + 1), 1000); return () => clearInterval(id); }, []);
  useE(() => {
    setAnswer('');
    if (answerMode === 'type') setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }, [idx, answerMode]);
  useE(() => () => { if (speechRef.current) speechRef.current.abort(); }, []);

  const target = queue[idx] || null;
  const canDictate = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const states = useM(() => {
    const o = {};
    solvedIds.forEach(id => o[id] = 'solved');
    missedIds.forEach(id => o[id] = 'hinted');
    if (answerMode === 'type' && target && !solvedIds.has(target.id) && !missedIds.has(target.id)) o[target.id] = 'target';
    return o;
  }, [solvedIds, missedIds, answerMode, target]);

  const next = useC((solvedSet = solvedIds, missedSet = missedIds, best = bestStreak) => {
    if (idx + 1 >= queue.length) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      onFinish({ mode: 'quiz', total: queue.length, correct: solvedSet.size, missed: queue.length - solvedSet.size, time: elapsed, bestStreak: best, solvedIds: [...solvedSet], revealedIds: [...missedSet] });
      return;
    }
    setIdx(i => i + 1); setTries(0); setAnswer('');
  }, [idx, queue.length, solvedIds, bestStreak, missedIds, startTime, onFinish]);

  const completeTarget = useC((match = { quality: 'exact' }) => {
    if (!target) return;
    const n = new Set(solvedIds); n.add(target.id); setSolvedIds(n);
    const nextBest = Math.max(bestStreak, streak + 1);
    setStreak(s => { const v = s + 1; setBestStreak(b => Math.max(b, v)); return v; });
    setAnswer('');
    setFlash({ tone: 'ok', text: match.quality === 'fuzzy' ? t('feedback.nearly') : t('feedback.correct') });
    setTimeout(() => next(n, missedIds, nextBest), 700);
  }, [target, solvedIds, missedIds, bestStreak, streak, t, next]);

  const missTarget = useC(() => {
    if (!target) return;
    const n = new Set(missedIds); n.add(target.id); setMissedIds(n);
    setAnswer('');
    setFlash({ tone: 'warn', text: `${t('feedback.revealed')} ${target.name}` });
    setTimeout(() => next(solvedIds, n, bestStreak), 1200);
  }, [target, missedIds, solvedIds, bestStreak, t, next]);

  const registerWrongTarget = useC(() => {
    const nextTries = tries + 1;
    setTries(nextTries);
    setStreak(0);
    if (nextTries >= 2) missTarget();
    else setFlash({ tone: 'warn', text: t('feedback.try_again') });
  }, [tries, missTarget, t]);

  const handleClick = useC((street) => {
    if (!target || answerMode !== 'click') return;
    if (street.id === target.id) {
      completeTarget();
    } else {
      registerWrongTarget();
    }
  }, [target, answerMode, completeTarget, registerWrongTarget]);

  const handleTypedSubmit = useC((event) => {
    event && event.preventDefault();
    if (!target || !answer.trim()) return;
    const result = window.evaluateGuess ? evaluateGuess(target, answer) : { accepted: matchesGuess(target, answer), quality: 'exact' };
    if (result.accepted) {
      completeTarget(result);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 350);
      setAnswer('');
      registerWrongTarget();
    }
  }, [target, answer, completeTarget, registerWrongTarget]);

  const toggleDictation = useC(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    if (speechRef.current) {
      speechRef.current.abort();
      speechRef.current = null;
      setListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = t('speech.lang');
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript;
      if (transcript) setAnswer(transcript);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    };
    recognition.onerror = () => setFlash({ tone: 'warn', text: t('quiz.dictation_error') });
    recognition.onend = () => { speechRef.current = null; setListening(false); };
    speechRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [t]);

  return (
    <div className="game-page">
      <div className="game-hud">
        <div className="hud-left">
          <button className="btn ghost small" onClick={onQuit}>← {t('app.quit')}</button>
          <div><div className="hud-mode">{t('mode.quiz')}</div><div className="hud-area">{districtIds ? districtIds.length : 'alla'} {t('app.districts')}</div></div>
        </div>
        <div className="hud-center hud-progress">
          <HudPill k={t('hud.score')} v={`${solvedIds.size}/${queue.length}`} />
          <div className="bar"><i style={{ width: `${queue.length ? (idx/queue.length)*100 : 0}%` }}/></div>
          <HudPill k={t('hud.streak')} v={streak} />
        </div>
        <div className="hud-right">
          <HudPill k={t('hud.time')} v={formatTime(Math.floor((Date.now() - startTime) / 1000))} />
        </div>
      </div>
      <div className="map-stage">
        <LeafletMap streets={active} activeDistricts={districtIds} focusDistrict={focusDistrict} streetStates={states} onStreetClick={handleClick} showLabels showSolvedLabels mapStyle={mapStyle} progress={queue.length ? solvedIds.size/queue.length : (active.length ? solvedIds.size/active.length : 0)} />
        {target && (
          <div className={`quiz-prompt ${answerMode === 'type' ? 'typed' : ''}`}>
            <div className="quiz-switch" role="group" aria-label={t('quiz.mode_label')}>
              <button type="button" className={answerMode === 'type' ? 'on' : ''} onClick={() => setAnswerMode('type')}>{t('quiz.type_mode')}</button>
              <button type="button" className={answerMode === 'click' ? 'on' : ''} onClick={() => setAnswerMode('click')}>{t('quiz.click_mode')}</button>
            </div>
            {answerMode === 'click' ? (
              <>
                <div className="eyebrow">{t('quiz.prompt')}</div>
                <div className="q"><em>{target.name}</em>?</div>
              </>
            ) : (
              <form className={`quiz-answer ${shake ? 'wrong' : ''}`} onSubmit={handleTypedSubmit}>
                <div className="eyebrow">{t('quiz.type_prompt')}</div>
                <div className="row">
                  <input ref={inputRef} value={answer} onChange={(e) => setAnswer(e.target.value)}
                    placeholder={t('quiz.type_placeholder')} aria-label={t('quiz.answer_label')}
                    spellCheck={false} autoComplete="off" />
                  {canDictate && <button type="button" className={`btn ghost small mic ${listening ? 'on' : ''}`} onClick={toggleDictation} title={t('quiz.dictate_title')}>{listening ? t('quiz.listening') : t('quiz.dictate')}</button>}
                  <button type="submit" className="btn small" disabled={!answer.trim()}>↵</button>
                </div>
                <div className="quiz-help">{tries ? t('quiz.try_hint') : t('quiz.type_help')}</div>
              </form>
            )}
          </div>
        )}
        {flash && (<Toast key={flash.text + idx} tone={flash.tone} onDone={() => setFlash(null)} ttl={1100}>{flash.text}</Toast>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TIME ATTACK
// ════════════════════════════════════════════════════════════════════
function TimeMode({ t, streets, districtIds, focusDistrict, difficulty, mapStyle, onFinish, onQuit }) {
  const LIMIT = 90;
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
        {feedback && (<Toast key={feedback.text + elapsed} tone={feedback.tone} onDone={() => setFeedback(null)} ttl={900}>{feedback.text}</Toast>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// LEARN
// ════════════════════════════════════════════════════════════════════
function LearnMode({ t, streets, districtIds, focusDistrict, difficulty, mapStyle, onFinish, onQuit }) {
  const active = useM(() => streetsForDistricts(streets, districtIds, difficulty), [streets, districtIds, difficulty]);
  const [hovered, setHovered] = useS(null);
  const [pinned, setPinned] = useS(() => new Set());
  const states = useM(() => { const o = {}; pinned.forEach(id => o[id] = 'solved'); return o; }, [pinned]);
  const handleClick = useC((street) => { const n = new Set(pinned); if (n.has(street.id)) n.delete(street.id); else n.add(street.id); setPinned(n); }, [pinned]);

  return (
    <div className="game-page">
      <div className="game-hud">
        <div className="hud-left">
          <button className="btn ghost small" onClick={onQuit}>← {t('app.quit')}</button>
          <div><div className="hud-mode">{t('mode.learn')}</div><div className="hud-area">{districtIds ? districtIds.length : 'alla'} {t('app.districts')}</div></div>
        </div>
        <div className="hud-center"><HudPill k={t('app.streets')} v={`${pinned.size}/${active.length}`} /></div>
        <div className="hud-right">
          <button className="btn small" onClick={() => onFinish({ mode: 'learn', total: active.length, correct: pinned.size, missed: 0, time: 0, bestStreak: 0, solvedIds: [...pinned], revealedIds: [] })}>{t('app.quit')} →</button>
        </div>
      </div>
      <div className="map-stage">
        <LeafletMap streets={active} activeDistricts={districtIds} focusDistrict={focusDistrict} streetStates={states} onStreetClick={handleClick} onStreetHover={setHovered} hoveredStreet={hovered} showLabels showStreetLabels showSolvedLabels mapStyle={mapStyle} progress={active.length ? pinned.size/active.length : 0} />
        <div className="learn-panel">
          <div className="eyebrow">{t('mode.learn')}</div>
          {hovered ? (<><div className="name">{hovered.name}</div><div className="meta">{(DISTRICTS.find(d => d.id === hovered.district) || {}).name}</div></>) : (<><div className="name" style={{ fontSize: 18 }}>{t('app.tap_street')}</div><div className="help">Klicka för att pinna gator du har lärt dig.</div></>)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FillMode, QuizMode, TimeMode, LearnMode });
