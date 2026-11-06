"""NEW reconstruction of recovered ability contracts, not the lost final candidate.
Run on the inspected revival+summoner intermediate. Fails on mismatched anchors.
"""
from pathlib import Path
import hashlib, re, sys
source, destination = map(Path, sys.argv[1:3])
s = source.read_text()
def edit(old, new):
    global s
    assert s.count(old) == 1, (old[:120], s.count(old))
    s = s.replace(old, new)

edit('// Prototype: one successful revival per army, paid for with lower routine healing.', '// NEW reconstruction: one successful revival per army, paid for with lower routine healing.')
edit('TYPES.tetherlash_adept.pullDistance=12;', '''TYPES.tetherlash_adept.pullDistance=12;
// NEW reconstruction from retained ability evidence; baseline boss values unchanged.
Object.assign(TYPES.shellburst_arcade,{deathExplosionDamage:30,deathExplosionRadius:36,deathExplosionTargetCap:4});
Object.assign(TYPES.glasswing_sting_moth,{exposureMultiplier:1.2,exposureTicks:120,exposureLockTicks:210});''')
edit('// Revival uses a new physical identity.', '''function exposureActive(u,tick){return !u.dead&&(u.exposureStartTick??Infinity)<=tick&&tick<(u.exposureUntilTick??0);}
function clearExposure(u){delete u.exposureStartTick;delete u.exposureUntilTick;delete u.exposureMultiplier;delete u.exposureSourceToken;}
// Revival uses a new physical identity.''')
edit("for(const k of keys){const t=TYPES[k];if(t.reviveRadius!==undefined", """for(const k of keys){const t=TYPES[k];if(t.deathExplosionDamage!==undefined&&(k!=='shellburst_arcade'||t.deathExplosionDamage!==30||t.deathExplosionRadius!==36||t.deathExplosionTargetCap!==4))throw Error('invalid-death-explosion-contract:'+k);if(t.exposureTicks!==undefined&&(k!=='glasswing_sting_moth'||t.exposureMultiplier!==1.2||t.exposureTicks!==120||t.exposureLockTicks!==210))throw Error('invalid-exposure-contract:'+k);}
for(const k of keys){const t=TYPES[k];if(t.reviveRadius!==undefined""")
edit(' function endMeleeAction(u,reason){', ''' // Observe each exposure boundary before clearing its fields.
 for(const u of units){
  if(!u.dead&&Number.isSafeInteger(u.exposureUntilTick)&&u.exposureUntilTick<=contactTick)observeBattleLogExtra({type:'status_expired',targetToken:battleLogEntityToken(u),status:'exposure',tick:contactTick,untilTick:u.exposureUntilTick,reason:'expired'});
  if(!u.dead&&Number.isSafeInteger(u.exposureImmuneUntilTick)&&u.exposureImmuneUntilTick<=contactTick)observeBattleLogExtra({type:'status_expired',targetToken:battleLogEntityToken(u),status:'exposureImmunity',tick:contactTick,untilTick:u.exposureImmuneUntilTick,reason:'expired'});
  if(u.dead||(u.exposureUntilTick??Infinity)<=contactTick)clearExposure(u);
  if(u.dead||(u.exposureImmuneUntilTick??Infinity)<=contactTick)delete u.exposureImmuneUntilTick;
 }
 function endMeleeAction(u,reason){''')
edit(' for(const u of units)if(u.dead&&u.reviveDueTick!==undefined){delete u.reviveDueTick;delete u.reviveTargetToken;}', " for(const u of units)if(u.dead&&u.reviveDueTick!==undefined){if(collectEvents)publishCombatEvent({type:'revive_cancel',sourceToken:tokenOf(u),tick:contactTick,reason:'source-dead',x:u.x,y:u.y});delete u.reviveDueTick;delete u.reviveTargetToken;}")
edit(' const slowSnapshot=new Map(alive.filter(v=>v.slowUntil>elapsed).map(v=>[v,v.slowUntil]));', ''' const slowSnapshot=new Map(alive.filter(v=>v.slowUntil>elapsed).map(v=>[v,v.slowUntil]));
 const exposureSnapshot=new Map(alive.filter(v=>exposureActive(v,contactTick)).map(v=>[v,{until:v.exposureUntilTick,multiplier:v.exposureMultiplier,sourceToken:v.exposureSourceToken}])),exposureIntents=new Map();''')
