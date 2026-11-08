// Ordinary combat cues use the same native-pixel material ramps as boss VFX.
// All anchors, source events and lifetimes remain presentation-only.
Object.assign(EFFECT_META,Object.fromEntries(['haste_changed','retreat_start','ration_given','charge_counter','priority_strike','wasp_poison','haste_ended'].map(k=>[k,{frames:1,fps:2}])));
function ordinaryPixelPoison(x,y,frame,count=4){
 const p=BOSS_PIXEL_PALETTES.green;
 for(let i=0;i<count;i++){const rise=(frame*2+i*6)%23,xx=x+Math.sin(i*2.4)*9,yy=y-rise;
  bossPixelPoly([[xx-2,yy],[xx-3,yy-2],[xx-1,yy-5],[xx+1,yy-4],[xx+3,yy-1],[xx+2,yy+1]],p[0]);
  bossPixelRect(xx-1,yy-3,3,3,p[2]);bossPixelRect(xx-1,yy-3,1,1,p[4]);
 }
}
function ordinaryPixelWard(x,y,r,frame,p=BOSS_PIXEL_PALETTES.gold){
 for(const side of [-1,1]){const xx=x+side*r,cy=y-12;
  bossPixelArc(x,cy,r,r*.8,side<0?2.25:-.85,side<0?3.95:.85,p,2,true);
  for(let i=0;i<2;i++){const yy=cy-7+i*14;bossPixelPoly([[xx,yy-4],[xx+3,yy],[xx,yy+4],[xx-3,yy]],p[1]);bossPixelLine(xx,yy-2,xx+1,yy+1,p[4]);}
 }
 if(frame%4<2)bossPixelGlint(x+r-1,y-21,p,1);
}
function ordinaryPixelFracture(x,y,p,spread=1){
 const pts=[[x-7,y-7],[x-1,y-3],[x-4,y+1],[x+4,y+5],[x+2,y+10]];
 for(let i=1;i<pts.length;i++){bossPixelLine(...pts[i-1],...pts[i],p[0],4);bossPixelLine(...pts[i-1],...pts[i],p[3],2);}
 for(const side of [-1,1]){bossPixelChip(x+side*(8+spread*2),y+side*4,p,2,side);}
}
function drawPrimitiveEffect(f){
 if(f.kind.startsWith('boss_')){drawBossEffect(f);return;}
 const meta=EFFECT_META[f.kind];if(!meta)return;
 const age=effectClockTick-f.tick,duration=meta.frames/meta.fps*60;if(age<0||age>=duration)return;
 const x=Math.round(f.x),y=Math.round(f.y),tx=Math.round(f.targetX??x),ty=Math.round(f.targetY??y),t=age/duration,frame=lowEffects?0:Math.floor(age/4),face=f.face||1;
 const P=BOSS_PIXEL_PALETTES,p=P.gold;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=t>.8?(1-t)*5:1;
 if(f.kind==='chain_arc'){
  bossPixelBolt(x,y,tx,ty,p,frame,2);drawEffect('chain_contact',tx,ty,age,1);
 }else if(f.kind==='charge_trail'){
  const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
  for(let i=0;i<7;i++){const q=(i+.5)/7,px=x+dx*q,py=y+dy*q,off=(i%3-1)*4;bossPixelLine(px-dx/d*7+nx*off,py-dy/d*7+ny*off,px+nx*off,py+ny*off,p[0],3);bossPixelLine(px-dx/d*5+nx*off,py-dy/d*5+ny*off,px+nx*off,py+ny*off,p[3],1);if(i%2===0)bossPixelSmoke(px,py+4,3,P.stone,frame,i);}
 }else if(f.kind==='frost_hit'){
  for(let i=0;i<5;i++){const a=i*2.399,rr=5+t*12;bossPixelCrystal(x+Math.cos(a)*rr,y+Math.sin(a)*rr,6+(1-t)*(i%2?8:4),P.ice,Math.cos(a)*3);}
 }else if(f.kind==='poison_cloud'){
  const radius=Math.max(6,Math.hypot(tx-x,ty-y));
  for(let i=0;i<9;i++){const a=i*2.399,rr=radius*(.24+.52*bossPixelNoise(i,4));ctx.globalAlpha=(t>.8?(1-t)*5:1)*.6;bossPixelSmoke(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.45-((frame+i)%4),Math.max(3,Math.min(9,radius*.18)),P.green,frame,i);}
  ctx.globalAlpha=t>.8?(1-t)*5:1;ordinaryPixelPoison(x,y-3,frame,3);
 }else if(f.kind==='poison_applied'||f.kind==='wasp_poison'){
  ordinaryPixelPoison(x,y-9,frame,4);if(f.kind==='wasp_poison')bossPixelGlint(x,y-14,P.green,1);
 }else if(f.kind==='burrow_warning'){
  for(let i=0;i<11;i++){const a=i*Math.PI*2/11,xx=x+Math.cos(a)*18,yy=y+Math.sin(a)*8;bossPixelChip(xx,yy,P.stone,2+(i%3===0?1:0),i);}
  const wobble=frame%3;bossPixelLine(x-9,y+1,x-3,y-2,P.stone[0],2);bossPixelLine(x-3,y-2,x+2,y+2,P.stone[1],2);bossPixelLine(x+2,y+2,x+9,y-wobble,P.stone[0],2);
  for(let i=0;i<3;i++)bossPixelRect(x-11+i*10,y-6+((i+frame)%3),2,1,p[3]);
 }else if(f.kind==='burrow_emerge'){
  bossPixelDebris(x,y,25,P.stone,frame,9,Math.min(1,t+.2));for(let i=0;i<4;i++)bossPixelSmoke(x-12+i*8,y-2-i%2*4,5,P.stone,frame,i);
 }else if(f.kind==='slime_split'){
  for(let i=0;i<7;i++){const a=i*2.399,rr=7+t*18,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.5-Math.sin(t*Math.PI)*6;bossPixelPoly([[px-3,py],[px-4,py-3],[px-1,py-7],[px+2,py-5],[px+4,py-2],[px+2,py+1]],p[0]);bossPixelRect(px-2,py-4,4,4,p[2]);bossPixelRect(px-2,py-4,2,1,p[4]);}
 }else if(f.kind==='parry_block'||f.kind==='charge_counter'||f.kind==='priority_strike'){
  const pp=f.kind==='priority_strike'?P.stone:p;
  for(let i=0;i<5;i++){const a=(i-2)*.43+(face<0?Math.PI:0),rr=4+t*15,px=x+Math.cos(a)*rr,py=y-13+Math.sin(a)*rr;bossPixelLine(px-Math.cos(a)*5,py-Math.sin(a)*5,px,py,pp[0],3);bossPixelLine(px-Math.cos(a)*4,py-Math.sin(a)*4,px,py,pp[4],1);}
  bossPixelGlint(x,y-13,pp,t<.4?3:1);if(f.kind==='priority_strike')bossPixelDebris(x,y,18,pp,frame,5,t+.15);
 }else if(f.kind==='ward_block'){
  ordinaryPixelWard(x,y,19,frame,P.ice);bossPixelGlint(x+face*17,y-15,P.ice,2);
 }else if(f.kind==='cadence_delayed'){
  bossPixelArc(x,y-14,13,9,.5+frame*.2,2.7+frame*.2,p,1,true);bossPixelArc(x,y-14,10,7,3.5-frame*.16,5.8-frame*.16,p,1,true);bossPixelRect(x-2,y-16,2,5,p[3]);bossPixelRect(x+1,y-12,4,1,p[4]);
 }else if(f.kind==='exposure_cleansed'){
  for(const side of [-1,1]){const xx=x+side*(5+t*12);bossPixelLine(xx,y-6,xx+side*3,y-2,P.ice[2],2);bossPixelLine(xx+side*3,y-2,xx,y+3,P.ice[4],1);bossPixelGlint(xx,y-7-frame%4,P.ice,1);}
 }else if(f.kind==='haste_changed'||f.kind==='haste_ended'||f.kind==='retreat_start'){
  const pp=f.kind==='haste_ended'?P.stone:p,dir=f.kind==='retreat_start'?-face:face;
  for(let i=0;i<3;i++){const xx=x-dir*(7+i*5),yy=y-6+i*5;bossPixelLine(xx-dir*8,yy+2,xx,yy,pp[0],3);bossPixelLine(xx-dir*7,yy+1,xx,yy,pp[3],1);}bossPixelSmoke(x-dir*13,y+3,4,P.stone,frame,2);
 }else if(f.kind==='ration_given'){
  bossPixelRuneMotes(x,y-5,17,P.green,frame,5);bossPixelGlint(x,y-20,P.green,2);
 }else if(f.kind==='bomb_explosion'){
  for(let i=0;i<7;i++){const a=i*2.399,rr=8+t*24;bossPixelFlame(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.6,16*(1-t)+6,P.fire,frame,i);}bossPixelDebris(x,y,28,P.stone,frame,6,t+.2);
 }else{
  // Asset decoding failure has a small material fallback, never a UI glyph.
  bossPixelGlint(x,y,p,Math.max(1,3-Math.floor(t*3)));
 }
 ctx.restore();
}
function statusArtAnchor(u){
 // Place status art relative to the registered visible body, not a fixed 35px
 // offset that puts stars and curses inside large monsters' torsos.
 const hp=crowdHPAnchor(u),x=Math.round(u.x),y=Math.round(u.y),height=Math.max(22,Math.min(180,y-hp.y-5));
 const m=typeof ctx.getTransform==='function'?ctx.getTransform():null,sx=Number.isFinite(m?.a)&&m.a>0?m.a:1,sy=Number.isFinite(m?.d)&&m.d>0?m.d:1,ox=Number.isFinite(m?.e)?m.e:0,oy=Number.isFinite(m?.f)?m.f:0;
 // Camera fitting can legitimately expose negative world coordinates. Clamp in
 // screen space, then map back, rather than pinning an overhead curse to y=8.
 const minX=(14-ox)/sx,maxX=(466-ox)/sx,minY=(14-oy)/sy,maxY=(524-oy)/sy;
 return {x,y,minX,maxX,minY,maxY,top:Math.max(minY,Math.min(maxY,Math.round(hp.y)-7)),height,side:Math.max(12,Math.min(46,radiusOf(u)*.72)),foot:Math.max(13,Math.min(34,radiusOf(u)*.62))};
}
function drawGuardIndicator(u){
 const f=u.presentationFlags||0;if(u.dead||!(f&(8192|16384)))return;
 ctx.save();ctx.imageSmoothingEnabled=false;ordinaryPixelWard(Math.round(u.x),Math.round(u.y)-Math.min(22,statusArtAnchor(u).height*.18),Math.max(14,Math.min(40,radiusOf(u)+3)),Math.floor(effectClockTick/5),(f&16384)?BOSS_PIXEL_PALETTES.ice:BOSS_PIXEL_PALETTES.gold);ctx.restore();
}
function drawExposureIndicator(u){
 if(u.dead||!((u.presentationFlags||0)&32768)||((u.presentationFlags||0)&2))return;
 const a=statusArtAnchor(u),x=Math.round(Math.max(a.minX,Math.min(a.maxX,u.x))),y=Math.max(a.minY,a.top-4);
 ctx.save();ctx.imageSmoothingEnabled=false;ordinaryPixelFracture(x,y,BOSS_PIXEL_PALETTES.gold,0);ctx.restore();
}
function drawRootIndicator(u){
 if(u.dead||!((u.presentationFlags||0)&4096))return;const x=Math.round(u.x),y=Math.round(u.y),p=BOSS_PIXEL_PALETTES.green;
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(const side of [-1,1]){const xx=x+side*7;bossPixelLine(xx-side*3,y+5,xx+side*3,y-1,p[0],4);bossPixelLine(xx+side*3,y-1,xx,y-7,p[1],3);bossPixelLine(xx-side*3,y+4,xx+side*2,y-1,p[3],1);bossPixelPoly([[xx,y-4],[xx+side*7,y-9],[xx+side*6,y-4],[xx+side,y-1]],p[3]);}ctx.restore();
}
function drawHealingBlockIndicator(u){
 if(u.dead||!(u.presentationFlags&2048))return;const a=statusArtAnchor(u),x=Math.round(Math.max(a.minX,Math.min(a.maxX,u.x))),y=Math.max(a.minY,a.top-1),p=BOSS_PIXEL_PALETTES.blood;
 ctx.save();ctx.imageSmoothingEnabled=false;
 bossPixelPoly([[x-7,y-5],[x-2,y-5],[x,y-2],[x+2,y-5],[x+7,y-5],[x+8,y],[x,y+8],[x-8,y]],p[0]);
 bossPixelPoly([[x-6,y-4],[x-2,y-4],[x,y],[x+2,y-4],[x+6,y-4],[x+6,y],[x,y+6],[x-6,y]],p[2]);
 bossPixelLine(x+6,y-6,x-5,y+6,p[0],3);bossPixelLine(x+6,y-6,x-5,y+6,p[4],1);ctx.restore();
}
function drawCornerPillarCues(layer){
 const playback=typeof multiPlayback!=='undefined'&&multiPlayback;
 const at=effectClockTick+(state==='result'?cornerResultOffset:0);
 const cues=playback?(state==='result'?multiPlayback.cornerCuesAt(at):replayCornerCues):wave4Host.cornerCuesAt(at);
 for(const c of cues){
  if((c.phase==='warning')!==(layer==='ground'))continue;
  const x=Math.round(c.x),y=Math.round(c.y),r=c.radius,frame=Math.floor(c.age/4),p=BOSS_PIXEL_PALETTES.gold;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(c.phase==='warning'){
   bossPixelBoundary(x,y,r,p,frame,true);
   for(let i=0;i<4;i++){const a=i*Math.PI/2;bossPixelRect(x+Math.cos(a)*(r-3)-2,y+Math.sin(a)*(r-3)-1,4,2,TEAM_COLORS[c.side===0?0:1]);}
   for(let i=0;i<3;i++)bossPixelRect(x-5+i*5,y-((frame+i*3)%8),1,2,p[3]);
  }else{
   const t=c.age/c.duration,h=32+Math.min(28,r),w=Math.max(3,Math.min(9,r*.3));ctx.globalAlpha=t>.7?(1-t)/.3:1;
   bossPixelArc(x,y,r,r*.55,0,Math.PI*2,p,2,true);
   for(let i=-2;i<=2;i++){const xx=x+i*w*.42,hh=h*(.7+.3*bossPixelNoise(i+3,2));bossPixelPoly([[xx-w*.35,y],[xx-w*.3,y-hh+6],[xx,y-hh],[xx+w*.3,y-hh+7],[xx+w*.35,y]],p[i%2===0?1:2]);bossPixelLine(xx,y-3,xx,y-hh+5,p[i%2===0?4:3],i===0?2:1);}
   bossPixelGlint(x,y-h*.8,p,2);bossPixelRuneMotes(x,y,Math.min(r,24),p,frame,5);
   bossPixelLine(x-w,y+2,x+w,y+2,TEAM_COLORS[c.side===0?0:1],2);
  }
  ctx.restore();
 }
}
function drawOrdinaryMovementCues(u,flags){
 const x=Math.round(u.x),y=Math.round(u.y),frame=Math.floor(effectClockTick/5),p=BOSS_PIXEL_PALETTES.stone,face=visualFor(u).face;
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(flags&4)for(let i=0;i<2;i++){bossPixelLine(x-face*(12+i*2),y-4+i*5,x-face*(23+i*2),y-3+i*5,p[0],3);bossPixelLine(x-face*(12+i*2),y-4+i*5,x-face*(21+i*2),y-3+i*5,BOSS_PIXEL_PALETTES.gold[3],1);}
 if(flags&2){for(let i=0;i<7;i++){const a=i*2.399;bossPixelChip(x+Math.cos(a)*11,y+Math.sin(a)*4,p,2,i);}bossPixelLine(x-5,y,x+6,y-2,p[0],2);}
 if(flags&1)bossPixelArc(x,y,15,6,.3+frame*.15,5.6+frame*.15,BOSS_PIXEL_PALETTES.ice,1,true);
 if(flags&8)ordinaryPixelPoison(x,y+3,frame,2);
 ctx.restore();return !!(flags&2);
}

