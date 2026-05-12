/* global React, window */
// Gatlykta — Quiz mode. Highlight a street; user types (or clicks) its name.

(function () {
  const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM, useCallback: useC } = React;
  const {
    evaluateGuess, matchesGuess,
    streetsForDistricts, shuffleStreets, quizRoundSize,
    HudPill, Toast, formatTime,
    LeafletMap,
  } = window;

  function QuizMode({ t, streets, districtIds, focusDistrict, difficulty, mapStyle, onFinish, onQuit }) {
    const active = useM(() => streetsForDistricts(streets, districtIds, difficulty), [streets, districtIds, difficulty]);
    const queue = useM(() => shuffleStreets(active).slice(0, quizRoundSize(difficulty, active.length)), [active, difficulty]);
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
    const triesRef = useR(0);
    const resolvingRef = useR(false);
    useE(() => { const id = setInterval(() => force(t => t + 1), 1000); return () => clearInterval(id); }, []);
    useE(() => {
      setAnswer('');
      if (answerMode === 'type') setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }, [answerMode]);
    useE(() => {
      resolvingRef.current = false;
      triesRef.current = 0;
      setTries(0);
      setAnswer('');
      if (answerMode === 'type') setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }, [idx]);
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
        const roundIds = queue.map(s => s.id);
        onFinish({ mode: 'quiz', total: queue.length, correct: solvedSet.size, missed: queue.length - solvedSet.size, time: elapsed, bestStreak: best, solvedIds: [...solvedSet], revealedIds: [...missedSet], roundIds });
        return;
      }
      triesRef.current = 0;
      setIdx(i => i + 1); setTries(0); setAnswer('');
    }, [idx, queue, solvedIds, bestStreak, missedIds, startTime, onFinish]);

    const completeTarget = useC((match = { quality: 'exact' }) => {
      if (!target || resolvingRef.current) return;
      resolvingRef.current = true;
      const n = new Set(solvedIds); n.add(target.id); setSolvedIds(n);
      const nextBest = Math.max(bestStreak, streak + 1);
      setStreak(s => { const v = s + 1; setBestStreak(b => Math.max(b, v)); return v; });
      setAnswer('');
      setFlash({ tone: 'ok', text: match.quality === 'fuzzy' ? t('feedback.nearly') : t('feedback.correct') });
      setTimeout(() => next(n, missedIds, nextBest), 700);
    }, [target, solvedIds, missedIds, bestStreak, streak, t, next]);

    const missTarget = useC(() => {
      if (!target || resolvingRef.current) return;
      resolvingRef.current = true;
      const n = new Set(missedIds); n.add(target.id); setMissedIds(n);
      setAnswer('');
      setFlash({ tone: 'warn', text: `${t('feedback.correct_answer')} ${target.name}` });
      setTimeout(() => next(solvedIds, n, bestStreak), 1200);
    }, [target, missedIds, solvedIds, bestStreak, t, next]);

    const registerWrongTarget = useC(() => {
      if (resolvingRef.current) return;
      const nextTries = triesRef.current + 1;
      triesRef.current = nextTries;
      setTries(nextTries);
      setStreak(0);
      if (nextTries >= 2) missTarget();
      else setFlash({ tone: 'warn', text: t('feedback.try_again') });
    }, [missTarget, t]);

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
      if (!target) return;
      if (!answer.trim()) {
        missTarget();
        return;
      }
      const result = evaluateGuess ? evaluateGuess(target, answer) : { accepted: matchesGuess(target, answer), quality: 'exact' };
      if (result.accepted) {
        completeTarget(result);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 350);
        setAnswer('');
        registerWrongTarget();
      }
    }, [target, answer, completeTarget, registerWrongTarget, missTarget]);

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
            <HudPill k={t('results.missed')} v={missedIds.size} />
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
                    <button type="submit" className="btn small" title={answer.trim() ? t('quiz.submit_title') : t('quiz.skip_title')}>↵</button>
                  </div>
                  <div className="quiz-help">{tries ? t('quiz.try_hint') : t('quiz.type_help')}</div>
                </form>
              )}
            </div>
          )}
          {flash && (<Toast tone={flash.tone} onDone={() => setFlash(null)} ttl={1100}>{flash.text}</Toast>)}
        </div>
      </div>
    );
  }

  window.QuizMode = QuizMode;
})();
