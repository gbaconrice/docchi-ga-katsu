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