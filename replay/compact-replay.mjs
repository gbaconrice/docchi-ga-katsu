/** Bounded canonical presentation trace. Spawns carry metadata; guests never simulate. */
export const COMPACT_VERSION='v7-expansion-status-vectorfx-v1';
export const ROLES=['sword','shield','spear','archer','cannon','rider','healer','goblin','golem','drake','wraith','boar','bombbug','frostmage','stormmage','burrower','slime','slimelet'];
export const FX_KINDS=['hit_spark','ground_slam','magic_sparkle','muzzle_flash','charge_trail','bomb_explosion','frost_hit','chain_arc','burrow_warning','burrow_emerge','slime_split'];
const finite=Number.isFinite;
const DELTA_COLUMNS=[3,4,5,6,7,8,11];
const withinActiveCap=rows=>{const list=[...rows];return [0,1].every(side=>list.filter(u=>u[1]===side&&!u[6]).length<=32)};
const validFlags=x=>Number.isSafeInteger(x)&&x>=0&&x<=7;
const boundedCoordinate=x=>finite(x)&&Math.abs(x)<=10000;
const validId=x=>(typeof x==='string'&&x.length>0&&x.length<=160)||(Number.isSafeInteger(x)&&x>=0);
function validRow(u){return Array.isArray(u)&&u.length===12&&validId(u[0])&&u.slice(1,9).every(finite)&&[0,1].includes(u[1])&&Number.isInteger(u[2])&&u[2]>=0&&u[2]<ROLES.length&&Math.abs(u[3])<=10000&&Math.abs(u[4])<=10000&&Math.abs(u[5])<=100000&&[0,1].includes(u[6])&&Number.isInteger(u[7])&&u[7]>=-1&&u[7]<=8&&[-1,1].includes(u[8])&&typeof u[9]==='string'&&u[9].length<=160&&(u[10]===null||typeof u[10]==='string'&&u[10].length<=160)&&validFlags(u[11])}
function validShots(ss){return Array.isArray(ss)&&ss.length<=2048&&ss.every(s=>Array.isArray(s)&&s.length===5&&s.every(finite)&&[0,1].includes(s[0])&&Number.isInteger(s[3])&&s[3]>=0&&s[3]<ROLES.length&&[s[1],s[2]].every(boundedCoordinate)&&Math.abs(s[4])<=4)}
function validEffects(fx){return Array.isArray(fx)&&fx.length<=24&&fx.every(f=>Array.isArray(f)&&f.length===7&&f.every(finite)&&Number.isInteger(f[0])&&f[0]>=0&&f[0]<FX_KINDS.length&&[-1,1].includes(f[3])&&Number.isInteger(f[4])&&f[4]>=0&&f[4]<=3601&&[f[1],f[2],f[5],f[6]].every(boundedCoordinate))}
function encodeEffects(effects,tick){if(!Array.isArray(effects))throw Error('invalid-effects');const fx=effects.map(f=>[FX_KINDS.indexOf(f.kind),Math.round(f.x),Math.round(f.y),f.face??1,f.tick??tick,Math.round(f.targetX??f.toX??f.x),Math.round(f.targetY??f.toY??f.y)]);if(!validEffects(fx)||fx.some(f=>f[4]>tick))throw Error('invalid-effects');return fx;}
function encodeShots(shots){const out=shots.map(s=>[s.side,Math.round(s.x),Math.round(s.y),ROLES.indexOf(s.k||'archer'),Math.round((s.angle??Math.atan2((s.target?.y??s.y)-s.y,(s.target?.x??s.x)-s.x))*1000)/1000]);if(!validShots(out))throw Error('invalid-shots');return out;}
export function createCompactRecorder({positionEvery=6,maxUnits=256,maxInitial=64,statusFor=u=>u.presentationFlags??0}={}){
 if(!Number.isInteger(positionEvery)||positionEvery<1||positionEvery>60||!Number.isInteger(maxUnits)||maxUnits<1||maxUnits>256||!Number.isInteger(maxInitial)||maxInitial<1||maxInitial>64||typeof statusFor!=='function')throw Error('invalid-recorder-options');
 let initial=null,previous=new Map(),retired=new Set(),deadAt=new Map(),seen=new Set(),lastShots='',lastTick=-1;const events=[];
 return {capture(tick,{units,shots,poseFor=()=>0,facingFor=u=>u.side?-1:1,movingFor=()=>false,effects=[],statusFor:readStatus=statusFor},force=false){
  if(!Number.isInteger(tick)||tick<0||tick>3601||tick<=lastTick||!Array.isArray(units)||!Array.isArray(shots)||units.length>maxUnits)throw Error('invalid-capture');
  if(units.some(u=>retired.has(u.id)&&!u.dead))throw Error('reused-id');
  const fx=encodeEffects(effects,tick),currentShots=encodeShots(shots);
  const rows=units.filter(u=>!retired.has(u.id)).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(u=>[u.id,u.side,ROLES.indexOf(u.k),Math.round(u.x),Math.round(u.y),Math.round(u.hp*100)/100,u.dead?1:0,movingFor(u)&&poseFor(u)<3?-1:poseFor(u),facingFor(u),String(u.token??u.id),u.ownerToken??null,readStatus(u)]);
  if(!withinActiveCap(rows))throw Error('active-team-cap');
  if(rows.some(u=>!validRow(u))||new Set(rows.map(u=>u[0])).size!==rows.length)throw Error('invalid-unit');
  if(!initial){if(tick!==0)throw Error('initial-tick');if(rows.length>maxInitial)throw Error('initial-cap');initial=rows;for(const row of rows){previous.set(row[0],row.slice());seen.add(row[0])}lastTick=tick;lastShots=JSON.stringify(currentShots);events.push([tick,[],currentShots,[],[],fx]);return}
  const updates=[],spawns=[],despawns=[];
  for(const row of rows){
   if(row[6]&&!deadAt.has(row[0]))deadAt.set(row[0],tick);
   if(deadAt.has(row[0])&&tick-deadAt.get(row[0])>=36){despawns.push(row[0]);previous.delete(row[0]);retired.add(row[0]);continue}
   const prior=previous.get(row[0]);
   if(!prior){if(seen.has(row[0])||seen.size>=maxUnits)throw Error('entity-cap-or-reused-id');seen.add(row[0]);spawns.push(row);previous.set(row[0],row.slice());continue}
   if([0,1,2,9,10].some(col=>row[col]!==prior[col]))throw Error('immutable-unit-metadata');
   let mask=0,values=[];const critical=row[5]!==prior[5]||row[6]!==prior[6]||row[11]!==prior[11]||(row[7]!==prior[7]&&row[7]>=3);
   for(let bit=0;bit<DELTA_COLUMNS.length;bit++){const col=DELTA_COLUMNS[bit];if(col<5&&!force&&!critical&&tick%positionEvery!==0)continue;if(row[col]!==prior[col]){mask|=1<<bit;values.push(row[col]);prior[col]=row[col]}}
   if(mask)updates.push([row[0],mask,...values]);
  }
  let sample=null;
  if(force||tick%positionEvery===0||shots.length!==JSON.parse(lastShots||'[]').length){
   const current=currentShots,encoded=JSON.stringify(current);
   if(encoded!==lastShots){sample=current;lastShots=encoded}
  }

  if(updates.length||spawns.length||despawns.length||sample!==null||fx.length||force)events.push([tick,updates,sample,spawns,despawns,fx]);lastTick=tick;
 },finish({ticks,winner}){
  if(!initial||lastTick!==ticks||!['A','B','draw'].includes(winner))throw Error('invalid-finish');
  if(events.at(-1)[0]!==ticks)events.push([ticks,[],null,[],[],[]]);
  return {engineVersion:COMPACT_VERSION,ticks,winner,initial,events,positionEvery,maxEntities:maxUnits};
 }};
}
export function createPlayback(replay){
 if(!replay||replay.engineVersion!==COMPACT_VERSION||!['A','B','draw'].includes(replay.winner)||!Number.isInteger(replay.maxEntities)||replay.maxEntities<1||replay.maxEntities>256||!Number.isInteger(replay.positionEvery)||replay.positionEvery<1||replay.positionEvery>60||!Number.isInteger(replay.ticks)||replay.ticks<0||replay.ticks>3601||!Array.isArray(replay.initial)||replay.initial.length>64||replay.initial.length>replay.maxEntities||!Array.isArray(replay.events)||replay.events.length>3602)throw Error('invalid-replay');
 const rows=new Map(),seen=new Set();
 for(const row of replay.initial){if(!validRow(row)||rows.has(row[0]))throw Error('invalid-unit');rows.set(row[0],row.slice());seen.add(row[0])}
 if(!withinActiveCap(rows.values()))throw Error('active-team-cap');
 const checkRows=new Map([...rows].map(([id,row])=>[id,row.slice()]));let last=-1;
 for(const e of replay.events){
  if(!Array.isArray(e)||e.length!==6||!Number.isInteger(e[0])||e[0]<=last||e[0]>replay.ticks||!Array.isArray(e[1])||e[1].length>256||!Array.isArray(e[3])||e[3].length>256||!Array.isArray(e[4])||e[4].length>256||!validEffects(e[5]))throw Error('invalid-event');
  if(e[5].some(f=>f[4]>e[0]))throw Error('future-effect');
  for(const row of e[3]){if(!validRow(row)||seen.has(row[0])||seen.size>=replay.maxEntities)throw Error('invalid-spawn');seen.add(row[0]);checkRows.set(row[0],row.slice())}
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
 let cursor=0,shots=[],lastTick=-1,effects=[];
 return {at(tick){
  if(!finite(tick)||tick<lastTick)throw Error('playback-cannot-rewind');lastTick=tick;
  while(cursor<replay.events.length&&replay.events[cursor][0]<=tick){
   const e=replay.events[cursor++];for(const row of e[3])rows.set(row[0],row.slice());
   for(const d of e[1]){const row=rows.get(d[0]);let j=2;for(let bit=0;bit<DELTA_COLUMNS.length;bit++)if(d[1]&(1<<bit))row[DELTA_COLUMNS[bit]]=d[j++];}
   for(const id of e[4])rows.delete(id);
   if(e[2]!==null)shots=e[2];effects.push(...e[5]);
  }
  effects=effects.filter(f=>tick-f[4]<48).slice(-24);
  return {units:[...rows.values()].map(u=>({id:u[0],side:u[1],k:ROLES[u[2]],x:u[3],y:u[4],hp:u[5],dead:!!u[6],pose:u[7]<0?([1,0,2,0][Math.floor((tick*1000/60)%350/87.5)]):u[7],face:u[8],token:u[9],ownerToken:u[10],presentationFlags:u[11]})),shots:shots.map(s=>({side:s[0],x:s[1],y:s[2],k:ROLES[s[3]],angle:s[4]})),effects:effects.map(f=>({kind:FX_KINDS[f[0]],x:f[1],y:f[2],face:f[3],tick:f[4],targetX:f[5],targetY:f[6]}))};
 }};
}
