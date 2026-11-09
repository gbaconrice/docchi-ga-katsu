// Additional exact-path rendering. No new emitter, damage event, timer or trail.
let licensedGeometryRockPattern=null;
function licensedGeometryStonePattern(){
 if(licensedGeometryRockPattern)return licensedGeometryRockPattern;
 const name='bouldersphere_rock',m=LICENSED_EFFECT_ART[name],im=effectImages['licensed_art_'+name],r=m?.frames[16];
 if(!r||!im?.complete||!im.naturalWidth)return null;
 const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#453338';g.fillRect(0,0,16,16);
 const x=140,y=38,w=18,h=18;g.drawImage(im,r[0]+(x-r[4])*r[2]/r[6],r[1]+(y-r[5])*r[3]/r[7],w*r[2]/r[6],h*r[3]/r[7],0,0,16,16);
 return licensedGeometryRockPattern=ctx.createPattern(c,'repeat')||'#514746';
}
function drawLicensedGeometryEffect(f){
 const kinds=['throw','firebird','meteor','fissure','breath_ice','fist_strike','fist_wave','pincer_snap','claw_block','claw_counter'];
 const k=f.kind.slice(5);if(!kinds.includes(k))return false;
 const age=effectClockTick-f.tick,duration=effectLifetime(f);if(age<0||age>=duration)return true;
 const t=age/duration,artT=lowEffects?.35:t,x=Math.round(f.x),y=Math.round(f.y),tx=Math.round(f.targetX??x),ty=Math.round(f.targetY??y),dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy)||1,angle=Math.atan2(dy,dx),r=f.radius||30,face=f.face||1,nx=-dy/len,ny=dx/len;
 if(k==='throw'){
  if(bossPixelEffectVariant(f)==='reflection_shards'){
   if(!licensedFxHas('frozen_original'))return false;
   for(let i=0;i<9;i++){const a=i*2.399,rr=r*t;drawLicensedEffectArt('frozen_original',x+Math.cos(a)*rr,y+Math.sin(a)*rr-Math.sin(t*Math.PI)*13,t,{crop:[49,11,18,35],frame:4,width:7+i%4,height:12+i%4*2,angle:a+Math.PI/2,alpha:t>.88?.45:t>.75?.7:1});}return true;
  }
  const px=x+dx*t,py=y+dy*t-Math.sin(Math.PI*t)*48,fire=licensedFxPalette(f.color,k)==='fire',name=fire?'flamesphere_fire':'bouldersphere_rock';
  return drawLicensedEffectArt(name,px,py,t,{width:fire?25:24,height:fire?25:23,crop:fire?undefined:[106,10,94,90],frame:fire?20+Math.min(4,Math.floor(artT*5)):16+Math.min(2,Math.floor(artT*3)),alpha:t>.88?.45:t>.75?.7:1});
 }
 if(k==='firebird')return drawLicensedEffectArt('f2_phoenixfire_original',x+dx*t,y+dy*t-16,t,{width:60,height:58,angle:angle+Math.PI/2,alpha:t>.88?.45:t>.75?.7:1});
 if(k==='meteor'){
  if(!licensedFxHas('bouldersphere_rock')||!licensedFxHas('f2_eightgates_purpleflame_fire'))return false;
  const radius=Math.min(36,Math.max(10,r)),q=t*t,px=x+dx*q,py=y+dy*q-5;
  drawLicensedEffectArt('f2_eightgates_purpleflame_fire',px,py,t,{crop:[64,2,58,164],width:radius*1.45,height:radius*3.2,angle:angle-Math.PI/2,anchorY:1});
  return drawLicensedEffectArt('bouldersphere_rock',px,py,t,{crop:[106,10,94,90],frame:16+Math.min(2,Math.floor(artT*3)),width:radius*2,height:radius*2,angle:lowEffects?0:t*.3});
 }
 if(k==='fissure'){
  const pattern=licensedGeometryStonePattern();if(!pattern)return false;
  const progress=Math.min(1,(t+.04)*2),steps=Math.max(1,Math.floor(14*progress));let prev=[x,y];
  ctx.save();ctx.globalAlpha*=t>.88?.45:t>.75?.7:1;ctx.lineJoin='round';ctx.lineCap='butt';
  const earth=(a,b,width)=>{bossPixelLine(...a,...b,'#241d27',width+2);bossPixelLine(...a,...b,pattern,width);bossPixelLine(...a,...b,'#30232b',Math.max(1,width-4));};
  for(let i=1;i<=steps;i++){const q=i/14,off=Math.sin(i*4.1)*6,px=x+dx*q+nx*off,py=y+dy*q+ny*off;earth(prev,[px,py],7);if(i%2){const side=i%4===1?1:-1,end=[px+nx*side*15-dx/len*5,py+ny*side*15-dy/len*5];earth([px,py],end,3);drawLicensedEffectArt('bouldersphere_rock',end[0],end[1]-3,t,{crop:[106,10,94,90],frame:16+i%3,width:7,height:7});}prev=[px,py];}
  ctx.restore();return true;
 }
 if(k==='breath_ice'){
  if(!licensedFxHas('frozen_original')||!licensedFxHas('smoke_ice'))return false;
  const spread=r>130?.72:.5;
  for(let i=0;i<26;i++){const q=((t*1.8+i/26)%1),theta=Math.sin(i*2.4)*spread,px=x+Math.cos(angle+theta)*r*q,py=y-16+Math.sin(angle+theta)*r*q,size=4+q*7;
   if(i%4===0)drawLicensedEffectArt('smoke_ice',px,py,q,{width:12+q*9,height:10+q*7,alpha:.45});
   else drawLicensedEffectArt('frozen_original',px,py,q,{crop:[49,11,18,35],frame:4,width:size,height:size*1.5,angle:angle+theta+Math.PI/2});
  }return true;
 }
 if(k==='fist_wave'){
  if(!licensedFxHas('smoke_stone'))return false;const reach=Math.min(r,95);
  for(let i=0;i<9;i++){const off=-.62+i*.155,dist=reach*(.57+(i%3)*.18),cx=x+Math.cos(angle+off)*dist,cy=y+Math.sin(angle+off)*dist;drawLicensedEffectArt('smoke_stone',cx,cy-Math.min(10,age*.7),t,{width:16,height:12,alpha:1-t});}return true;
 }
 if(k==='fist_strike'||k==='pincer_snap'){
  if(!licensedFxHas('smoke_stone'))return false;const span=k==='fist_strike'?6:8;if(age>=span)return true;const reach=Math.min(len,k==='fist_strike'?52:50),cx=x+dx/len*reach,cy=y+dy/len*reach-(k==='fist_strike'?13:18);
  return drawLicensedEffectArt('smoke_stone',cx-dx/len*5,cy-dy/len*5,age/span,{width:15,height:10,angle,alpha:.8*(1-age/span)});
 }
 if(k==='claw_block'){const cx=x+dx/len*23,cy=y+dy/len*23-22;return drawLicensedEffectArt('impact_gold',cx,cy,t,{width:32,height:30,face,alpha:1-t});}
 if(k==='claw_counter'){
  if(!licensedFxHas('animalslash_fire'))return false;if(age>=9)return true;const cx=x+dx/len*34,cy=y+dy/len*34-16;
  return drawLicensedEffectArt('animalslash_fire',cx,cy,age/9,{width:31,height:28,angle,face,alpha:1-t});
 }
 return false;
}
