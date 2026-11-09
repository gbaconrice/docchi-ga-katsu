"""Repack only used licensed FX frames/crops, preserving original source files.
Character art is never an input. Source-frame indexes stay stable after packing.
"""
from pathlib import Path
from PIL import Image
import plistlib,re,json,hashlib,base64,io,math
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
PALETTES={
 'wood':['#1f2b22','#34452b','#526c3b','#78964b','#99b66b','#c3ce91'],
 'fire':['#49203c','#8d2b39','#d84d35','#fc813e','#ffc96a','#fff3c7'],
 'blood':['#341f38','#70253c','#a6384a','#d95658','#ff916d','#ffcf9a'],
 'ice':['#203a67','#3268a0','#45a9c7','#7dd9e2','#bbf7ec','#f1fff5'],
 'gold':['#4b2d55','#795575','#ba997a','#e7bd70','#ffe59b','#fff8cf'],
 'plum':['#321e34','#532137','#7b294e','#a64b68','#cf7b86','#e9aaa6'],
 'storm':['#351b58','#633280','#a14dac','#d57cda','#ecb1f4','#fff0ff'],
 'green':['#263437','#3d6553','#649e70','#9bc577','#d4e7aa','#f5ffda'],
 'stone':['#2d242b','#453338','#675147','#8c7358','#b0976d','#d3bd86']}
