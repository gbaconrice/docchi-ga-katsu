"""Bounded late-round multi-boss escalation and large-vs-large combat only."""
def patch(source):
    def replace(old,new,count=1):
        nonlocal source
        found=source.count(old)
        if found!=count: raise ValueError(f'late boss patch anchor expected {count}, found {found}: {old[:100]}')
        source=source.replace(old,new)
    replace('const GrowthGenerator=(()=>{', '''// No stat inflation: later rounds spend on distinct large abilities, within the existing deployment ceiling.
const LateRoundPolicy=Object.freeze({version:'late-distinct-bosses-v1',bossCap:round=>round<11?1:3,budgetFloor:round=>round<11?0:40+4*Math.min(9,round-11),preferredBossCount:(round,roll)=>roll<.2+.04*Math.min(9,Math.max(0,round-11))?3:2});
const GrowthGenerator=(()=>{''')
    replace('/* Army rules: early rounds stay small so each unit is readable; one boss per army at most. */let headcountCap=64,carriedRosterSignature=null;', '/* R1–10: one boss. R11+: up to three distinct bosses. */let headcountCap=64,bossCap=1,carriedRosterSignature=null;')
    replace('kinds.filter(k=>catalog[k].boss===true).length>1', 'kinds.filter(k=>catalog[k].boss===true).length>bossCap||new Set(kinds.filter(k=>catalog[k].boss===true)).size!==kinds.filter(k=>catalog[k].boss===true).length')
    replace('if(Number.isSafeInteger(round)&&round>=1)headcountCap=headcountCapFor(round);', 'if(Number.isSafeInteger(round)&&round>=1){headcountCap=headcountCapFor(round);bossCap=LateRoundPolicy.bossCap(round);}')
    old="const base=carryKinds.slice(),left=base.slice();if(!left.length){const starters="
    new="""const base=carryKinds.slice(),left=base.slice();
  if(!left.length&&round>=11&&r()<.4){
   const budget=LateRoundPolicy.budgetFloor(round),large=pool.filter(k=>catalog[k].boss===true),wanted=LateRoundPolicy.preferredBossCount(round,r());
   // Reserve the cheapest remaining distinct bosses so every seeded pick fits.
   for(let n=0;n<wanted;n++){
    const remaining=wanted-n-1,choices=large.filter(k=>!left.includes(k)&&cost([...left,k])+large.filter(x=>x!==k&&!left.includes(x)).map(x=>catalog[x].estimateCost).sort((a,b)=>a-b).slice(0,remaining).reduce((a,b)=>a+b,0)<=budget&&fit([...left,k]));
    if(!choices.length)break;left.push(choices[Math.floor(r()*choices.length)]);
   }
  }
  if(!left.length){const starters="""
    replace(old,new)
    replace('round===1?firstBudget:18);', 'round===1?firstBudget:Math.max(18,LateRoundPolicy.budgetFloor(round)));')
    replace('Math.round(leftCost*(challengerMultiplier??rightMultiplier)))', 'Math.max(Math.min(LateRoundPolicy.budgetFloor(round),Math.ceil(leftCost*1.25)),Math.round(leftCost*(challengerMultiplier??rightMultiplier))))')
    replace('actualBand=[Math.floor(.8*boost*incumbentActual),Math.ceil(1.25*boost*incumbentActual)],estimatedBand=args.round===1?plan.band:[Math.floor(.8*boost*incumbentEstimated),Math.ceil(1.25*boost*incumbentEstimated)]', 'actualTarget=Math.max(boost*incumbentActual,Math.min(LateRoundPolicy.budgetFloor(args.round),Math.ceil(incumbentActual*1.25))),estimatedTarget=Math.max(boost*incumbentEstimated,Math.min(LateRoundPolicy.budgetFloor(args.round),Math.ceil(incumbentEstimated*1.25))),actualBand=[Math.floor(.8*actualTarget),Math.ceil(1.25*actualTarget)],estimatedBand=args.round===1?plan.band:[Math.floor(.8*estimatedTarget),Math.ceil(1.25*estimatedTarget)]')
    replace('const domains={mixed:0x4d495831,elite:0x454c5431,crowd:0x43524431};', "const domains={mixed:0x4d495831,elite:0x454c5431,crowd:0x43524431,...(args.round>=11?{bosses:0x424f5353}:{})},families=args.round>=11?['mixed','elite','crowd','bosses']:['mixed','elite','crowd'];")
    replace("for(const family of ['mixed','elite','crowd']){", "for(const family of families){")
    replace("   if(family==='mixed'){", """    if(family==='bosses'){
     const wanted=LateRoundPolicy.preferredBossCount(args.round,r()),large=pool.filter(k=>catalog[k].boss===true),ordinary=pool.filter(k=>!catalog[k].boss&&!support(k));
     for(let n=0;n<wanted;n++){const remaining=wanted-n-1,allowed=large.filter(k=>!kinds.includes(k)&&actual([...kinds,k])+large.filter(x=>x!==k&&!kinds.includes(x)).map(x=>catalog[x].cost).sort((a,b)=>a-b).slice(0,remaining).reduce((a,b)=>a+b,0)<=actualBand[1]&&cost([...kinds,k])+large.filter(x=>x!==k&&!kinds.includes(x)).map(x=>catalog[x].estimateCost).sort((a,b)=>a-b).slice(0,remaining).reduce((a,b)=>a+b,0)<=estimatedBand[1]&&normal.fit([...kinds,k]));if(!allowed.length)break;kinds.push(allowed[Math.floor(r()*allowed.length)]);}
     if(kinds.length!==wanted)reason='insufficient-budget-for-distinct-bosses';const supportPool=ordinary.filter(k=>actual([...kinds,k])<=actualBand[1]&&cost([...kinds,k])<=estimatedBand[1]);if(supportPool.length)kinds.push(supportPool[Math.floor(r()*supportPool.length)]);maxCount=supportPool.length?12:wanted;
    }
    if(family==='mixed'){""")
    replace("null,target=boost*incumbentEstimated;", "null,target=estimatedTarget;")
    replace("const pickFrom=historySelection.candidates,near=", "const bossChoices=historySelection.candidates.filter(c=>c.family==='bosses'),preferBosses=args.round>=11&&bossChoices.length&&random((args.seed^0x4c415445)>>>0)()<.5,pickFrom=preferBosses?bossChoices:historySelection.candidates,near=")
    replace("work:{...plan.work,extraCombinations:48}", "work:{...plan.work,extraCombinations:families.length*16}")
    replace("['normal','mixed','elite','crowd'].map(f=>", "['normal',...families].map(f=>")
    replace("['avoidance-fallback','history-alternative'].includes(best.family)", "['avoidance-fallback','history-alternative','bosses'].includes(best.family)")
    replace('normalAlwaysEligible:true,avoidanceFallback', 'normalAlwaysEligible:!preferBosses,avoidanceFallback')
    replace('extraAttempts:48,perPoolAttempts:16,domains,incumbentActual', 'extraAttempts:families.length*16,perPoolAttempts:16,domains,...(args.round>=11?{lateBossDecision:{version:LateRoundPolicy.version,bossCap:LateRoundPolicy.bossCap(args.round),budgetFloor:LateRoundPolicy.budgetFloor(args.round),preferred:!!preferBosses,candidates:bossChoices.length}}:{}),incumbentActual')
    replace('const BossAbilities=(()=>{', 'const BOSS_CLASH_DAMAGE_MULTIPLIER=2;\nconst BossAbilities=(()=>{')
    # Scale only direct damage between full-size large units. Do not amplify
    # already-derived reflection/redirect damage or small split/summoned bodies.
    # This remains inside the authoritative hit/defense pipeline for solo/replay.
    replace("hit={source,target,amount,delivery};if(source&&!spec(source))", "hit={source,target,amount,delivery};if(source&&TYPES[source.k]?.boss===true&&TYPES[target.k]?.boss===true&&!source.ownerToken&&!target.ownerToken&&!['boss_counter','boss_redirect','intercept','counter','reflect','counter_projectile'].includes(delivery))hit.amount*=BOSS_CLASH_DAMAGE_MULTIPLIER;if(source&&!spec(source))")
    return source
