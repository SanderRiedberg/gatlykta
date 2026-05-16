/* global React, window, DISTRICTS */
// Gatlykta — Learn mode. Hover/click to pin streets at your own pace.

(function () {
  const { useState: useS, useMemo: useM, useCallback: useC } = React;
  const {
    streetsForDistricts,
    HudPill,
    LeafletMap,
  } = window;

  function LearnMode({ t, streets, districtIds, focusDistrict, difficulty, mapStyle, lang, onFinish, onQuit }) {
    const active = useM(() => streetsForDistricts(streets, districtIds, difficulty), [streets, districtIds, difficulty]);
    const [hovered, setHovered] = useS(null);
    const [, force] = useS(0);
    const masteryFor = (id) => (window.getMastery ? window.getMastery(id) : { level: 0 });
    const setMastery = useC((id, level) => {
      if (!id) return;
      if (window.markStreetMastery) window.markStreetMastery(id, level);
      force(x => x + 1);
    }, []);
    const states = useM(() => {
      const o = {};
      for (const s of active) {
        const m = masteryFor(s.id);
        if (m.level === 2) o[s.id] = 'solved';
        else if (m.level === 1) o[s.id] = 'hinted';
      }
      return o;
    }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
    const counts = useM(() => {
      let known = 0, learning = 0;
      for (const s of active) {
        const m = masteryFor(s.id);
        if (m.level === 2) known++;
        else if (m.level === 1) learning++;
      }
      return { known, learning };
    }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleClick = useC((street) => {
      const m = masteryFor(street.id);
      // Toggle through 0 → 1 → 2 → 0
      setMastery(street.id, (m.level + 1) % 3);
    }, [setMastery]);
    const hoveredLevel = hovered ? masteryFor(hovered.id).level : 0;

    return (
      <div className="game-page">
        <div className="game-hud">
          <div className="hud-left">
            <button className="btn ghost small" onClick={onQuit}>← {t('app.quit')}</button>
            <div><div className="hud-mode">{t('mode.learn')}</div><div className="hud-area">{districtIds ? districtIds.length : 'alla'} {t('app.districts')}</div></div>
          </div>
          <div className="hud-center hud-progress">
            <HudPill k={t('learn.known_label')} v={`${counts.known}/${active.length}`} />
            {counts.learning > 0 && <HudPill k={t('learn.review_label')} v={counts.learning} />}
          </div>
          <div className="hud-right">
            <button className="btn small" onClick={() => onFinish({ mode: 'learn', total: active.length, correct: counts.known, missed: active.length - counts.known, time: 0, bestStreak: 0, solvedIds: active.filter(s => masteryFor(s.id).level === 2).map(s => s.id), revealedIds: [] })}>{t('app.quit')} →</button>
          </div>
        </div>
        <div className="map-stage">
          <LeafletMap streets={active} activeDistricts={districtIds} focusDistrict={focusDistrict} streetStates={states} onStreetClick={handleClick} onStreetHover={setHovered} hoveredStreet={hovered} showLabels showStreetLabels showSolvedLabels mapStyle={mapStyle} progress={active.length ? counts.known/active.length : 0} />
          <div className="learn-panel">
            <div className="eyebrow">{t('mode.learn')}</div>
            {hovered ? (
              <>
                <div className="name">{hovered.name}</div>
                <div className="meta">{(DISTRICTS.find(d => d.id === hovered.district) || {}).name}</div>
                {window.triviaForStreet && window.triviaForStreet(hovered.name, lang || 'sv') && (
                  <p className="learn-trivia">{window.triviaForStreet(hovered.name, lang || 'sv')}</p>
                )}
                <div className="learn-mastery">
                  <button type="button" className={`btn small ${hoveredLevel === 2 ? '' : 'ghost'}`} onClick={() => setMastery(hovered.id, hoveredLevel === 2 ? 0 : 2)}>✓ {t('learn.mark_known')}</button>
                  <button type="button" className={`btn small ghost ${hoveredLevel === 1 ? 'warn' : ''}`} onClick={() => setMastery(hovered.id, hoveredLevel === 1 ? 0 : 1)}>↻ {t('learn.mark_unknown')}</button>
                </div>
              </>
            ) : (
              <>
                <div className="name" style={{ fontSize: 18 }}>{t('app.tap_street')}</div>
                <div className="help">{t('learn.pin_hint')}</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  window.LearnMode = LearnMode;
})();
