// Full-size authored sheets for broad attacks; no enlargement of a half-size stamp.
function drawLicensedRefinedPrimitive(f){
 const age=effectClockTick-f.tick,meta=EFFECT_META[f.kind];if(!meta)return false;const duration=meta.frames/meta.fps*60;if(age<0||age>=duration)return false;
 const t=age/duration,x=f.x,y=f.y,face=f.face||1;
 if(f.kind==='ration_given'||f.kind==='exposure_cleansed'){
  const pal=f.kind==='ration_given'?'green':'ice',fade=t>.7?(1-t)/.3:1;
  if(!licensedFxHas('cleanse_burst_'+pal))return false;
  if(f.kind==='ration_given'){
   for(const side of [-1,1])drawLicensedEffectArt('cleanse_burst_'+pal,x+side*15,y+2,t,{width:16,height:20,anchorY:1,alpha:.55*fade});
   const P=BOSS_PIXEL_PALETTES;bossPixelRuneMotes(x,y-5,17,P.green,Math.floor((lowEffects?.35:t)*8),5);bossPixelGlint(x,y-20,P.green,2);
  }else{
   drawLicensedEffectArt('cleanse_burst_'+pal,x,y+3,t,{width:26,height:19,anchorY:1,alpha:.4*fade});
   drawLicensedEffectArt('cleanse_ripple_'+pal,x,y,t,{width:36,height:14,alpha:.55*fade});
  }
  return true;
 }
 if(f.kind==='frost_hit'){
  if(!licensedFxHas('frozen_original'))return false;for(let i=0;i<5;i++){const a=i*2.399,rr=5+t*12,h=6+(1-t)*(i%2?8:4);drawLicensedEffectArt('frozen_original',x+Math.cos(a)*rr,y+Math.sin(a)*rr,t,{crop:[49,11,18,35],frame:4,width:h*.6,height:h,angle:a});}return true;
 }
 if(f.kind==='burrow_emerge')return drawLicensedEffectArt('f5_tremor_stone',x,y-3,t,{width:64,height:51,anchorY:.72,frame:licensedFxFrame('f5_tremor_stone',t,10,25)});
 if(f.kind==='ward_block')return drawLicensedEffectArt('defense_ice',x+face*8,y-15,t,{crop:[35,15,33,37],frame:lowEffects||t<.5?0:4,width:22,height:25,face,alpha:t>.8?(1-t)*5:1});
 if(f.kind==='poison_applied'||f.kind==='wasp_poison')return drawLicensedEffectArt('smoke_green',x,y-15,t,{width:32,height:25,face,alpha:.8});
 return false;
}
function drawLicensedRefinedBoss(f){
 const age=effectClockTick-f.tick,duration=effectLifetime(f);if(age<0||age>=duration)return false;if(isDarkClawEffect(f))return false;
 const t=age/duration,k=f.kind.slice(5),x=f.x,y=f.y,r=f.radius||30,tx=f.targetX??x,ty=f.targetY??y,dx=tx-x,dy=ty-y,angle=Math.atan2(dy,dx),face=f.face||1,pal=licensedFxPalette(f.color,k);
 if(k==='warning')return drawLicensedEffectArt('geometry_warning_'+pal,x,y,t,{width:r*2,height:r*2,alpha:.75+t*.2});
 if(k==='ring'){
  const rr=r*(.85+.15*t);
  if(pal==='fire'||pal==='blood'){
   if(!licensedFxHas('fireimpact_'+pal)||!licensedFxHas('f2_eightgates_purpleflame_'+(pal==='blood'?'blood':'fire')))return false;
   const fade=t>.88?.45:t>.75?.7:1;
   for(let i=0;i<3;i++)drawLicensedEffectArt('fireimpact_'+pal,x,y,t,{frame:lowEffects?2+i%3:2+(Math.floor(age/3)+i)%3,width:rr*2,height:rr*2,angle:i*Math.PI*2/3+(lowEffects?0:Math.sin((age+i*4)*.15)*.06),alpha:.65*fade});
   const originalCount=Math.max(12,Math.min(40,Math.ceil(rr/4))),count=lowEffects?4:Math.max(5,Math.min(8,Math.ceil(rr/14)));
   for(let i=0;i<count;i++){const slot=Math.floor(i*originalCount/count),a=slot*Math.PI*2/originalCount,height=11+(i*7%10);drawLicensedEffectArt('f2_eightgates_purpleflame_'+(pal==='blood'?'blood':'fire'),x+Math.cos(a)*rr,y+Math.sin(a)*rr,t,{crop:[64,2,58,164],frame:5+((lowEffects?0:Math.floor(age/3))+i*2)%6,width:6+i%3,height,anchorY:1,face:i%2?-1:1,alpha:(.7-t*.25)*fade});}
   return true;
  }
  return drawLicensedEffectArt('geometry_warning_'+pal,x,y,t,{width:rr*2,height:rr*2,angle:Math.floor(age/4)*.12,alpha:t>.8?(1-t)*5:1});
 }
 if(k==='wall'){
  if(!licensedFxHas('bouldersphere_wall'))return false;const fade=t>.88?.45:t>.75?.7:1;
  drawLicensedEffectArt('f5_tremor_stone',x,y+2,t,{width:r*2.1,height:r*.65,anchorY:.8,frame:16,alpha:.55*fade});
  const stones=[[-.32,-10,.82,1.05,16,-.12],[.3,-8,.86,1.12,17,.08],[-.68,1,.72,.86,18,-.16],[.65,1,.72,.9,16,.12],[-.05,4,.85,.88,18,.03]];
  for(const [ox,oy,w,h,frame,angle]of stones)drawLicensedEffectArt('bouldersphere_wall',x+ox*r,y+oy,t,{crop:[106,10,94,90],frame,width:r*w,height:r*h,anchorY:1,angle,alpha:fade});return true;
 }
 if(k==='fire'&&r>90){
  if(!licensedFxHas('death_smoke_ember'))return false;
  const size=Math.min(280,r*1.17),artT=lowEffects?.45:t,fade=t>.85?(1-t)/.15:1;
  drawLicensedEffectArt('death_smoke_ember',x,y-14,t,{width:size,height:size,frame:13+Math.min(7,Math.floor(artT*8)),alpha:(.7-t*.25)*fade});
  const count=lowEffects?5:8;
  for(let i=0;i<count;i++){const a=i*2.399963,rr=r*(.32+.43*t)*(.68+(i%3)*.13),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.87,phase=Math.min(.999,t+(i%3)*.035);drawLicensedEffectArt('death_puff_original',px,py,phase,{width:58+(i%3)*9,height:44+(i%3)*7,face:i%2?-1:1,alpha:(1-t)*.5});}
  return true;
 }
 if(k==='summon'||k==='grow'){
  const name='arrival_'+pal;if(!licensedFxHas(name))return false;
  const fade=t>.82?(1-t)/.18:1,frame=lowEffects?5:t<.8?3+Math.min(5,Math.floor(t/.8*6)):12+Math.min(1,Math.floor((t-.8)*10));
  drawLicensedEffectArt('cleanse_ripple_'+pal,x,y,t,{width:r*2,height:r*.8,alpha:fade});
  drawLicensedEffectArt(name,x,y+3,t,{width:r*2.2,height:r*2.6,anchorY:1,frame,alpha:fade});return true;
 }
 if(k==='fire'||(k==='burst'&&pal==='fire'))return drawLicensedEffectArt('geometry_bigfirehitspark_fire',x,y-10,t,{width:r*2,height:r*1.6,face});
 if(k==='burst'&&pal!=='fire'){const name='beamtesla_'+pal;if(!licensedFxHas(name))return false;for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=r*(.2+.65*t);drawLicensedEffectArt(name,x+Math.cos(a)*rr,y+Math.sin(a)*rr,t,{crop:[0,0,110,360],width:10,height:22,angle:a+Math.PI/2,frame:licensedFxFrame(name,t,16,29),alpha:t>.88?.45:t>.75?.7:1});}drawLicensedMaterialHit(x,y-12,age,face);return true;}
 if(k==='frost')return drawLicensedEffectArt('f6_chromaticcold_ice',x,y-8,t,{width:r*2,height:r*1.6,anchorY:.78,face,frame:licensedFxFrame('f6_chromaticcold_ice',t,10,24)});
 if(k==='quake')return drawLicensedEffectArt('f5_tremor_stone',x,y-3,t,{width:r*2,height:r*1.6,anchorY:.72,face,frame:licensedFxFrame('f5_tremor_stone',t,10,25),alpha:t>.88?.45:t>.75?.7:1});
 if(k==='slash'||k==='claw'){
  const reach=Math.min(Math.hypot(dx,dy),r*2),cx=x+Math.cos(angle)*reach*Math.min(.8,t),cy=y-16+Math.sin(angle)*reach*Math.min(.8,t),rad=r*(.5+.3*t),name=k==='slash'&&licensedFxHas('geometry_animalslash_'+pal)?'geometry_animalslash_'+pal:'animalslash_'+pal;
  return drawLicensedEffectArt(name,cx,cy,t,{width:k==='slash'?rad*2:r*1.4,height:k==='slash'?rad*1.6:r*1.2,face,angle});
 }
 if(k==='tail_sweep'){const a=t*Math.PI*2*face,cx=x+Math.cos(a-.3)*r*.85,cy=y-8+Math.sin(a-.3)*r*.85;return drawLicensedEffectArt('geometry_animalslash_fire',cx,cy,t,{width:r*.82,height:r*.42,angle:a,frame:13+Math.min(10,Math.floor((lowEffects?.35:t)*11))});}
 if(k==='shield')return drawLicensedEffectArt('defense_'+pal,x+face*8,y-20,t,{crop:[35,15,33,37],frame:lowEffects||t<.5?0:4,width:24,height:27,alpha:t>.8?(1-t)*5:1});
 if(k==='column_light'){const height=Math.round(90*Math.min(1,(t+.06)*5));return drawLicensedEffectArt('beamtesla_'+pal,x,y,t,{crop:[0,0,110,360],width:r*1.5,height,anchorY:1,frame:licensedFxFrame('beamtesla_'+pal,t,16,29)});}
 return false;
}
