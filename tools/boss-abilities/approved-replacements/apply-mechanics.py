from pathlib import Path
import re,hashlib,json
base=Path(__file__).resolve().parent
KINDS=['fist_strike','fist_wave','pincer_snap','claw_block','claw_counter']
def patch(s):
 def edit(a,b,n=1):
  nonlocal s
  assert s.count(a)==n,(a[:90],s.count(a),n)
  s=s.replace(a,b)
 def region(start,end,file):
  nonlocal s
  a=s.index(start);b=s.index(end,a)
  s=s[:a]+(base/file).read_text().rstrip()+'\n'+s[b:]
 region("  register('gauntlet_combo_guard'","  register('rootwarden_treant'",'control-gauntlet.js')
 region("  register('kilnback_pincerbeast'","  register('carapace_slashbeast'",'control-pincer.js')
 region("  R('razorclaw_reaver'","  R('cleaver_brute'",'resilience-claws.js')
 edit("if(blocked(u,c.tick)){if(st.cast)","if(blocked(u,c.tick)){if(s.interrupt)s.interrupt(u,c);if(st.cast)")
 edit("st.cast={target:tokenOf(target),due:c.tick+Math.max(1,s.windup)};c.effect", "st.cast={target:tokenOf(target),due:c.tick+Math.max(1,s.windup)};if(s.motion)st.cast.start=c.tick;if(s.prepare)s.prepare(u,target,c);c.effect")
 # Append identifiers without renumbering any existing replay kind.
 edit("'breath_ice','tail_sweep'];", "'breath_ice','tail_sweep',"+','.join(repr(k) for k in KINDS)+"];")
 edit("'boss_breath_ice','boss_tail_sweep'];", "'boss_breath_ice','boss_tail_sweep',"+','.join(repr('boss_'+k) for k in KINDS)+"];")
 edit('function drawPrimitiveEffect(f){', 'for(const kind of '+json.dumps(['boss_'+k for k in KINDS])+')EFFECT_META[kind]={frames:1,fps:1.5};\nfunction drawPrimitiveEffect(f){')
 # New flag is for replayable, immediately cancellable guard state. It does not reuse a status bit.
 edit('x<=1073741823&&(x&768)!==768','x<=2147483647&&(x&768)!==768')
 edit("const scale=u.bossRadiusScale;if(Number.isFinite(scale)","if(u.bossState?.clawGuard&&!BossAbilities.blocked(u,tick)&&tick<(u.bossState.clawGuard.counterAt??u.bossState.clawGuard.until))bits|=1073741824;const scale=u.bossRadiusScale;if(Number.isFinite(scale)")
 for a,b in [("gauntlet_combo_guard:'敵を投げて群れを吹き飛ばす'","gauntlet_combo_guard:'連打と衝撃波で敵を押し返す'"),("kilnback_pincerbeast:'敵をつかんで持ち上げ潰す'","kilnback_pincerbeast:'巨大な鋏を閉じて重い一撃'"),("razorclaw_reaver:'捕まえた敵を盾にする'","razorclaw_reaver:'爪で防ぎ、開く勢いで反撃'")]:edit(a,b)
 return s
if __name__=='__main__':
 import sys
 s=patch(Path(sys.argv[1]).read_text())
 s=re.sub(r'const CONTENT_REVISION="[a-f0-9]{64}";', 'const CONTENT_REVISION="'+'0'*64+'";',s)
 revision=hashlib.sha256(('docchi-boss-abilities-v1\0'+s).encode()).hexdigest()
 s=s.replace('const CONTENT_REVISION="'+'0'*64+'";',f'const CONTENT_REVISION="{revision}";')
 Path(sys.argv[2]).write_text(s)
 print(json.dumps({'sha':hashlib.sha256(s.encode()).hexdigest(),'revision':revision}))
