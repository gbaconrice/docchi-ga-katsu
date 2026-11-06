"""Conversation recovery of original revival prototype edits, NOT final integrated HTML.
Explicit INPUT OUTPUT required. Refuses overwrite. No regression claim for new output.
Original literal edit bodies retained; CLI/manifest handling simplified for recovery.
"""
from pathlib import Path
import re, hashlib, sys
source, destination = map(Path, sys.argv[1:3])
assert not destination.exists(), 'Do not overwrite recovered evidence'
s = source.read_text()
def edit(a,b):
 global s
 assert s.count(a)==1,(a[:120],s.count(a))
 s=s.replace(a,b)
edit('TYPES.tetherlash_adept.pullDistance=12;', '''TYPES.tetherlash_adept.pullDistance=12;
// Prototype: one successful revival per army, paid for with lower routine healing.
Object.assign(TYPES.candle_archdeacon,{groupHealAmount:12,groupHealCap:1,reviveRadius:90,reviveWindupTicks:90,reviveHpRatio:.25,reviveHpCap:60});''')
edit('for(const k of keys){if(TYPES[k].supportFollowCombatants', '''for(const k of keys){const t=TYPES[k];if(t.reviveRadius!==undefined&&(!(t.reviveRadius>0&&t.reviveRadius<=128)||!Number.isInteger(t.reviveWindupTicks)||t.reviveWindupTicks<60||t.reviveWindupTicks>180||!(t.reviveHpRatio>0&&t.reviveHpRatio<=.5)||!(t.reviveHpCap>0&&t.reviveHpCap<=100)||!t.supportOnly||t.dmg!==0||t.hasteExcluded!==true))throw Error('invalid-revive-contract:'+k);}
for(const k of keys){if(TYPES[k].supportFollowCombatants''')
edit('// Result facts use the authoritative simulation only; absent or tied evidence is omitted.', '''// Revival uses a new physical identity. Never clear death or reuse a retired replay ID.
function revivalRootToken(u){const owner=u?.ownerToken;return typeof owner==='string'&&String(u.token??u.id)===owner+'/revive:1'?owner:null;}
function revivalEligible(u,source){const t=TYPES[u.k];return u!==source&&u.dead&&u.side===source.side&&!u.ownerToken&&!u.summoned&&!u.revived&&!u.reviveClaimed&&t.dmg>0&&!t.splitCount&&!t.explosionDamage;}
function revivalPosition(corpse,occupied){
 const r=radiusOf(corpse),forward=corpse.originForward??(corpse.side===0?1:-1),start=hashString(tokenOf(corpse))%8;
 const fits=(x,y)=>x>=r&&x<=FIELD.w-r&&y>=r&&y<=FIELD.h-r&&occupied.every(v=>!canCollide(v,{k:corpse.k})||Math.hypot(v.x-x,v.y-y)>=radiusOf(v)+r+1);
 if(fits(corpse.x,corpse.y))return{x:corpse.x,y:corpse.y};
 for(let ring=1;ring<=3;ring++)for(let n=0;n<8;n++){const a=(start+n)*Math.PI/4,x=snapXPosition(corpse.x+Math.cos(a)*forward*ring*16),y=snapPosition(corpse.y+Math.sin(a)*ring*16);if(fits(x,y))return{x,y};}return null;
}
function revivalLife(corpse,pos,hp){
 const token=tokenOf(corpse)+'/revive:1',u={id:token,token,ownerToken:tokenOf(corpse),revived:true,k:corpse.k,side:corpse.side,...pos,hp,cd:Math.max(.75,TYPES[corpse.k].rate),priority:corpse.priority,originForward:corpse.originForward??(corpse.side===0?1:-1),dead:false};
 // Preserve finite lifetime resources, but discard poison, roots, wards and old action tokens.
 for(const k of ['summonCharges','summonCd','bookCharges','bookReadyTick','spawnCount','guardSpent','parrySpent','mushroomTrapPlaced','rationCharges','selfRepairRemaining','chargeReady','cornerStudySpent','deathExplosionSpent'])if(corpse[k]!==undefined)u[k]=corpse[k];
 if(corpse.burrowStage)u.burrowStage='done';return u;
}
// Result facts use the authoritative simulation only; absent or tied evidence is omitted.''')
edit("const key=String(sourceToken??''),source=initial.get(key);if(!source)","let key=String(sourceToken??'');if(!initial.has(key)){const revived=entities.find(u=>String(u.token??u.id??'')===key),root=revivalRootToken(revived),original=initial.get(root);if(original&&original.kind===revived.k&&original.side===revived.side)key=root;}const source=initial.get(key);if(!source)")
edit('const current=byToken.get(key);if(current&&!current.dead', "const current=byToken.get(key+'/revive:1')?.ownerToken===key?byToken.get(key+'/revive:1'):byToken.get(key);if(current&&!current.dead")
edit('const v=end.get(u.token);return n+', "const replacement=end.get(u.token+'/revive:1'),v=replacement&&revivalRootToken(replacement)===u.token&&replacement.k===u.k&&replacement.side===u.side?replacement:end.get(u.token);return n+")
edit(' const targetLayers=new Map(alive.map(u=>[u,layerOf(u)]));', ''' const reviveIntents=[],reviveReservedSides=new Set(units.filter(u=>u.reviveUsed||u.reviveDueTick!==undefined).map(u=>u.side));
 for(const u of units)if(u.dead&&u.reviveDueTick!==undefined){delete u.reviveDueTick;delete u.reviveTargetToken;}
 const targetLayers=new Map(alive.map(u=>[u,layerOf(u)]));''')
