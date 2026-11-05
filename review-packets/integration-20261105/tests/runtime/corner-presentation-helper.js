const CornerPillars=(()=>{
'use strict';
// Isolated presentation contract. No simulation, random choices, or body-pose state.
const CONFIG=Object.freeze({pillar_hammerer:Object.freeze({windup:60,radius:20,cap:3}),spectralhand_wizard:Object.freeze({windup:30,radius:12,cap:2}),colossal_hornfist:Object.freeze({windup:30,radius:12,cap:2})});
const REASONS=Object.freeze(['complete','target-dead','target-layer','out-of-zone','source-dead','battle-ended','normal-priority','guard-priority']);
const CONTACT_TICKS=12,MAX_TICK=3601,WIDTH=480,HEIGHT=538;
const token=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const tick=x=>Number.isSafeInteger(x)&&x>=0&&x<=MAX_TICK;
const position=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=WIDTH&&y>=0&&y<=HEIGHT;
const coordinate=x=>Number.isFinite(x)&&Math.abs(x)<=10000;
// A corner action must fit one continuous actor lifetime. First death/removal
// is permanent for this contract, even if a malformed stream later reappears.
const lifetimeEnd=m=>Math.min(m?.deadTick??Infinity,m?.despawnTick??Infinity);
const withinLifetime=(m,at)=>!!m&&(m.birthTick??0)<=at&&at<=lifetimeEnd(m);
const fail=reason=>{throw Error('invalid-corner-'+reason)};
const copy=r=>Object.freeze({...r});
const wire=r=>[r.sourceToken,r.targetToken,r.actionToken,r.startTick,r.dueTick,r.x,r.y,r.contactTick,r.endTick,r.endReason];
function ordered(records){return [...records].sort((a,b)=>a.startTick-b.startTick||(a.sourceToken<b.sourceToken?-1:a.sourceToken>b.sourceToken?1:0));}
function sample(records,at){
 if(!Number.isFinite(at)||at<0)fail('sample-time');
 return ordered(records).flatMap(r=>{
  if(at<r.startTick)return [];
  if(r.contactTick!==null&&at>=r.contactTick&&at<r.contactTick+CONTACT_TICKS)return [Object.freeze({sourceToken:r.sourceToken,actionToken:r.actionToken,kind:r.kind,side:r.side,x:r.x,y:r.y,radius:r.radius,phase:'contact',age:at-r.contactTick,duration:CONTACT_TICKS})];
  if(r.contactTick===null||at<r.contactTick){if(at<r.dueTick&&(r.endTick===null||at<r.endTick))return [Object.freeze({sourceToken:r.sourceToken,actionToken:r.actionToken,kind:r.kind,side:r.side,x:r.x,y:r.y,radius:r.radius,phase:'warning',age:at-r.startTick,duration:r.dueTick-r.startTick})];}
  return [];
 });
}
function identity(e,r){return e.sourceToken===r.sourceToken&&e.targetToken===r.targetToken&&e.actionToken===r.actionToken&&e.startTick===r.startTick;}
function createLedger({maxActors=512}={}){
 if(!Number.isInteger(maxActors)||maxActors<1||maxActors>512)fail('cap');
 let epoch=null,lastTick=-1;const history=new Map(),actors=new Map(),dead=new Set();
 return Object.freeze({
  reset(next){if(!token(next)||next===epoch)fail('epoch');epoch=next;lastTick=-1;history.clear();actors.clear();dead.clear()},
  clear(){epoch=null;lastTick=-1;history.clear();actors.clear();dead.clear()},
  ingest({epoch:incoming,tick:at,units,events},dryRun=false){
   if(epoch===null||incoming!==epoch)return false;
   if(!tick(at)||at<lastTick||!Array.isArray(units)||units.length>maxActors||!Array.isArray(events)||events.length>16384)fail('batch');
   const roster=new Map(),nextActors=new Map(actors),next=new Map([...history].map(([k,r])=>[k,{...r}]));
   for(const u of units){if(!u||!token(u.token)||roster.has(u.token)||typeof u.k!=='string'||![0,1].includes(u.side))fail('roster');const old=actors.get(u.token);if(old&&(old.k!==u.k||old.side!==u.side)||dead.has(u.token)&&!u.dead)fail('actor-identity');roster.set(u.token,u);nextActors.set(u.token,{k:u.k,side:u.side,birthTick:old?.birthTick??at,deadTick:Math.min(old?.deadTick??Infinity,u.dead?at:Infinity),despawnTick:old?.despawnTick??Infinity});}
   for(const [key,old]of actors)if(!roster.has(key)&&old.despawnTick===Infinity)nextActors.set(key,{...old,despawnTick:at});
   if(nextActors.size>maxActors)fail('actor-cap');
   const input=events.filter(e=>['corner_pillar_start','corner_pillar_release','corner_pillar_end'].includes(e?.type));
   for(const e of input){if(e.cornerMode!==1||!token(e.sourceToken)||!token(e.targetToken)||!token(e.actionToken)||!tick(e.startTick)||![e.x,e.y].every(coordinate))fail('event');}
   for(const e of input.filter(e=>e.type==='corner_pillar_start')){
    const u=roster.get(e.sourceToken),v=roster.get(e.targetToken),cfg=CONFIG[u?.k];
    if(!cfg||!v||u.side===v.side||!withinLifetime(nextActors.get(u.token),at)||!withinLifetime(nextActors.get(v.token),at)||e.actionToken!==e.sourceToken+'/corner:1'||e.startTick!==at||!Number.isSafeInteger(e.dueTick)||e.dueTick!==at+cfg.windup||![-1,1].includes(e.face)||!position(e.zoneX,e.zoneY)||next.has(e.sourceToken))fail('start');
    next.set(e.sourceToken,{sourceToken:e.sourceToken,targetToken:e.targetToken,actionToken:e.actionToken,kind:u.k,side:u.side,face:e.face,startTick:at,dueTick:e.dueTick,x:e.zoneX,y:e.zoneY,radius:cfg.radius,contactTick:null,endTick:null,endReason:null});
   }
   for(const e of input.filter(e=>e.type==='corner_pillar_release')){
    const r=next.get(e.sourceToken),cfg=CONFIG[r?.kind];
    if(!r||!identity(e,r)||!withinLifetime(nextActors.get(r.sourceToken),at)||!withinLifetime(nextActors.get(r.targetToken),at)||r.endTick!==null||r.contactTick!==null||e.tick!==at||at!==r.dueTick||e.face!==r.face||e.zoneX!==r.x||e.zoneY!==r.y||e.radius!==cfg.radius||!Number.isInteger(e.count)||e.count<1||e.count>cfg.cap)fail('release');
    r.contactTick=at;
   }
   for(const e of input.filter(e=>e.type==='corner_pillar_end')){
    const r=next.get(e.sourceToken);
    if(!r||!identity(e,r)||r.endTick!==null||e.tick!==at||at<r.startTick||at>r.dueTick||!REASONS.includes(e.reason))fail('end');
    if(e.reason==='complete'?(r.contactTick!==at||at!==r.dueTick):r.contactTick!==null)fail('end-contact');
    r.endTick=at;r.endReason=e.reason;
   }
   for(const r of next.values()){
    if(r.contactTick!==null&&r.endTick===null)fail('release-without-end');
    // Monotonic batches cannot discover a terminal boundary before an old end.
    if(r.endTick!==null&&r.endTick<at)continue;
    const sourceEnd=lifetimeEnd(nextActors.get(r.sourceToken)),targetEnd=lifetimeEnd(nextActors.get(r.targetToken));
    if(r.endTick===null&&(at>r.dueTick||at>=sourceEnd||at>targetEnd))fail('missing-end');
    if(r.endTick!==null&&(r.endTick>sourceEnd||r.endTick>targetEnd+(r.contactTick===null?1:0)))fail('end-lifetime');
   }
   // Everything above is prospective; rejected batches cannot spend or move a cue.
   if(dryRun)return true;
   history.clear();for(const [k,r]of next)history.set(k,copy(r));actors.clear();for(const [k,v]of nextActors)actors.set(k,v);for(const u of units)if(u.dead)dead.add(u.token);lastTick=at;return true;
  },
  records(){return ordered(history.values()).map(copy)},
  cuesAt(at){return sample(history.values(),at)},
  export(){const list=ordered(history.values());if(list.some(r=>r.endTick===null))fail('unfinished');return list.map(wire)},
  stats(){return Object.freeze({epoch,lastTick,records:history.size,actors:actors.size})}
 });
}
function validateReplay(rows,{ticks,maxEntities,metadata}={}){
 if(!tick(ticks)||!Number.isInteger(maxEntities)||maxEntities<1||maxEntities>512||!metadata||typeof metadata.get!=='function'||!Array.isArray(rows)||rows.length>maxEntities)fail('replay');
 const sources=new Set(),actions=new Set(),out=[];let previous=null;
 for(const a of rows){
  if(!Array.isArray(a)||a.length!==10)fail('wire-shape');
  const [sourceToken,targetToken,actionToken,startTick,dueTick,x,y,contactTick,endTick,endReason]=a;
  const u=metadata.get(sourceToken),v=metadata.get(targetToken),cfg=CONFIG[u?.k];
  if(!token(sourceToken)||!token(targetToken)||!token(actionToken)||actionToken!==sourceToken+'/corner:1'||sources.has(sourceToken)||actions.has(actionToken)||!cfg||!v||u.ambiguous||v.ambiguous||u.side===v.side||!withinLifetime(u,startTick)||!withinLifetime(v,startTick)||!tick(startTick)||!Number.isSafeInteger(dueTick)||dueTick!==startTick+cfg.windup||!position(x,y)||!tick(endTick)||endTick<startTick||endTick>dueTick||endTick>ticks||!REASONS.includes(endReason))fail('wire-record');
  if(contactTick===null?endReason==='complete':(!tick(contactTick)||contactTick!==dueTick||contactTick!==endTick||endReason!=='complete'))fail('wire-contact');
  // Source death cleanup occurs this tick. A target killed after reservation checks
  // is observed by mechanics on the following tick; that may cancel, never release.
  if(endTick>lifetimeEnd(u)||endTick>lifetimeEnd(v)+(contactTick===null?1:0))fail('wire-death');
  if(previous&&(startTick<previous.startTick||startTick===previous.startTick&&sourceToken<=previous.sourceToken))fail('wire-order');
  const r=copy({sourceToken,targetToken,actionToken,startTick,dueTick,x,y,contactTick,endTick,endReason,kind:u.k,side:u.side,radius:cfg.radius});sources.add(sourceToken);actions.add(actionToken);out.push(r);previous=r;
 }
 return Object.freeze(out);
}
return Object.freeze({CONFIG,REASONS,CONTACT_TICKS,createLedger,sample,validateReplay});
})();
