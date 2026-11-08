"""Forward mushroom traps and spaced stationary emplacements, deterministic at 60 Hz."""
import json,re

STATIONARY = ('repair_pylon','ward_bastion','embergrille_monument','redcore_burstshrine','rune_cube_warder','eggshell_repairpod','bonecolumn_warder')
FORMATION = r'''
 // Stationary pieces are emplacements, not a packed marching row. Preserve
 // moving-only armies byte for byte; never alter roster, stats or RNG draws.
 function arrangeEmplacements(placed){
  const fixed=placed.filter(p=>catalog[p.k].stationary===true);
  if(!fixed.length)return placed;
  const occupied=placed.filter(p=>catalog[p.k].stationary!==true),result=[];
  const candidates=[];
  for(let row=0;row<8;row++)for(let col=0;col<4;col++){
   const x=60+col*46+(row%2?6:-6),y=96+row*52+((col*7+row*3)%9)-4;
   candidates.push({x,y,order:row*4+col});
  }
  candidates.sort((a,b)=>Math.hypot((a.x-128)*1.15,a.y-294)-Math.hypot((b.x-128)*1.15,b.y-294)||a.order-b.order);
  for(const p of fixed){
   const t=catalog[p.k],fits=c=>c.x-p.radius>=8&&c.x+p.radius<=232&&c.y-(t.openingTop??p.radius)>=14&&c.y+(t.openingBottom??p.radius)<=524&&occupied.concat(result).every(q=>Math.hypot(c.x-q.x,c.y-q.y)>=p.radius+q.radius+6);
   const pos=candidates.find(fits);
   // An oversized carried legacy roster keeps its valid packing, rather than
   // clipping, deleting a unit, or changing admission because of presentation.
   if(!pos)return placed;
   result.push({...p,x:pos.x,y:pos.y});
  }
  const byIndex=new Map(result.map(p=>[p.inputIndex,p]));return placed.map(p=>byIndex.get(p.inputIndex)||p);
 }
'''
DEPLOY=r'''  if(t.mushroomTrapCharges&&!u.mushroomTrapPlaced&&shots.length<1536){
   // Carry the one-use trap to engagement. Bounded local placement, not an
   // opening-position mine or a teleport onto a distant target.
   const targets=enemies.filter(v=>targetLayers.get(v)==='ground').sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||stableOrder(a,b));
   for(const target of targets){
    const dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy),gap=d-radiusOf(u)-radiusOf(target);
    if(gap>46||d<1e-8)continue;
    const offset=Math.min(32,Math.max(0,d-radiusOf(target)-4)),x=snapXPosition(u.x+dx/d*offset),y=snapPosition(u.y+dy/d*offset);
    // Keep the complete footprint visible. Do not stack a row of overlapping
    // traps; a blocked carrier keeps its charge and can place it later.
    if(x<32||x>FIELD.w-32||y<40||y>FIELD.h-28||shots.some(s=>s.trap&&!s.done&&s.side===u.side&&Math.hypot(s.x-x,s.y-y)<26))continue;
    u.mushroomTrapPlaced=true;shots.push({k:u.k,side:u.side,x,y,vx:0,vy:0,sourceToken:tokenOf(u),trap:true,armTick:contactTick+t.mushroomTrapArmingTicks,expiresTick:contactTick+t.mushroomTrapDurationTicks});
    observeBattleLogExtra({type:'trap_placed',sourceToken:battleLogEntityToken(u),tick:contactTick,x,y,armTick:contactTick+t.mushroomTrapArmingTicks,expiresTick:contactTick+t.mushroomTrapDurationTicks});break;
   }
  }'''
