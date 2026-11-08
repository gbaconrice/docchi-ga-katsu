(function installHomeGif(win, doc) {
  'use strict';
  const home = doc.getElementById('homeScreen');
  const backdrop = doc.getElementById('app');
  if (!home || !backdrop) return;
  win.DocchiHomeAmbience?.destroy?.();
  const GIF_SOURCE = '__HOME_GIF_SOURCE__';
  const disposers = [];
  let disposed = false, pageActive = true, battery = null;
  let pendingImage = null, sequence = 0, failed = false;
  let reduced = null, slowUpdate = null;
  try {
    reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    slowUpdate = win.matchMedia?.('(update: slow)');
  } catch (_) { /* Preferences are optional; the static background is always available. */ }
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
  function reason() {
    const config = win.DOCCHI_HOME_MOTION || {};
    if (!pageActive || doc.hidden === true || home.hidden) return 'hidden';
    if (reduced?.matches) return 'reduced-motion';
    if (config.enabled === false) return 'disabled';
    // Safari/iOS does not expose its OS low-power setting. Hosts may supply it.
    if (config.lowPower === true || connection?.saveData || slowUpdate?.matches ||
        (battery && battery.charging === false && battery.level <= .2)) return 'power-saving';
    return '';
  }
  function releaseImage() {
    if (!pendingImage) return;
    pendingImage.onload = pendingImage.onerror = null;
    pendingImage.removeAttribute?.('src');
    pendingImage = null;
  }
  function stop(state) {
    sequence++;
    releaseImage();
    backdrop.style.removeProperty('--home-gif-image');
    backdrop.dataset.homeGif = state;
  }
  function sync() {
    if (disposed) return;
    const blocked = reason();
    if (blocked) { stop(blocked); return; }
    if (failed) { stop('load-failed'); return; }
    if (pendingImage || backdrop.dataset.homeGif === 'running') return;
    if (typeof win.Image !== 'function') { stop('unsupported'); return; }
    const token = ++sequence;
    const image = new win.Image();
    pendingImage = image;
    backdrop.dataset.homeGif = 'loading';
    image.onload = function () {
      if (disposed || token !== sequence || reason()) return;
      if (!(image.naturalWidth > 0 && image.naturalHeight > 0)) { image.onerror(); return; }
      // Only replace the still after the GIF has decoded its first frame.
      backdrop.style.setProperty('--home-gif-image', 'url("' + GIF_SOURCE + '")');
      backdrop.dataset.homeGif = 'running';
      releaseImage();
    };
    image.onerror = function () {
      if (disposed || token !== sequence) return;
      failed = true;
      stop('load-failed');
    };
    image.src = GIF_SOURCE;
  }
  listen(doc, 'visibilitychange', sync);
  listen(win, 'pagehide', () => { pageActive = false; sync(); });
  listen(win, 'pageshow', () => { pageActive = true; sync(); });
  listen(win, 'home-motion-change', sync);
  listen(connection, 'change', sync);
  listenQuery(reduced);
  listenQuery(slowUpdate);
  if (typeof win.MutationObserver === 'function') {
    const navigation = new win.MutationObserver(sync);
    navigation.observe(home, { attributes:true, attributeFilter:['hidden'] });
    disposers.push(() => navigation.disconnect());
  }
  win.DocchiHomeAmbience = {
    sync,
    retry() { if (disposed) return; failed = false; stop('retry'); sync(); },
    destroy() {
      disposed = true;
      for (const dispose of disposers) dispose();
      stop('disposed');
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
      }, () => {});
    } catch (_) { /* Optional battery information cannot block the game. */ }
  }
})(window, document);
