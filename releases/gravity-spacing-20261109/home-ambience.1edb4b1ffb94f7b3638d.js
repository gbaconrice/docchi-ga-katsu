
(function installHomeGif(win, doc) {
  'use strict';
  const home = doc.getElementById('homeScreen');
  const backdrop = doc.getElementById('app');
  if (!home || !backdrop) return;
  win.DocchiHomeAmbience?.destroy?.();
  const GIF_SOURCE = 'https://gbaconrice.github.io/docchi-ga-katsu/releases/terrain-emote-fix-20261108/images/f194872040aa40216e601203501b678380f3f5fa72fd3f3e58f8f02e8acad084.gif';
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

/* REVIEW CANDIDATE, not production: home-background-20261109. */
(function installHomeReframe(win,doc){
  'use strict';
  // Integration must replace this URL with the reviewed, versioned asset.
  const asset = "https://gbaconrice.github.io/docchi-ga-katsu/releases/gravity-spacing-20261109/images/eaa567bdb27dd4bf612b3a45ba1305363a7391ea1abc4bd413ba68fbe10ba4af.png";
  let installed = false;
  function install(){
    if(installed)return;
    const app=doc.getElementById('app'),home=doc.getElementById('homeScreen'),root=doc.documentElement;
    if(!app||!home)return;
    installed=true;
    win.DocchiHomeReframe?.destroy?.();
    const disposers=[];
    let ready=false,requested=false,disposed=false,frame=0;
    // Generated asset 887x1774. Its original-image seam is y=156.
    const seamShare=156/(1774-887*1.5);
    const image=new win.Image();
    function measure(){
      frame=0;
      if(disposed)return;
      const box=app.getBoundingClientRect(),w=box.width,h=box.height;
      const eligible=!home.hidden&&root.dataset.hostShell==='gravity'&&w>0&&h/w>5/3;
      // Standalone, landscape, compact screens and hidden home never request
      // the extra asset. A failed request stays on the original cover fallback.
      if(eligible&&!requested){requested=true;image.src=asset;}
      const active=ready&&eligible;
      if(!active){app.removeAttribute('data-home-reframe');return;}
      // Match the original 390x650 browser composition (10/9 width).
      // Very tall windows still cover using the extended 1:2 master.
      const artWidth=Math.max(w*10/9,h/2);
      app.style.setProperty('--home-reframe-width',artWidth+'px');
      app.style.setProperty('--home-reframe-original-top',((h-artWidth*1.5)*seamShare)+'px');
      app.style.setProperty('--home-reframe-original-bottom',((h-artWidth*1.5)*seamShare+artWidth*1.5)+'px');
      app.style.setProperty('--home-reframe-extension-top',((h-artWidth*2)*seamShare)+'px');
      app.dataset.homeReframe='true';
    }
    function schedule(){if(!disposed&&!frame)frame=win.requestAnimationFrame(measure);}
    function listen(target,event){target.addEventListener(event,schedule);disposers.push(()=>target.removeEventListener(event,schedule));}
    image.onload=function(){
      if(disposed||!image.naturalWidth||!image.naturalHeight)return;
      app.style.setProperty('--home-extension-image','url("'+asset+'")');
      ready=true;schedule();
    };
    image.onerror=function(){ready=false;schedule();};
    // Keep the existing cover fallback until the added artwork has loaded.
    if(typeof win.ResizeObserver==='function'){
      const observer=new win.ResizeObserver(schedule);observer.observe(app);disposers.push(()=>observer.disconnect());
    }
    if(typeof win.MutationObserver==='function'){
      const observer=new win.MutationObserver(schedule);
      observer.observe(home,{attributes:true,attributeFilter:['hidden']});
      observer.observe(root,{attributes:true,attributeFilter:['data-host-shell']});
      disposers.push(()=>observer.disconnect());
    }
    listen(win,'resize');listen(win,'pageshow');
    win.DocchiHomeReframe={
      destroy(){
        disposed=true;if(frame)win.cancelAnimationFrame(frame);
        disposers.forEach(fn=>fn());image.onload=image.onerror=null;
        image.removeAttribute('src');app.removeAttribute('data-home-reframe');
        for(const key of ['--home-extension-image','--home-reframe-width','--home-reframe-original-top','--home-reframe-original-bottom','--home-reframe-extension-top'])app.style.removeProperty(key);
      }
    };
    schedule();
  }
  install();
  doc.addEventListener('DOMContentLoaded',install,{once:true});
  doc.addEventListener('docchi:entry-ready',install,{once:true});
})(window,document);

