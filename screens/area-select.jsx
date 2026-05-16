/* global React, window, DISTRICTS */
// Gatlykta — area select screen: pick a district (or all) and a difficulty.

(function () {
  const { useState: useS, useMemo: useM } = React;
  const { TopBar, Stars, LeafletMap, bestStars } = window;

  function AreaSelect({ t, modeId, streets, difficulty, onDifficulty, mapStyle, onMapStyle, timeLimit, onTimeLimit, quizRoundSize, onQuizRoundSize, onPick, onPickAll, onBack }) {
    const [focusId, setFocusId] = useS(null); // null = whole city, all districts visible
    const filtered = useM(() => window.filterByDifficulty ? window.filterByDifficulty(streets, difficulty) : streets, [streets, difficulty]);
    const counts = useM(() => {
      const o = {};
      for (const s of filtered) o[s.district] = (o[s.district] || 0) + 1;
      return o;
    }, [filtered]);

    return (
      <div className="page">
        <TopBar t={t} onHome={onBack} right={<button className="btn-link" onClick={onBack}>← {t('app.back')}</button>} />
        <div className="area-page">
          <div className="area-side">
            <div className="eyebrow">{t(`mode.${modeId}`)}</div>
            <h1>{t('area.pick_title')}</h1>
            <p className="lede">{t('area.pick_lede')}</p>

            <button className="area-row" style={{ background: focusId === null ? 'var(--bg-card)' : 'transparent' }}
              onClick={() => setFocusId(null)} onDoubleClick={() => onPickAll && onPickAll()}>
              <span className="idx">★</span>
              <span className="name" style={{ color: focusId === null ? 'var(--accent-deep)' : '' }}>{t('area.all')}</span>
              <span className="meta">{filtered.length} {t('app.streets')}</span>
            </button>

            <div className="area-list">
              {DISTRICTS.map((d, i) => {
                const stars = bestStars(d.id);
                return (
                  <button key={d.id} className={`area-row ${focusId === d.id ? 'active' : ''}`}
                    onClick={() => setFocusId(d.id)} onDoubleClick={() => onPick([d.id], d.id)}>
                    <span className="idx">{(i + 1).toString().padStart(2, '0')}</span>
                    <span className="name">{d.name}</span>
                    <span className="meta">{counts[d.id] || 0} · <Stars count={stars} /></span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{t('diff.label')}</div>
              <div className="diff-row">
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d} className={`diff ${difficulty === d ? 'on' : ''}`} onClick={() => onDifficulty(d)}>
                    <span className="name">{t(`diff.${d}`)}</span>
                    <span className="sub">{t(`diff.${d}_sub`)}</span>
                  </button>
                ))}
              </div>
              {modeId === 'time' && (
                <>
                  <div className="eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>{t('time.duration_label')}</div>
                  <div className="diff-row">
                    {[60, 90, 120, 180].map(v => (
                      <button key={v} className={`diff ${timeLimit === v ? 'on' : ''}`} onClick={() => onTimeLimit && onTimeLimit(v)}>
                        <span className="name">{v}s</span>
                        <span className="sub">{t(`time.duration_${v}`)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {modeId === 'quiz' && (
                <>
                  <div className="eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>{t('quiz.round_label')}</div>
                  <div className="diff-row">
                    {['auto', 'short', 'normal', 'long'].map(v => (
                      <button key={v} className={`diff ${quizRoundSize === v ? 'on' : ''}`} onClick={() => onQuizRoundSize && onQuizRoundSize(v)}>
                        <span className="name">{t(`quiz.round_${v}`)}</span>
                        <span className="sub">{t(`quiz.round_${v}_sub`)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>{t('style.label')}</div>
              <div className="style-row">
                {['sketch', 'lithograph', 'cartoon', 'minimalism', 'popart'].map(s => (
                  <button key={s} className={`style-chip ${mapStyle === s ? 'on' : ''}`} onClick={() => onMapStyle(s)} title={t(`style.${s}_sub`)}>
                    <span className={`style-swatch s-${s}`} aria-hidden></span>
                    <span className="name">{t(`style.${s}`)}</span>
                  </button>
                ))}
              </div>
              <button className="btn" style={{ marginTop: 14 }} onClick={() => focusId ? onPick([focusId], focusId) : onPickAll()}>
                {focusId ? `${t('area.start')} ${DISTRICTS.find(d => d.id === focusId).name}` : t('area.start_all')} →
              </button>
            </div>
          </div>

          <div className="area-preview">
            <header>
              <h2>{focusId ? DISTRICTS.find(d => d.id === focusId).name : t('area.all')}</h2>
              <span className="eyebrow">{focusId ? (counts[focusId] || 0) + ' ' + t('app.streets') : filtered.length + ' ' + t('app.streets')}</span>
            </header>
            <div className="area-thumb">
              <LeafletMap streets={filtered} focusDistrict={focusId} interactive={false} showLabels scratch mapStyle={mapStyle} progress={1} />
            </div>
            <div className="area-actions">
              <span className="eyebrow">{t('area.hint_doubleclick')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.AreaSelect = AreaSelect;
})();
