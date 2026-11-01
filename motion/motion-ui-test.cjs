'use strict';
const assert = require('node:assert/strict');
const createBattleMotion = require('./motion-ui.js');

class FakeAnimation {
  constructor(element, frames, options) {
    this.element = element; this.frames = frames; this.options = options;
    this.effect = { pseudoElement: element.pseudoSupport ? (options.pseudoElement || null) : null };
    this.cancelled = false; this.onfinish = null; this.oncancel = null;
  }
  cancel() { if (this.cancelled) return; this.cancelled = true; if (this.oncancel) this.oncancel(); }
  finish() { if (this.onfinish) this.onfinish(); }
}
class FakeElement {
  constructor(id, { hidden = false, pressed = false, animate = true, pseudoSupport = true } = {}) {
    this.id = id; this.hidden = hidden; this.textContent = 'untouched'; this.attrs = new Map([['aria-pressed', String(pressed)]]);
    this.pseudoSupport = pseudoSupport; this.animations = [];
    if (animate) this.animate = (frames, options) => {
      const animation = new FakeAnimation(this, frames, options || {}); this.animations.push(animation); return animation;
    };
  }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
}
function makeHarness({ animate = true, reduced = false, pseudoSupport = true } = {}) {
  const els = {
    '#comparison': new FakeElement('comparison'),
    '#red': new FakeElement('red', { animate, pseudoSupport }),
    '#blue': new FakeElement('blue', { animate, pseudoSupport }),
    '#field': new FakeElement('field', { animate }),
    '#resultPanel': new FakeElement('resultPanel'),
    '#message': new FakeElement('message', { animate }),
    '#breakdown': new FakeElement('breakdown', { animate })
  };
  const listeners = new Map();
  const mediaListeners = new Set();
  const media = {
    matches: reduced,
    addEventListener(type, fn) { if (type === 'change') mediaListeners.add(fn); },
    removeEventListener(type, fn) { if (type === 'change') mediaListeners.delete(fn); },
    set(value) { this.matches = value; mediaListeners.forEach(fn => fn({ matches: value })); }
  };
  const win = { matchMedia: () => media };
  const doc = {
    defaultView: win, hidden: false,
    querySelector(selector) { return els[selector] || null; },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    fire(type) { const fn = listeners.get(type); if (fn) fn(); }
  };
  return { els, media, doc, create: () => createBattleMotion({ document: doc }) };
}

(function testBasicSequenceAndDedupe() {
  const h = makeHarness(); const m = h.create(); const e = h.els;
  m.enterPrediction('session:1');
  assert.equal(e['#red'].animations.length, 1);
  assert.equal(e['#blue'].animations.length, 1);
  assert.equal(e['#red'].animations[0].options.duration, 170);
  assert.equal(e['#blue'].animations[0].options.delay, 50);
  m.enterPrediction('session:1');
  assert.equal(e['#red'].animations.length, 1, 'same prediction key is deduped');

  e['#red'].setAttribute('aria-pressed', 'true');
  m.selectSide('red');
  assert.equal(e['#red'].animations.length, 2);
  assert.equal(e['#red'].animations[1].options.duration, 120);
  assert.equal(e['#red'].animations[1].options.pseudoElement, '::after');
  m.selectSide('A');
  assert.equal(e['#red'].animations.length, 2, 'same side selection is deduped');

  e['#red'].setAttribute('aria-pressed', 'false');
  e['#blue'].setAttribute('aria-pressed', 'true');
  m.selectSide(1);
  assert.equal(e['#blue'].animations.at(-1).options.duration, 120);

  m.startBattle('session:1');
  assert.equal(e['#field'].animations.length, 1);
  assert.equal(e['#field'].animations[0].options.duration, 160);
  m.startBattle('session:1');
  assert.equal(e['#field'].animations.length, 1, 'same battle key is deduped');

  e['#resultPanel'].hidden = false;
  const exactRenderedBreakdown = e['#breakdown'].textContent;
  m.showResult('session:1', { delta: 10 });
  assert.equal(e['#breakdown'].textContent, exactRenderedBreakdown, 'result motion never rewrites displayed accounting');
  assert.equal(e['#message'].animations.length, 1);
  assert.equal(e['#message'].animations[0].options.duration, 170);
  assert.equal(e['#breakdown'].animations[0].options.duration, 150);
  m.showResult('session:1', { delta: 10 });
  assert.equal(e['#message'].animations.length, 1, 'same result key is deduped');
  m.destroy();
  console.log('ok - sequence, durations, and dedupe');
})();

(function testPseudoFallbackAndCancel() {
  const h = makeHarness({ pseudoSupport: false }); const m = h.create(); const e = h.els;
  e['#red'].setAttribute('aria-pressed', 'true');
  m.selectSide('red');
  assert.equal(e['#red'].animations.length, 2, 'unsupported pseudo animation falls back to card pop');
  assert.equal(e['#red'].animations[0].cancelled, true);
  assert.equal(e['#red'].animations[1].options.pseudoElement, undefined);
  m.enterPrediction('s:2');
  m.startBattle('s:2');
  const before = [...e['#red'].animations, ...e['#blue'].animations, ...e['#field'].animations].filter(a => !a.cancelled).length;
  m.cancel();
  const after = [...e['#red'].animations, ...e['#blue'].animations, ...e['#field'].animations].filter(a => !a.cancelled).length;
  assert.equal(after, 0, 'cancel stops active visual transitions');
  assert.ok(before > 0);
  m.destroy();
  console.log('ok - pseudo fallback and cancel');
})();

(function testReducedMotionAndHiddenTab() {
  const h = makeHarness(); const m = h.create(); const e = h.els;
  h.media.set(true);
  m.enterPrediction('s:1'); m.startBattle('s:1');
  assert.equal(e['#red'].animations.length, 0, 'reduced motion is static');
  h.media.set(false);
  m.startBattle('s:2');
  assert.equal(e['#field'].animations.length, 1);
  h.doc.hidden = true; h.doc.fire('visibilitychange');
  assert.equal(e['#field'].animations[0].cancelled, true, 'hidden tab cancels active animation');
  h.doc.hidden = false; h.doc.fire('visibilitychange');
  m.startBattle('s:2');
  assert.equal(e['#field'].animations.length, 1, 'same event key does not replay after hide');
  m.destroy();
  console.log('ok - reduced motion and tab visibility');
})();

(function testNoWAAPIFallback() {
  const h = makeHarness({ animate: false }); const m = h.create(); const e = h.els;
  e['#red'].setAttribute('aria-pressed', 'true');
  assert.doesNotThrow(() => {
    m.enterPrediction('s:1'); m.selectSide('red'); m.startBattle('s:1');
    e['#resultPanel'].hidden = false; m.showResult('s:1', { delta: 0 }); m.cancel(); m.destroy();
  });
  assert.equal(e['#red'].animations.length, 0);
  assert.equal(e['#field'].animations.length, 0);
  console.log('ok - WAAPI unsupported fallback');
})();
