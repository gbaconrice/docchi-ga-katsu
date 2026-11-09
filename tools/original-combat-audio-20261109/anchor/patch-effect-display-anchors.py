"""Reversible optional display identity and moon/breath body projections."""
from pathlib import Path
ROOT=Path(__file__).parent
MARKER='/* effect-display-anchors-v1 */\n'
END='/* end-effect-display-anchors-v1 */\n'
SEAMS=[
 ("if(fx)c.effect(u,fx,v.x,v.y,{radius:radiusOf(v)+5});", "if(fx)c.effect(u,fx,v.x,v.y,{radius:radiusOf(v)+5,...(fx==='moon'?{displayTargetToken:tokenOf(v)}:{})});"),
 ("fx(u,c,'breath_ice',u,{radius:140,targetX:t.x,targetY:t.y,duration:45,color:ice})", "fx(u,c,'breath_ice',u,{radius:140,targetX:t.x,targetY:t.y,duration:45,color:ice,displayTargetToken:tokenOf(t)})"),
 ("fx(u,c,'breath_ice',u,{radius:120,targetX:t.x,targetY:t.y,duration:65,color:ice})", "fx(u,c,'breath_ice',u,{radius:120,targetX:t.x,targetY:t.y,duration:65,color:ice,displayTargetToken:tokenOf(t)})"),
 ("sourceToken:tokenOf(u),tick:c.tick,x,y,targetX:tx,targetY:ty,face:u.originForward||1,radius:r", "sourceToken:tokenOf(u),...effectDisplayMetadata('boss_'+kind,effectDisplayIdentity('boss_'+kind,tokenOf(u),opt.displayTargetToken??null)),tick:c.tick,x,y,targetX:tx,targetY:ty,face:u.originForward||1,radius:r"),
 ("...(kind.startsWith('boss_')?bossEffectData(details||{}):{})};activeEffects.push(f);", "...(kind.startsWith('boss_')?bossEffectData(details||{}):{}),...effectDisplayMetadata(kind,details?.displayAnchor)};activeEffects.push(f);"),
 ("...(e.type==='boss_effect'?bossEffectData(e):{})});", "...(e.type==='boss_effect'?bossEffectData(e):{}),...effectDisplayMetadata(kind,e.type==='boss_effect'?e.displayAnchor:null)});"),
 ("let byteEstimate=0,failed=false;function addEvent(e)", "let byteEstimate=0,failed=false;const displayEffectAnchors=[];function addEvent(e)"),
 ("const fx=encodeEffects(effects,tick),currentShots=encodeShots(shots,tick);", "const fx=encodeEffects(effects,tick),currentShots=encodeShots(shots,tick);recordEffectDisplayAnchors(tick,effects,fx,displayEffectAnchors);"),
 ("cornerPillars:JSON.parse(JSON.stringify(cornerPillars))};if(replayByteLength(replay)>MAX_REPLAY_BYTES)", "cornerPillars:JSON.parse(JSON.stringify(cornerPillars))};attachEffectDisplayAnchors(replay,displayEffectAnchors,MAX_REPLAY_BYTES);if(replayByteLength(replay)>MAX_REPLAY_BYTES)"),
 ("let cursor=0,shots=[],lastTick=-1,effects=[],tailBase=null,tailCursor=0,tailLast=-1,api;", "const displayEffectAnchors=readReplayEffectDisplayAnchors(replay,FX_KINDS);\n let cursor=0,shots=[],lastTick=-1,effects=[],tailBase=null,tailCursor=0,tailLast=-1,api;"),
 ("...(f.length===10?{radius:f[7],duration:f[8],color:f[9]}:{})}))};", "...(f.length===10?{radius:f[7],duration:f[8],color:f[9]}:{}),...effectDisplayMetadata(FX_KINDS[f[0]],displayEffectAnchors.get(f))}))};"),
 ("if(!effectImages[f.kind])drawPrimitiveEffect(f);else drawEffect(f.kind,f.x,f.y,effectClockTick-f.tick,f.face);", "if(!effectImages[f.kind])drawAnchoredPrimitiveEffect(f);else drawEffect(f.kind,f.x,f.y,effectClockTick-f.tick,f.face);"),
]
def patch(source):
 if MARKER in source:return source
 for old,new in SEAMS:
  if source.count(old)!=1:raise ValueError('Anchor seam changed: '+old)
  source=source.replace(old,new,1)
 anchor='function drawCombatEffects(layer){\n'
 if source.count(anchor)!=1:raise ValueError('Draw seam changed')
 return source.replace(anchor,MARKER+(ROOT/'effect-display-anchors.js').read_text()+'\n'+END+anchor,1)
def unpatch(source):
 if MARKER not in source:return source
 for old,new in reversed(SEAMS):
  if source.count(new)!=1:raise ValueError('Patched anchor seam changed: '+old)
  source=source.replace(new,old,1)
 a=source.index(MARKER);b=source.index(END,a)+len(END)
 return source[:a]+source[b:]
if __name__=='__main__':
 import sys
 Path(sys.argv[2]).write_text(patch(Path(sys.argv[1]).read_text()))
