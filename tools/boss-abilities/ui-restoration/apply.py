from pathlib import Path
import runpy

def patch(source):
    base=Path(__file__).resolve().parent
    for name in ['patch-copy.py','patch-layout.py','patch-layout-followup.py','patch-miss-animation.py']:
        source=runpy.run_path(str(base/name))['patch'](source)
    start=source.index('// Boss cues are deterministic geometry sampled from recorded simulation events.')
    end=source.index('function drawCombatEffects(layer)',start)
    assert source[start:end].strip()==(base/'original-presentation.js').read_text().strip(), 'Unexpected boss renderer; reconcile before replacing'
    return source[:start]+(base/'presentation.js').read_text()+'\n'+source[end:]
