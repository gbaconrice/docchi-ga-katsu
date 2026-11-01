from PIL import Image,ImageDraw
import random,math,json,hashlib,os,zipfile
OUT=os.path.dirname(__file__);W,H=480,538
R=random.Random(91841)
P={'outer':'#18282d','joint':'#253337','stone_dark':'#344247','stone':'#455350','stone_light':'#59645a','stone_edge':'#6c7462','chip':'#7d8069','moss':'#3c5143','moss_light':'#52634a','grass_deep':'#30433c','grass':'#37483e','grass_light':'#41513f','dry_grass':'#586047','soil':'#454b3f','soil_light':'#4b5043','scuff':'#515446','groove':'#3b443b','bronze':'#837652','bronze_shadow':'#514f3e'}
# Controlled low-frequency fields create compact pixel clusters, not an internal grid.
noise=[[R.random()for _ in range(12)]for _ in range(13)]
def field(x,y):
 fx=x/48;fy=y/48;ix,iy=int(fx),int(fy);tx,ty=fx-ix,fy-iy
 tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty)
 a=noise[iy][ix]*(1-tx)+noise[iy][ix+1]*tx;b=noise[iy+1][ix]*(1-tx)+noise[iy+1][ix+1]*tx
 return a*(1-ty)+b*ty
def rgb(h):return tuple(bytes.fromhex(h[1:]))
def mix(a,b,t):return tuple(round(v*(1-t)+w*t)for v,w in zip(a,b))
base=Image.new('RGB',(W,H));pix=base.load()
g=rgb(P['grass']);soil=rgb(P['soil_light'])
for y in range(H):
 for x in range(W):
  # Broad asymmetric wear, without a lane, ring, central divider or tactical symbol.
  broad=math.exp(-(((x-228)/205)**4+((y-280)/225)**4))
  wear=max(0,min(1,broad*.78+(field(x,y)-.5)*.46))
  wear=round(wear*7)/7
  c=mix(g,soil,wear)
  n=(field(x+3,y+2)-.5)*5
  pix[x,y]=tuple(max(0,min(255,round(v+n)))for v in c)
d=ImageDraw.Draw(base)
# Sparse clusters are authored as connected pixel forms; interior stays low contrast.
for i in range(1650):
 x=R.randrange(20,460);y=R.randrange(20,518)
 edge=min(x-20,460-x,y-20,518-y)
 if edge>34 and R.random()<.58:continue
 c=rgb(P['grass_light']if edge<40 else P['soil_light'])
 if edge>40:c=mix(pix[x,y],c,.55)
 shape=R.randrange(4)
 if shape==0:d.line([(x,y),(x+2,y),(x+3,y-1)],fill=c)
 elif shape==1:d.line([(x,y),(x+1,y-2),(x+1,y)],fill=c)
 elif shape==2:d.rectangle((x,y,x+1,y),fill=c);d.point((x+2,y-1),fill=c)
 else:d.line([(x,y),(x+3,y-1)],fill=c)
