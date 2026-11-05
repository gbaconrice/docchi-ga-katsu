
(function(){
  var root=document&&document.documentElement;
  if(!root)return; // Unit-test and server-side shells may not provide a live DOM.
  var config=window.DOCCHI_HOST_LAYOUT||{}, query;
  try{query=new URLSearchParams(location.search)}catch(_){query=null}
  var gravity=config.shell==='gravity'||window.isGravity===true||query?.get('hostShell')==='gravity';
  root.dataset.hostShell=gravity?'gravity':'standalone';
  if(!gravity)return;
  if(config.viewportAlreadyInset===true){
    root.style.setProperty('--gravity-top-inset','0px');
    root.style.setProperty('--gravity-bottom-inset','0px');
    return;
  }
  var queryProfile=query&&query.get('gravityProfile');
  var profile=config.profile||queryProfile;
  var profilePx=profile==='legacy-74'?74:(profile==='legacy-98'?98:null);
  var topPx=Number(config.topInsetPx);
  var bottomPx=Number(config.bottomInsetPx);
  if(Number.isFinite(topPx)&&config.topInsetPx!==undefined&&topPx>=0&&topPx<=220)root.style.setProperty('--gravity-top-inset',Math.round(topPx)+'px');
  else if(profilePx!==null)root.style.setProperty('--gravity-top-inset',profilePx+'px');
  if(Number.isFinite(bottomPx)&&config.bottomInsetPx!==undefined&&bottomPx>=0&&bottomPx<=220)root.style.setProperty('--gravity-bottom-inset',Math.round(bottomPx)+'px');
}());
