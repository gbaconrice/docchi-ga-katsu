"""Remove requested name fills and keep prediction picks inside a fixed preview lane."""
from pathlib import Path

MARKER = '/* requested-pick-icon-overlay-20261108 */'
CSS = r'''
/* requested-pick-icon-overlay-20261108 */
/* One bounded row at the upper-left. It never participates in the card's flow.
   Eight seats shrink evenly on narrow screens instead of wrapping into stats. */
#app #gameScreen #comparison .army-card > .prediction-picks {
  position:absolute; top:10px; left:10px; right:10px; z-index:1;
  display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,21px);
  justify-content:start; align-items:start; align-content:start; gap:2px;
  width:auto; max-width:none; height:21px; margin:0; padding:0;
  overflow:hidden; contain:layout paint; pointer-events:none;
}
#app #gameScreen #comparison .prediction-picks > .prediction-pick {
  box-sizing:border-box; width:100%; min-width:0; height:auto; max-height:21px;
  aspect-ratio:1; margin:0; padding:0;
}
#app #gameScreen #comparison .prediction-picks[hidden] { display:none; }
'''

PICKS = r'''function predictionPickEntries(snapshot,viewer,localSide){
 if(snapshot?.phase!=='predict')return [];
 const participants=Array.isArray(snapshot.participants)?snapshot.participants:[],departed=new Set(snapshot.departedIds||[]),cashedOut=new Set(snapshot.cashedOutIds||[]),eligible=new Set(participants.filter(id=>!departed.has(id)&&!cashedOut.has(id))),rows=new Map();
 const valid=row=>row&&eligible.has(row.userId)&&(row.side==='A'||row.side==='B');
 for(const row of Array.isArray(snapshot.selectedSides)?snapshot.selectedSides:[])if(valid(row))rows.set(row.userId,{userId:row.userId,side:row.side,confirmed:false});
 for(const row of Array.isArray(snapshot.confirmedSides)?snapshot.confirmedSides:[])if(valid(row))rows.set(row.userId,{userId:row.userId,side:row.side,confirmed:true});
 const own=rows.get(viewer),ownUnconfirmed=eligible.has(viewer)&&!own?.confirmed&&!(snapshot.readyIds||[]).includes(viewer);
 if(ownUnconfirmed){rows.delete(viewer);if(localSide===0||localSide===1)rows.set(viewer,{userId:viewer,side:localSide===0?'A':'B',confirmed:false});}
 // Stable seat order prevents confirmation or a side change from shuffling peers.
 return [...new Set(participants)].map(id=>rows.get(id)).filter(Boolean).slice(0,8);
}'''

PREVIEW_INSETS = r'''// Reserve the avatar lane before any pick, so selecting never moves the artwork.
// Reuse the old lower whitespace rather than increasing the card/canvas height.
function predictionPreviewLane(){
 return multiSession&&state==='choose'&&screenMode==='game'&&multiSnapshot?.phase==='predict'?{top:24,bottom:8}:{top:4,bottom:22};
}
'''

def once(s, old, new):
    assert s.count(old) == 1, 'Expected one patch target: '+old[:120]
    return s.replace(old, new, 1)

def patch(s):
    assert MARKER not in s, 'Already patched'
    s = once(s, '''/* Restore the pre-mat contrast only under the participant names. */
#app #gameScreen .participant-name {
  color:#f6e7cb;
  background:#3c291f;
}''', '''/* Participant names remain plain text over the existing scene. */
#app #gameScreen .participant-name {
  color:#f6e7cb;
  background:none;
}''')
    s = once(s, '''  justify-self:start; max-width:100%; padding-inline:2px;
  background:#fff3d7; border-radius:2px; text-shadow:none;''', '''  justify-self:start; max-width:100%; padding-inline:0;
  background:none; border-radius:0; text-shadow:none;''')
    s = once(s, '''/* Keep small victory text above 4.5:1 without muting either team hue. */''', '''/* Team text keeps its identity hue with no added backing. */''')
    s = once(s, '''  padding-inline:4px; background:#fff3d7; border-radius:2px;''', '''  padding-inline:0; background:none; border-radius:0;''')
    s = once(s, '''/* Exact selected hues need a light backing on the dark log surface. */''', '''/* Log actor and winner names are unfilled text on the existing log surface. */''')
    s = once(s, '''  background:#fff3d7; padding:0 2px; border-radius:2px;
  box-decoration-break:clone; -webkit-box-decoration-break:clone;''', '''  background:none; padding:0; border-radius:0;''')
    s = once(s, '</style>', CSS+'\n</style>')
    start=s.index('function predictionPickEntries('); end=s.index('\nfunction syncPredictionPicks(',start)
    s=s[:start]+PICKS+s[end:]
    s=once(s,"row.className='prediction-pick'+(pick.confirmed?' is-confirmed':' is-selecting');", "row.setAttribute('data-user-id',pick.userId);row.className='prediction-pick'+(pick.confirmed?' is-confirmed':' is-selecting');")
    s=once(s,'function drawArmyPreviewsLegacy(){', PREVIEW_INSETS+'function drawArmyPreviewsLegacy(){')
    start=s.index('function drawArmyPreviewsLegacy(){'); end=s.index('// Prediction-only marker.',start)
    code=s[start:end]
    code=once(code,'const dpr=Math.min(2,globalThis.devicePixelRatio||1),width=box.width,height=box.height;', 'const dpr=Math.min(2,globalThis.devicePixelRatio||1),width=box.width,height=box.height,lane=predictionPreviewLane();')
    code=once(code,'(height-26)/(maxAnchor+maxBottom)', 'Math.max(1,height-lane.top-lane.bottom)/(maxAnchor+maxBottom)')
    code=once(code,'y=height-22-maxBottom*scale;', 'y=height-lane.bottom-maxBottom*scale;')
    s=s[:start]+code+s[end:]
    start=s.index('function predictionPreviewPlan('); end=s.index('\nfunction drawArmyPreviews(){',start)
    code=s[start:end]
    code=once(code,'const weight=groups.reduce', 'const lane=predictionPreviewLane();\n const weight=groups.reduce')
    code=once(code,'Math.max(1,height-22-30)/(top+bottom)', 'Math.max(1,height-lane.bottom-lane.top-26)/(top+bottom)')
    code=once(code,'return {entries,fit,top,bottom,width,height};','return {entries,fit,top,bottom,width,height,lane};')
    s=s[:start]+code+s[end:]
    s=once(s,'const y=height-22-plan.bottom*scale;', 'const y=height-plan.lane.bottom-plan.bottom*scale;')
    return s

if __name__ == '__main__':
    import sys
    assert len(sys.argv)==3, 'Usage: patch-pick-icon-layout.py INPUT.html OUTPUT.html'
    source,out=map(Path,sys.argv[1:]); assert source.resolve()!=out.resolve(), 'Do not edit the immutable source'
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(patch(source.read_text()))
