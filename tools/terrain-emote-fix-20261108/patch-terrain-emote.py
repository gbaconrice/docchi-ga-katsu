"""Fix terrain clipping and portrait-emote backing, retaining result clearance.

Idempotent, presentation-only patch. All original scripts remain byte-identical
except the exact appended layout observer (and the release's separately sealed
CONTENT_REVISION). Gameplay, protocol, assets and Gravity safe-area rules stay.
"""

MARKER = "terrain-emote-surface-20261108"
LAYOUT_MARKER = "terrain-result-clearance-20261108"
CSS = r"""
/* terrain-emote-surface-20261108 */
/* Show the complete terrain effect at the existing size. Let only the current
   header row grow when narrow screens need more than one line. */
#app #gameScreen > #gameTopline.game-topline {
  grid-template-rows:minmax(44px,auto);
}
#app #gameScreen > #gameTopline #fieldStatus {
  width:100%; height:auto; max-height:none;
  white-space:normal; overflow-wrap:anywhere; overflow:visible;
  touch-action:auto;
}
/* The native emoji is the badge. Its old cream disc peeks out above/left of
   the glyph. Preserve the existing 18px box, font and portrait placement. */
#app #gameScreen #gameToolbar .participant-emote {
  background:none; border:0;
}
/* Keep the existing cap and internal scrolling, but reserve the real upper
   stack when the fully visible terrain label makes the header taller. */
#app #gameScreen[data-personal-result="true"] #resultPanel,
#app #gameScreen[data-personal-result="true"][data-reaction-strip="solo"] #resultPanel,
#app #gameScreen[data-personal-result="true"][data-participants="true"] #resultPanel {
  max-height:min(68%,calc(100% - var(--result-upper-clearance,126px)));
}
"""
LAYOUT = r"""
// terrain-result-clearance-20261108: DOM layout only; never a gameplay tick.
(function(){
  const screen=document.querySelector('#gameScreen'),header=document.querySelector('#gameTopline'),toolbar=document.querySelector('#gameToolbar');
  if(!screen||!header||!toolbar||typeof screen.style?.setProperty!=='function')return;
  const frame=typeof window.requestAnimationFrame==='function'?window.requestAnimationFrame.bind(window):fn=>fn();
  let queued=false,last='';
  function measure(){
    queued=false;
    if(screen.hidden||toolbar.hidden)return;
    const outer=screen.getBoundingClientRect(),upper=toolbar.getBoundingClientRect();
    if(!(outer.height>0&&upper.height>0)||!Number.isFinite(upper.bottom-outer.top))return;
    // Original clearance is 126px: upper stack + 8px gap + 8px bottom.
    // Preserve that minimum so normal-size result geometry cannot expand.
    const value=Math.max(126,Math.ceil(upper.bottom-outer.top+16))+'px';
    if(value!==last){last=value;screen.style.setProperty('--result-upper-clearance',value);}
  }
  function schedule(){if(!queued){queued=true;frame(measure);}}
  if(typeof window.ResizeObserver==='function'){
    const observer=new window.ResizeObserver(schedule);
    observer.observe(screen);observer.observe(header);observer.observe(toolbar);
  }else{
    // Older engines: watch only game visibility/phase and terrain text, never
    // the clock. Repeated writes of unchanged text do not request a layout read.
    const field=document.querySelector('#fieldStatus');
    let hidden=screen.hidden,phase=screen.getAttribute?.('data-phase'),text=field?.textContent;
    if(typeof window.MutationObserver==='function'){
      const observer=new window.MutationObserver(()=>{
        const nextHidden=screen.hidden,nextPhase=screen.getAttribute?.('data-phase'),nextText=field?.textContent;
        if(nextHidden===hidden&&nextPhase===phase&&nextText===text)return;
        hidden=nextHidden;phase=nextPhase;text=nextText;schedule();
      });
      observer.observe(screen,{attributes:true,attributeFilter:['hidden','data-phase']});
      if(field)observer.observe(field,{childList:true,characterData:true,subtree:true});
    }
    // Font completion can change wrapping without changing the terrain string.
    document.fonts?.ready?.then?.(schedule,()=>{});
    document.fonts?.addEventListener?.('loadingdone',schedule);
  }
  window.addEventListener?.('resize',schedule,{passive:true});
  window.addEventListener?.('pageshow',schedule);
  measure();
}());
"""
ANCHOR = "\nrequestAnimationFrame(loop);\nif(typeof window!=='undefined'&&window.__gameBootComplete)window.__gameBootComplete();"


def patch(source):
    if MARKER in source:
        if LAYOUT_MARKER not in source:
            raise ValueError("partial older terrain patch: rebuild from the immutable base")
        return source
    if source.count("</style>") < 1:
        raise ValueError("game CSS closing tag was not found")
    for anchor in (
        "#app #gameScreen > #gameTopline #fieldStatus",
        "top:-2px; right:-6px; width:18px; height:18px;",
        "function inlineFieldLabel(e)",
    ):
        if anchor not in source:
            raise ValueError("expected current UI anchor missing: " + anchor)
    if source.count(ANCHOR) != 1:
        raise ValueError("expected unique runtime end anchor")
    return source.replace("</style>", CSS + "\n</style>", 1).replace(ANCHOR, LAYOUT + ANCHOR, 1)


if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error("write an isolated candidate, not the immutable source")
    result = patch(args.source.read_text())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result)
