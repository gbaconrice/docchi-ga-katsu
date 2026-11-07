"""Bridge new boss roots to ordinary cleanse and voluntary movement contracts.

Apply to the assembled source after boss delivery patches, before revision hashing.
The tick-start root object is retained so fresh/replaced statuses survive cleansing.
"""
def patch(s):
    def edit(old, new, count=1):
        nonlocal s
        assert s.count(old) == count, ('boss-status-interop', old[:140], s.count(old), count)
        s = s.replace(old, new)

    edit(" const slowSnapshot=new Map(alive.filter(v=>v.slowUntil>elapsed).map(v=>[v,v.slowUntil]));",
         " const bossRootSnapshot=new Map(alive.map(v=>[v,BossAbilities.active(v,'root',contactTick)]).filter(([,root])=>root));\n const slowSnapshot=new Map(alive.filter(v=>v.slowUntil>elapsed).map(v=>[v,v.slowUntil]));")
    edit("(slowSnapshot.has(v)||exposureSnapshot.has(v))&&!cleanseReserved.has(v)",
         "(slowSnapshot.has(v)||bossRootSnapshot.has(v)||exposureSnapshot.has(v))&&!cleanseReserved.has(v)")
    edit("||(slowSnapshot.get(b)??0)-(slowSnapshot.get(a)??0)||stableOrder(a,b)",
         "||Math.max(slowSnapshot.get(b)??0,(bossRootSnapshot.get(b)?.until??0)/60)-Math.max(slowSnapshot.get(a)??0,(bossRootSnapshot.get(a)?.until??0)/60)||stableOrder(a,b)")
    edit("cleanseIntents.push({source:u,target,previousUntil:slowSnapshot.get(target),exposure:exposureSnapshot.get(target)})",
         "cleanseIntents.push({source:u,target,previousUntil:slowSnapshot.get(target),bossRoot:bossRootSnapshot.get(target),exposure:exposureSnapshot.get(target)})")
    edit("}if(a.exposure&&a.target.exposureUntilTick===a.exposure.until",
         "}if(a.bossRoot&&a.target.bossStatuses?.root===a.bossRoot){delete a.target.bossStatuses.root;if(a.previousUntil===undefined&&collectEvents)publishCombatEvent({type:'slow_cleansed',sourceToken:tokenOf(a.source),targetToken:tokenOf(a.target),x:a.target.x,y:a.target.y,previousUntil:a.bossRoot.until/60,tick:contactTick});}if(a.exposure&&a.target.exposureUntilTick===a.exposure.until")

    # These two legacy paths deliberately bypass ordinary move boosts, but roots
    # must still stop their voluntary motion. Do not gate forced displacement.
    edit("(u.slowUntil>elapsed?t.retreatSpeed*u.slowFactor:t.retreatSpeed)*fieldMove(t)",
         "(u.slowUntil>elapsed?t.retreatSpeed*u.slowFactor:t.retreatSpeed)*fieldMove(t)*(BossAbilities.active(u,'root',contactTick)?0:1)")
    edit("*(u.chargeReady?1:moveFactor(u))*fieldMove(t);const travel=",
         "*(u.chargeReady?BossAbilities.active(u,'root',contactTick)?0:1:moveFactor(u))*fieldMove(t);const travel=")

    # A delayed hostile status must share damage's underground/phased boundary.
    # Friendly shields, boosts and other allied statuses remain available.
    edit("if(!v||v.dead||!Number.isFinite(duration)||!Number.isFinite(strength))return false;",
         "if(!v||v.dead||!Number.isFinite(duration)||!Number.isFinite(strength)||u.side!==v.side&&layerOf(v)==='underground')return false;")
    # Ordinary movement pulses use the same tick-start snapshot for bosses.
    edit("BossAbilities.begin({tick:contactTick,dt,units,alive,pending,moves,knockbacks,hit,",
         "BossAbilities.begin({tick:contactTick,dt,units,alive,pending,moves,knockbacks,moveBoosts,hit,")
    edit("TYPES[u.k].speed*clamp(m,0,5)*movementFactor(u,c.tick)*(o.fieldMove?",
         "TYPES[u.k].speed*clamp(m,0,5)*movementFactor(u,c.tick)*(u.summonMoveFactor??1)*(o.moveBoosts?.get(u)||1)*(o.fieldMove?")

    # All existing healing selectors/caps use the entity's real maximum HP.
    # For ordinary entities without an override this is exactly TYPES[k].hp.
    edit("v.hp<TYPES[v.k].hp", "v.hp<BossAbilities.maxHp(v)", 4)
    edit("a.hp/TYPES[a.k].hp-b.hp/TYPES[b.k].hp", "a.hp/BossAbilities.maxHp(a)-b.hp/BossAbilities.maxHp(b)", 2)
    edit("v.hp+(rationReserved.get(v)||0)<TYPES[v.k].hp", "v.hp+(rationReserved.get(v)||0)<BossAbilities.maxHp(v)")
    edit("TYPES[v.k].hp-v.hp-(rationReserved.get(v)||0)", "BossAbilities.maxHp(v)-v.hp-(rationReserved.get(v)||0)")
    edit("TYPES[v.k].hp-v.hp-(pending.get(v)||0)", "BossAbilities.maxHp(v)-v.hp-(pending.get(v)||0)")
    edit("TYPES[u.k].hp-u.hp-(pending.get(u)||0)", "BossAbilities.maxHp(u)-u.hp-(pending.get(u)||0)")
    edit("u.hp<t.hp", "u.hp<BossAbilities.maxHp(u)")
    edit("t.hp-u.hp-(pending.get(u)||0)", "BossAbilities.maxHp(u)-u.hp-(pending.get(u)||0)")

    # Share root/slow immunity across the old and new status systems without
    # adding stun/freeze immunity. A fresh boss root cannot retroactively block
    # an ordinary slow/root from the same tick; only the start snapshot applies.
    edit("const control=['stun','freeze','root','airborne'].includes(kind);",
         "if(kind==='root'&&(v.slowImmuneUntil||0)>elapsed)return false;\n  const control=['stun','freeze','root','airborne'].includes(kind);")
    edit("if(control)v.bossControlLock.control=c.tick+1+dur+90;",
         "if(control)v.bossControlLock.control=c.tick+1+dur+90;if(kind==='root')v.bossControlLock.root=c.tick+1+dur+90;")
    edit(" const bossRootSnapshot=new Map(",
         " const bossRootImmunitySnapshot=new Map(alive.filter(v=>(v.bossControlLock?.root||0)>contactTick).map(v=>[v,v.bossControlLock.root]));\n const bossRootSnapshot=new Map(")
    edit("if(u.dead||(u.slowImmuneUntil||0)>elapsed)continue;u.slowFactor=slow.factor;",
         "if(u.dead||(u.slowImmuneUntil||0)>elapsed||(bossRootImmunitySnapshot.get(u)||0)>contactTick)continue;u.slowFactor=slow.factor;")

    # Ordinary cadence delays affect unlaunched boss windups/cooldowns. Already
    # released combo/projectile/zone payloads and passive/death hooks are untouched.
    edit(" function movementFactor(u,tick){",
         " function applyCadenceDelay(u,seconds,tick){const s=spec(u);if(!s)return;const ticks=Math.round(seconds*60),st=state(u);if(st.cast)st.cast.due+=ticks;st.next=Math.max(tick+1,st.next||0)+ticks;if(s.cadence)s.cadence(u,ticks,tick);}\n function movementFactor(u,tick){")
    edit("settleDeath,reset,movementFactor,attackFactor", "settleDeath,reset,applyCadenceDelay,movementFactor,attackFactor")
    edit("u.cd=Math.max(0,u.cd)+a.t.cadenceDelay;u.cadenceImmuneUntil=",
         "u.cd=Math.max(0,u.cd)+a.t.cadenceDelay;BossAbilities.applyCadenceDelay(u,a.t.cadenceDelay,contactTick);u.cadenceImmuneUntil=")
    # Cyanrise's continuous spin has no scheduler cast, so expose its pulse clock.
    # Its no-delay timings remain 36,72,108... exactly as before.
    edit("color:'#58d5ff',tick(u,c){if(c.tick%36===0){area(u,c,70,0.32,8);",
         "color:'#58d5ff',cadence(u,ticks,tick){u.bossState.spinNext=(u.bossState.spinNext??Math.ceil((tick+1)/36)*36)+ticks;},tick(u,c){u.bossState.spinNext??=Math.ceil(c.tick/36)*36;if(c.tick>u.bossState.spinNext)u.bossState.spinNext+=Math.ceil((c.tick-u.bossState.spinNext)/36)*36;if(c.tick>=u.bossState.spinNext){u.bossState.spinNext=c.tick+36;area(u,c,70,0.32,8);")
    return patch_aegis(s)



