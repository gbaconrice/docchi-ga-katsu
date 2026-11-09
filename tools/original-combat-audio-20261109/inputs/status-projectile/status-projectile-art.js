// Status and projectile composition only. Never writes unit/shot/event state.
// Original body atlases are reused unmodified; source crop is confined to a head,
// never a historic flight trail. All clocks are recorded presentation clocks.
const AQSP_NATIVE_HEADS=Object.freeze({
 emberstring_archer:{crop:[7,0,9,16],anchor:[8,7],scale:1.15},
 tigermask_archer:{crop:[64,48,28,19],anchor:[27,9],scale:.8},
 silverflare_archer:{crop:[36,25,23,28],anchor:[21,14],scale:.72},
 golden_bowling:{crop:[75,10,33,35],anchor:[31,18],scale:.58},
 brass_flareslinger:{crop:[67,59,38,33],anchor:[36,17],scale:.52,rearFade:[0,.2,.45,.7,.9]},
 gilded_shooter:{crop:[55,51,26,17],anchor:[25,8],scale:.85,clip:[[0,8],[8,6],[12,4],[16,2],[21,5],[26,8],[21,11],[16,14],[12,12],[8,10]]},
 lumen_charger:{crop:[1,0,15,16],anchor:[14,8],scale:.9}
});
const AQSP_LOCAL_ART=Object.freeze({
 healingblock:{anchor:[7,7],rows:['...............','..1111...111561','.123431.123561.','123454312356131','123454443561431','123444445614431','.1234445614431.','..12345614431..','...125614431...','....5614431....','...5612331.....','..561.131......','.561...1.......','161............','...............'],palette:['','#352a32','#672f40','#934153','#b55d64','#ad976a','#ead9a9']},
 arrow:{anchor:[17,3],rows:['...........11.....','1.........1231....','121111111125541...','1234444444555541..','121111111125541...','1.........1231....','...........11.....'],palette:['','#342b32','#755147','#bd8051','#e1b16f','#fff0bc']},
 needle:{anchor:[14,3],rows:['...............','11.............','123111111111...','12345555555541.','123333333331...','11.............','...............'],palette:['','#263f44','#426a65','#71a994','#a7d9bf','#e5f4cf']},
 crystal:{anchor:[12,5],rows:['.....11......','....1231.....','...123431....','..12345431...','.1234555431..','123455554431.','.1233444431..','..12333431...','...122231....','....1221.....','.....11......'],palette:['','#243447','#355f78','#569aab','#9dd9d6','#e6faf0']},
 vial:{anchor:[10,5],rows:['..111........','..1231.......','.12431.......','12243111.....','123443231....','1235434431...','1235444431...','.12444431....','..123331.....','...1111......'],palette:['','#263044','#8e7957','#426d88','#62b9c6','#e6f2cc']},
 cinder:{anchor:[18,3],rows:['11..........11.....','1231.......1231....','.123111111125541...','..1234444445555541.','.123111111125541...','1231.......1231....','11..........11.....'],palette:['','#462c2d','#82513b','#c78a4d','#edc580','#fff2c8']}
});
const AQSP_TRAP=Object.freeze({width:25,height:23,anchor:[12,18],rows:[
 '.........................',
 '.........111111..........',
 '......11122322211........',
 '....112233332222211......',
 '...12333443332232221.....',
 '..1234433333222222221....',
 '.123433322222222222221...',
 '.1233322222222222222221..',
 '12222222222222222222221..',
 '1222222111112222222221...',
 '.11111155555511111111....',
 '..155665656555555551.....',
 '....16665656565661.......',
 '........1677681..........',
 '........1677681..........',
 '........1677681..........',
 '.......916776819.........',
 '......19916768199........',
 '....199aa16768aaa91......',
 '..199aabbaa889aaab991....',
 '...199aabbbaaabba991.....',
 '.....1119911991111.......',
 '.........................'],palette:{'1':'#311e27','2':'#661f32','3':'#8e2e43','4':'#b74957','5':'#6f4c4b','6':'#b49a78','7':'#e3d8b8','8':'#8f7a5d','9':'#302e29','a':'#514537','b':'#786342'}});
