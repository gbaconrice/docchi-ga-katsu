"""Physical boss contacts opt into target defenses, not retired source on-hit abilities.

Applied to assembled HTML by build-source.py before CONTENT_REVISION is hashed.
The patch intentionally leaves magic, periodic, redirected and counter deliveries alone.
"""
def patch(s):
    def edit(old, new, count=1):
        nonlocal s
        assert s.count(old) == count, ('boss-delivery', old[:120], s.count(old), count)
        s = s.replace(old, new)

    # Separate delivery geometry from legacy source ability eligibility.
    edit("function hit(u,n,ranged,sourceKind,sourceToken,delivery='direct',action=null,barrierResolved=false){",
         "function hit(u,n,ranged,sourceKind,sourceToken,delivery='direct',action=null,barrierResolved=false){\n  const meleeContact=delivery==='melee'||delivery==='boss_melee',projectileContact=delivery==='projectile'||delivery==='boss_projectile',directProjectile=projectileContact&&(delivery==='boss_projectile'||!TYPES[sourceKind]?.splash);")
    edit("activeBarriers.has(u)&&delivery==='projectile'&&!TYPES[sourceKind]?.splash", "activeBarriers.has(u)&&directProjectile")
    edit("if(n>0&&delivery==='melee'&&targetLayers.get(u)==='ground'", "if(n>0&&meleeContact&&targetLayers.get(u)==='ground'")
    edit("if(delivery==='melee'&&TYPES[u.k].parryReduction", "if(meleeContact&&TYPES[u.k].parryReduction")
    edit("if(delivery==='projectile'||delivery==='counter_projectile'){", "if(projectileContact||delivery==='counter_projectile'){")
    edit("barrierAmount=delivery==='projectile'&&activeBarriers.has(u)&&!barrierConsumed.has(u)&&!TYPES[sourceKind]?.splash", "barrierAmount=directProjectile&&activeBarriers.has(u)&&!barrierConsumed.has(u)")
    edit("followupTeams.size&&(delivery==='melee'||delivery==='projectile')&&!(delivery==='projectile'&&TYPES[sourceKind]?.splash)", "followupTeams.size&&(meleeContact||directProjectile)")
    edit("if(amount>0&&delivery==='melee'&&TYPES[u.k].contactCounterDamage", "if(amount>0&&meleeContact&&TYPES[u.k].contactCounterDamage")
    edit("['melee','projectile','direct','cone','area','cleave','boss'].includes(delivery)", "['melee','projectile','direct','cone','area','cleave','boss','boss_melee','boss_projectile'].includes(delivery)", 2)
    edit("Math.min(600,n),delivery==='projectile',u.k,tokenOf(u),delivery", "Math.min(600,n),delivery==='projectile'||delivery==='boss_projectile',u.k,tokenOf(u),delivery")

    # Control helper is direct/magic unless a call explicitly selects contact geometry.
    edit("const hit = (u,t,c,m=1,status,duration=36) => { if(!live(t,c)) return; c.damage(u,t,c.power(u,m)); if(status)c.status(u,t,status,duration); };",
         "const hit = (u,t,c,m=1,status,duration=36,delivery='boss') => { if(!live(t,c)) return; const recipient=c.damage(u,t,c.power(u,m),delivery); if(status)c.status(u,recipient||t,status,duration); return recipient||t; };")
    edit("function radial(u,c,r,m,kind,duration=36,cap=6) { c.targets(u,r,cap).forEach(t=>hit(u,t,c,m,kind,duration)); }",
         "function radial(u,c,r,m,kind,duration=36,cap=6,delivery='boss') { c.targets(u,r,cap).forEach(t=>hit(u,t,c,m,kind,duration,delivery)); }")
    edit("radial(u,c,112,1,'root',42,8);", "radial(u,c,112,1,'root',42,8,'boss_projectile');")
    edit("fx(u,c,'claw',t,{radius:30,duration:16});hit(u,t,c);", "fx(u,c,'claw',t,{radius:30,duration:16});hit(u,t,c,1,null,0,'boss_melee');")
    edit("hit(u,t,n,.42,i===0?'freeze':null,38);", "hit(u,t,n,.42,i===0?'freeze':null,38,'boss_melee');")
    edit("forEach(v=>hit(u,v,n,.45));", "forEach(v=>hit(u,v,n,.45,null,0,'boss_projectile'));")
    edit("hit(u,t,c,1.25,'freeze',42);", "hit(u,t,c,1.25,'freeze',42,'boss_melee');")
    edit("hit(u,t,c,.8,'airborne',42);", "hit(u,t,c,.8,'airborne',42,'boss_melee');")
    edit("hit(u,t,n,1.3);", "hit(u,t,n,1.3,null,0,'boss_melee');")
    edit("c.breakShield(u,v);hit(u,v,c);", "c.breakShield(u,v);hit(u,v,c,1,null,0,'boss_melee');")
    edit("radial(u,n,105,.48,null,0,6);", "radial(u,n,105,.48,null,0,6,'boss_projectile');")
    edit("hit(u,t,c,1.2,'airborne',32);", "hit(u,t,c,1.2,'airborne',32,'boss_melee');")

    # Elemental combinations keep their magical follow-up components non-contact.
    edit("const hit = (u,t,c,m=1) => c.damage(u,t,c.power(u,m));", "const hit = (u,t,c,m=1,delivery='boss') => c.damage(u,t,c.power(u,m),delivery);")
    edit("cast(u,t,c){hit(u,t,c,.7);", "cast(u,t,c){hit(u,t,c,.7,'boss_melee');")
    edit("return;hit(u,t,cc,.4);fx", "return;hit(u,t,cc,.4,'boss_melee');fx")
    edit("hit(u,v,c,[1,.65,.45][i]);", "hit(u,v,c,[1,.65,.45][i],i===0?'boss_melee':'boss');")
    edit("hit(u,v,c,.7);burn(u,v,c,90,.15);", "hit(u,v,c,.7,'boss_melee');burn(u,v,c,90,.15);")

    # Basic body/claw strikes are contacts. Bursts, beams and reflected damage stay direct.
    edit("const strike = (u,t,c) => { if(t) c.damage(u,t,c.power(u)); };", "const strike = (u,t,c) => { if(t) c.damage(u,t,c.power(u),'boss_melee'); };")
    edit("const area = (u,c,r,m,cap=8) => c.targets(u,r,cap).forEach(t=>c.damage(u,t,c.power(u,m)));", "const area = (u,c,r,m,cap=8) => c.targets(u,r,cap).forEach(t=>c.damage(u,t,c.power(u,m),'boss_melee'));")
    edit("c.damage(u,e,c.power(u,before<c.maxHp(e)*0.2?2.5:1));", "c.damage(u,e,c.power(u,before<c.maxHp(e)*0.2?2.5:1),'boss_melee');")
    edit("c.damage(u,e,c.power(u,0.65));", "c.damage(u,e,c.power(u,0.65),'boss_melee');")
    edit("cc.damage(u,t,Math.min(160,cc.power(u,low?1.7:0.85)));", "cc.damage(u,t,Math.min(160,cc.power(u,low?1.7:0.85)),'boss_melee');")
    # Geometry belongs to the hit, not the source's retired attack metadata.
    edit("incoming(u,hit,c){if(hit.source&&c.type(hit.source)?.projectile)", "incoming(u,hit,c){if(['projectile','counter_projectile','boss_projectile'].includes(hit.delivery))")
    return s