edit('  let amount=n*(TYPES[sourceKind]?.bossDamageScale||1)*(followup?TYPES[sourceKind].followupMultiplier:1)*(ranged?(TYPES[u.k].armor||1):1);', '''  const exposure=exposureSnapshot.get(u),exposureFactor=exposure&&['melee','projectile','direct','cone','area','cleave'].includes(delivery)?exposure.multiplier:1;
  let amount=n*exposureFactor*(TYPES[sourceKind]?.bossDamageScale||1)*(followup?TYPES[sourceKind].followupMultiplier:1)*(ranged?(TYPES[u.k].armor||1):1);''')
edit("  if(amount>0&&remainingHpBeforeHit>0&&delivery==='melee'&&TYPES[sourceKind]?.healingBlockTicks)", """  if(amount>0&&remainingHpBeforeHit>0&&delivery==='melee'&&TYPES[sourceKind]?.exposureTicks&&(u.exposureImmuneUntilTick??0)<=contactTick){const attacker=alive.find(v=>tokenOf(v)===sourceToken);if(attacker&&attacker.side!==u.side){const t=TYPES[sourceKind],old=exposureIntents.get(u),candidate={source:attacker,multiplier:t.exposureMultiplier,ticks:t.exposureTicks,lockTicks:t.exposureLockTicks};if(!old||candidate.multiplier>old.multiplier||candidate.multiplier===old.multiplier&&(candidate.ticks>old.ticks||candidate.ticks===old.ticks&&stableOrder(attacker,old.source)<0))exposureIntents.set(u,candidate);}}
  if(amount>0&&remainingHpBeforeHit>0&&delivery==='melee'&&TYPES[sourceKind]?.healingBlockTicks)""")
edit('allies.filter(v=>slowSnapshot.has(v)&&!cleanseReserved.has(v)', 'allies.filter(v=>(slowSnapshot.has(v)||exposureSnapshot.has(v))&&!cleanseReserved.has(v)')
edit('||slowSnapshot.get(b)-slowSnapshot.get(a)||stableOrder(a,b));', '||(slowSnapshot.get(b)??0)-(slowSnapshot.get(a)??0)||stableOrder(a,b));')
edit('cleanseIntents.push({source:u,target,previousUntil:slowSnapshot.get(target)})', 'cleanseIntents.push({source:u,target,previousUntil:slowSnapshot.get(target),exposure:exposureSnapshot.get(target)})')

forced = " for(const u of forcedDeaths){const logWasDead=!!u.dead;u.hp=0;u.dead=true;if(!logWasDead)observeBattleLogExtra({type:'unit_defeated',targetToken:battleLogEntityToken(u),tick:contactTick,reason:'self-destruct'});}"
edit(forced, forced + '''
 // Resolve death bursts in simultaneous waves before splits, revivals and winner checks.
 let deathBurstWave=alive.filter(u=>u.dead&&TYPES[u.k].deathExplosionDamage&&!u.deathExplosionSpent&&!u.ownerToken&&!u.summoned&&!u.revived);
 while(deathBurstWave.length){
  pending.clear();insightDamageEvents.clear();
  const survivors=alive.filter(u=>!u.dead),nextWave=[];
  for(const source of deathBurstWave){
   source.deathExplosionSpent=true;const t=TYPES[source.k];
   const targets=survivors.filter(v=>v.side!==source.side&&targetLayers.get(v)==='ground'&&Math.hypot(v.x-source.x,v.y-source.y)<=t.deathExplosionRadius+radiusOf(v)+1e-7).sort((a,b)=>Math.hypot(a.x-source.x,a.y-source.y)-radiusOf(a)-(Math.hypot(b.x-source.x,b.y-source.y)-radiusOf(b))||stableOrder(a,b)).slice(0,t.deathExplosionTargetCap);
   if(collectEvents)publishCombatEvent({type:'death_explode',sourceToken:tokenOf(source),sourceKind:source.k,tick:contactTick,x:source.x,y:source.y,radius:t.deathExplosionRadius,count:targets.length});
   for(const v of targets)hit(v,t.deathExplosionDamage,false,source.k,tokenOf(source),'death_explosion');
  }
  for(const [u,delta]of pending){
   const before=Math.max(0,u.hp);u.hp+=delta;if(u.hp<=0)u.dead=true;
   if(u.dead)observeBattleLogExtra({type:'unit_defeated',targetToken:battleLogEntityToken(u),tick:contactTick,reason:'hp'});
   let remaining=Math.max(0,before-Math.max(0,u.hp));const records=insightDamageEvents.get(u)||[];
   if(new Set(records.map(r=>String(r.sourceToken??''))).size>1&&records.reduce((n,r)=>n+r.amount,0)>remaining+1e-9)BattleInsights.markIncomplete();
   for(const record of records){const credited=Math.min(remaining,record.amount);remaining-=credited;if(credited>0)BattleInsights.hit(record.sourceToken,u.side,credited,units);}
   if(u.dead&&TYPES[u.k].deathExplosionDamage&&!u.deathExplosionSpent&&!u.ownerToken&&!u.summoned&&!u.revived)nextWave.push(u);
  }
  deathBurstWave=nextWave.sort(stableOrder);
 }''')
