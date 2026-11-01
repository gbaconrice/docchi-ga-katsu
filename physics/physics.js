// v10 horizontal combat: side 0 advances +x, side 1 advances -x; stats/caps unchanged.
const RADII={sword:9,shield:12,spear:9,archer:8,cannon:14,rider:15,healer:8,goblin:7,golem:25,drake:13,wraith:9,boar:14,bombbug:9,frostmage:8,stormmage:8,burrower:11,slime:16,slimelet:7,screech_cricket:8,reaper_mantis:13,spore_toad:17,rootwarden_treant:27,sky_harpooner:11,bounty_hound:11,siege_crab:28};
const REACH={sword:6,shield:3,spear:25,archer:132,cannon:102,rider:4,healer:72,goblin:4,golem:2,drake:12,wraith:63,boar:4,bombbug:5,frostmage:110,stormmage:95,burrower:5,slime:3,slimelet:3,screech_cricket:58,reaper_mantis:9,spore_toad:65,rootwarden_treant:5,sky_harpooner:145,bounty_hound:5,siege_crab:150};
for(const k of keys){TYPES[k].radius=RADII[k];TYPES[k].reach=REACH[k]}
const TEAM_CAP=32,GRID_SIZE=48,FIELD={w:480,h:538},MAX_RADIUS=Math.max(...Object.values(RADII));
function stableOrder(a,b){const p=(a.priority??0)-(b.priority??0),k=(a.k??'').localeCompare(b.k??'');if(p||k)return p||k;const ai=Number(a.id??0),bi=Number(b.id??0);if(Number.isFinite(ai)&&Number.isFinite(bi)&&ai!==bi)return ai-bi;return String(a.token??a.id??'').localeCompare(String(b.token??b.id??''))}
function tokenOf(u){if(u.token===undefined)u.token=String(u.id??`${u.side}:${u.k}:${u.priority??0}`);return String(u.token)}
function layerOf(u){return u.burrowStage==='underground'?'underground':TYPES[u.k].collisionLayer||'ground'}
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
// X reflection needs an odd tie rule about the field center, not absolute Math.round.
// Epsilon is in quantized units (under 3e-11 world px), only resolving float ties.
function snapXPosition(v){const q=(v-FIELD.w/2)*4096;return FIELD.w/2+(q<0?-1:1)*Math.floor(Math.abs(q)+.5+1e-7)/4096}
function resolveBodies(alive,positions){
 // Jacobi: unordered same-layer pairs, simultaneous corrections, inverse explicit mass.
 for(let pass=0;pass<8;pass++){
  const near=nearbyGrid(alive,positions),index=new Map(alive.map((u,i)=>[u,i])),delta=new Map(alive.map(u=>[u,{x:0,y:0}]));let maximum=0;
  for(const u of alive){const p=positions.get(u),ru=radiusOf(u);for(const v of near(p.x,p.y,ru+MAX_RADIUS)){if(index.get(v)<=index.get(u)||!canCollide(u,v))continue;const q=positions.get(v),rv=radiusOf(v),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),penetration=ru+rv-d;if(penetration<=.01)continue;maximum=Math.max(maximum,penetration);const nx=d>1e-8?dx/d:(u.originForward??(u.side===0?1:-1)),ny=d>1e-8?dy/d:0,iu=1/massOf(u),iv=1/massOf(v),a=delta.get(u),b=delta.get(v),correction=penetration+.005;a.x-=nx*correction*iu/(iu+iv);a.y-=ny*correction*iu/(iu+iv);b.x+=nx*correction*iv/(iu+iv);b.y+=ny*correction*iv/(iu+iv)}}
  for(const u of alive){const p=positions.get(u),d=delta.get(u),r=radiusOf(u),length=Math.hypot(d.x,d.y),scale=length>r*.5?r*.5/length:1;p.x=Math.max(r,Math.min(FIELD.w-r,p.x+d.x*scale));p.y=Math.max(r,Math.min(FIELD.h-r,p.y+d.y*scale));p.x=snapXPosition(p.x);p.y=snapPosition(p.y)}
  if(maximum<.04)break;
 }
}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function spawnPosition(parent,spawnToken,alive,kind='goblin'){
 // A deterministic spiral, rotated by stable token. No shared RNG or array-order draws.
 const pr=radiusOf(parent),r=radiusOf({k:kind}),start=hashString(spawnToken)%8,base=pr+r+3,forward=parent.originForward??(parent.side===0?1:-1);
 for(let ring=0;ring<6;ring++)for(let j=0;j<8;j++){
  const slot=(start+j)%8,angle=slot*Math.PI/4,dist=base+ring*(r*1.65),x=snapXPosition(parent.x+Math.cos(angle)*forward*dist),y=snapPosition(parent.y+Math.sin(angle)*dist);
  if(x<r||x>FIELD.w-r||y<r||y>FIELD.h-r)continue;
  const free=alive.every(v=>!canCollide(v,{k:kind})||Math.hypot(v.x-x,v.y-y)>=radiusOf(v)+r+1);
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
  if(collectEvents)for(const child of arrivals){publishCombatEvent({type:'summon_spawn',parentToken:child.ownerToken,childToken:tokenOf(child),k:child.k,side:child.side,x:child.x,y:child.y});if(child.splitChild)publishCombatEvent({type:'split_spawn',parentToken:child.ownerToken,childToken:tokenOf(child),k:child.k,side:child.side,x:child.x,y:child.y});}
 }
 const alive=units.filter(u=>!u.dead).sort(stableOrder),pending=new Map(),moves=new Map(),attacks=[],spawnRequests=[],near=nearbyGrid(alive);
 // Targetability is a shared tick-start snapshot, not actor iteration order.
 const targetLayers=new Map(alive.map(u=>[u,layerOf(u)]));
 const canTargetSnapshot=(a,b)=>(TYPES[a.k].attackTargetMask||['ground']).includes(targetLayers.get(b));
 const snapshotBodies=alive.map(v=>({k:v.k,x:v.x,y:v.y,burrowStage:targetLayers.get(v)==='underground'?'underground':undefined}));
 const forcedDeaths=new Set(),knockbacks=new Map(),slowIntents=[],cadenceIntents=[],poisonIntents=[];
 const wardProviders=alive.filter(u=>TYPES[u.k].wardRadius).map(u=>({u,x:u.x,y:u.y}));
 const startPositions=new Map(alive.map(u=>[u,{x:u.x,y:u.y}]));
 const resolvedHits=collectEvents?[]:null,healIntents=collectEvents?new Map():null,damageByTarget=collectEvents?new Map():null,golemContacts=collectEvents?[]:null;
 function hit(u,n,ranged,sourceKind,sourceToken,delivery='direct'){
  let amount=n*(ranged?(TYPES[u.k].armor||1):1);
  if(delivery==='melee'&&TYPES[u.k].parryReduction&&!u.parrySpent){u.parrySpent=true;const blocked=amount*TYPES[u.k].parryReduction;amount-=blocked;if(collectEvents)publishCombatEvent({type:'parry_block',sourceToken:tokenOf(u),attackerToken:sourceToken,x:u.x,y:u.y,blocked});}
  if(delivery==='projectile'){
   const p=startPositions.get(u),providers=wardProviders.filter(w=>w.u.side===u.side&&Math.hypot(w.x-p.x,w.y-p.y)<=TYPES[w.u.k].wardRadius+1e-7).sort((a,b)=>TYPES[b.u.k].wardReduction-TYPES[a.u.k].wardReduction||stableOrder(a.u,b.u));
   if(providers.length){const w=providers[0].u,blocked=amount*TYPES[w.k].wardReduction;amount-=blocked;if(collectEvents)publishCombatEvent({type:'ward_block',sourceToken:tokenOf(w),targetToken:tokenOf(u),x:u.x,y:u.y,blocked});}
  }
  pending.set(u,(pending.get(u)||0)-amount);
  if(collectEvents&&amount>0){resolvedHits.push({target:u,amount,sourceKind,sourceToken,delivery});damageByTarget.set(u,(damageByTarget.get(u)||0)+amount)}
 }
 // Existing poison is resolved with this tick's damage, even if its source died.
 for(const u of alive)while(u.poisonNextAt!==undefined&&u.poisonNextAt<=elapsed+1e-9&&u.poisonNextAt<=u.poisonUntil+1e-9){hit(u,u.poisonDps*.5,false,'spore_toad',u.poisonSourceToken,'poison');u.poisonNextAt+=.5;}
 const sideCounts=[0,0];for(const u of alive)sideCounts[u.side]++;
 for(const u of alive){
  tokenOf(u);if(u.originForward===undefined)u.originForward=u.side===0?1:-1;
  const t=TYPES[u.k];if(u.summonCharges===undefined)u.summonCharges=t.summonCharges||0;
  const enemies=alive.filter(v=>v.side!==u.side&&canTargetSnapshot(u,v));moves.set(u,{x:u.x,y:u.y});u.cd-=dt;
  if(t.chargeBonus&&u.chargeReady===undefined)u.chargeReady=true;
  if(t.burrowWarning){
   if(u.burrowStage===undefined&&enemies.length){
    const rear=enemies.slice().sort((a,b)=>(b.x-a.x)*u.originForward||Math.abs(a.y-u.y)-Math.abs(b.y-u.y)||stableOrder(a,b))[0];
    u.burrowStage='warning';u.burrowUntil=elapsed+t.burrowWarning;
    u.burrowX=Math.max(radiusOf(u),Math.min(FIELD.w-radiusOf(u),rear.x+u.originForward*(radiusOf(u)+radiusOf(rear)+6)));u.burrowY=Math.max(radiusOf(u),Math.min(FIELD.h-radiusOf(u),rear.y));
    if(collectEvents)publishCombatEvent({type:'burrow_warning',sourceToken:tokenOf(u),x:u.burrowX,y:u.burrowY,sourceX:u.x,sourceY:u.y,targetX:u.burrowX,targetY:u.burrowY,until:u.burrowUntil});
   }
   if(u.burrowStage==='warning'){
    if(elapsed+1e-9>=u.burrowUntil){u.burrowStage='underground';u.burrowUntil=elapsed+t.burrowTravel;moves.set(u,{x:u.burrowX,y:u.burrowY});if(collectEvents)publishCombatEvent({type:'burrow_start',sourceToken:tokenOf(u),x:u.x,y:u.y,targetX:u.burrowX,targetY:u.burrowY,until:u.burrowUntil});}
    continue;
   }
   if(u.burrowStage==='underground'){
    if(elapsed+1e-9<u.burrowUntil)continue;
    u.burrowStage='done';u.cd=Math.max(u.cd,.15);
    if(collectEvents)publishCombatEvent({type:'burrow_emerge',sourceToken:tokenOf(u),x:u.x,y:u.y});
   }
  }
  if(u.summonCharges>0){
   u.summonCd=(u.summonCd??t.summonInitialDelay??t.summonCooldown??0)-dt;
   if(u.summonCd<=0&&sideCounts[u.side]<TEAM_CAP){
    const spawnIndex=u.spawnCount??0,token=`${tokenOf(u)}/summon:${spawnIndex}`;
    const occupied=snapshotBodies.concat(spawnRequests.map(s=>({k:'goblin',x:s.x,y:s.y,side:s.parent.side}))),pos=spawnPosition(u,token,occupied);
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
  const preferred=t.targetPriority==='air'?enemies.filter(v=>targetLayers.get(v)==='air'):t.targetPriority==='child'?enemies.filter(v=>v.ownerToken!==undefined&&v.ownerToken!==null&&String(v.ownerToken).length>0):[];
  const targetPool=preferred.length?preferred:enemies;
  let dist=Math.min(...targetPool.map(gap));const target=targetPool.filter(v=>Math.abs(gap(v)-dist)<1e-7).sort(stableOrder)[0];
  if(dist>t.reach+1/2048){
   let dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy),nx=d>1e-8?dx/d:(u.originForward??(u.side===0?1:-1)),ny=d>1e-8?dy/d:0;
   // Snapshot-local lateral avoidance. Only bodies which physically collide can block.
   const blocked=near(u.x,u.y,radiusOf(u)+MAX_RADIUS).some(v=>v!==u&&v!==target&&targetLayers.get(u)===targetLayers.get(v)&&((v.x-u.x)*nx+(v.y-u.y)*ny)>0&&Math.hypot(v.x-u.x,v.y-u.y)<radiusOf(u)+radiusOf(v)+5);
   if(blocked){const turn=(u.priority??.25)<.5?-1:1,tx=ny*u.originForward*turn,ty=-nx*u.originForward*turn;nx+=tx*1.35;ny+=ty*1.35;const length=Math.hypot(nx,ny);nx/=length;ny/=length}
   const baseSpeed=u.chargeReady?t.chargeSpeed:t.speed,speed=u.slowUntil>elapsed?baseSpeed*u.slowFactor:baseSpeed;const travel=Math.min(speed*dt,Math.max(0,dist-t.reach));moves.set(u,{x:u.x+nx*travel,y:u.y+ny*travel});
  }else if(u.cd<=0){u.cd=t.rate;attacks.push([u,target,t])}
 }
 for(const [u,target,t]of attacks){
  const preferredStrike=(t.targetPriority==='air'&&targetLayers.get(target)==='air')||(t.targetPriority==='child'&&target.ownerToken!==undefined&&target.ownerToken!==null&&String(target.ownerToken).length>0);
  const attackDamage=t.dmg*(t.airDamageMultiplier&&targetLayers.get(target)==='air'?t.airDamageMultiplier:1);
  if(collectEvents&&preferredStrike)publishCombatEvent({type:'priority_strike',sourceToken:tokenOf(u),targetToken:tokenOf(target),k:u.k,priorityKind:t.targetPriority,x:target.x,y:target.y,damage:attackDamage});
  if(t.poisonRadius){
   if(collectEvents)publishCombatEvent({type:'poison_cloud',sourceToken:tokenOf(u),x:target.x,y:target.y,radius:t.poisonRadius});
   for(const v of alive)if(v.side!==u.side&&canTargetSnapshot(u,v)&&Math.hypot(v.x-target.x,v.y-target.y)<=t.poisonRadius+radiusOf(v)+1e-7)poisonIntents.push({target:v,sourceToken:tokenOf(u),t});
   hit(target,t.dmg,false,u.k,tokenOf(u));
  }else if(t.cadenceDelay){
   hit(target,t.dmg,false,u.k,tokenOf(u));cadenceIntents.push({target,sourceToken:tokenOf(u),t});
  }else if(t.explosionDamage){
   for(const v of alive)if(v.side!==u.side&&canTargetSnapshot(u,v)&&Math.hypot(v.x-u.x,v.y-u.y)<=t.explosionRadius+radiusOf(v)+1e-7)hit(v,t.explosionDamage,false,u.k,tokenOf(u));
   forcedDeaths.add(u);if(collectEvents)publishCombatEvent({type:'bomb_explode',sourceToken:tokenOf(u),x:u.x,y:u.y,radius:t.explosionRadius});
  }else if(t.chainCount){
   let from=u,next=target;const struck=new Set();
   for(let index=0;index<t.chainCount&&next;index++){
    hit(next,t.dmg*Math.pow(t.chainFalloff,index),true,u.k,tokenOf(u));struck.add(next);
    if(collectEvents)publishCombatEvent({type:'chain_link',sourceToken:tokenOf(u),fromToken:tokenOf(from),targetToken:tokenOf(next),x:from.x,y:from.y,targetX:next.x,targetY:next.y,fromX:from.x,fromY:from.y,toX:next.x,toY:next.y,index});
    from=next;const candidates=alive.filter(v=>v.side!==u.side&&!struck.has(v)&&canTargetSnapshot(u,v)&&Math.hypot(v.x-from.x,v.y-from.y)<=t.chainRange+1e-7);
    candidates.sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y)||stableOrder(a,b));next=candidates[0];
   }
  }else if(t.projectile){
   const sourceToken=tokenOf(u),targetToken=tokenOf(target);
   shots.push({side:u.side,k:u.k,sourceToken,x:u.x,y:u.y,target,damage:attackDamage,splash:t.splash||0,mask:t.attackTargetMask||['ground'],...(t.slowDuration?{slowFactor:t.slowFactor,slowDuration:t.slowDuration,slowImmunity:t.slowImmunity}:{})});
   if(collectEvents)publishCombatEvent({type:'projectile_release',source:sourceToken,sourceToken,k:u.k,target:targetToken,targetToken,x:u.x,y:u.y});
  }else{
   hit(target,t.dmg+(u.chargeReady?t.chargeBonus:0),false,u.k,tokenOf(u),'melee');
   if(u.chargeReady){u.chargeReady=false;const dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy),push=knockbacks.get(target)||{x:0,y:0};const knock=t.knockback*Math.min(1,massOf(u)/massOf(target));push.x+=(d>1e-8?dx/d:(u.originForward??(u.side===0?1:-1)))*knock;push.y+=(d>1e-8?dy/d:0)*knock;knockbacks.set(target,push);if(collectEvents)publishCombatEvent({type:'charge_impact',sourceToken:tokenOf(u),targetToken:tokenOf(target),x:u.x,y:u.y,targetX:target.x,targetY:target.y});}
   if(collectEvents&&u.k==='golem')golemContacts.push({source:u,target});
  }
 }
 for(const [u,push]of knockbacks){const p=moves.get(u);p.x+=push.x;p.y+=push.y;}
 resolveBodies(alive,moves);for(const u of alive){const p=moves.get(u);u.x=p.x;u.y=p.y}
 for(const s of shots){
  const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy);
  if(d<=210*dt+1e-7){
   if(s.splash)alive.filter(v=>v.side!==s.side&&s.mask.includes(targetLayers.get(v))&&Math.hypot(v.x-s.target.x,v.y-s.target.y)<=s.splash+1e-7).forEach(v=>hit(v,s.damage,true,s.k,s.sourceToken,'projectile'));
   else if(!s.target.dead&&s.mask.includes(targetLayers.get(s.target))){hit(s.target,s.damage,true,s.k,s.sourceToken,'projectile');if(s.slowDuration)slowIntents.push({target:s.target,sourceToken:s.sourceToken,factor:s.slowFactor,duration:s.slowDuration,immunity:s.slowImmunity});}
   s.done=true;
  }else if(d>1e-8){s.x=snapXPosition(s.x+dx/d*210*dt);s.y=snapPosition(s.y+dy/d*210*dt)}
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
 for(const u of forcedDeaths){u.hp=0;u.dead=true;}
 for(const slow of slowIntents){const u=slow.target;if(u.dead||(u.slowImmuneUntil||0)>elapsed)continue;u.slowFactor=slow.factor;u.slowUntil=elapsed+slow.duration;u.slowImmuneUntil=u.slowUntil+slow.immunity;if(collectEvents)publishCombatEvent({type:'slow_applied',sourceToken:slow.sourceToken,targetToken:tokenOf(u),x:u.x,y:u.y,until:u.slowUntil,factor:u.slowFactor});}
 for(const a of cadenceIntents){const u=a.target;if(u.dead||(u.cadenceImmuneUntil||0)>elapsed)continue;u.cd=Math.max(0,u.cd)+a.t.cadenceDelay;u.cadenceImmuneUntil=elapsed+a.t.cadenceImmunity;if(collectEvents)publishCombatEvent({type:'cadence_delayed',sourceToken:a.sourceToken,targetToken:tokenOf(u),x:u.x,y:u.y,delay:a.t.cadenceDelay,immuneUntil:u.cadenceImmuneUntil});}
 for(const a of poisonIntents){const u=a.target;if(u.dead||(u.poisonImmuneUntil||0)>elapsed)continue;u.poisonUntil=elapsed+a.t.poisonDuration;u.poisonDps=a.t.poisonDps;u.poisonNextAt=elapsed+.5;u.poisonSourceToken=a.sourceToken;u.poisonImmuneUntil=u.poisonUntil+a.t.poisonImmunity;if(collectEvents)publishCombatEvent({type:'poison_applied',sourceToken:a.sourceToken,targetToken:tokenOf(u),x:u.x,y:u.y,until:u.poisonUntil,dps:u.poisonDps});}
 // Death splitting is requested after simultaneous damage, never by descendants.
 const splitAlive=alive.filter(u=>!u.dead);const splitCounts=[splitAlive.filter(u=>u.side===0).length,splitAlive.filter(u=>u.side===1).length];for(const req of spawnRequests)splitCounts[req.parent.side]++;
 for(const parent of alive){const t=TYPES[parent.k];if(!parent.dead||!t.splitCount||parent.splitDone)continue;parent.splitDone=true;let created=0;
  for(let i=0;i<t.splitCount&&splitCounts[parent.side]<TEAM_CAP;i++){
   const token=`${tokenOf(parent)}/split:${i}`,occupied=splitAlive.concat(spawnRequests.map(s=>({k:s.kind||'goblin',side:s.parent.side,x:s.x,y:s.y}))),pos=spawnPosition(parent,token,occupied,t.splitKind);
   if(!pos)continue;spawnRequests.push({parent,spawnIndex:i,token,kind:t.splitKind,splitChild:true,...pos});splitCounts[parent.side]++;created++;
  }
  if(collectEvents)publishCombatEvent({type:'slime_split',parentToken:tokenOf(parent),x:parent.x,y:parent.y,count:created});
 }
 if(collectEvents){
  for(const h of resolvedHits)publishCombatEvent({type:'resolved_hit',targetToken:tokenOf(h.target),source: h.sourceToken,sourceToken:h.sourceToken,sourceKind:h.sourceKind,delivery:h.delivery,x:h.target.x,y:h.target.y,amount:h.amount});
  for(const h of resolvedHeals)publishCombatEvent({type:'heal',source:h.sourceToken,sourceToken:h.sourceToken,target:tokenOf(h.target),targetToken:tokenOf(h.target),x:h.target.x,y:h.target.y,actualAmount:h.actualAmount});
  for(const c of golemContacts)publishCombatEvent({type:'golem_ground_contact',source:tokenOf(c.source),sourceToken:tokenOf(c.source),target:tokenOf(c.target),targetToken:tokenOf(c.target),x:c.target.x,y:c.target.y});
 }
 // Summons are independent after creation and persist when their summoner dies.
 // Tokens are based only on stable parent token + that parent's spawn count.
 const additions=[];for(const req of spawnRequests.sort((a,b)=>stableOrder(a.parent,b.parent)||a.spawnIndex-b.spawnIndex)){
  const {parent,token,x,y}=req,k=req.kind||'goblin';additions.push({token,id:token,ownerToken:tokenOf(parent),k,side:parent.side,x,y,hp:TYPES[k].hp,cd:0,priority:parent.priority,dead:false,originForward:parent.originForward,summoned:true,...(req.splitChild?{splitChild:true}:{})});
 }
 if(additions.length)pendingSummons=(pendingSummons||[]).concat(additions);
 const a=units.some(u=>!u.dead&&u.side===0)||(pendingSummons||[]).some(u=>u.side===0),b=units.some(u=>!u.dead&&u.side===1)||(pendingSummons||[]).some(u=>u.side===1);
 if(!a||!b||elapsed+1e-9>=60){winner=a&&!b?0:b&&!a?1:null;if(winner!==null){if(winner!==choice)mistakes++;else correct++}state='result';update()}
}