def patch_aegis(s):
    """Share ordinary aegis assignment for new boss windup selection only.

    Locked windups, released actions and custom release-time rear-line/cluster
    selection retain their own documented targeting behavior.
    """
    def edit(old, new, count=1):
        nonlocal s
        assert s.count(old) == count, ('boss-aegis-interop', old[:140], s.count(old), count)
        s = s.replace(old, new)
    old = """  const redirect=aegisProviders.filter(g=>g.side!==u.side&&[g.aegisEnemyToken0,g.aegisEnemyToken1].includes(tokenOf(u))&&canTargetSnapshot(u,g)&&(aegisCounts.get(g)||0)<TYPES[g.k].aegisLimit&&Math.hypot(g.x-u.x,g.y-u.y)<=TYPES[g.k].aegisRadius+1e-7).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||stableOrder(a,b))[0];
  if(redirect){target=redirect;dist=gap(target);aegisCounts.set(redirect,(aegisCounts.get(redirect)||0)+1);aegisAssignments.set(u,redirect);const slot=redirect.aegisEnemyToken0===tokenOf(u)?0:1;if(!redirect['aegisClaimed'+slot]){redirect['aegisClaimed'+slot]=true;if(collectEvents)publishCombatEvent({type:'aegis_target_acquired',sourceToken:tokenOf(redirect),attackerToken:tokenOf(u),tick:contactTick,x:redirect.x,y:redirect.y});}}"""
    body=old.replace('target=redirect;dist=gap(target);','').removesuffix('}')+'return redirect;}return target;'
    helper=" function bossAegisTarget(u,target){const assigned=aegisAssignments.get(u);if(assigned)return assigned;\n"+body+"\n }\n"
    edit(old,"  target=bossAegisTarget(u,target);dist=gap(target);")
    edit(" const bossContext=BossAbilities.begin(",helper+" const bossContext=BossAbilities.begin(")
    edit("moves,knockbacks,moveBoosts,hit,breakWard:","moves,knockbacks,moveBoosts,redirectTarget:bossAegisTarget,hit,breakWard:")
    edit("const enemies=c.enemies(u),target=c.nearest(u,enemies);", "const enemies=c.enemies(u);let target=c.nearest(u,enemies);")
    edit("  if(c.gap(u,target)>s.range){c.move", "  if(c.redirectTarget)target=c.redirectTarget(u,target);\n  if(c.gap(u,target)>s.range){c.move")
    return s
