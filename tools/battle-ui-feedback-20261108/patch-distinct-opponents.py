"""Hard no shared opposing species, including summons; hard no repeated exact pair."""
HELPER=r'''const OpposingSpecies=(()=>{
 // Reserve every possible descendant; combat abilities are not disabled.
 const bossSpawns={slime:['slimelet'],slimelet:['slimelet'],golem:['stone_mason'],bone_crown_lich:['ashbone_swordsman']};
 function closure(kinds){const seen=new Set(kinds),queue=[...seen];for(let i=0;i<queue.length;i++){const k=queue[i],t=TYPES[k]||{},children=[...(bossSpawns[k]||[]),...(t.splitCount&&t.splitKind?[t.splitKind]:[]),...(t.summonCharges?['goblin']:[]),...(t.bookBatchCount?[t.bookSpawnKind||'goblin']:[])];for(const child of children)if(!seen.has(child)){seen.add(child);queue.push(child);}}return [...seen].sort();}
 function allowedAgainst(kinds){const occupied=new Set(closure(kinds)),cache=new Map();return k=>{if(!cache.has(k))cache.set(k,closure([k]).every(child=>!occupied.has(child)));return cache.get(k);};}
 function disjoint(left,right){const allowed=allowedAgainst(left);return right.every(allowed);}
 return {closure,allowedAgainst,disjoint};
})();
'''
def patch(source):
    if 'const OpposingSpecies=(()=>{' in source:return source
    def replace(old,new,count=1):
        nonlocal source
        assert source.count(old)==count, f'distinct anchor {source.count(old)} != {count}: {old[:110]}'
        source=source.replace(old,new)
    replace('const MatchupHistory=(()=>{',HELPER+'const MatchupHistory=(()=>{')
    replace("let rightPool=pool.filter(k=>hasAir||!(catalog[k].flying??k==='drake'));if(new Set(left).size===1&&round<=5)rightPool=rightPool.filter(k=>k!==left[0]);", "const compatible=OpposingSpecies.allowedAgainst(left);let rightPool=pool.filter(k=>compatible(k)&&(hasAir||!(catalog[k].flying??k==='drake')));\n  // Opposing armies must have disjoint species, including legal fallbacks.\n  if(!rightPool.length)throw Error('NO_DISTINCT_CHALLENGER');")
    replace('for(const roster of proposals){tried++;const spent=cost(roster)', 'for(const roster of proposals){tried++;if(roster.some(k=>!compatible(k)))continue;const spent=cost(roster)')
    replace("  if(!best)throw Error('NO_FEASIBLE_CHALLENGER');", "  if(!best)throw Error('NO_FEASIBLE_CHALLENGER');\n  if(!OpposingSpecies.disjoint(left,best))throw Error('SHARED_OPPOSING_SPECIES');")
    old="const pool=Object.keys(catalog).sort().filter(k=>stage>=(catalog[k].unlockStage??unlock[k]??1)&&(stage>5||catalog[k].earlyEligible===true||['sword','shield','spear','archer','rider','goblin','boar','slime'].includes(k))&&(hasAir||!(catalog[k].flying??k==='drake')))"
    replace(old,"const compatible=OpposingSpecies.allowedAgainst(left),pool=Object.keys(catalog).sort().filter(k=>compatible(k)&&stage>=(catalog[k].unlockStage??unlock[k]??1)&&(stage>5||catalog[k].earlyEligible===true||['sword','shield','spear','archer','rider','goblin','boar','slime'].includes(k))&&(hasAir||!(catalog[k].flying??k==='drake')))")
    replace('  const right=best.roster,summary=candidates.map', "  if(!OpposingSpecies.disjoint(left,best.roster))throw Error('SHARED_OPPOSING_SPECIES');\n  const right=best.roster,summary=candidates.map")
    a=source.index('  if(!choices.length){minimumUses=',source.index(' function select(left,candidates,history=[]'));b=source.index('  const run=diversity(',a)
    source=source[:a]+"  // No repeated matchup pair fallback, even for an exhausted test catalog.\n  if(!choices.length)throw Error('NO_UNSEEN_MATCHUP');\n"+source[b:]
    # Fresh-draw wrappers may already catch these errors. Keep their bounded retry.
    anchor="const candidateSeed=(args.seed+Math.imul(attempt,0x9e3779b9))>>>0,plan=generateCore({...args,seed:candidateSeed});"
    if anchor in source:replace(anchor,"const candidateSeed=(args.seed+Math.imul(attempt,0x9e3779b9))>>>0;let plan;try{plan=generateCore({...args,seed:candidateSeed});}catch(error){if(['NO_UNSEEN_MATCHUP','NO_DISTINCT_CHALLENGER','NO_FEASIBLE_CHALLENGER','NO_FEASIBLE_SINGLE_SPECIES_CHALLENGER'].includes(error.message))continue;throw error;}")
    return source