function drawBossStatus(u){
 if(u.dead)return;const flags=bossRenderFlags(u);if(!(flags&(65536|131072|262144|524288|1048576|2097152|8388608)))return;
 const a=statusArtAnchor(u),{x,y}=a,frame=Math.floor(effectClockTick/5),P=BOSS_PIXEL_PALETTES;
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(flags&65536){const p=P.ice,r=a.foot,h=Math.max(22,Math.min(38,a.height*.48));bossPixelArc(x,y+2,r,r*.38,0,Math.PI*2,p,1,true);bossPixelCrystal(x-r*.8,y+2,h,p,-3);bossPixelCrystal(x+r*.75,y+4,h+4,p,4);bossPixelCrystal(x-3,y+6,Math.min(17,h*.5),p,2);}
 if(flags&131072){const p=P.green;for(let i=-1;i<=1;i++){const xx=x+i*a.foot*.55;bossPixelLine(xx,y+4,xx-4,y-5,p[0],4);bossPixelLine(xx-4,y-5,xx+2,y-13,p[1],3);bossPixelLine(xx,y+4,xx-3,y-4,p[3],1);bossPixelPoly([[xx-1,y-9],[xx+7,y-15],[xx+6,y-9],[xx+1,y-6]],p[3]);}}
 if(flags&262144){bossPixelArc(x,y+2,a.foot,4,.2,2.8,P.stone,1,true);bossPixelRect(x-8,y+5,3,1,P.stone[3]);}
 if(flags&2097152){for(const i of [-1,1])bossPixelFlame(x+i*a.side,y+1,Math.min(24,14+a.height*.1)+(frame+i)%4,P.blood,frame,i+2);bossPixelRuneMotes(x,y,a.foot,P.blood,frame,4);}
 if(flags&524288)bossPixelFlame(x-a.side*.7,y-Math.min(28,a.height*.3),Math.min(23,11+a.height*.09),P.fire,frame,2);
 if(flags&1048576)ordinaryPixelPoison(x+a.side*.8,y-Math.min(28,a.height*.25),frame,3);
 if(flags&8388608){const top=Math.max(a.minY,a.top-2);for(let i=0;i<3;i++){const angle=frame*.5+i*Math.PI*2/3;bossPixelGlint(Math.max(a.minX,Math.min(a.maxX,x+Math.cos(angle)*11)),top+Math.sin(angle)*3,P.gold,1);}}
 ctx.restore();
}
const meteorStoneCache=new Map();
function meteorStoneImage(radius){
 if(meteorStoneCache.has(radius))return meteorStoneCache.get(radius);
 try{
  const size=Math.ceil(radius)*2+3,c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(size,size):typeof document!=='undefined'?document.createElement('canvas'):null;if(!c)return null;
  c.width=size;c.height=size;const g=c.getContext('2d');if(!g)return null;const origin=Math.ceil(radius)+1,p=BOSS_PIXEL_PALETTES.stone;
  for(let yy=-Math.ceil(radius);yy<=radius;yy++)for(let xx=-Math.ceil(radius);xx<=radius;xx++){
   const angle=Math.atan2(yy,xx),edge=radius*(.9+.045*Math.sin(angle*5)+.035*Math.sin(angle*9+1)),d=Math.hypot(xx,yy);
   if(d>edge)continue;const noise=bossPixelNoise(Math.floor((xx+radius)/3)+Math.floor((yy+radius)/3)*41,11);
   let shade=d>edge-1.5?0:xx+yy< -radius*.5?3:xx+yy<radius*.4?2:1;
   if(d<edge-2&&noise>.83)shade=Math.max(1,shade-1);else if(d<edge-2&&noise<.12)shade=Math.min(4,shade+1);
   g.fillStyle=p[shade];g.fillRect(origin+xx,origin+yy,1,1);
  }
  const record={canvas:c,origin};meteorStoneCache.set(radius,record);while(meteorStoneCache.size>12)meteorStoneCache.delete(meteorStoneCache.keys().next().value);return record;
 }catch{return null;}
}
function bossPixelMeteor(x,y,dx,dy,len,r,frame,t){
 const q=t*t,px=x+dx*q,py=y+dy*q-5,p=BOSS_PIXEL_PALETTES.fire,stone=BOSS_PIXEL_PALETTES.stone;
 const radius=Math.min(36,Math.max(10,r)),ux=dx/len,uy=dy/len,nx=-uy,ny=ux;
 const point=(along,off)=>[px+ux*along+nx*off,py+uy*along+ny*off];
 // One irregular burning wake, oriented along the actual fall. Broken tongues
 // and detached cinders replace repeated upright flames and a polygon outline.
 for(let layer=0;layer<3;layer++){
  const w=radius*(.72-layer*.17),tail=radius*(3.2-layer*.65),flick=frame%3;
  const shape=[[-tail,0],[-tail*.7,-w*.22],[-tail*.84,-w*.55],[-tail*.44,-w*.48],[-radius*.7,-w],[-radius*.25,-w*.65],[radius*.3,0],[-radius*.3,w*.7],[-radius,w*.9],[-tail*.58,w*.32],[-tail*.76,w*.45],[-tail*.7,w*.1]];
  bossPixelPoly(shape.map(([along,off],i)=>point(along+(i%3===1?flick:0),off)),p[layer+1]);
 }
 // Radius-keyed static texture preserves native pixels without repainting thousands
 // of identical texels every frame. The cache is bounded independently of rounds.
 const body=meteorStoneImage(radius);
 if(body)ctx.drawImage(body.canvas,Math.round(px)-body.origin,Math.round(py)-body.origin);
 else bossPixelChip(px,py,stone,Math.max(4,Math.round(radius*.75)),1);
 for(let i=0;i<3;i++){const a=i*2.399+.4,cx=px+Math.cos(a)*radius*.5,cy=py+Math.sin(a)*radius*.5,s=radius*(.1+i*.025);bossPixelPoly([[cx-s,cy],[cx-s+1,cy-s],[cx+s,cy-s*.5],[cx+s*.8,cy+s],[cx-s*.6,cy+s*.7]],stone[1]);bossPixelLine(cx-s+1,cy-s,cx+s,cy-s*.5,stone[3]);}
 const crack=[[px-radius*.2,py-radius*.7],[px-radius*.1,py-radius*.25],[px+radius*.12,py-radius*.05],[px-radius*.04,py+radius*.36],[px+radius*.23,py+radius*.68]];
 for(let i=1;i<crack.length;i++){bossPixelLine(...crack[i-1],...crack[i],p[1],3);bossPixelLine(...crack[i-1],...crack[i],p[3],1);}
 bossPixelLine(px+radius*.1,py,px+radius*.58,py-radius*.15,p[2],2);bossPixelRect(px-radius*.08,py-radius*.15,2,2,p[4]);
 for(let i=0;i<8;i++){const tail=radius*(1+i*.35),off=Math.sin(i*2.4+frame*.5)*radius*.6;bossPixelRect(...point(-tail,off),i%3===0?2:1,2,p[i%2?3:4]);}
}
// Exact emitted roles that previously fell through to one gold circle. Palette
// choices follow visible original action art, not role-name or team-color guesses.
const ORDINARY_SHOT_ART=Object.freeze({
 cannon:['pellet','#242731','#707780','#d4b78a'],
 voltaic_beetle:['bolt','#153c69','#32cddd','#dcfff3'],
 crystal_tailbeast:['crystal','#28536a','#76dce6','#effff7'],
 froststing_hornet:['needle','#234d54','#67d9b4','#e8fff0'],
 emberstring_archer:['arrow','#542632','#ed8039','#ffe6a0'],
 tigermask_archer:['arrow','#27213f','#a77cb8','#e9d2e9'],
 silverflare_archer:['arrow','#44415c','#d8ca9f','#fff8dd'],
 golden_bowling:['pellet','#62422a','#e6ba4b','#fff1ad'],
 brass_flareslinger:['bolt','#164f56','#62e2c3','#ecfff1'],
 ribbed_fanclam:['bead','#233966','#48bcd7','#baf7f2'],
 willyee_skel_archer:['arrow','#41322d','#ae9770','#eee1b8'],
 willyee_alchemist:['vial','#243e67','#58b9cf','#d8f6db'],
 willyee_char_02:['focus','#4e3156','#d3ad53','#ffedac'],
 willyee_char_08:['bolt','#26376b','#39b6e3','#d6fff5'],
 willyee_char_42:['crystal','#214b58','#42d0bc','#d4fff0'],
 willyee_char_54:['bead','#293a69','#57c9da','#e9f3bd'],
 willyee_char_10_lute_bard:['needle','#34304c','#8ba4ba','#ead2a1'],
 willyee_char_34_goldring_caster:['bead','#57263c','#e67c37','#ffe6a1']
});
function drawMaterialProjectile(s){
 const art=ORDINARY_SHOT_ART[s.k];if(!art)return false;
 const [shape,dark,mid,light]=art,x=Math.round(s.x),y=Math.round(s.y)-16,angle=Number.isFinite(s.angle)?s.angle:s.side?Math.PI:0,c=Math.cos(angle),sn=Math.sin(angle);
 const point=(a,b)=>[x+a*c-b*sn,y+a*sn+b*c],line=(a,b,d,e,color,w=1)=>bossPixelLine(...point(a,b),...point(d,e),color,w),poly=(pts,color)=>bossPixelPoly(pts.map(([a,b])=>point(a,b)),color);
 if(shape==='arrow'){
  line(-9,0,1,0,dark,3);line(-7,0,0,0,mid,1);
  poly([[-3,-3],[3,0],[-3,3],[-1,0]],dark);poly([[-2,-2],[2,0],[-2,1],[0,0]],light);
  line(-8,-2,-6,0,mid,1);line(-8,2,-6,0,mid,1);
 }else if(shape==='bolt'){
  poly([[-7,0],[-3,-3],[-1,-1],[3,0],[-1,2],[-3,1],[-5,3]],dark);poly([[-6,0],[-2,-2],[-1,0],[2,0],[-2,1],[-4,2]],mid);line(-3,0,1,0,light,1);
 }else if(shape==='needle'){
  poly([[-8,-2],[3,0],[-8,2],[-5,0]],dark);line(-6,0,2,0,mid,1);line(-2,0,2,0,light,1);
 }else if(shape==='crystal'){
  poly([[-4,0],[0,-3],[4,0],[0,3]],dark);poly([[-3,0],[0,-2],[0,2]],mid);poly([[0,-2],[3,0],[0,2]],light);line(-2,0,0,-1,light,1);
 }else if(shape==='vial'){
  poly([[-3,-2],[1,-2],[3,0],[1,3],[-3,2]],dark);poly([[-2,-1],[1,-1],[2,0],[0,2],[-2,1]],mid);line(-1,-1,1,0,light,1);line(-3,-2,-3,1,'#aa8b4d',2);
 }else{
  const mask=['0011100','0133210','1322221','1322211','1222111','0111110','0001000'],palette=['',dark,mid,light];
  for(let yy=0;yy<7;yy++)for(let xx=0;xx<7;xx++){const v=+mask[yy][xx];if(v)bossPixelRect(x+xx-3,y+yy-3,1,1,palette[v]);}
  if(shape==='focus'){bossPixelRect(x-1,y,2,2,dark);bossPixelRect(x-2,y-2,1,1,light);}
 }
 return true;
}
function drawMaterialHit(x,y,age,face=1){
 const duration=EFFECT_META.hit_spark.frames/EFFECT_META.hit_spark.fps*60;if(age<0||age>=duration)return false;
 const t=age/duration,p=BOSS_PIXEL_PALETTES.gold,frame=lowEffects?0:Math.floor(age/4);x=Math.round(x);y=Math.round(y);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=t>.65?Math.max(0,(1-t)/.35):1;
 // Unequal metal/stone chips stay complete in world space. The old 32px sheet
 // visibly severed four bright rays at the source cell edges on frames1..4.
 for(let i=0;i<7;i++){const a=i*2.399+.3,rr=(2+t*13)*(.6+.4*bossPixelNoise(i,2)),xx=x+Math.cos(a)*rr*face,yy=y+Math.sin(a)*rr,len=(1-t)*(3+i%3);
  bossPixelPoly([[xx-Math.cos(a)*len*face-Math.sin(a),yy-Math.sin(a)*len+Math.cos(a)],[xx+Math.cos(a)*2*face,yy+Math.sin(a)*2],[xx-Math.cos(a)*len*face+Math.sin(a),yy-Math.sin(a)*len-Math.cos(a)]],p[1]);
  bossPixelLine(xx-Math.cos(a)*len*.65*face,yy-Math.sin(a)*len*.65,xx,yy,p[i%3===0?4:3],1);
 }
 if(t<.45){bossPixelGlint(x,y,p,t<.2?2:1);bossPixelRect(x,y,1,1,p[5]);}
 ctx.restore();return true;
}
