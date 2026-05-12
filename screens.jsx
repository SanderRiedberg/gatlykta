/* global React, window, DISTRICTS, LeafletMap */
const { useState: useSc, useEffect: useEc, useRef: useRc, useMemo: useMc } = React;

// ─────────────── Mode menu ───────────────
function ModeMenu({ t, onPickMode, lang, onLangChange, theme, onThemeChange }) {
  const modes = [
    { id: 'fill', key: 'mode.fill', desc: 'mode.fill_desc' },
    { id: 'quiz', key: 'mode.quiz', desc: 'mode.quiz_desc' },
    { id: 'time', key: 'mode.time', desc: 'mode.time_desc' },
    { id: 'learn',key: 'mode.learn',desc: 'mode.learn_desc' },
  ];
  return (
    <div className="page">
      <TopBar t={t} onHome={() => {}} right={
        <span>
          <button className="btn-link" onClick={() => onLangChange(lang === 'sv' ? 'en' : 'sv')}>{lang === 'sv' ? 'EN' : 'SV'}</button>
          {' · '}
          <button className="btn-link" onClick={() => onThemeChange(theme === 'dark' ? 'paper' : 'dark')}>{theme === 'dark' ? '☼' : '☾'}</button>
        </span>
      } />
      <div className="menu-page">
        <div className="menu-hero">
          <div className="eyebrow">{t('app.tagline')}</div>
          <h1 className="display">{t('app.title')} <em>{t('app.title_emph')}</em></h1>
          <p className="lede">{t('app.description')}</p>
          <div className="meta">
            <div><b>{DISTRICTS.length}</b> {t('app.districts')}</div>
            <div><b>OSM</b> kartdata</div>
            <div><b>4</b> {t('app.modes')}</div>
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t('app.pick_mode')}</div>
          <div className="mode-grid">
            {modes.map((m, i) => (
              <button key={m.id} className="mode-card" onClick={() => onPickMode(m.id)}>
                <span className="num">0{i+1}</span>
                <span className="name">{t(m.key)}</span>
                <span className="desc">{t(m.desc)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Area select ───────────────
function AreaSelect({ t, modeId, streets, difficulty, onDifficulty, mapStyle, onMapStyle, onPick, onPickAll, onBack }) {
  const [focusId, setFocusId] = useSc(null); // null = whole city, all districts visible
  const filtered = useMc(() => window.filterByDifficulty ? window.filterByDifficulty(streets, difficulty) : streets, [streets, difficulty]);
  const counts = useMc(() => {
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
                  <span className="idx">{(i+1).toString().padStart(2, '0')}</span>
                  <span className="name">{d.name}</span>
                  <span className="meta">{counts[d.id] || 0} · <Stars count={stars} /></span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t('diff.label')}</div>
            <div className="diff-row">
              {['easy','medium','hard'].map(d => (
                <button key={d} className={`diff ${difficulty === d ? 'on' : ''}`} onClick={() => onDifficulty(d)}>
                  <span className="name">{t(`diff.${d}`)}</span>
                  <span className="sub">{t(`diff.${d}_sub`)}</span>
                </button>
              ))}
            </div>
            <div className="eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>{t('style.label')}</div>
            <div className="style-row">
              {['sketch','lithograph','cartoon','minimalism','popart'].map(s => (
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

// ─────────────── Results ───────────────
function Results({ t, result, districtIds, streets, difficulty, mapStyle, onPlayAgain, onPickArea, onHome }) {
  const stars = useMc(() => calculateStars({ correct: result.correct, total: result.total, timeSec: result.time, mode: result.mode }), [result]);
  const allStreetsActive = useMc(() => {
    const set = districtIds ? new Set(districtIds) : null;
    const inDist = streets.filter(s => !set || set.has(s.district));
    return window.filterByDifficulty ? window.filterByDifficulty(inDist, difficulty) : inDist;
  }, [streets, districtIds, difficulty]);
  const states = useMc(() => {
    const o = {}; (result.solvedIds || []).forEach(id => o[id] = 'solved'); (result.revealedIds || []).forEach(id => { if (!o[id]) o[id] = 'hinted'; }); return o;
  }, [result]);

  useEc(() => { if (districtIds) districtIds.forEach(id => recordResult(id, result.mode, stars)); }, []);

  return (
    <div className="page">
      <TopBar t={t} onHome={onHome} right={<button className="btn-link" onClick={onHome}>{t('results.home')}</button>} />
      <div className="results-page">
        <div className="results-left">
          <div className="eyebrow">{t(`mode.${result.mode}`)}</div>
          <h1>{stars >= 3 ? <em>{t('results.amazing')}</em> : stars >= 2 ? t('results.well_done') : stars >= 1 ? t('results.not_bad') : t('results.keep_trying')}</h1>
          <div className="results-stars"><Stars count={stars} big /></div>
          <div className="results-summary">
            <div className="stat"><div className="k">{t('results.correct')}</div><div className="v">{result.correct} <span className="unit">/ {result.total}</span></div></div>
            {result.points != null && <div className="stat"><div className="k">{t('hud.points')}</div><div className="v">{result.points}</div></div>}
            <div className="stat"><div className="k">{t('results.time')}</div><div className="v">{formatTime(result.time)}</div></div>
            <div className="stat"><div className="k">{t('results.streak')}</div><div className="v">{result.bestStreak || 0}</div></div>
          </div>
          <div className="eyebrow">{t('results.solved')}</div>
          <div className="results-streets">
            {allStreetsActive.map(s => {
              const ok = (result.solvedIds || []).includes(s.id);
              return <span key={s.id} className={`chip ${ok ? 'ok' : 'miss'}`}>{s.name}</span>;
            })}
          </div>
          <div className="actions-row" style={{ marginTop: 28 }}>
            <button className="btn" onClick={onPlayAgain}>↻ {t('results.again')}</button>
            <button className="btn ghost" onClick={onPickArea}>{t('results.pick_area')}</button>
          </div>
        </div>
        <div className="results-right">
          <div className="map-preview">
            <LeafletMap streets={streets} activeDistricts={districtIds} focusDistrict={districtIds && districtIds.length === 1 ? districtIds[0] : null} streetStates={states} interactive={false} showLabels showSolvedLabels scratch mapStyle={mapStyle} progress={1} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Loading screen ───────────────
function LoadingScreen({ t, stage }) {
  return (
    <div className="page">
      <TopBar t={t} onHome={() => {}} />
      <div className="loading-screen">
        <div className="loading-card">
          <div className="spinner"></div>
          <h2>{t('app.loading_title')}</h2>
          <p>{stage === 'fetching' ? t('app.loading_fetch') : stage === 'processing' ? t('app.loading_processing') : stage === 'fallback' ? t('app.loading_fallback') : t('app.loading_init')}</p>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ t, error, onRetry }) {
  return (
    <div className="page">
      <TopBar t={t} onHome={() => {}} />
      <div className="loading-screen">
        <div className="loading-card">
          <h2>{t('app.error_title')}</h2>
          <p>{t('app.error_msg')}</p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>{String(error && error.message || error)}</p>
          <button className="btn" style={{ marginTop: 18 }} onClick={onRetry}>↻ {t('app.retry')}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModeMenu, AreaSelect, Results, LoadingScreen, ErrorScreen });