# Source ranges/crops reviewed directly; no source anticipation from another game.
SPECS={
 'beamlaser':(['ice','gold','storm'],range(13,29),None),
 'beamtesla':(['ice','storm','gold'],range(16,30),None),
 'bouldersphere':(['stone','gold'],[16,17,18],[106,10,94,90]),
 'heal':(['green','ice','gold','storm','fire','blood'],None,None),
 'searingchasm':(['fire'],None,None),
 'bigfirehitspark':(['original','fire'],None,None),
 'bluewatersplash':(['plum','ice'],None,None),
 'f5_tremor':(['stone'],None,None),
 'f6_chromaticcold':(['ice'],range(4,25),None),
 'animalslash':(['gold','ice','fire','storm','green','blood'],range(13,28),None),
 'impact':(['gold','stone'],range(5),None),
 'smoke':(['green','stone'],range(0,9),None),
 'energyhaloground':(['fire','gold','ice','stone','storm','green','blood'],None,None),
 'frozen':(['original'],[3,4,5,8,9],[0,5,80,71]),
 'roots':(['original','green','stone','wood'],[2,3,4,5,6],[0,8,58,62]),
 'defense':(['gold','ice','storm'],range(5),[35,15,33,37]),
 'deathplagueicon':(['green','storm'],None,[4,1,16,20]),
 'f6_bbs_stun':(['gold'],[22,23,24],[63,63,54,54]),
 'f2_deathstrikeseal':(['original','gold'],range(7,18),[44,48,92,96]),
 'teleportpurpleorb':(['ice','gold','green','storm'],range(6,12),[4,3,92,98]),
 'electricsphere':(['ice'],range(21,25),[16,45,60,60]),
 'flamesphere':(['fire','gold','blood'],range(12,25),None),
 'f2_eightgates_purpleflame':(['fire','blood'],range(5,11),[64,2,58,164]),
 'fireimpact':(['fire','blood'],None,None),
 'plasma':(['ice','green','storm'],range(8),None),
}
def sha(b):return hashlib.sha256(b).hexdigest()
def rect(s):return list(map(int,re.findall(r'-?\d+',s)))
def build():
 meta={};assets={};provenance=[];total_pixels=0;payloads=[]
 for name,(variants,selected,scrop) in SPECS.items():
  plist=ROOT/f'assets/source/fx_{name}.plist';png=plist.with_suffix('.png')
  if not png.exists() or not plist.exists():raise ValueError('Required source missing '+name)
  d=plistlib.loads(plist.read_bytes());im=Image.open(png).convert('RGBA');source=[]
  for key,f in sorted(d['frames'].items()):
   r=rect(f.get('frame',f.get('textureRect','')))
   if f.get('rotated',f.get('textureRotated',False)):raise ValueError('Rotated frame '+key)
   source.append(r)
  sequence=list(selected) if selected is not None else list(range(len(source)))
  cell=source[0][2:];packed=[];area=0;maxw=1
  for i in sequence:
   x,y,w,h=source[i];frame=im.crop((x,y,x+w,y+h));crop=scrop or [0,0,w,h];cx,cy,cw,ch=crop
   part=frame.crop((cx,cy,cx+cw,cy+ch));b=part.getchannel('A').getbbox()
   if not b:b=(0,0,1,1)
   part=part.crop(b);ox=cx+b[0];oy=cy+b[1];packed.append((i,part,ox,oy));area+=(part.width+2)*(part.height+2);maxw=max(maxw,part.width+2)
  width=min(1024,max(maxw,2**math.ceil(math.log2(max(1,math.sqrt(area))))));pos=[];px=py=rowh=0
  for i,part,ox,oy in packed:
   if px+part.width+2>width:px=0;py+=rowh;rowh=0
   pos.append((i,part,ox,oy,px+1,py+1));px+=part.width+2;rowh=max(rowh,part.height+2)
  height=py+rowh;atlas=Image.new('RGBA',(width,height));frames=[None]*len(source)
  for i,part,ox,oy,px,py in pos:atlas.paste(part,(px,py));frames[i]=[px,py,part.width,part.height,ox,oy]
  factor=2 if max(cell)>=100 and name not in ['teleportpurpleorb','f2_deathstrikeseal','f6_bbs_stun','electricsphere'] else 1
  if factor==2:
   # Scale each packed frame independently to avoid sampling neighbors.
   reduced=Image.new('RGBA',((width+1)//2,(height+1)//2));newframes=[None]*len(source)
   for i,part,ox,oy,px,py in pos:
    rw=(part.width+1)//2;rh=(part.height+1)//2;rx=px//2;ry=py//2
    reduced.paste(part.resize((rw,rh),Image.Resampling.NEAREST),(rx,ry));newframes[i]=[rx,ry,rw,rh,ox,oy,part.width,part.height]
   atlas=reduced;frames=newframes;width,height=atlas.size
  else:
   for f in frames:
    if f:f.extend(f[2:4])
  arr=np.asarray(atlas).copy();lum=np.clip(np.round(arr[:,:,0]*.2126+arr[:,:,1]*.7152+arr[:,:,2]*.0722),0,255).astype('uint8');idx=np.minimum(5,lum.astype('uint16')*6//256)
  for pal in variants:
   output=atlas
   if pal!='original':
    ramp=np.array([list(bytes.fromhex(c[1:])) for c in PALETTES[pal]],dtype='uint8');colored=arr.copy();colored[:,:,:3]=ramp[np.minimum(5,np.floor((lum.astype('float32')/255)**.48*6).astype('uint8'))] if pal=='stone' else ramp[idx];colored[colored[:,:,3]==0,:3]=0;output=Image.fromarray(colored)
   b=io.BytesIO();output.save(b,format='PNG',optimize=True);data=b.getvalue();key=name+'_'+pal;source_url=f'https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/resources/fx/fx_{name}.png'
   meta[key]={'frames':frames,'sequence':sequence,'cell':cell,'size':[width,height],'source':name,'palette':pal,'sha256':sha(data)}
   assets['licensed_art_'+key]='data:image/png;base64,'+base64.b64encode(data).decode();total_pixels+=width*height
   payloads.append({'key':key,'mime':'image/png','bytes':len(data),'sha256':sha(data),'decodedPixels':width*height,'decodedRGBABytes':width*height*4,'sourceURL':source_url,'license':'CC0-1.0','sourcePNG_SHA256':sha(png.read_bytes()),'sourcePlistSHA256':sha(plist.read_bytes()),'selectedSourceFrames':sequence,'sourceCellCrop':scrop,'role':'Presentation-only combat/status FX; never character art'})
  provenance.append({'name':name,'source_png_sha256':sha(png.read_bytes()),'source_plist_sha256':sha(plist.read_bytes()),'frames':len(source),'usedFrames':sequence,'source_commit':'2843f2400854136598631288c2e8dfb8f5173de7','license':'CC0-1.0'})
 text='/* licensed-effect-atlas-registry-v1: NEW trimmed FX only; original character bytes untouched. */\nconst LICENSED_EFFECT_ART='+json.dumps(meta,separators=(',',':'))+';\nObject.assign(EFFECT_ASSETS,'+json.dumps(assets,separators=(',',':'))+');\n'
 (ROOT/'tools/licensed-effect-registry.js').write_text(text)
 (ROOT/'major-tests/licensed-effect-provenance.json').write_text(json.dumps({'sources':provenance,'payloads':payloads,'totals':{'compressedPNGBytes':sum(p['bytes'] for p in payloads),'jsBytes':len(text),'decodedPixels':total_pixels,'decodedRGBABytes':total_pixels*4}},indent=2))
 print(json.dumps({'sources':len(provenance),'variants':len(meta),'payload_bytes':len(text),'decodedMiB':round(total_pixels*4/1048576,2)}))
if __name__=='__main__':build()