edit(" // Cleanse only the tick-start slow; retained immunity gates any fresh slow normally.\n for(const a of cleanseIntents){if(a.target.dead)continue;a.target.slowUntil=elapsed;a.target.slowFactor=1;a.source.cleanseCd=TYPES[a.source.k].cleanseCooldown;if(collectEvents)publishCombatEvent({type:'slow_cleansed',sourceToken:tokenOf(a.source),targetToken:tokenOf(a.target),x:a.target.x,y:a.target.y,previousUntil:a.previousUntil,tick:contactTick});}", """ // Cleanse tick-start slow/root and exposure, retaining their immunity and poison.
 for(const a of cleanseIntents){if(a.target.dead)continue;if(a.previousUntil!==undefined){a.target.slowUntil=elapsed;a.target.slowFactor=1;if(collectEvents)publishCombatEvent({type:'slow_cleansed',sourceToken:tokenOf(a.source),targetToken:tokenOf(a.target),x:a.target.x,y:a.target.y,previousUntil:a.previousUntil,tick:contactTick});}if(a.exposure&&a.target.exposureUntilTick===a.exposure.until&&a.target.exposureSourceToken===a.exposure.sourceToken){clearExposure(a.target);if(collectEvents)publishCombatEvent({type:'exposure_cleansed',sourceToken:tokenOf(a.source),targetToken:tokenOf(a.target),x:a.target.x,y:a.target.y,tick:contactTick});}a.source.cleanseCd=TYPES[a.source.k].cleanseCooldown;}
 // New exposure becomes effective next tick, independent of actor iteration order.
 for(const [u,a]of [...exposureIntents].sort((a,b)=>stableOrder(a[0],b[0]))){if(u.dead||u.hp<=0||(u.exposureImmuneUntilTick??0)>contactTick)continue;u.exposureStartTick=contactTick+1;u.exposureUntilTick=contactTick+1+a.ticks;u.exposureImmuneUntilTick=contactTick+1+a.lockTicks;u.exposureMultiplier=a.multiplier;u.exposureSourceToken=tokenOf(a.source);if(collectEvents)publishCombatEvent({type:'exposure_applied',sourceToken:tokenOf(a.source),targetToken:tokenOf(u),tick:contactTick,startTick:u.exposureStartTick,untilTick:u.exposureUntilTick,multiplier:a.multiplier,x:u.x,y:u.y});}
 for(const u of units)if(u.dead){clearExposure(u);delete u.exposureImmuneUntilTick;}""")
edit('x:child.x,y:child.y,hp:child.hp});}', 'x:child.x,y:child.y,hp:child.hp,actualAmount:child.hp});}')
edit('// Display-only event history. It never changes unit state or consumes RNG.', '''Object.assign(BATTLE_LOG_CATALOG,{
 "revive_start":{"s":["sourceToken"],"t":["targetToken"],"text":"{source}が{target}の復活詠唱を開始","extra":{}},
 "revive_complete":{"s":["sourceToken"],"t":["childToken"],"text":"{source} → {target}：HP{actualAmount}で復活","extra":{"original":"targetToken"}},
 "revive_cancel":{"s":["sourceToken"],"t":[],"text":"{source}の復活詠唱が中断：{reason}","extra":{}},
 "death_explode":{"s":["sourceToken"],"t":[],"text":"{source}が死亡時爆発：地上の敵{count}体が範囲内","extra":{}},
 "exposure_applied":{"s":["sourceToken"],"t":["targetToken"],"text":"{source} → {target}：弱点露出（受ける通常攻撃{multiplier}倍）","extra":{}},
 "exposure_cleansed":{"s":["sourceToken"],"t":["targetToken"],"text":"{source}が{target}の弱点露出を解除","extra":{}}
});
// Display-only event history. It never changes unit state or consumes RNG.''')