const aqspPixelCache=new Map();
function aqspPixelImage(key){
 if(aqspPixelCache.has(key))return aqspPixelCache.get(key);
 const a=key==='trap'?AQSP_TRAP:AQSP_LOCAL_ART[key];if(!a)return null;
 try{const c=document.createElement('canvas');c.width=a.width||a.rows[0].length;c.height=a.height||a.rows.length;const g=c.getContext('2d');if(!g)return null;
 for(let y=0;y<a.rows.length;y++)for(let x=0;x<a.rows[y].length;x++){const p=a.palette[a.rows[y][x]];if(p){g.fillStyle=p;g.fillRect(x,y,1,1);}}aqspPixelCache.set(key,c);return c;}catch{return null;}
}
function aqspPixelShot(key,x,y,angle=0){const a=AQSP_LOCAL_ART[key],im=aqspPixelImage(key);if(!a||!im)return false;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,-a.anchor[0],-a.anchor[1]);ctx.restore();return true;}
const aqspHeadCache=new Map();
function aqspTaperedHead(kind,f,image,a){
 const key=kind+':'+f.rect.join(',');if(aqspHeadCache.has(key))return aqspHeadCache.get(key);
 const [x,y,w,h]=a.crop;try{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!g)return null;
 g.imageSmoothingEnabled=false;g.drawImage(image,f.rect[0]+x,f.rect[1]+y,w,h,0,0,w,h);g.globalCompositeOperation='destination-out';g.fillStyle='#000';
 for(let i=0;i<a.rearFade.length;i++){g.globalAlpha=1-a.rearFade[i];g.fillRect(i*2,0,2,h);}g.globalCompositeOperation='source-over';g.globalAlpha=1;aqspHeadCache.set(key,c);return c;}catch{return null;}
}
function aqspNativeHead(s,yOffset=0,providedFrame=null){
 const a=AQSP_NATIVE_HEADS[s.k],spec=LICENSED_CLIP_SPECS[s.k],frames=spec?.preservedClips?.projectile?.frames;if(!a||!frames?.length)return false;
 const frame=lowEffects?0:(providedFrame??Math.floor(effectClockTick/5)%frames.length),f=frames[Math.max(0,Math.min(frames.length-1,frame))],image=licensedImageForFrame(s.k,f);if(!image?.complete||!image.naturalWidth)return false;
 const [cx,cy,cw,ch]=a.crop,angle=Number.isFinite(s.angle)?s.angle:s.side?Math.PI:0;
 ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y+yOffset));ctx.rotate(angle);ctx.imageSmoothingEnabled=false;
 if(a.clip){ctx.beginPath();a.clip.forEach(([px,py],i)=>{const xx=(px-a.anchor[0])*a.scale,yy=(py-a.anchor[1])*a.scale;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.closePath();ctx.clip();}
 const tapered=a.rearFade?aqspTaperedHead(s.k,f,image,a):null;if(tapered)ctx.drawImage(tapered,0,0,cw,ch,-a.anchor[0]*a.scale,-a.anchor[1]*a.scale,cw*a.scale,ch*a.scale);else ctx.drawImage(image,f.rect[0]+cx,f.rect[1]+cy,cw,ch,-a.anchor[0]*a.scale,-a.anchor[1]*a.scale,cw*a.scale,ch*a.scale);ctx.restore();return true;
}
function aqspSprite(name,x,y,width,height,phase=.5,options={}){
 return typeof drawLicensedEffectArt==='function'&&drawLicensedEffectArt(name,Math.round(x),Math.round(y),phase,{width,height,...options});
}
function aqspPhase(offset=0){return lowEffects ? .5 :.22+(.5-.5*Math.cos((effectClockTick+offset)*Math.PI/30))*.5;}


function aqspFrames(list,step=7){return list[lowEffects?0:Math.floor(effectClockTick/step)%list.length];}
function aqspOverhead(u,bit,width=16,height=18){
 const a=statusArtAnchor(u),flags=(u.presentationFlags||0)|bossRenderFlags(u),bits=[2048,32768,8388608].filter(b=>flags&b),slot=Math.max(0,bits.indexOf(bit)),xx=a.x+(slot-(bits.length-1)/2)*19;
 return {x:Math.round(Math.max(a.minX+width/2,Math.min(a.maxX-width/2,xx))),y:Math.round(Math.max(a.minY+height/2,Math.min(a.maxY-height/2,a.top-3)))};
}
function aqspPoison(u){const a=statusArtAnchor(u);return aqspSprite('deathplagueicon_green',a.x+a.side+4,a.y-Math.min(19,a.height*.27),13,17,.5,{crop:[4,1,16,20],frame:aqspFrames([0,1,2,3,4,5],8)});}
const aqspStatusMaterialCache=new Map();
function aqspStatusMaterial(key){
 if(aqspStatusMaterialCache.has(key))return aqspStatusMaterialCache.get(key);
 const root=key==='root',name=root?'roots_original':'energyhaloground_ice',m=typeof LICENSED_EFFECT_ART!=='undefined'?LICENSED_EFFECT_ART[name]:null,image=effectImages['licensed_art_'+name],frame=root?4:2,r=m?.frames?.[frame];if(!r||!image?.complete||!image.naturalWidth)return null;
 const crop=root?[0,8,58,62]:[0,0,80,34],w=root?40:33,h=root?30:11,ox=r[4]||0,oy=r[5]||0,left=Math.max(ox,crop[0]),top=Math.max(oy,crop[1]),right=Math.min(ox+(r[6]||r[2]),crop[0]+crop[2]),bottom=Math.min(oy+(r[7]||r[3]),crop[1]+crop[3]);
 try{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!g){aqspStatusMaterialCache.set(key,null);return null;}g.imageSmoothingEnabled=false;g.drawImage(image,r[0]+(left-ox)*r[2]/(r[6]||r[2]),r[1]+(top-oy)*r[3]/(r[7]||r[3]),(right-left)*r[2]/(r[6]||r[2]),(bottom-top)*r[3]/(r[7]||r[3]),(left-crop[0])*w/crop[2],(top-crop[1])*h/crop[3],(right-left)*w/crop[2],(bottom-top)*h/crop[3]);
 const data=g.getImageData(0,0,w,h),src=data.data.slice(),body=new Uint8Array(w*h),shade=new Uint8Array(w*h),rgba=data.data;
 for(let i=0;i<w*h;i++)if(src[i*4+3]>=40){body[i]=1;shade[i]=Math.max(src[i*4],src[i*4+1],src[i*4+2]);}
 // Grow only source-authored branches by one horizontal pixel. The outer
 // dark edge and stable mature frame keep a restraint, rather than fading tips.
 if(root)for(let y=0;y<h;y++)for(let x=1;x<w;x++)if(src[(y*w+x-1)*4+3]>=40&&!body[y*w+x]){body[y*w+x]=1;shade[y*w+x]=110;}
 rgba.fill(0);const palette=root?[[32,46,32],[65,92,43],[104,143,57],[153,187,87]]:[[29,59,72],[48,103,126],[80,166,186],[176,220,205]],outline=root?[28,39,28]:[24,43,57];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let rgb=null;if(body[i]){const v=shade[i];rgb=palette[v<65?0:v<115?1:v<190?2:3];}else{for(const[dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&body[yy*w+xx]){rgb=outline;break;}}}if(rgb){rgba[i*4]=rgb[0];rgba[i*4+1]=rgb[1];rgba[i*4+2]=rgb[2];rgba[i*4+3]=255;}}
 g.putImageData(data,0,0);aqspStatusMaterialCache.set(key,c);return c;}catch{aqspStatusMaterialCache.set(key,null);return null;}
}
function aqspMaterialStatus(key,x,y,width,height,anchorY){const im=aqspStatusMaterial(key);if(!im)return false;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(im,Math.round(x)-width/2,Math.round(y)-height*anchorY,width,height);ctx.restore();return true;}
function aqspRoot(u,boss=false){const a=statusArtAnchor(u);return aqspMaterialStatus('root',a.x,a.y+3,boss?Math.min(64,a.foot*2+12):40,boss?Math.max(27,Math.min(36,a.height*.5)):30,.83);}
function aqspMagicHead(kind,x,y,size,angle=0){
 if(kind==='electric')return aqspSprite('electricsphere_ice',x,y,size,size,.5,{crop:[16,45,60,60],frame:aqspFrames([21,22,23,24],4),angle});
 if(kind==='fire'||kind==='goldfire')return aqspSprite('flamesphere_'+(kind==='fire'?'fire':'gold'),x,y,size,size,.5,{crop:[26,43,88,84],frame:aqspFrames([20,21,22,23,24],4),angle});
 return aqspSprite('teleportpurpleorb_'+kind,x,y,size,size,.5,{crop:[4,3,92,98],frame:aqspFrames([6,7,8,9,10,11],5),angle});
}

