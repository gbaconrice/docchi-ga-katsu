"""Hide redundant event phases in presentation only and omit unavailable attribution."""
PREP='book_action_start defense_action_start aegis_action_start dispel_action_start burrow_warning melee_action_start combo_melee_start charged_shot_start moon_action_start orb_action_start pillar_action_start corner_pillar_start guard_warning high_action_start wave4_action_start revive_start'
LAUNCH='counter_bolt_release projectile_release pillar_release corner_pillar_release shockwave_release high_breath_release high_cleave_swing ground_burst cleave_release breath_release'
COMPLETE='book_action_end defense_action_end aegis_action_end dispel_action_end melee_action_end combo_melee_end charged_shot_end moon_action_end orb_action_end pillar_action_end corner_pillar_end high_action_end wave4_action_end'
def patch(s):
 if 'function battleLogVisibleRow(' in s:return s
 def once(a,b):
  nonlocal s
  assert s.count(a)==1,a[:120];s=s.replace(a,b,1)
 code="""// Preserve recorded events and replay data; filter only the displayed rows.
const BATTLE_LOG_PREPARATION=new Set('%s'.split(' '));
const BATTLE_LOG_LAUNCH=new Set('%s'.split(' '));
const BATTLE_LOG_COMPLETION=new Set('%s'.split(' '));
function battleLogVisibleRow(row){return !!row&&!BATTLE_LOG_PREPARATION.has(row.type)&&!BATTLE_LOG_LAUNCH.has(row.type)&&!(BATTLE_LOG_COMPLETION.has(row.type)&&row.data?.reason==='complete');}
"""%(PREP,LAUNCH,COMPLETE)
 once('const BattleLog=(()=>{',code+'const BattleLog=(()=>{')
 once("const actorText=a=>a?`${TYPES[a.kind]?.name||a.kind} #${a.ordinal}`:'対象不明';","const actorText=a=>a?`${TYPES[a.kind]?.name||a.kind} #${a.ordinal}`:'';")
 once("number(d.reduction*100):'不明'","number(d.reduction*100):''")
 once("String(args[k]??'不明')","String(args[k]??'')")
 marker="for(const m of template.matchAll(/\\{\\s*([^}]+?)\\s*\\}/g))"
 assert s.count(marker)==1
 clean=r'''// Missing attribution is omitted, never replaced with an invented actor.
  for(const [role,actor] of Object.entries(roles))if(!actor){
   const token='{'+role+'}';
   template=template.split(token+' → ').join('').split(' → '+token).join('');
   template=template.split(token+'から').join('').split(token+'への').join('').split(token+'の').join('').split(token+'が').join('').split(token+'を').join('').split(token+'へ').join('').split(token).join('');
  }
  template=template.replace(/^[\s：:→]+/,'');
  if(row.type==='ward_granted'&&!Number.isFinite(d.reduction))template=source&&target?'{source} → {target}：結界を付与':target?'{target}：結界を付与':'結界を付与';
  '''
 s=s.replace(marker,clean+marker)
 once('const view=battleLogView(),rows=view.rows,stats=view.stats,lastRow=rows[rows.length - 1]','const view=battleLogView(),rows=view.rows.filter(battleLogVisibleRow),stats=view.stats,lastRow=rows[rows.length - 1]')
 return s
