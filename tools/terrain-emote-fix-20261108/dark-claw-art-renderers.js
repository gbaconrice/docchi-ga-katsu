/* dark-claw-material-v1: only the added darkfan curse/claw cue, not source sprites. */
function isDarkClawEffect(f){return f.kind==='boss_claw'&&bossColor(f.color)===0xa66aea;}
function darkClawWorldPoint(x,y,angle,along,across){return [x+Math.cos(angle)*along-Math.sin(angle)*across,y+Math.sin(angle)*along+Math.cos(angle)*across];}
function darkClawMaterial(){
 // Earth and fractured lips follow the existing field. Violet lives inside the cut.
 const palettes={grassland:['#242c28','#465248','#798174','#a8ad92'],shallow_ford:['#242b31','#45575b','#778a89','#a8b5ae'],crosswind_ridge:['#29292a','#57544c','#908574','#bbae97'],desert:['#46382c','#796248','#aa8c62','#d1b680'],icefield:['#293942','#526f7c','#92b2ba','#c5d9d6'],highland:['#2b2c2d','#55544f','#8b8b7a','#b6b5a1'],rockfield:['#2a272c','#585256','#8c8182','#b5aaa1'],volcano:['#272127','#493b40','#71605d','#927b72']};return palettes[battleEnvironment?.fieldId]||palettes.grassland;
}
function drawDarkClawGouge(x,y,angle,radius,index,fade,p){
 const count=16,length=radius*[1.32,1.52,1.16][index],offset=radius*[-.3,.015,.29][index],bend=[.11,.06,.14][index],left=[],right=[],center=[],widths=[0,.34,.68,.82,.57,1,.78,.92,.54,.85,.71,.97,.55,.62,.28,.15,0];
 for(let i=0;i<=count;i++){
  const q=i/count,along=(q-[.46,.42,.39][index])*length,fracture=([0,-.4,.2,-.3,.6,.2,-.35,.1][(i+index*2)%8])*Math.sin(Math.PI*q),across=offset+Math.sin(Math.PI*q)*radius*bend+fracture+3,w=.12+widths[(i+index)%15+1]*Math.pow(Math.sin(Math.PI*q),.35)*(1.9+index*.13),a=angle+[.025,-.035,.06][index];
  center.push(darkClawWorldPoint(x,y,a,along,across));left.push(darkClawWorldPoint(x,y,a,along,across-w));right.push(darkClawWorldPoint(x,y,a,along,across+w));
 }
 ctx.save();const alpha=ctx.globalAlpha*fade;
 // Deliberately broken borders and unequal tips: no uniform outline or repeated bricks.
 ctx.globalAlpha=alpha*.9;bossPixelPoly([...left,...right.slice().reverse()],p[0]);
 for(const [start,end] of (index===1?[[2,6],[9,14]]:[[2+index,6+index],[10,14-index]])){
  const top=left.slice(start,end+1),bottom=center.slice(start,end+1).reverse();ctx.globalAlpha=alpha*.82;bossPixelPoly([...top,...bottom],p[1]);
 }
 for(const i of (lowEffects?[4+index,12-index]:[3+index,7,11-index,14-index])){
  const a=left[i],b=left[i+1],chip=(i+index)%3;ctx.globalAlpha=alpha*.76;
  bossPixelPoly([[a[0],a[1]-1],[b[0]-1,b[1]-2-chip*.35],[b[0]+1,b[1]],[a[0]+1,a[1]+1]],p[2]);
  if(!lowEffects&&chip===0){ctx.globalAlpha=alpha*.65;bossPixelRect(a[0],a[1]-1,2,1,p[3]);}
 }
 // A few recessed violet facets carry the curse color, not a luminous purple stripe.
 for(const i of (lowEffects?[8-index]:[5+index,9-index,12])){const a=center[i],b=center[i+1];ctx.globalAlpha=alpha*(i===12?.38:.65);bossPixelLine(a[0],a[1],b[0],b[1],i===9-index?'#8b6b9b':'#5c426b',1);}
 if(!lowEffects)for(const i of [4+index,12-index]){const a=right[i],sgn=i<8?-1:1,xx=Math.round(a[0]+sgn*2),yy=Math.round(a[1]+2);ctx.globalAlpha=alpha*.62;bossPixelPoly([[xx-2,yy],[xx,yy-2],[xx+2,yy],[xx,yy+1]],p[1]);ctx.globalAlpha=alpha*.6;bossPixelRect(xx-1,yy-1,1,1,p[2]);}
 ctx.restore();
}
function drawDarkClawDebris(x,y,angle,r,age,p,contact){
 const life=contact?8:12;if(age>=life||lowEffects)return;const t=age/life,fade=Math.pow(1-t,1.5),n=contact?2:5;
 for(let i=0;i<n;i++){
  const phase=Math.min(1,age/8),along=contact?2+i*2:r*(-.34+(i%4)*.23),across=contact?(i-.5)*3:((i%3)-1)*r*.25,dir=(i%2?1:-1),travel=1+phase*(contact?2:4),h=Math.sin(Math.PI*phase)*2,g=darkClawWorldPoint(x,y,angle,along+travel*.55,across+dir*travel*.4),px=Math.round(g[0]),py=Math.round(g[1]-h),size=1;
  ctx.globalAlpha=fade*.7;bossPixelPoly([[px-size,py],[px,py-size-1],[px+size,py],[px,py+1]],p[1]);ctx.globalAlpha=fade*.62;bossPixelRect(px,py-1,1,1,p[i%3===0?3:2]);
 }
}
function drawDarkClawEffect(f,age,duration){
 const t=age/duration,x=Math.round(f.x),y=Math.round(f.y),r=Math.max(8,Math.min(100,f.radius||30)),dx=(f.targetX??x+(f.face||1)*r)-x,dy=(f.targetY??y)-y,angle=Math.atan2(dy,dx),p=darkClawMaterial();
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(duration>=60){
  // Ground damage is active from its first tick; only displaced grit moves.
  const fade=t>.72?Math.max(0,(1-t)/.28):1;for(let i=0;i<3;i++)drawDarkClawGouge(x,y,angle,r,i,fade,p);drawDarkClawDebris(x,y,angle,r,age,p,false);
 }else drawDarkClawDebris(x,y,angle,r,age,p,true);
 ctx.restore();
}
