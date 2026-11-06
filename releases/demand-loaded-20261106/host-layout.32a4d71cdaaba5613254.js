
(function(){
  var root=document&&document.documentElement;
  if(!root)return;
  // Only the GRAVITY entry or an explicit host signal enables the native band.
  // An SDK script can also be loaded in a normal browser, so its presence is not a signal.
  var entryGravity=root.dataset.hostShell==='gravity',lastWidth=window.innerWidth;
  // Number Bluff's current app fallback, not a measured or universal SDK size.
  function defaultTop(){return Number.isFinite(window.innerHeight)&&window.innerHeight>=812?98:74;}
  var fallbackTop=defaultTop();
  function inset(value){if(value===undefined||value===null||value==='')return null;var n=Number(value);return Number.isFinite(n)&&n>=0&&n<=220?Math.round(n):null;}
  function update(){
    var config=window.DOCCHI_HOST_LAYOUT||{},query;
    try{query=new URLSearchParams(location.search)}catch(_){query=null;}
    var gravity=config.shell==='standalone'?false:config.shell==='gravity'||entryGravity||window.isGravity===true||query?.get('hostShell')==='gravity'||query?.get('isGravity')==='1';
    root.dataset.hostShell=gravity?'gravity':'standalone';
    var alreadyInset=gravity&&config.viewportAlreadyInset===true;
    root.dataset.hostViewportInset=alreadyInset?'true':'false';
    if(!gravity){root.style.removeProperty?.('--gravity-top-inset');root.style.removeProperty?.('--gravity-bottom-inset');return;}
    if(alreadyInset){root.style.setProperty('--gravity-top-inset','0px');root.style.setProperty('--gravity-bottom-inset','0px');return;}
    var active=document.activeElement,widthChanged=window.innerWidth!==lastWidth;lastWidth=window.innerWidth;
    // Preserve the native exclusion while room-code entry shrinks the viewport.
    if(widthChanged||!active||(!/^(INPUT|TEXTAREA)$/.test(active.tagName)&&!active.isContentEditable))fallbackTop=defaultTop();
    var profile=config.profile||query?.get('gravityProfile');
    var profilePx=profile==='legacy-74'?74:(profile==='legacy-98'?98:null);
    root.style.setProperty('--gravity-top-inset',(inset(config.topInsetPx)??profilePx??fallbackTop)+'px');
    root.style.setProperty('--gravity-bottom-inset',(inset(config.bottomInsetPx)??0)+'px');
  }
  update();
  window.addEventListener?.('resize',update);
  window.addEventListener?.('pageshow',update);
  window.addEventListener?.('load',update);
  document.addEventListener?.('focusout',update);
}());
