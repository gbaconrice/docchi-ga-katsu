
// Only room-code text entry follows VisualViewport. Never blur the input or
// infer an unreported keyboard height from the host window.
(function(){
  if(!document||!document.documentElement||!document.addEventListener||!window.addEventListener)return;
  var root=document.documentElement,vv=window.visualViewport;
  function isTextEntry(){
    var active=document.activeElement;
    return !!active&&active.matches&&active.matches('input:not([type="button"]):not([type="submit"]):not([type="reset"]),textarea,[contenteditable="true"]');
  }
  function sync(){
    if(isTextEntry()){
      if(vv&&Number.isFinite(vv.height)&&vv.height>0)root.style.setProperty('--app-viewport-height',Math.round(vv.height)+'px');
    }else{
      root.style.removeProperty('--app-viewport-height');
    }
  }
  window.addEventListener('resize',sync,{passive:true});
  if(vv)vv.addEventListener('resize',sync,{passive:true});
  document.addEventListener('focusin',sync);
  document.addEventListener('focusout',function(){requestAnimationFrame(sync);});
}());
