from pathlib import Path
ROOT=Path(__file__).parent
START='/* licensed-utility-effects-v1: separate ten-family visual module. */\n'
END='/* end-licensed-utility-effects-v1 */\n'
SEAMS=[('function drawLicensedPrimitiveEffect(f){\n','function drawLicensedPrimitiveEffect(f){\n if(drawLicensedUtilityEffect(f))return true;\n'),('function drawLicensedBossEffect(f){\n','function drawLicensedBossEffect(f){\n if(drawLicensedUtilityEffect(f))return true;\n')]
def block():return START+(ROOT/'utility-effect-registry.js').read_text()+'\n'+(ROOT/'utility-effect-renderers.js').read_text()+'\n'+END
def patch(source):
 if START in source:return source
 if 'const LICENSED_EFFECT_ART=' not in source:raise ValueError('Apply major module before utility module')
 anchor='function drawPrimitiveEffect(f){\n'
 if source.count(anchor)!=1:raise ValueError('Primitive seam changed')
 source=source.replace(anchor,block()+anchor,1)
 for a,b in SEAMS:
  if source.count(a)!=1:raise ValueError('Major utility seam changed')
  source=source.replace(a,b,1)
 return source
def exactunpatch(source):
 if START not in source:return source
 for a,b in SEAMS:
  if source.count(b)!=1:raise ValueError('Patched utility seam changed')
  source=source.replace(b,a,1)
 a=source.index(START);b=source.index(END,a)+len(END)
 return source[:a]+source[b:]
unpatch=exactunpatch
if __name__=='__main__':
 import sys
 if len(sys.argv)!=3:raise SystemExit('usage: patch-utility-effect-art.py INPUT OUTPUT')
 Path(sys.argv[2]).write_text(patch(Path(sys.argv[1]).read_text()))