edit('  if(t.groupHealAmount){\n', '''  if(t.reviveRadius&&!u.ownerToken){
   if(u.reviveDueTick!==undefined){if(contactTick>=u.reviveDueTick)reviveIntents.push(u);continue;}
   if(!reviveReservedSides.has(u.side)&&contactTick>=(u.reviveRetryTick||0)&&elapsed+t.reviveWindupTicks/60<60){
    const corpse=units.filter(v=>revivalEligible(v,u)&&Math.hypot(v.x-u.x,v.y-u.y)<=t.reviveRadius+1e-7).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||stableOrder(a,b))[0];
    if(corpse){u.reviveTargetToken=tokenOf(corpse);u.reviveDueTick=contactTick+t.reviveWindupTicks;reviveReservedSides.add(u.side);if(collectEvents)publishCombatEvent({type:'revive_start',sourceToken:tokenOf(u),targetToken:tokenOf(corpse),tick:contactTick,dueTick:u.reviveDueTick,x:u.x,y:u.y});continue;}
   }
  }
  if(t.groupHealAmount){
''')
edit(' if(additions.length)pendingSummons=(pendingSummons||[]).concat(additions);', ''' if(additions.length)pendingSummons=(pendingSummons||[]).concat(additions);
 for(const source of reviveIntents){
  const t=TYPES[source.k],corpse=units.find(v=>tokenOf(v)===source.reviveTargetToken),occupied=units.filter(v=>!v.dead).concat(pendingSummons||[]);
  const allowed=!source.dead&&corpse&&revivalEligible(corpse,source)&&!units.some(v=>v.side===source.side&&v.reviveUsed)&&Math.hypot(corpse.x-source.x,corpse.y-source.y)<=t.reviveRadius+1e-7&&occupied.filter(v=>v.side===source.side).length<TEAM_CAP&&hasCreatedRoom(source.side)&&elapsed+1e-9<60;
  const pos=allowed?revivalPosition(corpse,occupied):null;
  if(pos){const child=revivalLife(corpse,pos,Math.max(1,Math.min(TYPES[corpse.k].hp*t.reviveHpRatio,t.reviveHpCap)*fieldHeal));corpse.reviveClaimed=true;source.reviveUsed=true;units.push(child);createdCounts[source.side]++;source.cd=t.rate;if(collectEvents)publishCombatEvent({type:'revive_complete',sourceToken:tokenOf(source),targetToken:tokenOf(corpse),childToken:tokenOf(child),tick:contactTick,x:child.x,y:child.y,hp:child.hp});}
  else if(collectEvents)publishCombatEvent({type:'revive_cancel',sourceToken:tokenOf(source),tick:contactTick,reason:source.dead?'source-dead':!allowed?'ineligible':'no-space',x:source.x,y:source.y});
  delete source.reviveDueTick;delete source.reviveTargetToken;source.reviveRetryTick=contactTick+30;
 }''')
