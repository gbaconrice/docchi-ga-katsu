"""Exact-anchor presentation patch, applied after core build integration."""
def patch(s):
 def edit(a,b,n=1):
  nonlocal s
  assert s.count(a)==n,('presentation anchor',a[:100],s.count(a),n)
  s=s.replace(a,b)
 # Keep all previous version gates, including the corner-cue schema.
 edit("const COMPACT_VERSION='first300-corner-presentation-v1';", "const PRE_BOSS_VERSION='first300-corner-presentation-v1';const COMPACT_VERSION='first300-boss49-v1';")
 edit('[COMPACT_VERSION,FIRST300_VERSION', '[COMPACT_VERSION,PRE_BOSS_VERSION,FIRST300_VERSION',4)
 edit('const cornerVersion=replay.engineVersion===COMPACT_VERSION;', 'const cornerVersion=[COMPACT_VERSION,PRE_BOSS_VERSION].includes(replay.engineVersion);')
 edit('compatibleRow=row=>row[2]<roleLimit&&(!legacy||row[11]<=63);', 'compatibleRow=row=>row[2]<roleLimit&&(replay.engineVersion===COMPACT_VERSION||row[11]<=65535)&&(!legacy||row[11]<=63);')
 edit("  if((legacy&&e[5].some(f=>f[0]>=17))", "  if(replay.engineVersion!==COMPACT_VERSION&&e[5].some(f=>f.length!==7||FX_KINDS[f[0]]?.startsWith('boss_')))throw Error('legacy-boss-extension');\n  if((legacy&&e[5].some(f=>f[0]>=17))")
 edit('FIRST290_VERSION,COMPACT_VERSION,ROLES,FX_KINDS', 'FIRST290_VERSION,PRE_BOSS_VERSION,COMPACT_VERSION,ROLES,FX_KINDS')
 edit('x<=65535&&(x&768)', 'x<=1073741823&&(x&768)')
 edit('Array.isArray(f)&&f.length===7&&f.every(finite)', "Array.isArray(f)&&[7,10].includes(f.length)&&(f.length===7||(FX_KINDS[f[0]]?.startsWith('boss_')&&f[7]>=1&&f[7]<=240&&Number.isInteger(f[8])&&f[8]>=1&&f[8]<=600&&Number.isInteger(f[9])&&f[9]>=0&&f[9]<=16777215))&&f.every(finite)")
 edit('Math.round(f.targetY??f.toY??f.y)]);', "Math.round(f.targetY??f.toY??f.y),...(f.kind.startsWith('boss_')?Object.values(bossEffectData(f)):[])]);")
 edit('effects=effects.filter(f=>tick-f[4]<48).slice(-24);', "effects=effects.filter(f=>tick-f[4]<(f.length===10?f[8]:48)).slice(-24);")
 edit('targetX:f[5],targetY:f[6]}))', 'targetX:f[5],targetY:f[6],...(f.length===10?{radius:f[7],duration:f[8],color:f[9]}:{})}))')
 edit(' return ((elapsed<(u.slowUntil||0)?1:0)', ' return bossPresentationFlags(u,elapsed)|((elapsed<(u.slowUntil||0)?1:0)')
 edit("targetY:e.type==='boss_effect'?e.targetY:target?.y??e.y});", "targetY:e.type==='boss_effect'?e.targetY:target?.y??e.y,...(e.type==='boss_effect'?bossEffectData(e):{})});")
 edit('targetX=x,targetY=y){\n const meta=EFFECT_META[kind]', 'targetX=x,targetY=y,details=null){\n const meta=EFFECT_META[kind]')
 edit('tick-f.tick<EFFECT_META[f.kind].frames/EFFECT_META[f.kind].fps*60', 'tick-f.tick<effectLifetime(f)')
 edit('const f={kind,x,y,face:face<0?-1:1,tick,targetX,targetY};', "const f={kind,x:Math.round(x),y:Math.round(y),face:face<0?-1:1,tick,targetX:Math.round(targetX),targetY:Math.round(targetY),...(kind.startsWith('boss_')?bossEffectData(details||{}):{})};")
 edit("  if(['cadence_delayed','parry_block','poison_cloud','poison_applied','ward_block'].includes(kind))", "  if(kind==='boss_effect')admitEffect(event.kind,event.x,event.y,face,effectClockTick,event.targetX??event.x,event.targetY??event.y,event);\n  if(kind==='boss_ability'&&actor){visualFor(actor).attack=visualTime;visualFor(actor).bossAttack=visualTime;}\n  if(['cadence_delayed','parry_block','poison_cloud','poison_applied','ward_block'].includes(kind))")
 edit("const ground=['ground_slam','burrow_warning','burrow_emerge'].includes(f.kind)", "const ground=['ground_slam','burrow_warning','burrow_emerge','boss_warning','boss_quake','boss_thorn','boss_poison','boss_ring','boss_wall','boss_summon'].includes(f.kind)")
 edit('function licensedShieldFrame(u){', "function licensedShieldFrame(u){\n  const bossV=visualFor(u),bossR=LICENSED_CLIP_REGISTRIES[u.k];if(!u.dead&&bossR&&Number.isFinite(bossV.bossAttack)&&visualTime-bossV.bossAttack<.5)return VariableClips.samplePresentation(bossR,{nowMs:visualTime*1000,contactAtMs:bossV.bossAttack*1000,moving:false,deadAtMs:null,hitAtMs:null,anticipatedContactAtMs:null}).index;")
 # Preserve the real sprite geometry; transforms are presentation-only.
 edit('ctx.translate(Math.round(u.x),Math.round(u.y)-hover);ctx.scale(visualFor(u).face,1);', "ctx.translate(Math.round(u.x),Math.round(u.y)-hover-((flags&262144)?25:0));ctx.scale(visualFor(u).face*bossRenderScale(u),bossRenderScale(u));if(flags&4194304)ctx.globalAlpha*=.35;if(flags&65536)ctx.filter='brightness(1.2) saturate(.25)';")
 edit('drawExposureIndicator(u);}', 'drawExposureIndicator(u);drawBossStatus(u);}')
 edit('  const flags=u.presentationFlags||0;\n', '  const flags=bossRenderFlags(u);\n')
 edit(' const max=Number(TYPES[u.k]?.hp);if(!(max>0))return;', ' const max=bossPresentationMaxHp(u);if(!(max>0))return;')
 edit('maxHP:TYPES[e.u.k]?.hp', 'maxHP:bossPresentationMaxHp(e.u)')
 edit('function draw(){const pass=', 'function drawBossScene(){const pass=')
 return s

if __name__=='__main__':
 import sys
 from pathlib import Path
 if len(sys.argv)>1:
  p=Path(sys.argv[1]);p.write_text(patch(p.read_text()))
 else:sys.stdout.write(patch(sys.stdin.read()))