ART=r'''
// A planted sporecap with a shaded cap, pale gills, roots and disturbed earth.
// Code-native pixel art; bounded 25x23 footprint, no atlas cropping or clip.
const MUSHROOM_TRAP_ART=Object.freeze({width:25,height:23,anchorX:12,anchorY:18,rows:[
 '..........11111..........',
 '........112222211........',
 '......1122333332211......',
 '.....123334433333321.....',
 '....12334444335533321....',
 '...1233344333555533321...',
 '..12333333333553333321...',
 '..123333366333333333321..',
 '.12333366663333443333321.',
 '.12333666663334444333321.',
 '.12233366333333443333221.',
 '..12222222222222222221...',
 '...177777777777777771....',
 '....1888888888888881.....',
 '........1899981..........',
 '........1899981..........',
 '.......118999811.........',
 '......1aa89998aa1........',
 '....1aaab8998baaa11......',
 '..11aabbbbbbbbbbaaa11....',
 '...1aabbbccbbbcbaa1......',
 '.....111111111111........',
 '.........................'],palette:Object.freeze({'1':'#30231f','2':'#6a3026','3':'#ac4e37','4':'#e6c88f','5':'#d5744c','6':'#7f382c','7':'#d29c67','8':'#986e46','9':'#ead5a0','a':'#514035','b':'#70513a','c':'#a4804c'})});
let mushroomTrapCanvas=null;
function paintMushroomTrap(context){for(let y=0;y<MUSHROOM_TRAP_ART.rows.length;y++){const row=MUSHROOM_TRAP_ART.rows[y];for(let x=0;x<row.length;x++){const color=MUSHROOM_TRAP_ART.palette[row[x]];if(color){context.fillStyle=color;context.fillRect(x,y,1,1);}}}}
function drawMushroomTrap(s){
 if(!mushroomTrapCanvas){try{const c=document.createElement('canvas');c.width=MUSHROOM_TRAP_ART.width;c.height=MUSHROOM_TRAP_ART.height;const g=c.getContext('2d');if(g){paintMushroomTrap(g);mushroomTrapCanvas=c;}}catch{}}
 ctx.save();ctx.translate(Math.round(s.x)-MUSHROOM_TRAP_ART.anchorX,Math.round(s.y)-MUSHROOM_TRAP_ART.anchorY);ctx.imageSmoothingEnabled=false;
 if(mushroomTrapCanvas)ctx.drawImage(mushroomTrapCanvas,0,0);else paintMushroomTrap(ctx);
 // A small team-coloured seal, not a chain of bright UI rings across the floor.
 ctx.fillStyle=TEAM_COLORS[s.side===0?0:1];ctx.fillRect(11,19,3,2);ctx.fillStyle='#e4c995';ctx.fillRect(12,19,1,1);ctx.restore();return true;
}
'''

def once(s,a,b):
 assert s.count(a)==1, 'Expected one trap patch anchor: '+a[:100]
 return s.replace(a,b,1)

def patch(s):
 assert 'function arrangeEmplacements(' not in s, 'Already patched traps/emplacements'
 s=once(s,' /* Units per army by round:',FORMATION+'\n /* Units per army by round:')
 s=once(s,'return placed.sort((a,b)=>a.inputIndex-b.inputIndex)}','return arrangeEmplacements(placed).sort((a,b)=>a.inputIndex-b.inputIndex)}')
 marker='const growthGenerator=TypedGrowthGenerator.createTypedGenerator('
 start=s.index(marker)+len(marker);catalog,end=json.JSONDecoder().raw_decode(s[start:])
 for k in STATIONARY:catalog[k]['stationary']=True
 s=s[:start]+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+s[start+end:]
 trapline=next(l for l in s.splitlines() if 'if(t.mushroomTrapCharges&&!u.mushroomTrapPlaced)' in l)
 s=once(s,trapline,DEPLOY)
 s=once(s,"開始時に地上罠最大1個（準備0.75秒・10秒で消滅・12ダメージ）","接近時に前方へ地上罠1個（準備0.75秒・設置から10秒・12ダメージ）")
 s=s.replace('/^開始時に地上罠/.test(text)', '/^(開始時に地上罠|接近時に前方へ地上罠)/.test(text)')
 s=once(s,'function drawProjectile(s){',ART+'\nfunction drawProjectile(s){')
 artline=next(l for l in s.splitlines() if "if(s.k==='punchcap_mushroom'){ctx.save();" in l)
 s=once(s,artline," if(s.k==='punchcap_mushroom')return drawMushroomTrap(s);")
 s=once(s,"drawCombatEffects('ground');for(let u of paintUnits)","drawCombatEffects('ground');for(const s of shots)if(s.k==='punchcap_mushroom')drawMushroomTrap(s);for(let u of paintUnits)")
 s=once(s,"for(const s of shots){if(drawProjectile(s))continue;","for(const s of shots){if(s.k==='punchcap_mushroom')continue;if(drawProjectile(s))continue;")
 return s

if __name__=='__main__':
 import sys,pathlib
 source=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(patch(source.read_text()))
