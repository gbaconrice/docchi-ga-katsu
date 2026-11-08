"""Freeze corpse facing without changing combat, death animation, or revival."""
def patch(source):
    marker='// Corpses retain their death position and facing until genuine revival.'
    if marker in source:return source
    def replace(old,new):
        nonlocal source
        assert source.count(old)==1, f'dead motion anchor: {source.count(old)} {old[:90]}'
        source=source.replace(old,new)
    replace('function nearestFacingEnemy(u,list){\n', 'function nearestFacingEnemy(u,list){\n if(u.dead)return null;\n')
    replace('    if(!b.dead&&u.dead)v.death=visualTime;\n    const nearest=nearestFacingEnemy(u,units);', '    if(!b.dead&&u.dead)v.death=visualTime;\n    // Corpses retain their death position and facing until genuine revival.\n    // Keep the death clock running; only live actors may retarget or turn.\n    if(u.dead){if(v.death==null)v.death=visualTime;continue;}\n    const nearest=nearestFacingEnemy(u,units);')
    replace(' if(!actor||!BOSS_REPLACEMENT_ROLES.has(actor.k))return;', ' if(!actor||actor.dead||!BOSS_REPLACEMENT_ROLES.has(actor.k))return;')
    return source
