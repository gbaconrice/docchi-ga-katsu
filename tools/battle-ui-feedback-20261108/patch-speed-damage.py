"""Tie primary damage to existing automatic 1x/2x/3x battle speed.
No overtime, no new UI label, no separate large-vs-large multiplier.
"""
def patch(source):
    def replace(old,new,count=1):
        nonlocal source
        found=source.count(old)
        if found!=count: raise ValueError(f'speed damage anchor expected {count}, found {found}: {old[:110]}')
        source=source.replace(old,new)
    if 'const BattleOvertime=' in source: raise ValueError('Remove superseded overtime patch before speed damage patch')
    replace('const BOSS_CLASH_DAMAGE_MULTIPLIER=2;\n','')
    replace("if(source&&TYPES[source.k]?.boss===true&&TYPES[target.k]?.boss===true&&!source.ownerToken&&!target.ownerToken&&!['boss_counter','boss_redirect','intercept','counter','reflect','counter_projectile'].includes(delivery))hit.amount*=BOSS_CLASH_DAMAGE_MULTIPLIER;",'')
    replace('/** Shared presentation pacing; no physics delta or winner changes. */','/** Shared automatic pacing and primary-damage factor. Fixed simulation ticks remain 60Hz. */')
    replace('sceneSeconds>=40?3:sceneSeconds>=20?2:1','sceneSeconds+1e-9>=40?3:sceneSeconds+1e-9>=20?2:1')
    replace('const FixedTickJob=(()=>{', '''// Automatic speed is the only new global damage factor; derived returns are not multiplied twice.
const BattleDamageSpeed=Object.freeze({
 factor:tick=>ReplayClock.effectiveSpeed(Math.max(0,tick)/60),
 scaleDamage(amount,tick,alreadyScaled=0){const factor=this.factor(tick),derived=alreadyScaled===true?amount:Math.max(0,Math.min(amount,Number(alreadyScaled)||0));return derived+(amount-derived)*factor;}
});
const FixedTickJob=(()=>{''')
    replace("function hit(u,n,ranged,sourceKind,sourceToken,delivery='direct',action=null,barrierResolved=false){", "function hit(u,n,ranged,sourceKind,sourceToken,delivery='direct',action=null,barrierResolved=false,speedDerived=0){")
    replace('const originalTarget=u;', 'const originalTarget=u;\n  n=BattleDamageSpeed.scaleDamage(n,contactTick,speedDerived);')
    replace('barrierHitIntents.push({u,n,ranged,sourceKind,sourceToken,delivery,action})', 'barrierHitIntents.push({u,n,ranged,sourceKind,sourceToken,delivery,action,speedDerived})')
    replace('h.sourceToken,h.delivery,h.action,true);', 'h.sourceToken,h.delivery,h.action,true,h.speedDerived);')
    replace('TYPES[u.k].hp*field.percent/200*terrainPulseCount', 'BattleDamageSpeed.scaleDamage(TYPES[u.k].hp*field.percent/200*terrainPulseCount,contactTick)')
    # Derived amounts already contain their triggering hit's multiplier. Fixed
    # counter attacks scale; mixed base+absorbed counters scale only base.
    replace("damage(u,v,n,delivery='boss'){", "damage(u,v,n,delivery='boss',speedDerived=['boss_counter','boss_redirect','intercept'].includes(delivery)){")
    replace("u.k,tokenOf(u),delivery);},\n   heal", "u.k,tokenOf(u),delivery,null,false,speedDerived);},\n   heal")
    replace("Math.min(90,absorbed*2),'counter');", "Math.min(90,absorbed*2),'counter',true);")
    replace("cc.damage(u,hit.source,reflect,'counter');", "cc.damage(u,hit.source,reflect,'counter',true);")
    replace("c.power(u,1.0)+(targets.length?g.absorbed/targets.length:0),'boss_melee');", "c.power(u,1.0)+(targets.length?g.absorbed/targets.length:0),'boss_melee',targets.length?g.absorbed/targets.length:0);")
    replace("tokenOf(c.source),'counter');", "tokenOf(c.source),'counter',null,false,c.reflectDamage!==undefined);")
    return source