# Irregular low-contrast scrape groups imply worn dirt rather than a square board.
for x,y,ln in [(92,104,14),(157,77,9),(297,121,12),(355,178,16),(131,197,11),(216,164,15),(269,223,13),(169,286,17),(326,309,11),(103,359,16),(247,373,13),(193,432,19),(371,422,12),(295,469,10),(84,465,14)]:
 c=mix(pix[x,y],rgb(P['scuff']),.5)
 d.line([(x,y),(x+ln//2,y-1),(x+ln,y)],fill=c)
 d.line([(x+3,y+3),(x+ln-4,y+2)],fill=mix(pix[x,y],rgb(P['groove']),.3))
# A few dry blades lie flat; they are not stones, walls, vegetation blockers or loot.
for x,y in [(53,61),(421,87),(73,242),(412,272),(45,420),(436,473),(206,43),(315,501)]:
 d.line([(x,y),(x+4,y-1),(x+6,y)],fill=P['dry_grass']);d.line([(x+2,y-1),(x+3,y-3)],fill=P['grass_light'])
base.save(OUT+'/arena_floor_only.png')
# Outer apron occupies only the area OUTSIDE the playable rectangle.
border=Image.new('RGBA',(W,H));bd=ImageDraw.Draw(border)
bd.rectangle((0,0,W-1,18),fill=P['outer']);bd.rectangle((0,H-19,W-1,H-1),fill=P['outer']);bd.rectangle((0,0,18,H-1),fill=P['outer']);bd.rectangle((W-18,0,W-1,H-1),fill=P['outer'])
# Tile is an integer-pixel stone face, with a bevel and occasional moss chip.
def stone_strip(vertical,pos,length,side,index):
 a=pos;b=pos+length-1
 pts=[(a+2,2),(b-3,2),(b,5),(b-1,13),(b-4,16),(a+3,16),(a,12),(a,5)]
 def xy(p):
  x,y=p
  if not vertical:return(x,y if side==0 else H-1-y)
  return(y if side==0 else W-1-y,x)
 def poly(ps,c):bd.polygon([xy(p)for p in ps],fill=P[c])
 def line(ps,c,w=1):bd.line([xy(p)for p in ps],fill=P[c],width=w)
 poly(pts,'stone');poly([(a+2,3),(b-4,3),(b-2,6),(a+3,7),(a+1,10)],'stone_light')
 poly([(a+3,12),(b-1,10),(b-2,14),(b-4,16),(a+3,16)],'stone_dark')
 line([(a+3,3),(b-5,3)],'stone_edge');line([(a+3,17),(b-4,17)],'joint')
 if index%3==0:
  mid=a+length//2;line([(mid,4),(mid+1,7),(mid-2,9)],'joint');line([(mid+2,7),(mid+5,7)],'stone')
 if index%2==0:
  poly([(a+3,12),(a+8,10),(a+12,12),(a+10,15),(a+5,15)],'moss');line([(a+5,12),(a+8,11)],'moss_light')
 if index%4==1:line([(b-8,4),(b-5,5),(b-5,7)],'chip')
for side in [0,1]:
 pos=20;index=0
 while pos<W-20:
  length=min(R.choice([33,41,47,54,62]),W-20-pos)
  if length<10:break
  stone_strip(False,pos,length,side,index+side);pos+=length+2;index+=1
 pos=20;index=0
 while pos<H-20:
  length=min(R.choice([32,39,46,53,61]),H-20-pos)
  if length<10:break
  stone_strip(True,pos,length,side,index+side+1);pos+=length+2;index+=1
# Corner masonry fits in the exterior18px zone; no raised posts intrude into play.
for x,y in [(0,0),(W-19,0),(0,H-19),(W-19,H-19)]:
 bd.polygon([(x+2,y+2),(x+15,y+2),(x+17,y+5),(x+16,y+15),(x+13,y+17),(x+3,y+16),(x+1,y+12)],fill=P['stone'])
 bd.line([(x+3,y+3),(x+14,y+3),(x+15,y+5)],fill=P['stone_edge']);bd.line([(x+4,y+15),(x+13,y+15)],fill=P['stone_dark'])
 bd.rectangle((x+7,y+7,x+11,y+11),fill=P['bronze_shadow']);bd.rectangle((x+8,y+7,x+10,y+9),fill=P['bronze'])
# Low moss along inner stone lips, entirely outside the field; uneven 1px edges.
for _ in range(180):
 side=R.randrange(4)
 if side<2:x=R.randrange(21,459);y=17 if side==0 else H-18
 else:x=17 if side==2 else W-18;y=R.randrange(21,H-21)
 bd.line([(x,y),(x+(R.choice([-2,-1,1,2])if side<2 else 0),y+(R.choice([-2,-1,1,2])if side>1 else 0))],fill=P['moss'])
border.save(OUT+'/arena_border_overlay.png')
final=base.convert('RGBA');final.alpha_composite(border);final=final.convert('RGB');final.save(OUT+'/arena_moss_court_480x538.png')
final.resize((960,1076),Image.Resampling.NEAREST).save(OUT+'/arena_moss_court_preview_2x.png')
# Verify no edge decor is inside the gameplay region. Floor textures are flat/passable.
assert border.crop((20,20,461,519)).getbbox() is None
assert final.size==(480,538)
meta={'name':'Moss Court','version':'v9 candidate 1','status':'standalone art; not game-render verified','size':[480,538],'mode':'RGB opaque','filter':'nearest','playable_bounds_inclusive':[20,20,460,518],'border_overlay_intrudes_playable':False,'collision':'none added; all interior marks are flat surface texture','floor':'arena_floor_only.png','border':'arena_border_overlay.png','combined':'arena_moss_court_480x538.png','palette':P,'draw_contract':'draw combined at0,0 at native size before groundFX/actors. Remove old gradient/grid/center-dash/baked team words. UI team labels remain separate. Camera transforms apply consistently to arena and actors.','reference':'Legacy v6.1 live screenshot viewed only as prior appearance; current v8QA-based draw function read separately. No new game render.'}
meta['sha256']=hashlib.sha256(open(OUT+'/'+meta['combined'],'rb').read()).hexdigest()
open(OUT+'/arena_art.json','w').write(json.dumps(meta,indent=2))
print('Opaque480x538 arena built. Playable region contains zero border-overlay pixels. SHA256',meta['sha256'])
