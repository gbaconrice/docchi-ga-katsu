from pathlib import Path

def patch(source: str) -> str:
    if '/* dark-claw-material-v1:' in source: return source
    if '/* crystal-hit-art-v1:' in source: raise ValueError('Rejected character-art patch must not be present')
    helper=Path(__file__).with_name('dark-claw-art-renderers.js').read_text()
    anchor='function drawBossEffect(f){\n'
    if source.count(anchor)!=1: raise ValueError('drawBossEffect seam changed')
    source=source.replace(anchor,helper+'\n'+anchor,1)
    lifetime=" const age=effectClockTick-f.tick,duration=effectLifetime(f);if(age<0||age>=duration)return;\n const t=age/duration,k=f.kind.slice(5)"
    replacement=" const age=effectClockTick-f.tick,duration=effectLifetime(f);if(age<0||age>=duration)return;\n if(isDarkClawEffect(f)){drawDarkClawEffect(f,age,duration);return;}\n const t=age/duration,k=f.kind.slice(5)"
    if source.count(lifetime)!=1: raise ValueError('boss lifetime guard changed')
    source=source.replace(lifetime,replacement,1)
    old="'boss_tail_sweep'].includes(f.kind);if(ground!==(layer==='ground'))continue;"
    new="'boss_tail_sweep'].includes(f.kind)||(isDarkClawEffect(f)&&effectLifetime(f)>=60);if(ground!==(layer==='ground'))continue;"
    if source.count(old)!=1: raise ValueError('combat effect layer seam changed')
    return source.replace(old,new,1)

def unpatch(source: str) -> str:
    if '/* dark-claw-material-v1:' not in source: return source
    helper=Path(__file__).with_name('dark-claw-art-renderers.js').read_text()
    if source.count(helper+'\n')!=1: raise ValueError('Dark claw helper has changed')
    source=source.replace(helper+'\n','',1)
    dispatch=" if(isDarkClawEffect(f)){drawDarkClawEffect(f,age,duration);return;}\n"
    if source.count(dispatch)!=1: raise ValueError('Dark claw dispatch has changed')
    source=source.replace(dispatch,'',1)
    new="'boss_tail_sweep'].includes(f.kind)||(isDarkClawEffect(f)&&effectLifetime(f)>=60);if(ground!==(layer==='ground'))continue;"
    old="'boss_tail_sweep'].includes(f.kind);if(ground!==(layer==='ground'))continue;"
    if source.count(new)!=1: raise ValueError('Dark claw layer has changed')
    return source.replace(new,old,1)

if __name__=='__main__':
    import sys
    if len(sys.argv)!=3: raise SystemExit('usage: patch-dark-claw-art.py INPUT OUTPUT')
    Path(sys.argv[2]).write_text(patch(Path(sys.argv[1]).read_text()))
