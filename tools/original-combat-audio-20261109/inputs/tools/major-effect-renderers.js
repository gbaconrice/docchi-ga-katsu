// Shared, deterministic atlas drawing. New FX images reuse the existing decode
// cache, and never touch licensed character registries or body drawing.
function drawLicensedEffectArt(name,x,y,progress,options={}){
 const m=LICENSED_EFFECT_ART[name],image=effectImages['licensed_art_'+name];
 if(!m||!image?.complete||!image.naturalWidth)return false;
 const p=Math.max(0,Math.min(.999999,Number.isFinite(progress)?progress:0));
 const seq=m.sequence||m.frames.map((_,i)=>i),fi=options.frame??seq[Math.min(seq.length-1,Math.floor((lowEffects?.35:p)*seq.length))],r=m.frames[fi];
 if(!r)return false;
 const crop=options.crop||[0,0,...m.cell],w=options.width??crop[2],h=options.height??crop[3];
 if(!(w>0&&h>0))return false;
 const ox=r[4]||0,oy=r[5]||0,left=Math.max(ox,crop[0]),top=Math.max(oy,crop[1]),right=Math.min(ox+(r[6]||r[2]),crop[0]+crop[2]),bottom=Math.min(oy+(r[7]||r[3]),crop[1]+crop[3]);
 if(right<=left||bottom<=top)return true;
 const sw=right-left,sh=bottom-top;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(options.angle||0);ctx.scale(options.face<0?-1:1,1);ctx.globalAlpha*=options.alpha??1;
 ctx.drawImage(image,r[0]+(left-ox)*r[2]/(r[6]||r[2]),r[1]+(top-oy)*r[3]/(r[7]||r[3]),sw*r[2]/(r[6]||r[2]),sh*r[3]/(r[7]||r[3]),-w*(options.anchorX??.5)+(left-crop[0])*w/crop[2],-h*(options.anchorY??.5)+(top-crop[1])*h/crop[3],sw*w/crop[2],sh*h/crop[3]);ctx.restore();return true;
}
function licensedFxHas(name){const im=effectImages['licensed_art_'+name];return !!(LICENSED_EFFECT_ART[name]&&im?.complete&&im.naturalWidth);}
function licensedFxPalette(color,kind=''){
 const p=bossPixelPalette(color,kind);return Object.keys(BOSS_PIXEL_PALETTES).find(k=>BOSS_PIXEL_PALETTES[k]===p)||'gold';
}
function licensedFxFrame(name,t,start=0,end=null){const m=LICENSED_EFFECT_ART[name];if(!m)return 0;const last=end===null?m.frames.length-1:Math.min(end,m.frames.length-1);return Math.min(last,Math.floor(start+(last-start+1)*Math.max(0,Math.min(.999,lowEffects?.35:t))));}
function licensedFxBeam(name,x,y,tx,ty,t,width=32){
 const len=Math.hypot(tx-x,ty-y);if(len<1)return false;
 // Source beam runs upward from its base. Crop only transparent margins, then
 // rotate the single authored connected silhouette onto the exact event line.
 const m=LICENSED_EFFECT_ART[name];if(!m)return false;
 const tesla=name.startsWith('beamtesla'),start=tesla?16:13,last=tesla?29:28;
 const crop=tesla?[0,0,110,360]:name.startsWith('beamfire')?[0,0,140,380]:[0,0,80,350];
 return drawLicensedEffectArt(name,(x+tx)/2,(y+ty)/2,t,{width,height:len*1.06,angle:Math.atan2(ty-y,tx-x)+Math.PI/2,frame:licensedFxFrame(name,t,start,last),crop});
}
function licensedFxColumn(name,x,y,t,width,height){
 return drawLicensedEffectArt(name,x,y,t,{width,height,anchorY:.94,frame:licensedFxFrame(name,t,13,28)});
}
function licensedFxBurst(name,x,y,t,r,face=1){
 return drawLicensedEffectArt(name,x,y,t,{width:r*2,height:r*1.6,face});
}
function drawLicensedMaterialHit(x,y,age,face=1){
 const duration=EFFECT_META.hit_spark.frames/EFFECT_META.hit_spark.fps*60;
 if(age<0||age>=duration)return true;
 const name=licensedFxHas('impact_gold')?'impact_gold':licensedFxHas('hit_gold')?'hit_gold':null;
 return name?drawLicensedEffectArt(name,x,y,age/duration,{width:40,height:40,face}):false;
}
function drawLicensedPrimitiveEffect(f){
 if(f.kind.startsWith('boss_'))return false;
 const meta=EFFECT_META[f.kind];if(!meta)return false;
 const age=effectClockTick-f.tick,duration=meta.frames/meta.fps*60;if(age<0||age>=duration)return true;
 const t=age/duration,x=f.x,y=f.y,tx=f.targetX??x,ty=f.targetY??y,face=f.face||1;
 if(f.kind==='chain_arc')return licensedFxBeam('beamtesla_ice',x,y,tx,ty,t,30);
 if(f.kind==='slime_split')return licensedFxBurst('bluewatersplash_plum',x,y-4,t,20,face);
 if(f.kind==='frost_hit')return licensedFxBurst('f6_chromaticcold_ice',x,y,t,25,face);
 if(f.kind==='burrow_emerge')return licensedFxBurst('f5_tremor_stone',x,y-3,t,32,face);
 if(f.kind==='poison_cloud')return licensedFxBurst('smoke_green',x,y-12,t,f.radius??Math.max(16,Math.hypot(tx-x,ty-y)),face);
 if(f.kind==='poison_applied'||f.kind==='wasp_poison')return licensedFxBurst('smoke_green',x,y-15,t,23,face);
 if(['parry_block','charge_counter','priority_strike'].includes(f.kind))return drawLicensedMaterialHit(x,y-13,age/duration*(EFFECT_META.hit_spark.frames/EFFECT_META.hit_spark.fps*60),face);
 if(f.kind==='ward_block')return drawLicensedEffectArt('defense_ice',x,y-18,t,{width:50,height:58,face});
 if(f.kind==='ration_given'||f.kind==='exposure_cleansed')return drawLicensedEffectArt('heal_'+(f.kind==='ration_given'?'green':'ice'),x,y-10,t,{width:55,height:50});
 return false;
}
function drawLicensedBossEffect(f){
 const age=effectClockTick-f.tick,duration=effectLifetime(f);if(age<0||age>=duration)return true;
 if(isDarkClawEffect(f))return false;
 const t=age/duration,k=f.kind.slice(5),x=f.x,y=f.y,r=f.radius||30,tx=f.targetX??x,ty=f.targetY??y,face=f.face||1,pal=licensedFxPalette(f.color,k),dx=tx-x,dy=ty-y;
 if(k==='beam_fire')return drawLicensedEffectArt('f2_eightgates_purpleflame_fire',(x+tx)/2,(y+ty)/2-16,t,{width:Math.min(31,r*1.3),height:Math.hypot(dx,dy),crop:[64,2,58,164],angle:Math.atan2(dy,dx)+Math.PI/2,alpha:t>.85?(1-t)/.15:1});
 if(k==='beam_ice')return licensedFxBeam('beamlaser_ice',x,y-16,tx,ty-16,t,Math.max(24,Math.min(45,r*1.5)));
 if(k==='beam')return licensedFxBeam('beamlaser_'+pal,x,y-16,tx,ty-16,t,30);
 if(k==='chain')return licensedFxBeam('beamtesla_'+(pal==='gold'?'ice':pal),x,y-15,tx,ty-15,t,34);
 if(k==='column_fire')return drawLicensedEffectArt('f2_eightgates_purpleflame_fire',x,y,t,{width:r*1.7,height:108,crop:[64,2,58,164],anchorY:1,alpha:t>.85?(1-t)/.15:1});
 if(k==='column_light')return licensedFxColumn('beamlaser_'+pal,x,y,t,r*1.7,124);
 if(k==='wall')return drawLicensedEffectArt('f5_tremor_stone',x,y-8,t,{width:r*2.6,height:r*2.1,anchorY:.64,frame:licensedFxFrame('f5_tremor_stone',t,10,25),alpha:t>.8?(1-t)/.2:1});
 if(k==='fire')return licensedFxBurst('bigfirehitspark_fire',x,y-10,t,r,face);
 if(k==='burst'&&pal==='fire')return licensedFxBurst('bigfirehitspark_fire',x,y-10,t,r,face);
 if(k==='frost')return licensedFxBurst('f6_chromaticcold_ice',x,y-8,t,r,face);
 if(k==='poison')return licensedFxBurst('smoke_green',x,y-8,t,r,face);
 if(k==='quake')return licensedFxBurst('f5_tremor_stone',x,y-3,t,r,face);
 if(k==='ring')return drawLicensedEffectArt(['fire','blood'].includes(pal)?'fireimpact_'+pal:'energyhaloground_'+pal,x,y,t,{width:r*2,height:r*2});
 if(k==='warning')return drawLicensedEffectArt('energyhaloground_'+pal,x,y,t,{width:r*2,height:r*2,alpha:.85,frame:licensedFxFrame('energyhaloground_'+pal,.25+.25*t)});
 if(k==='slash'||k==='claw'){const angle=Math.atan2(dy,dx),reach=Math.min(Math.hypot(dx,dy),r*2),cx=x+Math.cos(angle)*reach*Math.min(.8,t),cy=y-16+Math.sin(angle)*reach*Math.min(.8,t);return drawLicensedEffectArt('animalslash_'+pal,cx,cy,t,{width:r*2,height:r*1.6,face,angle});}
 if(k==='tail_sweep')return drawLicensedEffectArt('animalslash_'+pal,x,y-8,t,{width:r*2,height:r*2,angle:t*Math.PI*2*face});
 if(k==='rain'){if(!licensedFxHas('f2_eightgates_purpleflame_fire'))return false;for(let i=0;i<9;i++){const xx=x+Math.sin(i*2.4)*r,base=y+Math.cos(i*2.4)*r*.5,q=((t*2+i/9)%1),yy=base-65+q*65;drawLicensedEffectArt('f2_eightgates_purpleflame_fire',xx,yy,q,{width:12+i%3*2,height:27+i%3*4,crop:[64,2,58,164],anchorY:1});}return true;}
 if(k==='shield')return drawLicensedEffectArt('defense_'+pal,x,y-22,t,{width:Math.min(70,r*1.8),height:Math.min(86,r*2.1)});
 if(k==='grow'||k==='summon')return drawLicensedEffectArt('heal_'+pal,x,y-20,t,{width:r*2,height:r*1.8});
 return false;
}
