/* global React, window */
// Gatlykta — shared guess popover used by Fill and Time modes.

(function () {
  const { useState: useS } = React;
  const { evaluateGuess, matchesGuess } = window;

  function GuessPop({ t, pos, street, wrongCount, hint, onHint, onCorrect, onWrong, onClose, onReveal, inputRef }) {
    const [val, setVal] = useS('');
    const [shake, setShake] = useS(false);
    const submit = (e) => {
      e && e.preventDefault();
      if (!val.trim()) return;
      const result = evaluateGuess ? evaluateGuess(street, val) : { accepted: matchesGuess(street, val), quality: 'exact' };
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

  window.GuessPop = GuessPop;
})();
