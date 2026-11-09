"""Build a separate, minimal atlas extension without rewriting the shared registry."""
import importlib.util,inspect
from pathlib import Path
p=Path(__file__).with_name('build-licensed-effect-registry.py')
spec=importlib.util.spec_from_file_location('shared_fx_builder',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.PALETTES['rock']=['#24222a','#3b3437','#514746','#76675b','#a68b70','#d1b18a'];ns=dict(vars(m));ns['SPECS']={'f2_phoenixfire':(['original'],range(22,30),None),'smoke':(['ice'],range(9),None)}
body=inspect.getsource(m.build).replace("tools/licensed-effect-registry.js","tools/geometry-effect-registry.js").replace("major-tests/licensed-effect-provenance.json","major-tests/geometry-effect-provenance.json")
exec(body,ns);ns['build']()
out=p.with_name('geometry-effect-registry.js');s=out.read_text().replace('const LICENSED_EFFECT_ART=','Object.assign(LICENSED_EFFECT_ART,',1).replace('};\nObject.assign(EFFECT_ASSETS','});\nObject.assign(EFFECT_ASSETS',1);out.write_text(s)
# Refined broad-area sheets retain native resolution; the shared low-cost sheets stay immutable.
ns['SPECS']={'f2_phoenixfire':(['original'],range(22,30),None),'smoke':(['ice'],range(9),None),'bigfirehitspark':(['fire'],None,None),'animalslash':(['ice','fire','storm'],range(13,28),None),'bouldersphere':(['rock'],[16,17,18],[106,10,94,90])}
body=body.replace("factor=2 if max(cell)>=100 and name not in ['teleportpurpleorb','f2_deathstrikeseal','f6_bbs_stun','electricsphere'] else 1","factor=1")
exec(body,ns);ns['build']();s=out.read_text().replace('const LICENSED_EFFECT_ART=','Object.assign(LICENSED_EFFECT_ART,',1).replace('};\nObject.assign(EFFECT_ASSETS','});\nObject.assign(EFFECT_ASSETS',1)
for name in ['bigfirehitspark','animalslash']:
 s=s.replace('"'+name+'_','"geometry_'+name+'_').replace('"licensed_art_'+name+'_','"licensed_art_geometry_'+name+'_')
out.write_text(s)
# The readable boundary is deliberately exact geometry. Its pixel ramp is sampled
# from the authored halo, not a solid luminous area enlarged over the characters.
import json,math,io,base64,hashlib,plistlib,re
from PIL import Image
root=p.parent.parent
src=root/'assets/source/fx_energyhaloground.png';j=plistlib.loads(src.with_suffix('.plist').read_bytes());f=j['frames'][sorted(j['frames'])[4]];x,y,w,h=map(int,re.findall(r'-?\d+',f['frame'] if 'frame' in f else f['textureRect']));source=Image.open(src).convert('RGBA').crop((x,y,x+w,y+h))
meta={};assets={};payloads=[]
for pal in ['fire','gold','ice','stone','storm','green','blood']:
 im=Image.new('RGBA',(128,128));pix=im.load();ramp=[tuple(bytes.fromhex(c[1:])) for c in m.PALETTES[pal]]
 for yy in range(128):
  for xx in range(128):
   dx,dy=xx-63.5,yy-63.5;distance=math.hypot(dx,dy);band=distance-62.5
   if abs(band)>1.35:continue
   a=math.atan2(dy,dx);sx=round(39.5+math.cos(a)*38);sy=round(16+abs(math.sin(a))*14);sample=source.getpixel((max(0,min(79,sx)),max(0,min(31,sy))));lum=sample[0]*.2126+sample[1]*.7152+sample[2]*.0722;idx=max(2,min(3,int(lum*6/256)));color=ramp[idx if abs(band)<.8 else 0];pix[xx,yy]=(*color,235 if abs(band)<.8 else 170)
 b=io.BytesIO();im.save(b,format='PNG',optimize=True);data=b.getvalue();name='geometry_warning_'+pal;digest=hashlib.sha256(data).hexdigest();meta[name]={'frames':[[0,0,128,128,0,0,128,128]],'sequence':[0],'cell':[128,128],'size':[128,128],'source':'energyhaloground','palette':pal,'sha256':digest};assets['licensed_art_'+name]='data:image/png;base64,'+base64.b64encode(data).decode();payloads.append({'key':name,'mime':'image/png','bytes':len(data),'sha256':digest,'decodedRGBABytes':128*128*4,'sourcePNG_SHA256':hashlib.sha256(src.read_bytes()).hexdigest(),'sourceURL':'https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/resources/fx/fx_energyhaloground.png','license':'CC0-1.0','derivation':'Exact-radius pixel boundary; restrained ramp sampled from original halo frame 4. This is geometry with source-derived material, not an unmodified source animation.'})
out.write_text(out.read_text()+'\nObject.assign(LICENSED_EFFECT_ART,'+json.dumps(meta,separators=(',',':'))+');\nObject.assign(EFFECT_ASSETS,'+json.dumps(assets,separators=(',',':'))+');\n')
pro=root/'major-tests/geometry-effect-provenance.json';j=json.loads(pro.read_text());
for q in j['payloads']:
 if q['key'].startswith(('bigfirehitspark_','animalslash_')):q['key']='geometry_'+q['key']
j['payloads']+=payloads;j['totals']['decodedRGBABytes']+=sum(q['decodedRGBABytes'] for q in payloads);j['totals']['compressedPNGBytes']+=sum(q['bytes'] for q in payloads);j['totals']['jsBytes']=out.stat().st_size;pro.write_text(json.dumps(j,indent=2));print('Final geometry/refinement atlas MiB',j['totals']['decodedRGBABytes']/1048576)

import runpy
runpy.run_path(str(p.with_name('build-reviewed-utility-atlases.py')),run_name='__main__')
