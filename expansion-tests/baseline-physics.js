// Independent monster-combat candidate. Geometry and combat metadata remain separate.
const RADII={sword:9,shield:12,spear:9,archer:8,cannon:14,rider:15,healer:8,goblin:7,golem:25,drake:13,wraith:9};
const REACH={sword:6,shield:3,spear:25,archer:132,cannon:102,rider:4,healer:72,goblin:4,golem:2,drake:12,wraith:63};
for(const k of keys){TYPES[k].radius=RADII[k];TYPES[k].reach=REACH[k]}
const TEAM_CAP=32,GRID_SIZE=48,FIELD={w:480,h:538},MAX_RADIUS=Math.max(...Object.values(RADII));
function stableOrder(a,b){const p=(a.priority??0)-(b.priority??0),k=(a.k??'').localeCompare(b.k??'');if(p||k)return p||k;const ai=Number(a.id??0),bi=Number(b.id??0);if(Number.isFinite(ai)&&Number.isFinite(bi)&&ai!==bi)return ai-bi;return String(a.token??a.id??'').localeCompare(String(b.token??b.id??''))}
function tokenOf(u){if(u.token===undefined)u.token=String(u.id??`${u.side}:${u.k}:${u.priority??0}`);return String(u.token)}
function layerOf(u){return TYPES[u.k].collisionLayer||'ground'}
function canCollide(a,b){return layerOf(a)===layerOf(b)}
function canTarget(attacker,target){const mask=TYPES[attacker.k].attackTargetMask||['ground'];return mask.includes(layerOf(target))}
function radiusOf(u){return TYPES[u.k].radius}
function massOf(u){const m=TYPES[u.k].mass;return Number.isFinite(m)&&m>0?m:radiusOf(u)**2}
function nearbyGrid(list,positions=null){
 const cells=new Map();
 for(const u of list){const p=positions?positions.get(u):u,key=Math.floor(p.x/GRID_SIZE)+','+Math.floor(p.y/GRID_SIZE);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(u)}
 return (x,y,range=GRID_SIZE)=>{const found=[],cx=Math.floor(x/GRID_SIZE),cy=Math.floor(y/GRID_SIZE),n=Math.ceil(Math.max(0,range)/GRID_SIZE);for(let dx=-n;dx<=n;dx++)for(let dy=-n;dy<=n;dy++)for(const u of cells.get((cx+dx)+','+(cy+dy))||[])found.push(u);return found.sort(stableOrder)};
}
function snapPosition(v){return Math.round(v*4096)/4096}
function resolveBodies(alive,positions){
 // Jacobi: unordered same-layer pairs, simultaneous corrections, inverse explicit mass.
 for(let pass=0;pass<8;pass++){
  const near=nearbyGrid(alive,positions),index=new Map(alive.map((u,i)=>[u,i])),delta=new Map(alive.map(u=>[u,{x:0,y:0}]));let maximum=0;
  for(const u of alive){const p=positions.get(u),ru=radiusOf(u);for(const v of near(p.x,p.y,ru+MAX_RADIUS)){if(index.get(v)<=index.get(u)||!canCollide(u,v))continue;const q=positions.get(v),rv=radiusOf(v),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),penetration=ru+rv-d;if(penetration<=.01)continue;maximum=Math.max(maximum,penetration);const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,iu=1/massOf(u),iv=1/massOf(v),a=delta.get(u),b=delta.get(v),correction=penetration+.005;a.x-=nx*correction*iu/(iu+iv);a.y-=ny*correction*iu/(iu+iv);b.x+=nx*correction*iv/(iu+iv);b.y+=ny*correction*iv/(iu+iv)}}
  for(const u of alive){const p=positions.get(u),d=delta.get(u),r=radiusOf(u),length=Math.hypot(d.x,d.y),scale=length>r*.5?r*.5/length:1;p.x=Math.max(r,Math.min(FIELD.w-r,p.x+d.x*scale));p.y=Math.max(r,Math.min(FIELD.h-r,p.y+d.y*scale));p.x=snapPosition(p.x);p.y=snapPosition(p.y)}
  if(maximum<.04)break;
 }
}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function spawnPosition(parent,spawnToken,alive){
 // A deterministic spiral, rotated by stable token. No shared RNG or array-order draws.
 const pr=radiusOf(parent),r=radiusOf({k:'goblin'}),start=hashString(spawnToken)%8,base=pr+r+3,forward=parent.originForward??(parent.y<=FIELD.h/2?1:-1);
 for(let ring=0;ring<6;ring++)for(let j=0;j<8;j++){
  const slot=(start+j)%8,angle=slot*Math.PI/4,dist=base+ring*(r*1.65),x=snapPosition(parent.x+Math.cos(angle)*dist),y=snapPosition(parent.y+Math.sin(angle)*forward*dist);
  if(x<r||x>FIELD.w-r||y<r||y>FIELD.h-r)continue;
  const free=alive.every(v=>!canCollide(v,{k:'goblin'})||Math.hypot(v.x-x,v.y-y)>=radiusOf(v)+r+1);
  if(free)return {x,y};
 }
 return null;
}
function combatEventSinkAvailable(){
 return (typeof combatEvents!=='undefined'&&Array.isArray(combatEvents))||typeof emitCombatEvent==='function';
}
function publishCombatEvent(event){
 const record=Object.freeze(event);
 if(typeof combatEvents!=='undefined'&&Array.isArray(combatEvents)){try{combatEvents.push(record)}catch(_){/* presentation buffers cannot abort combat */}return}
 if(typeof emitCombatEvent==='function'){try{emitCombatEvent(record)}catch(_){/* presentation hooks cannot change combat */}}
}
function step(dt){
 elapsed+=dt;
 const collectEvents=combatEventSinkAvailable();
 // Prior-tick summons enter before this snapshot; a summon requested below cannot act now.
 if(pendingSummons&&pendingSummons.length){
  const arrivals=pendingSummons;units.push(...arrivals);pendingSummons=[];
  if(collectEvents)for(const child of arrivals)publishCombatEvent({type:'summon_spawn',parentToken:child.ownerToken,childToken:tokenOf(child),k:child.k,side:child.side,x:child.x,y:child.y});
 }
 const alive=units.filter(u=>!u.dead).sort(stableOrder),pending=new Map(),moves=new Map(),attacks=[],spawnRequests=[],near=nearbyGrid(alive);
 const resolvedHits=collectEvents?[]:null,healIntents=collectEvents?new Map():null,damageByTarget=collectEvents?new Map():null,golemContacts=collectEvents?[]:null;
 function hit(u,n,ranged,sourceKind,sourceToken){
  const amount=n*(ranged?(TYPES[u.k].armor||1):1);
  pending.set(u,(pending.get(u)||0)-amount);
  if(collectEvents&&amount>0){resolvedHits.push({target:u,amount,sourceKind,sourceToken});damageByTarget.set(u,(damageByTarget.get(u)||0)+amount)}
 }
 const sideCounts=[0,0];for(const u of alive)sideCounts[u.side]++;
 for(const u of alive){
  tokenOf(u);if(u.originForward===undefined)u.originForward=u.y<=FIELD.h/2?1:-1;
  const t=TYPES[u.k];if(u.summonCharges===undefined)u.summonCharges=t.summonCharges||0;
  const enemies=alive.filter(v=>v.side!==u.side&&canTarget(u,v));moves.set(u,{x:u.x,y:u.y});u.cd-=dt;
  if(u.summonCharges>0){
   u.summonCd=(u.summonCd??t.summonInitialDelay??t.summonCooldown??0)-dt;
   if(u.summonCd<=0&&sideCounts[u.side]<TEAM_CAP){
    const spawnIndex=u.spawnCount??0,token=`${tokenOf(u)}/summon:${spawnIndex}`;
    const occupied=alive.concat(spawnRequests.map(s=>({k:'goblin',x:s.x,y:s.y,side:s.parent.side}))),pos=spawnPosition(u,token,occupied);
    if(pos){spawnRequests.push({parent:u,spawnIndex,token,...pos});u.spawnCount=spawnIndex+1;u.summonCharges--;u.summonCd=t.summonCooldown??4;sideCounts[u.side]++}
    else u.summonCd=.25;
   }
  }
  if(t.heal){
   const hurt=alive.filter(v=>v.side===u.side&&v.hp<TYPES[v.k].hp&&Math.hypot(v.x-u.x,v.y-u.y)<90+1e-7);
   if(hurt.length&&u.cd<=0){
    hurt.sort((a,b)=>a.hp/TYPES[a.k].hp-b.hp/TYPES[b.k].hp||stableOrder(a,b));const v=hurt[0];
    pending.set(v,(pending.get(v)||0)+t.heal);
    if(collectEvents){const list=healIntents.get(v)||[];list.push({source:u,amount:t.heal,sourceToken:tokenOf(u)});healIntents.set(v,list)}
    u.cd=t.rate;continue;
   }
  }
  if(!enemies.length)continue;
  const gap=v=>Math.hypot(v.x-u.x,v.y-u.y)-radiusOf(u)-radiusOf(v);
  let dist=Math.min(...enemies.map(gap));const target=enemies.filter(v=>Math.abs(gap(v)-dist)<1e-7).sort(stableOrder)[0];
  if(dist>t.reach+1/2048){
   let dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy),nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0;
   // Snapshot-local lateral avoidance. Only bodies which physically collide can block.
   const blocked=near(u.x,u.y,radiusOf(u)+MAX_RADIUS).some(v=>v!==u&&v!==target&&canCollide(u,v)&&((v.x-u.x)*nx+(v.y-u.y)*ny)>0&&Math.hypot(v.x-u.x,v.y-u.y)<radiusOf(u)+radiusOf(v)+5);
   if(blocked){const turn=(u.priority??.25)<.5?-1:1,tx=ny*u.originForward*turn,ty=-nx*u.originForward*turn;nx+=tx*1.35;ny+=ty*1.35;const length=Math.hypot(nx,ny);nx/=length;ny/=length}
   const travel=Math.min(t.speed*dt,Math.max(0,dist-t.reach));moves.set(u,{x:u.x+nx*travel,y:u.y+ny*travel});
  }else if(u.cd<=0){u.cd=t.rate;attacks.push([u,target,t])}
 }
 for(const [u,target,t]of attacks){
  if(t.projectile){
   const sourceToken=tokenOf(u),targetToken=tokenOf(target);
   shots.push({side:u.side,k:u.k,sourceToken,x:u.x,y:u.y,target,damage:t.dmg,splash:t.splash||0,mask:t.attackTargetMask||['ground']});
   if(collectEvents)publishCombatEvent({type:'projectile_release',source:sourceToken,sourceToken,k:u.k,target:targetToken,targetToken,x:u.x,y:u.y});
  }else{
   hit(target,t.dmg,false,u.k,tokenOf(u));
   if(collectEvents&&u.k==='golem')golemContacts.push({source:u,target});
  }
 }
 resolveBodies(alive,moves);for(const u of alive){const p=moves.get(u);u.x=p.x;u.y=p.y}
 for(const s of shots){
  const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy);
  if(d<=210*dt+1e-7){
   if(s.splash)alive.filter(v=>v.side!==s.side&&s.mask.includes(layerOf(v))&&Math.hypot(v.x-s.target.x,v.y-s.target.y)<=s.splash+1e-7).forEach(v=>hit(v,s.damage,true,s.k,s.sourceToken));
   else if(!s.target.dead&&s.mask.includes(layerOf(s.target)))hit(s.target,s.damage,true,s.k,s.sourceToken);
   s.done=true;
  }else if(d>1e-8){s.x=snapPosition(s.x+dx/d*210*dt);s.y=snapPosition(s.y+dy/d*210*dt)}
 }
 shots=shots.filter(s=>!s.done);
 const resolvedHeals=[];
 for(const [u,delta]of pending){
  if(collectEvents){
   const intents=healIntents.get(u)||[];
   if(intents.length){
    const requested=intents.reduce((n,h)=>n+h.amount,0),damage=damageByTarget.get(u)||0;
    // Matches the existing net-delta HP formula, including heals that offset same-tick damage.
    let remaining=Math.max(0,Math.min(requested,TYPES[u.k].hp-u.hp+damage));
    for(const h of intents){const actual=Math.min(h.amount,remaining);if(actual>0)resolvedHeals.push({source:h.source,target:u,actualAmount:actual,sourceToken:h.sourceToken});remaining-=actual}
   }
  }
  u.hp=Math.min(TYPES[u.k].hp,u.hp+delta);if(u.hp<=0)u.dead=true;
 }
 if(collectEvents){
  for(const h of resolvedHits)publishCombatEvent({type:'resolved_hit',targetToken:tokenOf(h.target),source: h.sourceToken,sourceToken:h.sourceToken,sourceKind:h.sourceKind,x:h.target.x,y:h.target.y,amount:h.amount});
  for(const h of resolvedHeals)publishCombatEvent({type:'heal',source:h.sourceToken,sourceToken:h.sourceToken,target:tokenOf(h.target),targetToken:tokenOf(h.target),x:h.target.x,y:h.target.y,actualAmount:h.actualAmount});
  for(const c of golemContacts)publishCombatEvent({type:'golem_ground_contact',source:tokenOf(c.source),sourceToken:tokenOf(c.source),target:tokenOf(c.target),targetToken:tokenOf(c.target),x:c.target.x,y:c.target.y});
 }
 // Summons are independent after creation and persist when their summoner dies.
 // Tokens are based only on stable parent token + that parent's spawn count.
 const additions=[];for(const req of spawnRequests.sort((a,b)=>stableOrder(a.parent,b.parent)||a.spawnIndex-b.spawnIndex)){
  const {parent,token,x,y}=req;additions.push({token,id:token,ownerToken:tokenOf(parent),k:'goblin',side:parent.side,x,y,hp:TYPES.goblin.hp,cd:0,priority:parent.priority,dead:false,originForward:parent.originForward,summoned:true});
 }
 if(additions.length)pendingSummons=(pendingSummons||[]).concat(additions);
 const a=units.some(u=>!u.dead&&u.side===0)||(pendingSummons||[]).some(u=>u.side===0),b=units.some(u=>!u.dead&&u.side===1)||(pendingSummons||[]).some(u=>u.side===1);
 if(!a||!b||elapsed+1e-9>=60){winner=a&&!b?0:b&&!a?1:null;if(winner!==null){if(winner!==choice)mistakes++;else correct++}state='result';update()}
}