# Append presentation capability without renumbering any existing replay effect ID.
edit("'priority_strike','wasp_poison','haste_ended'];", "'priority_strike','wasp_poison','haste_ended','exposure_cleansed'];")
edit('x>=0&&x<=32767&&(x&768)!==768', 'x>=0&&x<=65535&&(x&768)!==768')
edit('(!u.dead&&(u.guardImpactUntilTick??0)>Math.round(elapsed*60)?16384:0);', '(!u.dead&&(u.guardImpactUntilTick??0)>Math.round(elapsed*60)?16384:0)|(!u.dead&&(u.exposureStartTick??Infinity)<=Math.round(elapsed*60)&&Math.round(elapsed*60)<(u.exposureUntilTick??0)?32768:0);')
edit('function drawRootIndicator(u){', '''function drawExposureIndicator(u){
 if(u.dead||!((u.presentationFlags||0)&32768)||((u.presentationFlags||0)&2))return;
 const x=Math.max(10,Math.min(FIELD.w-10,u.x)),y=Math.max(10,u.y-28);
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#2c1828';ctx.fillRect(x-9,y-8,18,16);ctx.strokeStyle='#ffd27f';ctx.lineWidth=1.5;ctx.strokeRect(x-9,y-8,18,16);ctx.fillStyle='#fff2cf';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('弱',x,y);ctx.restore();
}
function drawRootIndicator(u){''')
edit('drawRootIndicator(u);drawGuardIndicator(u);', 'drawRootIndicator(u);drawGuardIndicator(u);drawExposureIndicator(u);')
edit("case 'bomb_explode': candidate", "case 'death_explode': case 'bomb_explode': candidate")
edit("if(kind==='bomb_explode')admitEffect", "if(kind==='bomb_explode'||kind==='death_explode')admitEffect")
edit('const EFFECT_CAPS={', "Object.assign(EFFECT_META,{exposure_cleansed:{frames:1,fps:2}});\nconst EFFECT_CAPS={exposure_cleansed:6,")
edit("  if(kind==='split_spawn')admitEffect('slime_split',event.x,event.y,face);", "  if(kind==='split_spawn')admitEffect('slime_split',event.x,event.y,face);\n  if(kind==='exposure_cleansed')admitEffect('exposure_cleansed',event.x,event.y-28,face);")
edit(" else if(f.kind==='burrow_warning'){", " else if(f.kind==='exposure_cleansed'){ctx.fillStyle='#193b3c';ctx.fillRect(x-9,y-8,18,16);ctx.strokeStyle='#b7fff1';ctx.strokeRect(x-9,y-8,18,16);ctx.fillStyle='#effffb';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('解',x,y);}\n else if(f.kind==='burrow_warning'){")
edit("  if (type.reviveRadius) addTrait(", """  if (type.deathExplosionDamage) addTrait(`初回の戦闘不能時、半径${type.deathExplosionRadius}の地上敵に${type.deathExplosionDamage}ダメージ（近い${type.deathExplosionTargetCap}体まで）`, 'attack');
  if (type.exposureTicks) addTrait(`近接命中で弱点露出：次の瞬間から${comparisonTicks(type.exposureTicks)}、受ける通常攻撃${comparisonNumber(type.exposureMultiplier)}倍（${comparisonTicks(type.exposureLockTicks)}再付与不可）`, 'control');
  if (type.reviveRadius) addTrait(""")

s = re.sub(r'const CONTENT_REVISION="[0-9a-f]{64}"', 'const CONTENT_REVISION="'+'0'*64+'"', s)
revision = hashlib.sha256(('docchi-new-ability-reconstruction-20261106-v1\n'+s).encode()).hexdigest()
s = s.replace('const CONTENT_REVISION="'+'0'*64+'"', 'const CONTENT_REVISION="'+revision+'"')
destination.write_text(s)
print('NEW ability reconstruction:', destination, 'SHA256:', hashlib.sha256(s.encode()).hexdigest(), 'revision:', revision)
