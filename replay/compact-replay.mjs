/** Host-only sampling. Integer display coordinates; no quantization of simulation. */
export const COMPACT_VERSION='v5-collision-sparse10fps-tick-events-v1';
export const ROLES=['sword','shield','spear','archer','cannon','rider','healer'];
export function createCompactRecorder({positionEvery=6,maxUnits=16}={}){
 let initial=null,previous=new Map(),lastShots='',lastTick=-1;const events=[];
 return {capture(tick,{units,shots,poseFor=()=>0,facingFor=u=>u.side?-1:1,movingFor=()=>false},force=false){
  if(!Number.isInteger(tick)||tick<0||tick>3601||tick<lastTick||units.length>maxUnits)throw Error('invalid-capture');
  const rows=units.slice().sort((a,b)=>a.id-b.id).map(u=>[u.id,u.side,ROLES.indexOf(u.k),Math.round(u.x),Math.round(u.y),Math.round(u.hp*100)/100,u.dead?1:0,movingFor(u)&&poseFor(u)<3?-1:poseFor(u),facingFor(u)]);
  if(!initial){initial=rows;for(const row of rows)previous.set(row[0],row.slice());lastTick=tick;events.push([tick,[],[]]);return}
  const updates=[];
  for(const row of rows){const prior=previous.get(row[0]);if(!prior)throw Error('roster-change');let mask=0,values=[];
   for(let col=3;col<9;col++){if(col<5&&!force&&tick%positionEvery!==0)continue;if(row[col]!==prior[col]){mask|=1<<(col-3);values.push(row[col]);prior[col]=row[col]}}
   if(mask)updates.push([row[0],mask,...values]);
  }
  let sample=null;
  if(force||tick%positionEvery===0||shots.length!==JSON.parse(lastShots||'[]').length){
   const current=shots.map(s=>[s.side,Math.round(s.x),Math.round(s.y)]),encoded=JSON.stringify(current);
   if(encoded!==lastShots){sample=current;lastShots=encoded}
  }
  if(updates.length||sample!==null||force)events.push([tick,updates,sample]);lastTick=tick;
 },finish({ticks,winner}){
  if(!initial||lastTick!==ticks||!['A','B','draw'].includes(winner))throw Error('invalid-finish');
  if(events.at(-1)[0]!==ticks)events.push([ticks,[],null]);
  return {engineVersion:COMPACT_VERSION,ticks,winner,initial,events,positionEvery};
 }};
}
export function createPlayback(replay){
 if(!replay||replay.engineVersion!==COMPACT_VERSION||!Number.isInteger(replay.ticks)||replay.ticks<0||replay.ticks>3601||!Array.isArray(replay.initial)||replay.initial.length>16||!Array.isArray(replay.events)||replay.events.length>3602)throw Error('invalid-replay');
 const rows=new Map();
 const validRow=u=>u.length===9&&u.every(Number.isFinite)&&Number.isInteger(u[0])&&u[0]>=0&&[0,1].includes(u[1])&&Number.isInteger(u[2])&&u[2]>=0&&u[2]<ROLES.length&&Math.abs(u[3])<=10000&&Math.abs(u[4])<=10000&&Math.abs(u[5])<=100000&&[0,1].includes(u[6])&&Number.isInteger(u[7])&&u[7]>=-1&&u[7]<=8&&[-1,1].includes(u[8]);
 for(const row of replay.initial){
  if(!Array.isArray(row)||!validRow(row)||row.length!==9||!row.every(Number.isFinite)||rows.has(row[0])||![0,1].includes(row[1])||!Number.isInteger(row[2])||row[2]<0||row[2]>=ROLES.length)throw Error('invalid-unit');
  rows.set(row[0],row.slice());
 }
 const checkRows=new Map([...rows].map(([id,row])=>[id,row.slice()]));
 let last=-1;
 for(const e of replay.events){
  if(!Array.isArray(e)||e.length!==3||!Number.isInteger(e[0])||e[0]<=last||e[0]>replay.ticks||!Array.isArray(e[1])||e[1].length>16)throw Error('invalid-event');
  for(const d of e[1])if(!Array.isArray(d)||!rows.has(d[0])||!Number.isInteger(d[1])||d[1]<1||d[1]>63||d.length!==2+d[1].toString(2).replace(/0/g,'').length||!d.every(Number.isFinite))throw Error('invalid-delta');
  for(const d of e[1]){const row=checkRows.get(d[0]);let j=2;for(let bit=0;bit<6;bit++)if(d[1]&(1<<bit))row[bit+3]=d[j++];if(!validRow(row))throw Error('invalid-delta-value');}
  if(e[2]!==null&&(!Array.isArray(e[2])||e[2].length>1024||e[2].some(s=>!Array.isArray(s)||s.length!==3||!s.every(Number.isFinite)||![0,1].includes(s[0]))))throw Error('invalid-shots');
  last=e[0];
 }
 if(replay.events[0]?.[0]!==0||last!==replay.ticks)throw Error('invalid-boundaries');
 let cursor=0,shots=[],lastTick=-1;
 return {at(tick){
  if(!Number.isFinite(tick)||tick<lastTick)throw Error('playback-cannot-rewind');lastTick=tick;
  while(cursor<replay.events.length&&replay.events[cursor][0]<=tick){
   const e=replay.events[cursor++];for(const d of e[1]){const row=rows.get(d[0]);let j=2;for(let bit=0;bit<6;bit++)if(d[1]&(1<<bit))row[bit+3]=d[j++];}
   if(e[2]!==null)shots=e[2];
  }
  return {units:[...rows.values()].map(u=>({id:u[0],side:u[1],k:ROLES[u[2]],x:u[3],y:u[4],hp:u[5],dead:!!u[6],pose:u[7]<0?([1,0,2,0][Math.floor((tick*1000/60)%350/87.5)]):u[7],face:u[8]})),shots:shots.map(s=>({side:s[0],x:s[1],y:s[2]}))};
 }};
}
