
(function installHomeAmbience(win, doc) {
  'use strict';
  const home = doc.getElementById('homeScreen');
  const layer = doc.getElementById('homeAmbience');
  if (!home || !layer) return;
  win.DocchiHomeAmbience?.destroy?.();
  const disposers = [];
  let disposed = false, pageActive = true, battery = null, frame = '';
  let reduced = null, slowUpdate = null;
  try {
    reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    slowUpdate = win.matchMedia?.('(update: slow)');
  } catch (_) { /* Unsupported preference queries leave the original art intact. */ }
  const connection = win.navigator?.connection;
  function listen(target, event, callback) {
    if (typeof target?.addEventListener !== 'function') return;
    target.addEventListener(event, callback);
    disposers.push(() => target.removeEventListener?.(event, callback));
  }
  function listenQuery(query) {
    if (typeof query?.addEventListener === 'function') listen(query, 'change', sync);
    else if (typeof query?.addListener === 'function') {
      query.addListener(sync);
      disposers.push(() => query.removeListener?.(sync));
    }
  }
  function blockedReason() {
    const config = win.DOCCHI_HOME_MOTION || {};
    if (!pageActive || doc.hidden === true || home.hidden) return 'hidden';
    // The background stays fixed to its box while absolute children scroll.
    // Use the original still art whenever home content cannot fit in that box.
    if (home.scrollHeight > home.clientHeight || home.scrollWidth > home.clientWidth ||
        (Number.isFinite(home.scrollTop) && home.scrollTop !== 0) ||
        (Number.isFinite(home.scrollLeft) && home.scrollLeft !== 0)) return 'overflow';
    if (reduced?.matches) return 'reduced-motion';
    if (config.enabled === false) return 'disabled';
    // OS low-power mode has no cross-browser API. Hosts can supply this signal.
    if (config.lowPower === true || connection?.saveData || slowUpdate?.matches ||
        (battery && battery.charging === false && battery.level <= .2)) return 'power-saving';
    return '';
  }
  function sync() {
    if (disposed) return;
    let reason = blockedReason();
    if (!reason) {
      const width = home.clientWidth, height = home.clientHeight;
      if (!(width > 0 && height > 0)) reason = 'not-laid-out';
      else {
        // Exactly mirrors background-size:cover and background-position:center.
        const scale = Math.max(width / 1024, height / 1536);
        const artWidth = 1024 * scale, artHeight = 1536 * scale;
        const nextFrame = artWidth + ':' + artHeight;
        if (frame !== nextFrame) {
          layer.style.setProperty('--home-art-width', artWidth + 'px');
          layer.style.setProperty('--home-art-height', artHeight + 'px');
          frame = nextFrame;
        }
      }
    }
    const mode = reason || 'running';
    if (layer.dataset.motion !== mode) layer.dataset.motion = mode;
    layer.hidden = !!reason;
  }
  listen(doc, 'visibilitychange', sync);
  listen(win, 'pagehide', () => { pageActive = false; sync(); });
  listen(win, 'pageshow', () => { pageActive = true; sync(); });
  listen(win, 'resize', sync);
  listen(home, 'scroll', sync);
  listen(win, 'home-motion-change', sync);
  listen(connection, 'change', sync);
  listenQuery(reduced);
  listenQuery(slowUpdate);
  if (typeof win.ResizeObserver === 'function') {
    const resize = new win.ResizeObserver(sync);
    resize.observe(home);
    disposers.push(() => resize.disconnect());
  }
  if (typeof win.MutationObserver === 'function') {
    const navigation = new win.MutationObserver(sync);
    navigation.observe(home, { attributes:true, attributeFilter:['hidden'] });
    disposers.push(() => navigation.disconnect());
  }
  win.DocchiHomeAmbience = {
    sync,
    destroy() {
      disposed = true;
      for (const dispose of disposers) dispose();
      layer.hidden = true;
      layer.dataset.motion = 'disposed';
    }
  };
  sync();
  if (typeof win.navigator?.getBattery === 'function') {
    try {
      Promise.resolve(win.navigator.getBattery()).then(value => {
        if (disposed || !value) return;
        battery = value;
        listen(battery, 'levelchange', sync);
        listen(battery, 'chargingchange', sync);
        sync();
      }, () => { /* Optional battery information must never block the game. */ });
    } catch (_) { /* Unsupported or denied battery information is optional. */ }
  }
})(window, document);
