// Presentation only. These stamps retain the exact event anchors, trajectory,
// lifetime, radius, draw layer and admission rules of the original effects.
function drawLicensedUtilityEffect(f){
 const owned=['boss_skull','boss_moon','boss_thorn','boss_stun','cadence_delayed','haste_changed','haste_ended','charge_trail','retreat_start','burrow_warning'];
 if(!owned.includes(f.kind))return false;
 const age=effectClockTick-f.tick,duration=effectLifetime(f);
 if(age<0||age>=duration)return true;
 const t=age/duration,x=f.x,y=f.y,tx=f.targetX??x,ty=f.targetY??y,face=f.face||1,r=f.radius||30,fade=t>.8?(1-t)*5:1;
 const rawPal=licensedFxPalette(f.color,f.kind.slice(5)),pal=['ice','fire','blood','storm','gold'].includes(rawPal)?rawPal:'gold';
 const draw=(name,xx,yy,progress,options={})=>drawLicensedEffectArt(name,xx,yy,progress,{alpha:fade,...options});
 if(f.kind==='boss_skull'){
  const name='utility_skull_'+pal;if(!licensedFxHas(name))return false;
  const q=Math.min(1,t*1.3),px=x+(tx-x)*q,py=y+(ty-y)*q-11-Math.sin(Math.PI*q)*14;
  // Small fading afterimages share the exact original projectile parabola.
  if(!lowEffects)for(const lag of [.16,.08]){const z=Math.max(0,q-lag);draw(name,x+(tx-x)*z,y+(ty-y)*z-11-Math.sin(Math.PI*z)*14,t,{width:27,height:40,crop:[38,52,24,36],face,alpha:fade*(lag>.1?.12:.22)});}
  return draw(name,px,py,t,{width:36,height:54,crop:[38,52,24,36],face});
 }
 if(f.kind==='boss_moon'){
  const name='utility_moon_'+pal;if(!licensedFxHas(name))return false;
  draw(name,x,y-35,t,{width:34,height:41,crop:[91,75,33,41],face:-face,alpha:fade*.15});
  return draw(name,x,y-35,t,{width:30,height:37,crop:[91,75,33,41],face:-face});
 }
 if(f.kind==='boss_thorn'){
  if(!licensedFxHas('utility_thorn_green'))return false;
  const count=r>60?12:7;
  for(let i=0;i<count;i++){
   const a=i*2.399,rr=r*(.35+.55*bossPixelNoise(i,5)),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.65;
   draw('utility_thorn_green',xx,yy,t,{width:20+(i%3)*3,height:(31+(i%3)*5)*Math.min(1,(t+.2)*3),anchorY:.92,face:i%2?-face:face,frame:i%3});
  }
  return true;
 }
 if(f.kind==='boss_stun'){
  if(!licensedFxHas('utility_wind_gold')||!licensedFxHas('utility_star_gold'))return false;
  draw('utility_wind_gold',x,y-35,t,{width:33,height:15,alpha:fade*.8});
  for(let i=0;i<3;i++){
   const a=(lowEffects?0:t*4.5)+i*Math.PI*2/3;
   draw('utility_star_gold',x+Math.cos(a)*13,y-35+Math.sin(a)*4,t,{width:10,height:16,crop:[0,0,100,200],alpha:fade*(.7+.3*(i===0))});
  }
  return true;
 }
 if(f.kind==='cadence_delayed'){
  if(!licensedFxHas('utility_wind_gold'))return false;
  // Authored broken sound-wave ribbons contract as the cadence is interrupted.
  draw('utility_wind_gold',x,y-14,t,{width:38-t*9,height:27-t*7,angle:.18,face});
  return draw('utility_wind_gold',x,y-14,1-t,{width:24-t*5,height:17-t*3,angle:-.25,face:-face,alpha:fade*.7});
 }
 if(f.kind==='charge_trail'){
  if(!licensedFxHas('utility_dust_stone'))return false;
  const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  if(d<1)return draw('utility_dust_stone',x,y,t,{width:25,height:17});
  // Each dust curl remains centered on the recorded line, never on an inferred
  // screen-horizontal path. Spacing and tangent remain correct for diagonals.
  const count=Math.max(2,Math.min(9,Math.ceil(d/18)));
  for(let i=0;i<count;i++){const q=(i+.5)/count;draw('utility_dust_stone',x+dx*q,y+dy*q,t,{width:Math.min(34,d/count+12),height:19,angle,face,alpha:fade*(.45+.35*q)});}
  return true;
 }
 if(f.kind==='burrow_warning'){
  if(!licensedFxHas('utility_dust_stone'))return false;
  // The essential warning stays visible in reduced-effects mode, with dirt
  // moving around the original 18-by-8 ground footprint rather than a UI icon.
  const p=lowEffects?.25:.13+((t*2)%1)*.25;
  if(licensedFxHas('utility_soil_stone'))draw('utility_soil_stone',x,y,t,{width:64,height:44,anchorY:.74,frame:lowEffects?9:8+Math.floor(t*6)%3,alpha:.92});
  draw('utility_dust_stone',x,y,p,{width:49,height:30,alpha:1});
  return draw('utility_dust_stone',x,y+1,.15+((p+.15)%1)*.2,{width:40,height:23,face:-face,alpha:.9});
 }
 if(f.kind==='haste_changed'||f.kind==='haste_ended'||f.kind==='retreat_start'){
  if(!licensedFxHas('utility_dust_stone')||!licensedFxHas('utility_wind_gold'))return false;
  const ended=f.kind==='haste_ended',retreat=f.kind==='retreat_start',dir=retreat?-face:face;
  // Retreat events already carry a source-facing cue, not a retained dx/dy
  // vector in replay FX. Preserve that exact cue; do not invent a trajectory.
  draw('utility_dust_stone',x-dir*13,y+3,t,{width:37,height:23,face:dir,alpha:fade*(ended?.65:.85)});
  if(!ended)draw('utility_wind_gold',x-dir*12,y-5,t,{width:34,height:16,face:dir,angle:dir*.12,alpha:fade*(retreat?.65:.85)});
  else draw('utility_wind_stone',x-face*12,y-5,t,{width:34,height:14,face,alpha:fade*.55});
  return true;
 }
 return false;
}
