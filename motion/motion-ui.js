/* Zero-dependency, presentation-only WAAPI cues for gravity_v9_candidate.
 * Load after the existing UI/controller scripts and call createBattleMotion(...).
 * No game state, RNG, physics, clock, wallet, or ledger reads/writes.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else if (root) root.createBattleMotion = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBattleMotion(options) {
  'use strict';
  options = options || {};
  var doc = options.document || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.querySelector !== 'function') return inertAPI();
  var win = doc.defaultView || options.window || (typeof window !== 'undefined' ? window : null);
  if (!win) return inertAPI();

  function inertAPI() { return Object.freeze({ enterPrediction: noop, selectSide: noop, startBattle: noop, showResult: noop, cancel: noop, destroy: noop }); }
  function noop() {}
  var dead = false;
  var running = new Map();
  var lastPredictionKey = null;
  var lastBattleKey = null;
  var lastResultKey = null;
  var lastSide = null;
  var listeners = [];
  var reducedQuery = null;
  var reduced = false;
  var mm = options.matchMedia || win.matchMedia;
  try {
    if (typeof mm === 'function') reducedQuery = mm.call(win, '(prefers-reduced-motion: reduce)');
    else if (mm && typeof mm === 'object') reducedQuery = mm;
    reduced = !!(reducedQuery && reducedQuery.matches);
  } catch (_) { reducedQuery = null; }

  function byId(id) { return doc.querySelector(id); }
  var comparison = byId('#comparison');
  var red = byId('#red');
  var blue = byId('#blue');
  var field = byId('#field');
  var resultPanel = byId('#resultPanel');
  var message = byId('#message');
  var breakdown = byId('#breakdown');
  function key(value) { return value == null ? '' : String(value); }
  function canAnimate(element) {
    return !dead && !reduced && doc.hidden !== true && !!element && typeof element.animate === 'function';
  }
  function cancelSlot(slot) {
    var animation = running.get(slot);
    if (!animation) return;
    running.delete(slot);
    try { animation.onfinish = null; animation.oncancel = null; animation.cancel(); } catch (_) {}
  }
  function cancelRunning() { Array.from(running.keys()).forEach(cancelSlot); }
  function play(slot, element, frames, timing, pseudoElement) {
    cancelSlot(slot);
    if (!canAnimate(element)) return null;
    var settings = Object.assign({ fill: 'both' }, timing || {});
    if (pseudoElement) settings.pseudoElement = pseudoElement;
    var animation;
    try { animation = element.animate(frames, settings); } catch (_) { return null; }
    if (!animation) return null;
    running.set(slot, animation);
    function finish() {
      if (running.get(slot) !== animation) return;
      running.delete(slot);
      try { animation.onfinish = null; animation.oncancel = null; animation.cancel(); } catch (_) {}
    }
    animation.onfinish = finish;
    animation.oncancel = function () { if (running.get(slot) === animation) running.delete(slot); };
    return animation;
  }
  function normalizeSide(side) {
    if (side === 0 || side === '0' || side === 'A' || side === 'red' || side === 'left') return 'red';
    if (side === 1 || side === '1' || side === 'B' || side === 'blue' || side === 'right') return 'blue';
    return null;
  }
  function enterPrediction(roundKey) {
    roundKey = key(roundKey);
    if (!roundKey || roundKey === lastPredictionKey) return;
    lastPredictionKey = roundKey;
    lastSide = null;
    cancelRunning();
    if (!comparison || comparison.hidden || !canAnimate(red) || !canAnimate(blue)) return;
    [red, blue].forEach(function (card, index) {
      play('prediction-card-' + index, card,
        [
          { opacity: 0.72, transform: 'translateY(7px)' },
          { opacity: 1, transform: 'translateY(0px)' }
        ], { duration: 170, delay: index * 50, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
  }
  function selectSide(side) {
    side = normalizeSide(side);
    if (!side || side === lastSide) return;
    var card = side === 'red' ? red : blue;
    if (!card || !card.getAttribute || card.getAttribute('aria-pressed') !== 'true') return;
    lastSide = side;
    var frames = [
      { opacity: 0.55, transform: 'scale(.58)' },
      { opacity: 1, transform: 'scale(1.12)', offset: 0.7 },
      { opacity: 1, transform: 'scale(1)' }
    ];
    // WAAPI pseudo-element support lets the existing CSS checkmark pop without moving the card.
    var check = play('selection-check', card, frames,
      { duration: 120, easing: 'cubic-bezier(.2,.8,.2,1)' }, '::after');
    var pseudoWorks = false;
    try { pseudoWorks = !!(check && check.effect && check.effect.pseudoElement === '::after'); } catch (_) {}
    if (!pseudoWorks) {
      if (check) cancelSlot('selection-check');
      play('selection-check', card,
        [
          { opacity: 0.82 },
          { opacity: 1 }
        ], { duration: 120, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }
  function startBattle(roundKey) {
    roundKey = key(roundKey);
    if (!roundKey || roundKey === lastBattleKey) return;
    lastBattleKey = roundKey;
    if (!field || field.hidden || !canAnimate(field)) return;
    play('battle-start', field,
      [
        { opacity: 0.74, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0px)' }
      ], { duration: 160, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  function showResult(roundKey, detail) {
    roundKey = key(roundKey);
    if (!roundKey || roundKey === lastResultKey) return;
    lastResultKey = roundKey;
    if (!resultPanel || resultPanel.hidden || !message || !canAnimate(message)) return;
    // `detail.delta` intentionally does not change text. The ledger and rendered accounting stay authoritative.
    void (detail && detail.delta);
    play('result-stamp', message,
      [
        { opacity: 0.75, transform: 'translateY(5px) rotate(-2deg) scale(.94)' },
        { opacity: 1, transform: 'translateY(-1px) rotate(1deg) scale(1.035)', offset: 0.72 },
        { opacity: 1, transform: 'translateY(0px) rotate(0deg) scale(1)' }
      ], { duration: 170, easing: 'cubic-bezier(.2,.8,.2,1)' });
    // A quiet accompanying reveal, not an amount counter or additional label.
    if (breakdown && typeof breakdown.animate === 'function') {
      play('result-breakdown', breakdown,
        [{ opacity: 0.82, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0px)' }],
        { duration: 150, delay: 35, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  }
  function cancel() { cancelRunning(); }
  function destroy() {
    if (dead) return;
    cancel(); dead = true;
    listeners.splice(0).forEach(function (remove) { try { remove(); } catch (_) {} });
  }
  function onHidden() { if (doc.hidden === true) cancel(); }
  function onReduced(event) { reduced = !!(event && event.matches); if (reduced) cancel(); }
  try {
    if (doc.addEventListener) {
      doc.addEventListener('visibilitychange', onHidden);
      listeners.push(function () { doc.removeEventListener('visibilitychange', onHidden); });
    }
  } catch (_) {}
  try {
    if (reducedQuery && reducedQuery.addEventListener) {
      reducedQuery.addEventListener('change', onReduced);
      listeners.push(function () { reducedQuery.removeEventListener('change', onReduced); });
    } else if (reducedQuery && reducedQuery.addListener) {
      reducedQuery.addListener(onReduced);
      listeners.push(function () { reducedQuery.removeListener(onReduced); });
    }
  } catch (_) {}

  return Object.freeze({
    enterPrediction: enterPrediction,
    selectSide: selectSide,
    startBattle: startBattle,
    showResult: showResult,
    cancel: cancel,
    destroy: destroy
  });
});
