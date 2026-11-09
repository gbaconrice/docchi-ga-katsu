from pathlib import Path
ROOT=Path(__file__).parent
MARKER='/* licensed-major-effects-v1:'
SEAMS=[
 ('function drawBossEffect(f){\n', 'function drawBossEffect(f){\n if(drawLicensedBossEffect(f))return;\n'),
 ('function drawPrimitiveEffect(f){\n', 'function drawPrimitiveEffect(f){\n if(drawLicensedPrimitiveEffect(f))return;\n'),
 ('function drawMaterialHit(x,y,age,face=1){\n', 'function drawMaterialHit(x,y,age,face=1){\n if(drawLicensedMaterialHit(x,y,age,face))return true;\n'),
]
def block():
 return MARKER+' appended licensed FX and visual-only dispatch. */\n'+(ROOT/'licensed-effect-registry.js').read_text()+'\n'+(ROOT/'major-effect-renderers.js').read_text()+'\n'+(ROOT/'corner-pillar-original.js').read_text().replace('function drawCornerPillarCues(', 'function drawOriginalCornerPillarCues(', 1)+'\n/* end-licensed-major-effects-v1 */\n'
def patch(source):
 if MARKER in source:return source
 anchor='function drawPrimitiveEffect(f){\n'
 if source.count(anchor)!=1:raise ValueError('Primitive seam changed')
 source=source.replace(anchor,block()+anchor,1)
 for old,new in SEAMS:
  if source.count(old)!=1:raise ValueError('Seam changed '+old)
  source=source.replace(old,new,1)
 old=(ROOT/'corner-pillar-original.js').read_text();new=(ROOT/'corner-pillar-licensed.js').read_text()
 if source.count(old)!=1:raise ValueError('Corner pillar seam changed')
 return source.replace(old,new,1)
def unpatch(source):
 if MARKER not in source:return source
 for old,new in SEAMS:
  if source.count(new)!=1:raise ValueError('Patched seam changed '+old)
  source=source.replace(new,old,1)
 old=(ROOT/'corner-pillar-original.js').read_text();new=(ROOT/'corner-pillar-licensed.js').read_text()
 if source.count(new)!=1:raise ValueError('Patched corner pillar changed')
 source=source.replace(new,old,1)
 a=source.index(MARKER);b=source.index('/* end-licensed-major-effects-v1 */\n',a)+len('/* end-licensed-major-effects-v1 */\n')
 return source[:a]+source[b:]
if __name__=='__main__':
 import sys
 if len(sys.argv)!=3:raise SystemExit('usage: patch-major-effect-art.py INPUT OUTPUT')
 Path(sys.argv[2]).write_text(patch(Path(sys.argv[1]).read_text()))
