/* global React, ReactDOM, window, ensureStreets, makeT, DISTRICTS */
const { useState: useSa, useEffect: useEa, useMemo: useMa, useCallback: useCa, useRef: useRa } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "paper",
  "lang": "sv",
  "showDistrictLabels": true,
  "scratch": true,
  "difficulty": "easy",
  "mapStyle": "sketch"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks ? useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];
  const t = useMa(() => makeT(tweaks.lang || 'sv'), [tweaks.lang]);

  // Apply theme
  useEa(() => { document.documentElement.setAttribute('data-theme', tweaks.theme || 'paper'); }, [tweaks.theme]);

  // Streets state
  const [streets, setStreets] = useSa(null);
  const [loadStage, setLoadStage] = useSa('init');
  const [loadError, setLoadError] = useSa(null);

  const doLoad = useCa(() => {
    setLoadError(null); setLoadStage('init');
    ensureStreets((p) => setLoadStage(p.stage)).then((data) => {
      setStreets(data); setLoadStage('done');
    }).catch((err) => { setLoadError(err); });
  }, []);
  useEa(() => { doLoad(); }, [doLoad]);

  // Navigation state
  const [view, setView] = useSa({ name: 'menu' });

  const goMenu = () => setView({ name: 'menu' });
  const pickMode = (modeId) => setView({ name: 'area', modeId });
  const pickArea = (districtIds, focusDistrict) => setView({ name: 'play', modeId: view.modeId, districtIds, focusDistrict });
  const pickAll = () => setView({ name: 'play', modeId: view.modeId, districtIds: null, focusDistrict: null });
  const finish = (result) => setView(v => ({ name: 'results', result, modeId: v.modeId, districtIds: v.districtIds, focusDistrict: v.focusDistrict }));
  const playAgain = () => setView(v => ({ name: 'play', modeId: v.modeId, districtIds: v.districtIds, focusDistrict: v.focusDistrict }));
  const pickAreaAgain = () => setView(v => ({ name: 'area', modeId: v.modeId }));

  if (loadError) return <ErrorScreen t={t} error={loadError} onRetry={doLoad} />;
  if (!streets) return <LoadingScreen t={t} stage={loadStage} />;

  if (view.name === 'menu') {
    return <ModeMenu t={t} onPickMode={pickMode}
      lang={tweaks.lang || 'sv'} onLangChange={(l) => setTweak('lang', l)}
      theme={tweaks.theme || 'paper'} onThemeChange={(th) => setTweak('theme', th)} />;
  }
  if (view.name === 'area') {
    return <AreaSelect t={t} modeId={view.modeId} streets={streets}
      difficulty={tweaks.difficulty || 'easy'}
      onDifficulty={(d) => setTweak('difficulty', d)}
      mapStyle={tweaks.mapStyle || 'sketch'}
      onMapStyle={(s) => setTweak('mapStyle', s)}
      onPick={pickArea} onPickAll={pickAll} onBack={goMenu} />;
  }
  if (view.name === 'play') {
    const Mode = { fill: FillMode, quiz: QuizMode, time: TimeMode, learn: LearnMode }[view.modeId];
    return <Mode t={t} streets={streets} districtIds={view.districtIds} focusDistrict={view.focusDistrict}
      difficulty={tweaks.difficulty || 'easy'} mapStyle={tweaks.mapStyle || 'sketch'}
      onFinish={finish} onQuit={pickAreaAgain} />;
  }
  if (view.name === 'results') {
    return <Results t={t} result={view.result} districtIds={view.districtIds} streets={streets}
      difficulty={tweaks.difficulty || 'easy'} mapStyle={tweaks.mapStyle || 'sketch'}
      onPlayAgain={playAgain} onPickArea={pickAreaAgain} onHome={goMenu} />;
  }
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
