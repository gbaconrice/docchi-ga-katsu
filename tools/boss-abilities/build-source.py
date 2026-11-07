from pathlib import Path
import re,json,hashlib
base=Path(__file__).resolve().parent
s=(base/'baseline.html').read_text()
changes=[]
def edit(a,b,n=1):
 global s
 assert s.count(a)==n,(a[:120],s.count(a),n)
 s=s.replace(a,b);changes.append({'anchor':a[:100],'matches':n})
modules='\n'.join((base/'modules'/f).read_text() for f in ['core.js','control.js','elemental.js','resilience.js','short-copy.js'])
# Exclude descendants from top-level roster; all49 main types retain IDs, art, price and boss classification.
modules+='''\nfor(const [id,spec] of BossAbilities.specs){if(TYPES[id]){TYPES[id].bossDamageScale=1;TYPES[id].bossAbilityVersion=1;for(const field of ['reflectionRatio','contactCounterDamage','parryReduction','guardRadius','aegisRadius','wardRadius','barrierWindupTicks','hasteRadius','singleWardRadius','movePulseRadius','followupMultiplier'])delete TYPES[id][field];}}\n'''
edit('function rng(s){return',modules+'\nfunction rng(s){return')
edit("function layerOf(u){return u.burrowStage==='underground'?", "function layerOf(u){return (u.bossPhaseUntil>Math.round(elapsed*60)||u.burrowStage==='underground')?")
edit('function radiusOf(u){return TYPES[u.k].radius}', 'function radiusOf(u){return TYPES[u.k].radius*(u.bossRadiusScale||1)}')
edit("const healingFactor=u=>fieldHeal*", "const healingFactor=u=>BossAbilities.healingFactor(u,contactTick)*fieldHeal*")
edit("const moveFactor=u=>(u.summonMoveFactor??1)*(moveBoosts.get(u)||1);", "const moveFactor=u=>(u.summonMoveFactor??1)*(moveBoosts.get(u)||1)*BossAbilities.movementFactor(u,contactTick)/(u.slowUntil>elapsed&&u.slowFactor?u.slowFactor:1);")
edit("['melee','projectile','direct','cone','area','cleave'].includes(delivery)", "['melee','projectile','direct','cone','area','cleave','boss'].includes(delivery)",2)
edit("  const singleWard=singleWards.get(u);", "  amount=BossAbilities.amount(u,sourceToken,amount,delivery);\n  const singleWard=singleWards.get(u);")
anchor=' // Existing poison is resolved with this tick\'s damage, even if its source died.'
edit(anchor," const bossContext=BossAbilities.begin({tick:contactTick,dt,units,alive,pending,moves,knockbacks,hit,breakWard:v=>{singleWards.delete(v);activeBarriers.delete(v);},healingFactor,healIntents,collect:collectEvents,terrain:field,fieldMove});\n"+anchor)
anchor='  const enemies=enemiesFor(u);moves.set(u,{x:u.x,y:u.y});'
edit(anchor,anchor+"\n  if(BossAbilities.handles(u)){BossAbilities.act(u,bossContext);continue;}\n  if(BossAbilities.blocked(u,contactTick))continue;")
edit("  u.cd-=haste===1?dt:dt*haste;", "  u.cd-=(haste===1?dt:dt*haste)*BossAbilities.attackFactor(u,contactTick);")
anchor="  const redirect=aegisProviders.filter"
edit(anchor,"  target=BossAbilities.redirectTarget(u,target,alive,contactTick);dist=gap(target);\n"+anchor)
edit(' resolveBodies(alive,moves);for(const u of alive){', ' BossAbilities.applyWalls(alive,moves);resolveBodies(alive,moves);BossAbilities.applyWalls(alive,moves);for(const u of alive){')
edit('Math.min(requested,TYPES[u.k].hp-u.hp+damage)', 'Math.min(requested,BossAbilities.maxHp(u)-u.hp+damage)')
edit('u.hp=Math.min(TYPES[u.k].hp,u.hp+delta)', 'u.hp=Math.min(BossAbilities.maxHp(u),u.hp+delta)')
edit(' // Resolve death bursts in simultaneous waves before splits, revivals and winner checks.', ' BossAbilities.settleDeath({pending});\n // Resolve death bursts in simultaneous waves before splits, revivals and winner checks.')
edit('if(!parent.dead||!t.splitCount||parent.splitDone)continue;', 'if(BossAbilities.handles(parent)||!parent.dead||!t.splitCount||parent.splitDone)continue;')
edit('function buildUnitComparisonFacts(type) {', 'function buildUnitComparisonFacts(type) {\n  const bossFacts=BossAbilities.facts(type);if(bossFacts)return bossFacts;')
fx=['warning','ring','burst','beam','chain','claw','throw','rain','frost','fire','poison','shield','quake','skull','grow','moon','wall','summon','stun','slash','thorn','beam_fire','beam_ice','firebird','column_light','column_fire','meteor','fissure','breath_ice','tail_sweep']
fx_literal=','.join(repr('boss_'+x) for x in fx)
edit("'exposure_cleansed'];", "'exposure_cleansed',"+fx_literal+"];")
edit("  if(e.type==='haste_changed'&&", "  if(e.type==='boss_effect'&&FX_KINDS.includes(e.kind))kind=e.kind;\n  else if(e.type==='haste_changed'&&")
edit("targetX:target?.x??e.x,targetY:target?.y??e.y", "targetX:e.type==='boss_effect'?e.targetX:target?.x??e.x,targetY:e.type==='boss_effect'?e.targetY:target?.y??e.y")
edit('Object.assign(EFFECT_META,{exposure_cleansed:{frames:1,fps:2}});', 'Object.assign(EFFECT_META,{exposure_cleansed:{frames:1,fps:2}});\nfor(const kind of '+json.dumps(['boss_'+x for x in fx])+')EFFECT_META[kind]={frames:1,fps:1.5};')
edit('function drawPrimitiveEffect(f){', 'function drawPrimitiveEffect(f){\n if(f.kind.startsWith("boss_")){drawBossEffect(f);return;}')
edit(" const BATTLE_LOG_EVENT_TONES=", " const BATTLE_LOG_EVENT_TONES=") if False else None
edit('// Presentation-only colors; recorded events, mechanics and replay payloads are unchanged.', "BATTLE_LOG_CATALOG.boss_ability={s:['sourceToken'],t:['targetToken'],text:'{source}：{name}',extra:{}};\n// Presentation-only colors; recorded events, mechanics and replay payloads are unchanged.")
edit("['neutral','status_expired unit_defeated battle_finished log_gap']", "['neutral','status_expired unit_defeated battle_finished log_gap boss_ability']")
edit('function buildUnitComparisonDisplayFacts(type) {', "function buildUnitComparisonDisplayFacts(type) {\n  const b=BossAbilities.facts(type);if(b){const k=Object.keys(TYPES).find(k=>TYPES[k]===type);return {...b,actionDetail:BOSS_SHORT_COPY[k]||b.ability,traits:[b.value],traitTones:[b.actionTone],timing:''};}")
edit("addStat('攻撃', facts.attackValue", "addStat(facts.attackLabel||'攻撃', facts.attackValue")
# New contacts drive actual licensed attack pose, rather than only a cosmetic ring.
edit("    if(LICENSED_CLIP_REGISTRIES[u.k]&&combatEvents.some(e=>licensedContactEvent(u,e)))v.contact=visualTime;", "    if(LICENSED_CLIP_REGISTRIES[u.k]&&combatEvents.some(e=>licensedContactEvent(u,e)||(BossAbilities.handles(u)&&e.type==='boss_ability'&&e.sourceToken===u.token)))v.contact=visualTime;")
# Rendering functions are declarative and consume the same append-only FX in recorded playback.
render=(base/'modules/presentation.js').read_text() if (base/'modules/presentation.js').exists() else 'function drawBossEffect(f){}'
edit('function drawCombatEffects(layer){',render+'\nfunction drawCombatEffects(layer){')
# Optional independently reviewed presentation/replay patch.
if (base/'patch-presentation.py').exists():
 import runpy
 s=runpy.run_path(str(base/'patch-presentation.py'))['patch'](s)
if (base/'patch-regression-compat.py').exists():
 import runpy
 s=runpy.run_path(str(base/'patch-regression-compat.py'))['patch'](s)
if (base/'patch-boss-delivery.py').exists():
 import runpy
 s=runpy.run_path(str(base/'patch-boss-delivery.py'))['patch'](s)
if (base/'patch-boss-status-interop.py').exists():
 import runpy
 s=runpy.run_path(str(base/'patch-boss-status-interop.py'))['patch'](s)
# Freeze unique content revision; existing old clients cannot join this altered simulation.
s=re.sub(r'const CONTENT_REVISION="[a-f0-9]{64}";', 'const CONTENT_REVISION="'+'0'*64+'";',s)
revision=hashlib.sha256(('docchi-boss-abilities-v1\0'+s).encode()).hexdigest()
s=s.replace('const CONTENT_REVISION="'+'0'*64+'";',f'const CONTENT_REVISION="{revision}";')
(base/'source/index.html').write_text(s)
(base/'build-changes.json').write_text(json.dumps({'changes':changes,'sourceSHA256':hashlib.sha256(s.encode()).hexdigest(),'contentRevision':revision},indent=2))
print('Built source',len(s),revision)
