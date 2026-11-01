/** Bounded canonical presentation trace. Spawns carry metadata; guests never simulate. */
export const COMPACT_VERSION='variable-fullclip64-tail-v1';
export const ROLES=['sword','shield','spear','archer','cannon','rider','healer','goblin','golem','drake','wraith','boar','bombbug','frostmage','stormmage','burrower','slime','slimelet','screech_cricket','reaper_mantis','spore_toad','rootwarden_treant','sky_harpooner','bounty_hound','siege_crab'];
export const FX_KINDS=['hit_spark','ground_slam','magic_sparkle','muzzle_flash','charge_trail','bomb_explosion','frost_hit','chain_arc','burrow_warning','burrow_emerge','slime_split','cadence_delayed','parry_block','poison_cloud','poison_applied','ward_block','drake_claw'];
export const MAX_FRAME_INDEX=4095;
export const MAX_RETIRE_TICKS=600;
export const MAX_REPLAY_BYTES=2*1024*1024;
export const replayByteLength=replay=>new TextEncoder().encode(JSON.stringify(replay)).byteLength;
const finite=Number.isFinite;
const initialTeamCap=rows=>[0,1].every(side=>rows.filter(u=>u[1]===side).length<=64);
const DELTA_COLUMNS=[3,4,5,6,7,8,11];
const withinActiveCap=rows=>{const list=[...rows];return [0,1].every(side=>list.filter(u=>u[1]===side&&!u[6]).length<=64)};
const validFlags=x=>Number.isSafeInteger(x)&&x>=0&&x<=63;
const boundedCoordinate=x=>finite(x)&&Math.abs(x)<=10000;
const validId=x=>(typeof x==='string'&&x.length>0&&x.length<=160)||(Number.isSafeInteger(x)&&x>=0);
function validRow(u){return Array.isArray(u)&&u.length===12&&validId(u[0])&&u.slice(1,9).every(finite)&&[0,1].includes(u[1])&&Number.isInteger(u[2])&&u[2]>=0&&u[2]<ROLES.length&&Math.abs(u[3])<=10000&&Math.abs(u[4])<=10000&&Math.abs(u[5])<=100000&&[0,1].includes(u[6])&&Number.isInteger(u[7])&&u[7]>=-1&&u[7]<=MAX_FRAME_INDEX&&[-1,1].includes(u[8])&&typeof u[9]==='string'&&u[9].length<=160&&(u[10]===null||typeof u[10]==='string'&&u[10].length<=160)&&validFlags(u[11])}
function validShots(ss){return Array.isArray(ss)&&ss.length<=2048&&ss.every(s=>Array.isArray(s)&&s.length===5&&s.every(finite)&&[0,1].includes(s[0])&&Number.isInteger(s[3])&&s[3]>=0&&s[3]<ROLES.length&&[s[1],s[2]].every(boundedCoordinate)&&Math.abs(s[4])<=4)}
function validEffects(fx){return Array.isArray(fx)&&fx.length<=24&&fx.every(f=>Array.isArray(f)&&f.length===7&&f.every(finite)&&Number.isInteger(f[0])&&f[0]>=0&&f[0]<FX_KINDS.length&&[-1,1].includes(f[3])&&Number.isInteger(f[4])&&f[4]>=0&&f[4]<=3601&&[f[1],f[2],f[5],f[6]].every(boundedCoordinate))}
function encodeEffects(effects,tick){if(!Array.isArray(effects))throw Error('invalid-effects');const fx=effects.map(f=>[FX_KINDS.indexOf(f.kind),Math.round(f.x),Math.round(f.y),f.face??1,f.tick??tick,Math.round(f.targetX??f.toX??f.x),Math.round(f.targetY??f.toY??f.y)]);if(!validEffects(fx)||fx.some(f=>f[4]>tick))throw Error('invalid-effects');return fx;}
function encodeShots(shots){const out=shots.map(s=>[s.side,Math.round(s.x),Math.round(s.y),ROLES.indexOf(s.k??'archer'),Math.round((s.angle??Math.atan2((s.target?.y??s.y)-s.y,(s.target?.x??s.x)-s.x))*1000)/1000]);if(!validShots(out))throw Error('invalid-shots');return out;}
export const MAX_PRESENTATION_TAIL_TICKS=180;
function validatePresentationTail(tail,finalRows){
 if(tail===undefined)return;
 if(!tail||typeof tail!=='object'||Array.isArray(tail)||Object.keys(tail).some(k=>!['durationTicks','frames'].includes(k))||!Number.isInteger(tail.durationTicks)||tail.durationTicks<0||tail.durationTicks>MAX_PRESENTATION_TAIL_TICKS||!Array.isArray(tail.frames)||tail.frames.length>180)throw Error('invalid-presentation-tail');
 let previous=-1;
 for(const frame of tail.frames){
  if(!Array.isArray(frame)||frame.length!==2||!Number.isInteger(frame[0])||frame[0]<0||frame[0]>tail.durationTicks||frame[0]<=previous||!Array.isArray(frame[1])||frame[1].length>512)throw Error('invalid-tail-frame');
  const ids=new Set();for(const delta of frame[1]){if(!Array.isArray(delta)||delta.length!==2||!validId(delta[0])||!finalRows.has(delta[0])||ids.has(delta[0])||!Number.isInteger(delta[1])||delta[1]<0||delta[1]>MAX_FRAME_INDEX)throw Error('invalid-tail-delta');ids.add(delta[0])}previous=frame[0];
 }
}
export function createCompactRecorder({positionEvery=6,maxUnits=512,maxInitial=128,statusFor=u=>u.presentationFlags??0,retireAfterTicksFor=()=>36}={}){
 if(!Number.isInteger(positionEvery)||positionEvery<1||positionEvery>60||!Number.isInteger(maxUnits)||maxUnits<1||maxUnits>512||!Number.isInteger(maxInitial)||maxInitial<1||maxInitial>128||typeof statusFor!=='function'||typeof retireAfterTicksFor!=='function')throw Error('invalid-recorder-options');
 let initial=null,previous=new Map(),retired=new Set(),deadAt=new Map(),retireAt=new Map(),seen=new Set(),lastShots='',lastTick=-1;const events=[];const seenPerSide=[0,0];let byteEstimate=0,failed=false;function addEvent(e){byteEstimate+=replayByteLength(e)+1;if(byteEstimate>MAX_REPLAY_BYTES){failed=true;throw Error('replay-byte-cap')}events.push(e)}
 return {capture(tick,{units,shots,poseFor=()=>0,frameFor=null,facingFor=u=>u.side?-1:1,movingFor=()=>false,effects=[],statusFor:readStatus=statusFor},force=false){
  if(failed)throw Error('recorder-failed');
  if(!Number.isInteger(tick)||tick<0||tick>3601||tick<=lastTick||!Array.isArray(units)||!Array.isArray(shots)||units.length>maxUnits)throw Error('invalid-capture');
  if(units.some(u=>retired.has(u.id)&&!u.dead))throw Error('reused-id');
  if(frameFor!==null&&typeof frameFor!=='function')throw Error('invalid-frame-reader');
  const sourceUnits=new Map(units.map(u=>[u.id,u]));
  const readFrame=u=>{const frame=frameFor(u);if(!Number.isInteger(frame)||frame<0||frame>MAX_FRAME_INDEX)throw Error('invalid-frame');return frame};
  const fx=encodeEffects(effects,tick),currentShots=encodeShots(shots);
  const rows=units.filter(u=>!retired.has(u.id)).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(u=>[u.id,u.side,ROLES.indexOf(u.k),Math.round(u.x),Math.round(u.y),Math.round(u.hp*100)/100,u.dead?1:0,frameFor!==null?readFrame(u):(movingFor(u)&&poseFor(u)<3?-1:poseFor(u)),facingFor(u),String(u.token??u.id),u.ownerToken??null,readStatus(u)]);
  if(!withinActiveCap(rows))throw Error('active-team-cap');
  if(rows.some(u=>!validRow(u))||new Set(rows.map(u=>u[0])).size!==rows.length)throw Error('invalid-unit');
  if(!initial){if(tick!==0)throw Error('initial-tick');if(rows.length>maxInitial||!initialTeamCap(rows))throw Error('initial-cap');initial=rows;byteEstimate=replayByteLength(rows);for(const row of rows){previous.set(row[0],row.slice());seen.add(row[0]);seenPerSide[row[1]]++}lastTick=tick;lastShots=JSON.stringify(currentShots);addEvent([tick,[],currentShots,[],[],fx]);return}
  const updates=[],spawns=[],despawns=[];
  for(const row of rows){
   if(row[6]&&!deadAt.has(row[0])){const snapshot=Object.freeze(Object.fromEntries(Object.entries(sourceUnits.get(row[0])).filter(([,v])=>v===null||['string','number','boolean'].includes(typeof v))));let duration;try{duration=retireAfterTicksFor(snapshot)}catch(error){failed=true;throw error}if(!Number.isInteger(duration)||duration<0||duration>MAX_RETIRE_TICKS){failed=true;throw Error('invalid-retire-duration')}deadAt.set(row[0],tick);retireAt.set(row[0],tick+duration)}
   if(deadAt.has(row[0])&&tick>=retireAt.get(row[0])){despawns.push(row[0]);previous.delete(row[0]);retired.add(row[0]);continue}
   const prior=previous.get(row[0]);
   if(!prior){if(seen.has(row[0])||seen.size>=maxUnits||seenPerSide[row[1]]>=256)throw Error('entity-cap-or-reused-id');seen.add(row[0]);seenPerSide[row[1]]++;spawns.push(row);previous.set(row[0],row.slice());continue}
   if([0,1,2,9,10].some(col=>row[col]!==prior[col]))throw Error('immutable-unit-metadata');
   let mask=0,values=[];const critical=row[5]!==prior[5]||row[6]!==prior[6]||row[11]!==prior[11]||(row[7]!==prior[7]&&(frameFor!==null||row[7]>=3));
   for(let bit=0;bit<DELTA_COLUMNS.length;bit++){const col=DELTA_COLUMNS[bit];if(col<5&&!force&&!critical&&tick%positionEvery!==0)continue;if(row[col]!==prior[col]){mask|=1<<bit;values.push(row[col]);prior[col]=row[col]}}
   if(mask)updates.push([row[0],mask,...values]);
  }
  let sample=null;
  if(force||tick%positionEvery===0||shots.length!==JSON.parse(lastShots||'[]').length){
   const current=currentShots,encoded=JSON.stringify(current);
   if(encoded!==lastShots){sample=current;lastShots=encoded}
  }

  if(updates.length||spawns.length||despawns.length||sample!==null||fx.length||force)addEvent([tick,updates,sample,spawns,despawns,fx]);lastTick=tick;
 },finish({ticks,winner,presentationTail}){
  if(failed)throw Error('recorder-failed');
  if(!initial||lastTick!==ticks||!['A','B','draw'].includes(winner))throw Error('invalid-finish');
  if(events.at(-1)[0]!==ticks)addEvent([ticks,[],null,[],[],[]]);
  validatePresentationTail(presentationTail,previous);
  const tailCopy=presentationTail===undefined?{}:{presentationTail:JSON.parse(JSON.stringify(presentationTail))};
  const replay={...tailCopy,engineVersion:COMPACT_VERSION,ticks,winner,initial,events,positionEvery,maxEntities:maxUnits};if(replayByteLength(replay)>MAX_REPLAY_BYTES){failed=true;throw Error('replay-byte-cap')}return replay;
 }};
}
export function createPlayback(replay){
 if(replayByteLength(replay)>MAX_REPLAY_BYTES)throw Error('replay-byte-cap');
 if(!replay||replay.engineVersion!==COMPACT_VERSION||!['A','B','draw'].includes(replay.winner)||!Number.isInteger(replay.maxEntities)||replay.maxEntities<1||replay.maxEntities>512||!Number.isInteger(replay.positionEvery)||replay.positionEvery<1||replay.positionEvery>60||!Number.isInteger(replay.ticks)||replay.ticks<0||replay.ticks>3601||!Array.isArray(replay.initial)||replay.initial.length>128||replay.initial.length>replay.maxEntities||!Array.isArray(replay.events)||replay.events.length>3602)throw Error('invalid-replay');
 const rows=new Map(),seen=new Set(),seenPerSide=[0,0];
 for(const row of replay.initial){if(!validRow(row)||rows.has(row[0]))throw Error('invalid-unit');rows.set(row[0],row.slice());seen.add(row[0]);seenPerSide[row[1]]++}
 if(!initialTeamCap(replay.initial))throw Error('initial-cap');
 if(!withinActiveCap(rows.values()))throw Error('active-team-cap');
 const checkRows=new Map([...rows].map(([id,row])=>[id,row.slice()]));let last=-1;
 for(const e of replay.events){
  if(!Array.isArray(e)||e.length!==6||!Number.isInteger(e[0])||e[0]<=last||e[0]>replay.ticks||!Array.isArray(e[1])||e[1].length>512||!Array.isArray(e[3])||e[3].length>512||!Array.isArray(e[4])||e[4].length>512||!validEffects(e[5]))throw Error('invalid-event');
  if(e[5].some(f=>f[4]>e[0]))throw Error('future-effect');
  for(const row of e[3]){if(!validRow(row)||seen.has(row[0])||seen.size>=replay.maxEntities||seenPerSide[row[1]]>=256)throw Error('invalid-spawn');seen.add(row[0]);seenPerSide[row[1]]++;checkRows.set(row[0],row.slice())}
  for(const d of e[1]){
   if(!Array.isArray(d)||!checkRows.has(d[0])||!Number.isInteger(d[1])||d[1]<1||d[1]>127||d.length!==2+d[1].toString(2).replace(/0/g,'').length||!d.slice(1).every(finite))throw Error('invalid-delta');
   const row=checkRows.get(d[0]);let j=2;for(let bit=0;bit<DELTA_COLUMNS.length;bit++)if(d[1]&(1<<bit))row[DELTA_COLUMNS[bit]]=d[j++];if(!validRow(row))throw Error('invalid-delta-value');
  }
  for(const id of e[4]){if(!validId(id)||!checkRows.has(id))throw Error('invalid-despawn');checkRows.delete(id)}
  if(!withinActiveCap(checkRows.values()))throw Error('active-team-cap');
  if(e[2]!==null&&!validShots(e[2]))throw Error('invalid-shots');
  last=e[0];
 }
 if(replay.events[0]?.[0]!==0||last!==replay.ticks)throw Error('invalid-boundaries');
 validatePresentationTail(replay.presentationTail,checkRows);
 const tail=replay.presentationTail===undefined?{durationTicks:0,frames:[]}:JSON.parse(JSON.stringify(replay.presentationTail));
 let cursor=0,shots=[],lastTick=-1,effects=[],tailBase=null,tailCursor=0,tailLast=-1,api;
 return api={at(tick){
  if(!finite(tick)||tick<lastTick)throw Error('playback-cannot-rewind');lastTick=tick;
  while(cursor<replay.events.length&&replay.events[cursor][0]<=tick){
   const e=replay.events[cursor++];for(const row of e[3])rows.set(row[0],row.slice());
   for(const d of e[1]){const row=rows.get(d[0]);let j=2;for(let bit=0;bit<DELTA_COLUMNS.length;bit++)if(d[1]&(1<<bit))row[DELTA_COLUMNS[bit]]=d[j++];}
   for(const id of e[4])rows.delete(id);
   if(e[2]!==null)shots=e[2];effects.push(...e[5]);
  }
  effects=effects.filter(f=>tick-f[4]<48).slice(-24);
  return {units:[...rows.values()].map(u=>({id:u[0],side:u[1],k:ROLES[u[2]],x:u[3],y:u[4],hp:u[5],dead:!!u[6],pose:u[7]<0?([1,0,2,0][Math.floor((tick*1000/60)%350/87.5)]):u[7],face:u[8],token:u[9],ownerToken:u[10],presentationFlags:u[11]})),shots:shots.map(s=>({side:s[0],x:s[1],y:s[2],k:ROLES[s[3]],angle:s[4]})),effects:effects.map(f=>({kind:FX_KINDS[f[0]],x:f[1],y:f[2],face:f[3],tick:f[4],targetX:f[5],targetY:f[6]}))};
 },atPresentationTail(offset){
  if(!finite(offset)||offset<0||offset>tail.durationTicks||offset<tailLast)throw Error('invalid-tail-offset');
  if(!tailBase){const final=api.at(replay.ticks);tailBase={units:new Map(final.units.map(u=>[u.id,{...u}])),shots:final.shots.map(s=>({...s}))}}
  tailLast=offset;
  while(tailCursor<tail.frames.length&&tail.frames[tailCursor][0]<=offset){for(const[id,frame]of tail.frames[tailCursor++][1])tailBase.units.get(id).pose=frame;}
  return {units:[...tailBase.units.values()].map(u=>({...u})),shots:tailBase.shots.map(s=>({...s})),effects:[],presentationTailOffset:offset};
 }};
}

/** Host-only presentation adapter: never advances mechanics; supply host elapsed. */
export function fourSpeciesPresentationFlags(u,elapsed,moving=false){
 if(!u||!Number.isFinite(elapsed)||elapsed<0||!validFlags(u.presentationFlags??0))throw Error('invalid-status-input');
 return ((elapsed<(u.slowUntil||0)?1:0)|(u.burrowStage==='underground'?2:0)|(u.k==='boar'&&u.chargeReady&&moving?4:0))|(u.parrySpent?16:0)|(!u.dead&&(u.poisonUntil??0)>elapsed+1e-9?8:0)|(!u.dead&&(u.cadenceImmuneUntil??0)>elapsed?32:0);
}
