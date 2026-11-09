"""Append narrowly selected, source-canvas-correct support/blast clips to geometry assets."""
import importlib.util,json,plistlib,re,math,io,base64,hashlib
from pathlib import Path
from PIL import Image
import numpy as np
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',R/'tools/build-licensed-effect-registry.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.PALETTES['ember']=['#30272d','#543436','#854035','#b75a36','#db8b4b','#efba6c']
m.PALETTES['wall']=['#2b222c','#51413a','#78604c','#a38b6b','#c4ad83','#e0cca0']
meta={};assets={};payloads=[]
configs=[('bouldersphere','wall',[16,17,18],[106,10,94,90],'bouldersphere_wall'),('f4_shadownova','ember',list(range(13,21)),None,'death_smoke_ember'),('explosionorangesmoke','original',[1,2,3,4],None,'death_puff_original')]
for pal in ['green','ice','gold','storm','fire','blood','stone']:
 configs += [('cleanse',pal,[0],None,'cleanse_burst_'+pal),('cleanse',pal,list(range(2,8)),None,'cleanse_ripple_'+pal),('teleportrecallwhite',pal,[3,4,5,6,7,8,12,13],None,'arrival_'+pal)]
for name,pal,seq,crop,key in configs:
 png=R/f'assets/source/fx_{name}.png';plist=png.with_suffix('.plist');src=Image.open(png).convert('RGBA');entries=sorted(plistlib.loads(plist.read_bytes())['frames'].items());parts=[];area=0
 for i in seq:
  _,f=entries[i];x,y,w,h=m.rect(f.get('frame',f.get('textureRect')));sw,sh=m.rect(f.get('sourceSize',f.get('spriteSourceSize')));ox,oy,*_=m.rect(f.get('sourceColorRect','{{0,0},{'+str(w)+','+str(h)+'}}'))
  canvas=Image.new('RGBA',(sw,sh));canvas.paste(src.crop((x,y,x+w,y+h)),(ox,oy));cx,cy,cw,ch=crop or [0,0,sw,sh];part=canvas.crop((cx,cy,cx+cw,cy+ch));bbox=part.getchannel('A').getbbox() or (0,0,1,1);part=part.crop(bbox);parts.append((i,part,cx+bbox[0],cy+bbox[1]));area+=(part.width+2)*(part.height+2)
 cell=[sw,sh];width=max(max(p.width+2 for _,p,*_ in parts),min(1024,2**math.ceil(math.log2(math.sqrt(area)))));positions=[];x=y=rh=0
 for i,im,ox,oy in parts:
  if x+im.width+2>width:x=0;y+=rh;rh=0
  positions.append((i,im,ox,oy,x+1,y+1));x+=im.width+2;rh=max(rh,im.height+2)
 height=y+rh;atlas=Image.new('RGBA',(width,height));frames=[None]*len(entries)
 for i,im,ox,oy,x,y in positions:atlas.paste(im,(x,y));frames[i]=[x,y,im.width,im.height,ox,oy,im.width,im.height]
 if pal!='original':
  a=np.asarray(atlas).copy();lum=a[:,:,:3]@np.array([.2126,.7152,.0722]);idx=np.minimum(5,(lum*6/256).astype('uint8'));ramp=np.array([list(bytes.fromhex(c[1:])) for c in m.PALETTES[pal]],dtype='uint8');a[:,:,:3]=ramp[idx];a[a[:,:,3]==0,:3]=0;atlas=Image.fromarray(a)
 b=io.BytesIO();atlas.save(b,format='PNG',optimize=True);data=b.getvalue();sha=m.sha(data);meta[key]={'frames':frames,'sequence':seq,'cell':cell,'size':[width,height],'source':name,'palette':pal,'sha256':sha};assets['licensed_art_'+key]='data:image/png;base64,'+base64.b64encode(data).decode()
 payloads.append({'key':key,'mime':'image/png','bytes':len(data),'sha256':sha,'decodedRGBABytes':width*height*4,'sourcePNG_SHA256':m.sha(png.read_bytes()),'sourcePlistSHA256':m.sha(plist.read_bytes()),'sourceURL':f'https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/resources/fx/fx_{name}.png','license':'CC0-1.0','selectedSourceFrames':seq,'sourceCellCrop':crop,'role':'Reviewed blast / support clips, with source-canvas trim offsets restored'})
output=R/'tools/geometry-effect-registry.js';output.write_text(output.read_text()+'\nObject.assign(LICENSED_EFFECT_ART,'+json.dumps(meta,separators=(',',':'))+');\nObject.assign(EFFECT_ASSETS,'+json.dumps(assets,separators=(',',':'))+');\n')
pro=R/'major-tests/geometry-effect-provenance.json';j=json.loads(pro.read_text());j['payloads']+=payloads;j['totals']['decodedRGBABytes']+=sum(p['decodedRGBABytes'] for p in payloads);j['totals']['compressedPNGBytes']+=sum(p['bytes'] for p in payloads);j['totals']['jsBytes']=output.stat().st_size;j['totals']['decodedPixels']=j['totals']['decodedRGBABytes']//4;pro.write_text(json.dumps(j,indent=2));print('reviewed additional',len(payloads),sum(p['decodedRGBABytes'] for p in payloads)/1048576,'MiB')
