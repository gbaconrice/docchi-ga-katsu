from pathlib import Path
ROOT=Path(__file__).parent
START='/* licensed-geometry-effects-v1 */\n'
END='/* end-licensed-geometry-effects-v1 */\n'
OLD='function drawLicensedBossEffect(f){\n'
NEW=OLD+' if(drawLicensedRefinedBoss(f)||drawLicensedGeometryEffect(f))return true;\n'
PRIMITIVE_OLD='function drawLicensedPrimitiveEffect(f){\n'
PRIMITIVE_NEW=PRIMITIVE_OLD+' if(drawLicensedRefinedPrimitive(f))return true;\n'
SEAMS=[(PRIMITIVE_OLD,PRIMITIVE_NEW),("{width:40,height:40,face}","{width:28,height:28,face}"),("'energyhaloground_gold',x,y,t,{width:r*2,height:r*2,alpha:.85,frame:licensedFxFrame('energyhaloground_gold',.3+t*.2)}","'geometry_warning_gold',x,y,t,{width:r*2,height:r*2,alpha:.85}"),("licensedFxColumn('beamlaser_gold',x,y,t,Math.max(22,r*2),42+Math.min(28,r));","drawLicensedEffectArt('beamtesla_gold',x,y,t,{crop:[0,0,110,360],width:Math.max(22,r*2),height:42+Math.min(28,r),anchorY:1,frame:licensedFxFrame('beamtesla_gold',t,16,29)});")]
def patch(source):
 if START in source:return source
 if source.count(OLD)!=1:raise ValueError('Major/shared stage required')
 block=START+(ROOT/'geometry-effect-registry.js').read_text()+'\n'+(ROOT/'geometry-effect-renderers.js').read_text()+'\n'+(ROOT/'refine-major-effect-renderers.js').read_text()+'\n'+END
 source=source.replace(OLD,block+NEW,1)
 for old,new in SEAMS:
  if source.count(old)!=1:raise ValueError('Refinement seam changed '+old)
  source=source.replace(old,new,1)
 return source
def unpatch(source):
 if START not in source:return source
 if source.count(NEW)!=1:raise ValueError('Geometry dispatch changed')
 for old,new in reversed(SEAMS):
  if source.count(new)!=1:raise ValueError('Refinement inverse seam changed '+new)
  source=source.replace(new,old,1)
 source=source.replace(NEW,OLD,1);a=source.index(START);b=source.index(END,a)+len(END)
 return source[:a]+source[b:]
exactunpatch=unpatch
if __name__=='__main__':
 import sys
 Path(sys.argv[2]).write_text(patch(Path(sys.argv[1]).read_text()))
