/* global React, window, DISTRICTS */
// Gatlykta — landing screen: pick a game mode.

(function () {
  const { TopBar } = window;

  function ModeMenu({ t, onPickMode, lang, onLangChange, theme, onThemeChange }) {
    const modes = [
      { id: 'fill', key: 'mode.fill', desc: 'mode.fill_desc' },
      { id: 'quiz', key: 'mode.quiz', desc: 'mode.quiz_desc' },
      { id: 'time', key: 'mode.time', desc: 'mode.time_desc' },
      { id: 'learn', key: 'mode.learn', desc: 'mode.learn_desc' },
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
                  <span className="num">0{i + 1}</span>
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

  window.ModeMenu = ModeMenu;
})();
