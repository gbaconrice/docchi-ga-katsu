 // Material accents augment the licensed fists/pincers/claws, never substitute a symbolic weapon.
 // All five cues begin on the authoritative event. Damage sparks remain resolved_hit-only.
 if(k==='fist_strike'){
  const reach=Math.min(len,52),cx=x+dx/len*reach,cy=y+dy/len*reach-13;
  // A short compression wake behind the fist, not a ranged bolt.
  if(age<6)for(let i=0;i<3;i++){const q=i/3,off=(i-1)*4;bossPixelLine(cx-dx/len*(16-age)-nx*off,cy-dy/len*(16-age)-ny*off,cx-dx/len*3-nx*off,cy-dy/len*3-ny*off,p[age<3?4:2],i===1?2:1);}
 }else if(k==='fist_wave'){
  // Entire forward pressure fan is present at age zero: this attack is instantaneous.
  // Later frames only dissipate dust at the same positions; no outward travelling hit front.
  const a=Math.atan2(dy,dx),reach=Math.min(r,95);
  ctx.globalAlpha*=1-t;
  for(let i=0;i<9;i++){const off=-.62+i*.155,dist=reach*(.57+(i%3)*.18),cx=x+Math.cos(a+off)*dist,cy=y+Math.sin(a+off)*dist;
   bossPixelLine(cx-Math.cos(a)*12,cy-Math.sin(a)*12,cx,cy,p[age<3?4:2],age<4?3:2);
   const rise=Math.min(10,age*.7);bossPixelRect(cx-2,cy-rise,3,2,BOSS_PIXEL_PALETTES.stone[3]);bossPixelRect(cx+2,cy-rise-2,2,2,p[2]);
  }
 }else if(k==='pincer_snap'){
  // The original blue-and-gold jaws supply the actual closure at frame 15.
  const cx=x+dx/len*Math.min(len,50),cy=y+dy/len*Math.min(len,50)-18;
  if(age<8)for(let i=-1;i<=1;i++){const off=i*4;bossPixelLine(cx-8*dx/len+nx*off,cy-8*dy/len+ny*off,cx+5*dx/len+nx*off,cy+5*dy/len+ny*off,p[age<3?5:2],1);}
 }else if(k==='claw_block'){
  // Metal-on-metal flakes at the held hooks. This cue only exists after a real block.
  const cx=x+dx/len*23,cy=y+dy/len*23-22;
  for(let i=0;i<6;i++){const a=i*2.4,dist=3+age*.9,px=cx+Math.cos(a)*dist,py=cy+Math.sin(a)*dist-age*.3;bossPixelLine(px,py,px+Math.cos(a)*3,py+Math.sin(a)*3,p[i%2?4:2],1);}
  if(age<3)bossPixelGlint(cx,cy,p,1);
 }else if(k==='claw_counter'){
  // Counter uses just one source upward sweep, not the clip's unrelated second contact.
  const cx=x+dx/len*34,cy=y+dy/len*34-16;
  ctx.globalAlpha*=1-t;
  if(age<9)for(let i=-1;i<=1;i++){const off=i*6;bossPixelLine(cx-dx/len*12+nx*off,cy-dy/len*12+ny*off+7,cx+dx/len*9+nx*off,cy+dy/len*9+ny*off-9,p[age<3?4:2],1);}
 }else