edit(" if(state==='result')for(const u of units.filter(u=>TYPES[u.k].chargedShotWindupTicks).sort(stableOrder))endCharged(u,'battle-ended');", """ for(const u of units)if((u.dead||state==='result')&&u.reviveDueTick!==undefined){if(collectEvents)publishCombatEvent({type:'revive_cancel',sourceToken:tokenOf(u),tick:contactTick,reason:u.dead?'source-dead':'battle-ended',x:u.x,y:u.y});delete u.reviveDueTick;delete u.reviveTargetToken;}
 if(state==='result')for(const u of units.filter(u=>TYPES[u.k].chargedShotWindupTicks).sort(stableOrder))endCharged(u,'battle-ended');""")
edit('  const sourceUnits=new Map(units.map(u=>[u.id,u]));', """  const sourceUnits=new Map(units.map(u=>[u.id,u]));
  const revivalOwners=new Set(units.filter(u=>typeof u.ownerToken==='string'&&String(u.token??u.id)===u.ownerToken+'/revive:1').map(u=>u.ownerToken));""")
edit('if(deadAt.has(row[0])&&tick>=retireAt.get(row[0]))','if(deadAt.has(row[0])&&(tick>=retireAt.get(row[0])||revivalOwners.has(row[9])))')
edit('function orderedDrawUnits(){drawOrderCache.length=units.length;for(let i=0;i<units.length;i++)drawOrderCache[i]=units[i];drawOrderCache.sort(presentationOrder);return drawOrderCache;}', 'function orderedDrawUnits(){drawOrderCache.length=0;for(const u of units)if(!(u.dead&&u.reviveClaimed))drawOrderCache.push(u);drawOrderCache.sort(presentationOrder);return drawOrderCache;}')
s=s.replace('v.ownerToken!==undefined&&v.ownerToken!==null&&String(v.ownerToken).length>0)', 'v.ownerToken!==undefined&&v.ownerToken!==null&&String(v.ownerToken).length>0&&!revivalRootToken(v))')
s=s.replace('target.ownerToken!==undefined&&target.ownerToken!==null&&String(target.ownerToken).length>0)', 'target.ownerToken!==undefined&&target.ownerToken!==null&&String(target.ownerToken).length>0&&!revivalRootToken(target))')
edit('function licensedShieldFrame(u){\n  const registry=', '''function licensedShieldFrame(u){
  if(!u.dead&&u.reviveDueTick!==undefined){const r=LICENSED_CLIP_REGISTRIES[u.k];if(r)return VariableClips.samplePresentation(r,{nowMs:visualTime*1000,anticipatedContactAtMs:u.reviveDueTick*1000/60,moving:false,deadAtMs:null,hitAtMs:null,contactAtMs:null}).index;}
  const registry=''')
edit("  if(kind==='split_spawn')admitEffect('slime_split',event.x,event.y,face);", """  if(kind==='split_spawn')admitEffect('slime_split',event.x,event.y,face);
   if(kind==='revive_complete'){admitEffect('magic_sparkle',event.x,event.y-18,face);if(actor)visualFor(actor).contact=visualTime;}""")
edit("  let label = '', value = '', wide = false, timing = '', actionTone = 'attack';", """  let label = '', value = '', wide = false, timing = '', actionTone = 'attack';
  if (type.reviveRadius) addTrait(`軍で1戦1回、近くの初期兵1体を${comparisonTicks(type.reviveWindupTicks)}詠唱してHP${comparisonNumber(type.reviveHpRatio*100)}%・最大${type.reviveHpCap}で復活（召喚・支援専業・自爆・分裂は対象外）`, 'support');""")
s=re.sub(r'const CONTENT_REVISION="[0-9a-f]{64}"','const CONTENT_REVISION="'+'0'*64+'"',s)
revision=hashlib.sha256(('docchi-revival-prototype-v1\n'+s).encode()).hexdigest()
s=s.replace('const CONTENT_REVISION="'+'0'*64+'"','const CONTENT_REVISION="'+revision+'"')
destination.parent.mkdir(parents=True,exist_ok=True)
with destination.open('x') as out: out.write(s)
print('NEW UNTESTED reconstruction:',destination,'content revision:',revision)
