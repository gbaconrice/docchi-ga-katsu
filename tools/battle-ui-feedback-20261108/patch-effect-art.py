from pathlib import Path
import re

def patch(source):
    marker='// Ordinary combat cues use the same native-pixel material ramps as boss VFX.'
    if marker in source:
        return source
    code=(Path(__file__).resolve().parent/'effect-art-renderers.js').read_text()
    # Replace old functions in-place; no runtime wrapping, duplicated renderer or gameplay changes.
    names=['drawPrimitiveEffect','drawGuardIndicator','drawExposureIndicator','drawRootIndicator','drawHealingBlockIndicator','drawCornerPillarCues','drawBossStatus']
    def extract(text,name):
        start=text.index('function '+name+'(');brace=text.index('{',start);depth=0
        # These renderers contain no template literals or braces in comments/strings.
        for end in range(brace,len(text)):
            if text[end]=='{':depth+=1
            elif text[end]=='}':
                depth-=1
                if depth==0:return start,end+1
        raise ValueError(name)
    for name in names:
        a,b=extract(source,name);source=source[:a]+source[b:]
    anchor='// Boss cues are deterministic geometry sampled from recorded simulation events.'
    assert source.count(anchor)==1
    source=source.replace(anchor,code+'\n'+anchor)
    a=source.index("  if(!u.dead&&(flags&4))",source.index('function drawSprite('))
    b=source.index("  if(!(u.k in SPRITE_ROWS)",a)
    source=source[:a]+"  if(!u.dead&&drawOrdinaryMovementCues(u,flags))return true;\n"+source[b:]
    old="if(s.k==='spirit_fan_wolf'){ctx.fillStyle='#a7eff2';ctx.fillRect(Math.round(s.x)-2,Math.round(s.y)-19,4,3);return true;}"
    new="if(s.k==='spirit_fan_wolf'){const x=Math.round(s.x),y=Math.round(s.y)-18,p=BOSS_PIXEL_PALETTES.ice,face=Math.cos(s.angle??0)<0?-1:1;bossPixelPoly([[x-face*5,y-2],[x+face*5,y],[x-face*5,y+2],[x-face*2,y]],p[1]);bossPixelLine(x-face*2,y,x+face*3,y,p[4],1);return true;}"
    assert source.count(old)==1;source=source.replace(old,new)
    old="if(s.k==='frostmage'){ctx.fillStyle='#b6efff';ctx.beginPath();ctx.moveTo(s.x,s.y-21);ctx.lineTo(s.x+4,s.y-16);ctx.lineTo(s.x,s.y-11);ctx.lineTo(s.x-4,s.y-16);ctx.closePath();ctx.fill();return true;}"
    new="if(s.k==='frostmage'){bossPixelCrystal(Math.round(s.x),Math.round(s.y)-12,10,BOSS_PIXEL_PALETTES.ice,2);return true;}"
    assert source.count(old)==1;source=source.replace(old,new)
    projectile_anchor=" if(s.k==='wraith'&&LICENSED_CLIP_REGISTRIES.wraith)"
    assert source.count(projectile_anchor)==1
    source=source.replace(projectile_anchor," if(drawMaterialProjectile(s))return true;\n"+projectile_anchor)
    effect_anchor="function drawEffect(kind,x,y,age,face=1,angle=null){"
    assert source.count(effect_anchor)==1
    source=source.replace(effect_anchor,effect_anchor+"\n if(kind==='hit_spark')return drawMaterialHit(x,y,age,face);")
    start=source.index(" }else if(k==='meteor'){")
    end=source.index(" }else if(k==='fissure'){",start)
    source=source[:start]+" }else if(k==='meteor'){\n  bossPixelMeteor(x,y,dx,dy,len,r,frame,t);\n"+source[end:]
    return source

if __name__=='__main__':
    import sys
    assert len(sys.argv)==3
    src,out=map(Path,sys.argv[1:]);assert src.resolve()!=out.resolve()
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(patch(src.read_text()))
