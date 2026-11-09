"""Remove only the rejected continuous battle backing. Never upload or publish."""
from pathlib import Path
import hashlib,re,sys

def patch(source):
    marker='/* COMBAT_AUDIO_QUALITY_V1_BEGIN */'
    a=source.index(marker); b=source.index('/* COMBAT_AUDIO_QUALITY_V1_END */',a)
    code=source[a:b]
    edits=[
      ('    let ambientGain = null;\n    let ambientDuckGain = null;\n',''),
      ('    let ambientNodes = [];\n    let ambientLevel = 0;\n    let tavernNextNote = 0, tavernNote = 0;\n',''),
      ('    let lastDuckAt = -Infinity;\n',''),
      ('      for (const n of ambientNodes) releaseNode(n);\n      ambientNodes = [];\n      ambientGain = null;\n      ambientDuckGain = null;\n',''),
      ('        if(lane===\'impact\'&&[\'stone\',\'blast\',\'thunder\'].includes(picked.family))duckAmbient(.78,.24);\n',''),
      ("      duckAmbient(kind === 'bomb' ? 0.72 : 0.77, kind === 'bomb' ? 0.34 : 0.25);\n",''),
      ('        ambientLevel = 0;\n        setImmediately(ambientGain?.gain, 0);\n',''),
      ('      get ambientLevel() { return ambientLevel; }','      get ambientLevel() { return 0; }'),
    ]
    start=code.index('    function ambienceWanted() {')
    end=code.index('    function unlockFromGesture(event)',start)
    code=code[:start]+'''    function syncAmbient() {
      // Battle backing was removed: no sustained oscillator bed or repeated
      // melody. Keep lifecycle callers stable; event-driven effects still play.
    }

'''+code[end:]
    start=code.index('    function duckAmbient(')
    end=code.index('    function startVoice(',start)
    code=code[:start]+code[end:]
    for old,new in edits:
      assert code.count(old)==1,old
      code=code.replace(old,new)
    return source[:a]+code+source[b:]

if __name__=='__main__':
    src,out=map(Path,sys.argv[1:]); assert not out.exists()
    original=src.read_text(); updated=patch(original)
    # This revision is derived from all content, as in the existing builder.
    pat=r'(const CONTENT_REVISION=["\'])[a-f0-9]{64}(["\'];?)'
    normalized=re.sub(pat,lambda m:m[1]+'0'*64+m[2],updated)
    revision=hashlib.sha256(('docchi-boss-abilities-v1\0'+normalized).encode()).hexdigest()
    updated=re.sub(pat,lambda m:m[1]+revision+m[2],updated)
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(updated)
    print(hashlib.sha256(updated.encode()).hexdigest(),revision)
