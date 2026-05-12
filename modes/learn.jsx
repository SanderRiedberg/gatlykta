/* global React, window, DISTRICTS */
// Gatlykta — Learn mode. Hover/click to pin streets at your own pace.

(function () {
  const { useState: useS, useMemo: useM, useCallback: useC } = React;
  const {
    streetsForDistricts,
    HudPill,
    LeafletMap,
  } = window;

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

  window.LearnMode = LearnMode;
})();