// REPLACEMENT FUNCTIONS
function drawGuardIndicator(u){
 const f=u.presentationFlags||0;if(u.dead||!(f&(8192|16384)))return;
 const a=statusArtAnchor(u),face=visualFor(u).face,frame=aqspFrames([0,1,2,3,4],8);let painted=false;
 if(f&8192)painted=aqspSprite('defense_gold',a.x+face*(a.side+5),a.y-Math.min(27,a.height*.4),16,19,.5,{frame,crop:[35,15,33,37],face});
 if(f&16384)painted=aqspSprite('defense_ice',a.x-face*(a.side+5),a.y-Math.min(27,a.height*.4),16,19,.5,{frame,crop:[35,15,33,37],face:-face})||painted;
 if(!painted)aqspFallback.drawGuardIndicator(u);
}
function drawExposureIndicator(u){
 if(u.dead||!((u.presentationFlags||0)&32768)||((u.presentationFlags||0)&2))return;
 const p=aqspOverhead(u,32768);if(!aqspSprite('f2_deathstrikeseal_original',p.x,p.y,17,18,.5,{crop:[44,48,92,96],frame:aqspFrames([7,9,11,13,15,17],8)}))aqspFallback.drawExposureIndicator(u);
}
function drawRootIndicator(u){if(u.dead||!((u.presentationFlags||0)&4096))return;if(!aqspRoot(u))aqspFallback.drawRootIndicator(u);}
function drawHealingBlockIndicator(u){
 if(u.dead||!(u.presentationFlags&2048))return;const p=aqspOverhead(u,2048,14,18);
 if(!aqspPixelShot('healingblock',p.x,p.y))aqspFallback.drawHealingBlockIndicator(u);
}
function drawOrdinaryMovementCues(u,flags){
 if(u.dead)return false;const a=statusArtAnchor(u),face=visualFor(u).face;let missing=0;
 if(flags&4){if(!aqspSprite('smoke_stone',a.x-face*(a.side+4),a.y+1,31,20,.5,{frame:aqspFrames([0,1,2,3,4,5],5),anchorY:.85,face:-face,alpha:.9}))missing|=4;}
 if(flags&2){const ok=aqspSprite('roots_stone',a.x,a.y+3,39,15,.5,{crop:[0,8,58,62],frame:4});if(ok){aqspSprite('bouldersphere_stone',a.x-11,a.y+1,15,12,.5,{crop:[106,10,94,90],frame:17});aqspSprite('bouldersphere_stone',a.x+10,a.y+2,14,11,.5,{crop:[106,10,94,90],frame:17,angle:1.7});aqspSprite('bouldersphere_stone',a.x,a.y+1,18,14,.5,{crop:[106,10,94,90],frame:17});}else missing|=2;}
 if(flags&1){if(!aqspMaterialStatus('slow',a.x,a.y+5,33,11,.5))missing|=1;}
 if((flags&8)&&!(flags&1048576)){if(!aqspPoison(u))missing|=8;}
 if(missing)aqspFallback.drawOrdinaryMovementCues(u,missing);return !!(flags&2);
}
function drawBossStatus(u){
 if(u.dead)return;const flags=bossRenderFlags(u),mask=65536|131072|262144|524288|1048576|2097152|8388608;if(!(flags&mask))return;
 const a=statusArtAnchor(u);let missing=0;
 if(flags&65536){if(!aqspSprite('frozen_original',a.x,a.y+5,Math.min(64,a.foot*2.2+4),Math.max(22,Math.min(39,a.height*.5)),.5,{crop:[0,5,80,71],frame:aqspFrames([3,4,5,8,9],9),anchorY:.98,alpha:.88}))missing|=65536;}
 if((flags&131072)&&!aqspRoot(u,true))missing|=131072;
 if(flags&262144){if(!aqspSprite('energyhaloground_ice',a.x,a.y+6,Math.min(44,a.foot*1.8),9,.5,{frame:3,crop:[0,0,80,34],alpha:.8}))missing|=262144;}
 if(flags&524288){if(!aqspSprite('f2_eightgates_purpleflame_fire',a.x-a.side-3,a.y+1,11,25,.5,{crop:[64,2,58,164],frame:aqspFrames([5,6,7,8,9,10],5),anchorY:.98}))missing|=524288;}
 if((flags&1048576)&&!aqspPoison(u))missing|=1048576;
 if(flags&2097152){let ok=false;for(const side of [-1,1])ok=aqspSprite('f2_eightgates_purpleflame_blood',a.x+side*(a.side+5),a.y+1,10,31,.5,{crop:[64,2,58,164],frame:aqspFrames([5,6,7,8,9,10],6),anchorY:.98,alpha:.9})||ok;if(!ok)missing|=2097152;}
 if(flags&8388608){const p=aqspOverhead(u,8388608,15,16);if(!aqspSprite('f6_bbs_stun_gold',p.x,p.y,15,16,.5,{crop:[63,63,54,54],frame:aqspFrames([22,23,24],8)}))missing|=8388608;}
 if(missing)aqspFallback.drawBossStatus({...u,presentationFlags:missing});
}
function drawMaterialProjectile(s){
 const art=ORDINARY_SHOT_ART[s.k];if(!art)return false;
 if(AQSP_NATIVE_HEADS[s.k]&&aqspNativeHead(s,-16))return true;
 const x=Math.round(s.x),y=Math.round(s.y)-16,angle=Number.isFinite(s.angle)?s.angle:s.side?Math.PI:0,shape=art[0];
 if(s.k==='cannon'&&aqspMagicHead('fire',x,y,14,angle))return true;
 if(s.k==='froststing_hornet'&&aqspSprite('plasma_green',x,y,17,15,.5,{frame:aqspFrames([0,1,2,3,4,5,6,7],4),angle,anchorX:.72}))return true;
 if(s.k==='willyee_char_10_lute_bard'&&aqspSprite('plasma_storm',x,y,17,15,.5,{frame:aqspFrames([0,1,2,3,4,5,6,7],4),angle,anchorX:.72}))return true;
 if(s.k==='voltaic_beetle'&&aqspMagicHead('electric',x,y,16,angle))return true;
 const magic={ribbed_fanclam:'ice',willyee_char_02:'gold',willyee_char_08:'electric',willyee_char_42:'green',willyee_char_54:'ice',willyee_char_34_goldring_caster:'fire'};
 if(magic[s.k]&&aqspMagicHead(magic[s.k],x,y,13,angle))return true;
 if(['arrow','needle','crystal','vial'].includes(shape)&&aqspPixelShot(shape,x,y,angle))return true;
 return aqspFallback.drawMaterialProjectile(s);
}
function drawOrbGlyph(x,y){if(!aqspMagicHead('ice',x,y,13))aqspFallback.drawOrbGlyph(x,y);}
function drawSparkGlyph(x,y){if(!aqspSprite('f6_bbs_stun_gold',x,y,14,14,.5,{crop:[63,63,54,54],frame:aqspFrames([22,23,24],5)}))aqspFallback.drawSparkGlyph(x,y);}
function drawCinderArrow(s){if(!aqspPixelShot('cinder',s.x,s.y,s.angle??0))aqspFallback.drawCinderArrow(s);}
function drawGuidedFlight(s){
 if(!['gilded_shooter','lumen_charger','spark_bird','cinderbow_archer','antler_archer','light_bowman'].includes(s.k))return false;
 const tick=typeof multiPlayback!=='undefined'&&multiPlayback?multiLastSceneTick:Math.round(visualTime*60),f=GuidedFlight.flightPresentation(LICENSED_CLIP_SPECS[s.k],GUIDED_FLIGHT_CONTRACT,s,Math.max(tick,s.birthTick));
 if(s.k==='cinderbow_archer'){drawCinderArrow(s);return true;}if(s.k==='spark_bird'){drawSparkGlyph(s.x,s.y);return true;}
 if(['gilded_shooter','lumen_charger'].includes(s.k)&&aqspNativeHead({...s,x:f.x,y:f.y,angle:f.angle},0,f.frameIndex))return true;
 return aqspFallback.drawGuidedFlight(s);
}
function drawMushroomTrap(s){
 const im=aqspPixelImage('trap');if(!im)return aqspFallback.drawMushroomTrap(s);
 ctx.save();ctx.translate(Math.round(s.x)-AQSP_TRAP.anchor[0],Math.round(s.y)-AQSP_TRAP.anchor[1]);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,0,0);
 ctx.fillStyle=TEAM_COLORS[s.side===0?0:1];ctx.fillRect(11,19,3,2);ctx.fillStyle='#e4c995';ctx.fillRect(12,19,1,1);ctx.restore();return true;
}
function drawProjectile(s){
 if(s.k==='punchcap_mushroom')return drawMushroomTrap(s);
 if(drawMaterialProjectile(s))return true;
 if(s.k==='wraith'&&LICENSED_CLIP_REGISTRIES.wraith){const spec=LICENSED_CLIP_SPECS.wraith,f=spec.preservedClips.projectile.frames[spec.projectilePresentation.frameIndex],image=licensedImageForFrame('wraith',f),a=spec.projectilePresentation.anchor;if(image){ctx.imageSmoothingEnabled=false;ctx.drawImage(image,...f.rect,s.x-a[0],s.y-a[1],f.rect[2],f.rect[3]);}return true;}
 if(drawGuidedFlight(s))return true;
 if(s.k==='orb_hunter'){drawOrbGlyph(s.x,s.y-18);return true;}
 if(s.k==='spirit_fan_wolf'){if(aqspSprite('plasma_ice',s.x,s.y-18,17,15,.5,{frame:aqspFrames([0,1,2,3,4,5,6,7],4),angle:s.angle??0,anchorX:.72}))return true;return aqspFallback.drawProjectile(s);}
 if(s.k==='frostmage'){if(aqspPixelShot('crystal',s.x,s.y-12,s.angle??0))return true;}
 if(s.k!=='archer'&&s.k!=='sky_harpooner')return false;
 const angle=s.angle??Math.atan2((s.target?.y??s.y)-s.y,(s.target?.x??s.x)-s.x);return drawEffect('arrow',s.x,s.y-18,effectClockTick,1,angle);
}
