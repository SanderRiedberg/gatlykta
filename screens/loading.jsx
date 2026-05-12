/* global React, window */
// Gatlykta — loading and error screens, shown while OSM data is being fetched
// or when fetching fails.

(function () {
  const { TopBar } = window;

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

  Object.assign(window, { LoadingScreen, ErrorScreen });
})();
