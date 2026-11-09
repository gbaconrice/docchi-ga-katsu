// Display-only identity. No physics coordinates, targets, radii or FX rows change.
function effectDisplayIdentity(kind,sourceToken,targetToken=null){
 const token=x=>typeof x==='string'&&x.length>0&&x.length<=160;
 if(!['boss_moon','boss_breath_ice'].includes(kind)||!token(sourceToken)||targetToken!==null&&!token(targetToken))return null;
 return {sourceToken,targetToken,anchorToken:kind==='boss_moon'?(targetToken??sourceToken):sourceToken};
}
function readEffectDisplayIdentity(kind,value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='anchorToken,sourceToken,targetToken')return null;
 const a=effectDisplayIdentity(kind,value.sourceToken,value.targetToken);
 return a&&a.anchorToken===value.anchorToken?a:null;
}
function effectDisplayMetadata(kind,value){const a=readEffectDisplayIdentity(kind,value);return a?{displayAnchor:a}:{};}
function recordEffectDisplayAnchors(tick,effects,wire,output){
 for(let i=0;i<effects.length;i++){const f=effects[i],a=readEffectDisplayIdentity(f.kind,f.displayAnchor);if(a)output.push([tick,i,wire[i][0],a.sourceToken,a.targetToken,a.anchorToken]);}
}
function attachEffectDisplayAnchors(replay,sidecar,maxBytes){
 if(!sidecar.length)return;
 replay.displayEffectAnchors=JSON.parse(JSON.stringify(sidecar));
 // Optional display identity must not make a previously valid replay unavailable.
 // Dropping the complete sidecar restores the exact legacy-anchor behavior.
 if(new TextEncoder().encode(JSON.stringify(replay)).byteLength>maxBytes)delete replay.displayEffectAnchors;
}
function readReplayEffectDisplayAnchors(replay,kinds){
 // A sidecar is optional, bounded and ignored if malformed. Legacy numeric FX
 // rows remain valid even when a producer omits or an old reader drops metadata.
 const out=new Map(),sidecar=replay.displayEffectAnchors;
 if(sidecar===undefined)return out;
 if(!Array.isArray(sidecar)||sidecar.length>86448)return out;
 const events=new Map(replay.events.map(e=>[e[0],e])),actors=new Map();
 const remember=(r,birth)=>{const old=actors.get(r[9]);if(old){old.ambiguous=true;return;}actors.set(r[9],{id:r[0],birth,death:r[6]?birth:Infinity,end:Infinity});};
 for(const r of replay.initial)remember(r,0);
 const ids=new Map(replay.initial.map(r=>[r[0],r[9]]));
 for(const e of replay.events){for(const r of e[3]){remember(r,e[0]);ids.set(r[0],r[9]);}for(const d of e[1]){if(!(d[1]&8))continue;let j=2;for(let b=0;b<7;b++)if(d[1]&(1<<b)){if(b===3&&d[j]){const a=actors.get(ids.get(d[0]));if(a)a.death=Math.min(a.death,e[0]);}j++;}}for(const id of e[4]){const a=actors.get(ids.get(id));if(a)a.end=e[0];}}
 let previousTick=-1,previousIndex=-1;
 for(const row of sidecar){
  if(!Array.isArray(row)||row.length!==6)return new Map();
  const[tick,index,kindIndex,sourceToken,targetToken,anchorToken]=row,event=events.get(tick),f=event?.[5]?.[index],kind=kinds[kindIndex],a=readEffectDisplayIdentity(kind,{sourceToken,targetToken,anchorToken});
  if(!Number.isInteger(tick)||!Number.isInteger(index)||index<0||index>=24||!Number.isInteger(kindIndex)||!f||f[0]!==kindIndex||!a||tick<previousTick||tick===previousTick&&index<=previousIndex)return new Map();
  previousTick=tick;previousIndex=index;
  const known=t=>{const u=actors.get(t);return u&&!u.ambiguous&&u.birth<=tick&&tick<=u.death&&tick<u.end;};
  if(!known(sourceToken)||!known(anchorToken)||targetToken!==null&&!known(targetToken))continue;
  out.set(f,a);
 }
 return out;
}
// Explicitly reviewed mouth locations, in source-frame pixel coordinates.
// Source grids and frame/atlas hashes are in anchors/source-frame-inspection.json.
// Only verified idle and post-contact attack frames are admitted. Unknown frames
// retain the recorded origin rather than borrowing another actor's mouth.
const EFFECT_DISPLAY_MOUTHS=Object.freeze({
 willyee_frost_dragon:{idle:[[75,71],[75,72],[75,72],[75,72],[75,69],[75,68],[75,68],[75,68],[75,68],[75,69]],attack:{15:[75,67],16:[77,72],17:[77,73],18:[77,71],19:[77,71],20:[77,71]}},
 frostbreath_lizard:{idle:[[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34],[59,34]],attack:{14:[54,24],15:[56,30],16:[57,29],17:[57,28],18:[55,26],19:[57,28],20:[57,28],21:[58,28],22:[59,28],23:[59,28],24:[60,28],25:[59,32],26:[59,34],27:[59,34]}}
});
// Frame-local top of the permanent head/horns, excluding the tall detached
// green attack strokes. Reviewed against the unchanged source contact sheets.
const EFFECT_DISPLAY_HEAD_TOPS=Object.freeze({
 moonclaw_werewolf:{idle:[67,67,67,67,67,67,68,68,69,69,69,68,68,67,67,67],attack:{11:74,12:74,13:74,14:74,15:74,16:74,17:74,18:74}},
 cleaver_brute:{idle:[65,65,65,65,65,65,66,66,66,66,66,65,65,65,65,65,65,65,65,65,65,65],attack:{6:74,7:74,8:74,9:74,10:74,11:74,12:74,13:74,14:74},hit:[65,66,66]}
});
function effectDisplayMoonClearance(x,y,u,face){
 const hp=crowdHPAnchor(u),halfWidth=17,halfHeight=20.5,gap=6;
 if(![hp.x,hp.y].every(Number.isFinite)||y+halfHeight+gap<=hp.y-1||y-halfHeight-gap>=hp.y+5)return {x,y,clearance:'none'};
 // Read the existing bar, never move it. The full licensed 34x41 shadow crop
 // bounds determine separation. Keep the recorded facing side when it fits.
 const side=face===-1?-1:1,distance=14+1+halfWidth+gap;
 const m=typeof ctx.getTransform==='function'?ctx.getTransform():null;
 const bounds=m&&[m.a,m.d,m.e,m.f].every(Number.isFinite)&&m.a>0?[(14-m.e)/m.a+halfWidth,(466-m.e)/m.a-halfWidth]:[-Infinity,Infinity];
 for(const sign of [side,-side]){const xx=hp.x+sign*distance;if(xx>=bounds[0]&&xx<=bounds[1])return {x:xx,y,clearance:sign===side?'side-facing':'side-opposite-edge',hp:{x:hp.x,y:hp.y}};}
 return {x:Math.max(bounds[0],Math.min(bounds[1],x)),y:hp.y-1-gap-halfHeight,clearance:'above-bar-narrow-viewport',hp:{x:hp.x,y:hp.y}};
}
function effectDisplayOffset(f){
 const a=readEffectDisplayIdentity(f.kind,f.displayAnchor);if(!a)return null;
 // Exact unique tokens only. Never proximity, color, owner cache or roster order.
 const actors=units.filter(u=>u.token===a.anchorToken),sources=units.filter(u=>u.token===a.sourceToken);
 if(actors.length!==1||sources.length!==1)return null;
 const targets=a.targetToken===null?[]:units.filter(u=>u.token===a.targetToken);
 if(a.targetToken!==null&&targets.length!==1)return null;
 const u=actors[0],flags=bossRenderFlags(u),scale=bossRenderScale(u),r=LICENSED_CLIP_REGISTRIES[u.k],s=LICENSED_CLIP_SPECS[u.k];
 if(!TYPES[u.k]||![u.x,u.y,scale].every(Number.isFinite)||u.dead)return null;
 const lift=(flags&262144)?25:0;
 if(f.kind==='boss_moon'){
  // Existing reviewed body insets exclude detached effect pixels. Reserve half
  // the licensed crescent's 41px height and 6px clear air above that body.
  const frame=r?.frames[spriteFrame(u)],head=frame&&EFFECT_DISPLAY_HEAD_TOPS[u.k]?.[frame.clip]?.[frame.local];
  if(EFFECT_DISPLAY_HEAD_TOPS[u.k]&&!Number.isFinite(head))return null;
  const top=Number.isFinite(head)?(r.anchor[1]-head)*r.renderScale*largeBodyScale(u.k):LARGE_BODY_PRESENTATION[u.k]?.insets?.[1]??(s?.bodyInsets?.top!==undefined?s.bodyInsets.top*(r?.renderScale??1)*largeBodyScale(u.k):LEGACY_STABLE_CAMERA[u.k]?.[1]??MONSTER_META[u.k]?.visual_insets?.[1]??BASE_VISUAL_META[u.k]?.visual_insets?.[1]??null);
  if(!Number.isFinite(top))return null;
  const headY=Math.round(u.y)-lift-top*scale,point=effectDisplayMoonClearance(Math.round(u.x),headY-27,u,f.face);
  return {x:point.x-f.x,y:point.y-(f.y-35),owner:a.anchorToken,mode:'head',frame:spriteFrame(u),headY,landmark:Number.isFinite(head)?'reviewed-frame-head':'reviewed-stable-body-inset',landmarkSource:Number.isFinite(head)?u.k+':'+frame.clip+':'+frame.local:LARGE_BODY_PRESENTATION[u.k]?.insets?'LARGE_BODY_PRESENTATION.insets':s?.bodyInsets?'LICENSED_CLIP_SPECS.bodyInsets':LEGACY_STABLE_CAMERA[u.k]?'LEGACY_STABLE_CAMERA':MONSTER_META[u.k]?'MONSTER_META.visual_insets':'BASE_VISUAL_META.visual_insets',sourceHeadY:Number.isFinite(head)?head:null,clearance:point.clearance,...(point.hp?{hp:point.hp}:{})};
 }
 if(f.kind==='boss_breath_ice'){
  if(!r||!s)return null;
  const frame=r.frames[spriteFrame(u)],p=frame&&EFFECT_DISPLAY_MOUTHS[u.k]?.[frame.clip]?.[frame.local];
  if(!p||![-1,1].includes(f.face))return null;
  const bodyScale=r.renderScale*largeBodyScale(u.k)*scale;
  // The attack's recorded face stays locked for this effect. Retargeting cannot
  // flip an already emitted cone across the body. Only the draw context moves.
  const mouthX=Math.round(u.x)+(p[0]-r.anchor[0])*bodyScale*f.face,mouthY=Math.round(u.y)-lift+(p[1]-r.anchor[1])*bodyScale;
  const result={x:mouthX-f.x,y:mouthY-(f.y-16),owner:a.anchorToken,mode:'mouth',frame:frame.index,sourcePixel:p.slice(),face:f.face,rotation:0,projection:'recorded-forward'};
  const target=targets[0];
  if(target&&[f.targetX,f.targetY].every(Number.isFinite)){
   const tr=LICENSED_CLIP_REGISTRIES[target.k],ts=LICENSED_CLIP_SPECS[target.k],top=ts?.bodyInsets?.top!==undefined?ts.bodyInsets.top*(tr?.renderScale??1)*largeBodyScale(target.k):LEGACY_STABLE_CAMERA[target.k]?.[1]??null;
   if(Number.isFinite(top)){
    const targetY=f.targetY-top*bossRenderScale(target)/2-((bossRenderFlags(target)&262144)?25:0);
    result.targetProjection=[f.targetX,targetY];
    // Original giant art can overlap a much smaller collision body. Never
    // reverse a committed breath back through its owner when that happens.
    if((f.targetX-mouthX)*f.face>0){result.rotation=Math.atan2(targetY-mouthY,f.targetX-mouthX)-Math.atan2(f.targetY-f.y,f.targetX-f.x);result.projection='verified-target';}
    else result.projection='behind-mouth-forward-fallback';
   }
  }
  return result;
 }
 return null;
}
function drawAnchoredPrimitiveEffect(f){
 const offset=effectDisplayOffset(f);if(!offset)return drawPrimitiveEffect(f);
 ctx.save();try{ctx.translate(offset.x,offset.y);if(offset.rotation){ctx.translate(f.x,f.y-16);ctx.rotate(offset.rotation);ctx.translate(-f.x,-f.y+16);}return drawPrimitiveEffect(f);}finally{ctx.restore();}
}
