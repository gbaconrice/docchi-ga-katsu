function drawCornerPillarCues(layer){
 if(!licensedFxHas('beamlaser_gold')||!licensedFxHas('energyhaloground_gold'))return drawOriginalCornerPillarCues(layer);
 const playback=typeof multiPlayback!=='undefined'&&multiPlayback;
 const at=effectClockTick+(state==='result'?cornerResultOffset:0);
 const cues=playback?(state==='result'?multiPlayback.cornerCuesAt(at):replayCornerCues):wave4Host.cornerCuesAt(at);
 for(const c of cues){
  if((c.phase==='warning')!==(layer==='ground'))continue;
  const x=Math.round(c.x),y=Math.round(c.y),r=c.radius,t=c.age/c.duration;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(c.phase==='warning'){
   if(!drawLicensedEffectArt('energyhaloground_gold',x,y,t,{width:r*2,height:r*2,alpha:.85,frame:licensedFxFrame('energyhaloground_gold',.3+t*.2)}))bossPixelBoundary(x,y,r,BOSS_PIXEL_PALETTES.gold,Math.floor(c.age/4),true);
   // Exact authoritative danger radius and faction remain readable.
   for(const side of [-1,1]){ctx.fillStyle=TEAM_COLORS[c.side===0?0:1];ctx.fillRect(x+side*r-2,y-1,4,2);}
  }else{
   licensedFxColumn('beamlaser_gold',x,y,t,Math.max(22,r*2),42+Math.min(28,r));
   ctx.fillStyle=TEAM_COLORS[c.side===0?0:1];ctx.fillRect(x-4,y+1,8,2);
  }
  ctx.restore();
 }
}
