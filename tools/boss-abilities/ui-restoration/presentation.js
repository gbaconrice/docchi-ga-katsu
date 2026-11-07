// Boss cues are deterministic geometry sampled from recorded simulation events.
function bossColor(v){return typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=0xffffff?v:typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?parseInt(v.slice(1),16):0xefd7a0;}
function bossEffectData(f){return {radius:Math.max(1,Math.min(240,Number.isFinite(f.radius)?f.radius:30)),duration:Math.max(1,Math.min(600,Math.round(Number.isFinite(f.duration)?f.duration:40))),color:bossColor(f.color)};}
function effectLifetime(f){return f.kind.startsWith('boss_')?(f.duration||40):EFFECT_META[f.kind].frames/EFFECT_META[f.kind].fps*60;}
function bossPresentationFlags(u,time){if(u.dead)return 0;const tick=Math.round(time*60);let bits=0;for(const [i,k] of ['freeze','root','airborne','burn','poison','fury','phase','stun'].entries()){const s=u.bossStatuses?.[k];if(k==='phase'?u.bossPhaseUntil>tick:s&&s.start<=tick&&s.until>tick)bits|=1<<(16+i);}const scale=u.bossRadiusScale;if(Number.isFinite(scale)&&scale!==1)bits|=Math.max(1,Math.min(63,Math.round(scale*20)))<<24;return bits;}
function bossRenderFlags(u){return Number.isInteger(u.presentationFlags)?u.presentationFlags:bossPresentationFlags(u,typeof elapsed==='number'?elapsed:0);}
function bossRenderScale(u){const n=(bossRenderFlags(u)>>>24)&63;return n?n/20:1;}
// Visual-only, deterministic pixel VFX. No gameplay reads beyond the recorded cue/status.
// Native-pixel clusters, limited material ramps and stepped silhouettes match the arena art.
const BOSS_PIXEL_PALETTES=Object.freeze({
 fire:['#42252a','#83332c','#c9572e','#ee8937','#ffc96a','#fff0bd'],
 ice:['#233849','#355f7b','#488ba5','#78bdce','#b9e4e4','#e4f3e9'],
 gold:['#44392e','#756039','#aa8b4d','#d1b56e','#f1d99b','#fff1c9'],
 storm:['#30283f','#524269','#7b69a0','#aa94cc','#d4c7ec','#f3e8ff'],
 stone:['#292e2b','#48504a','#6f7464','#969582','#beb69a','#dbcfab'],
 green:['#29362c','#435a39','#65814a','#91a763','#bbcd87','#e5e8b3'],
 blood:['#3d2533','#703343','#ae4b54','#dc7372','#f7ae98','#ffe0bd']
});
function bossPixelPalette(color,kind=''){
 if(/fire|rain|meteor/.test(kind))return BOSS_PIXEL_PALETTES.fire;
 if(/ice|frost/.test(kind))return BOSS_PIXEL_PALETTES.ice;
 if(/quake|fissure|wall/.test(kind))return BOSS_PIXEL_PALETTES.stone;
 if(/poison|thorn/.test(kind))return BOSS_PIXEL_PALETTES.green;
 const c=bossColor(color),r=c>>>16,g=c>>>8&255,b=c&255;
 return r>g*1.35&&r>b*1.2?(g<100?BOSS_PIXEL_PALETTES.blood:BOSS_PIXEL_PALETTES.fire):b>r*1.12&&b>g*1.25?BOSS_PIXEL_PALETTES.storm:g>r*1.12&&g>b?BOSS_PIXEL_PALETTES.green:b>r*1.08||g>r*1.08?BOSS_PIXEL_PALETTES.ice:BOSS_PIXEL_PALETTES.gold;
}
// The original replay schema records kind and exact color, but not sourceToken.
// Reflection is the dedicated #83e2ff throw cue emitted by willyee_stone_golem.
// Resolve that documented cue explicitly; blue palettes alone never imply shards.
function bossPixelEffectVariant(f){return f.kind==='boss_throw'&&bossColor(f.color)===0x83e2ff?'reflection_shards':f.kind.slice(5);}
function bossPixelRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function bossPixelLine(x0,y0,x1,y1,color,width=1){
 // Clip in logical arena coordinates before stepping. Full-field beams may begin
 // over700px off-screen; a pre-clip step cap would truncate their visible end.
 const margin=Math.ceil(width/2)+3,xmin=-margin,ymin=-margin,xmax=480+margin,ymax=538+margin;
 const vx=x1-x0,vy=y1-y0;let enter=0,leave=1;
 for(const [p,q]of [[-vx,x0-xmin],[vx,xmax-x0],[-vy,y0-ymin],[vy,ymax-y0]]){
  if(p===0){if(q<0)return;continue;}const t=q/p;
  if(p<0){if(t>leave)return;enter=Math.max(enter,t);}else{if(t<enter)return;leave=Math.min(leave,t);}
 }
 x1=Math.round(x0+leave*vx);y1=Math.round(y0+leave*vy);x0=Math.round(x0+enter*vx);y0=Math.round(y0+enter*vy);
 const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;
 ctx.fillStyle=color;const off=Math.floor(width/2);
 while(true){ctx.fillRect(x0-off,y0-off,width,width);if(x0===x1&&y0===y1)break;const e=err*2;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
}
function bossPixelPoly(points,color){
 let lo=Infinity,hi=-Infinity;for(const p of points){lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1]);}
 ctx.fillStyle=color;
 for(let y=Math.ceil(lo);y<=Math.floor(hi);y++){
  const xs=[];for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[j],b=points[i];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
  }
  xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2){const x=Math.round(xs[i]),w=Math.round(xs[i+1])-x+1;if(w>0)ctx.fillRect(x,y,w,1);}
 }
}
function bossPixelNoise(i,seed=0){const v=Math.sin(i*127.1+seed*311.7)*43758.5453;return v-Math.floor(v);}
function bossPixelGlint(x,y,p,size=2){
 bossPixelRect(x-1,y-size-1,3,size*2+3,p[1]);bossPixelRect(x-size-1,y-1,size*2+3,3,p[1]);
 bossPixelRect(x,y-size,1,size*2+1,p[4]);bossPixelRect(x-size,y,size*2+1,1,p[4]);bossPixelRect(x,y,1,1,p[5]);
}
function bossPixelChip(x,y,p,size=3,seed=0){
 const s=Math.max(2,Math.round(size));
 bossPixelPoly([[x-s,y],[x-s+1,y-s],[x+s-1,y-s-1],[x+s+1,y-1],[x+s-1,y+s],[x-s+1,y+s]],p[0]);
 bossPixelPoly([[x-s+1,y-1],[x,y-s],[x+s-1,y-1],[x+1,y+s-1],[x-s+1,y+1]],p[2]);
 bossPixelLine(x-s+1,y-1,x,y-s,p[4]);bossPixelRect(x+1,y,Math.max(1,s-1),1,p[1]);
}
function bossPixelCrystal(x,y,h,p,lean=0){
 const w=Math.max(3,Math.round(h*.22)),tipx=x+lean,tipy=y-h;
 bossPixelPoly([[x-w-1,y-2],[tipx-1,tipy],[tipx+2,tipy+1],[x+w+1,y-4],[x+w-1,y+2],[x-w+2,y+3]],p[0]);
 bossPixelPoly([[x-w,y-3],[tipx,tipy+1],[x,y-3],[x-1,y+1]],p[2]);
 bossPixelPoly([[tipx,tipy+1],[x+w,y-4],[x+1,y+1],[x,y-3]],p[3]);
 bossPixelLine(tipx,tipy+2,x,y-4,p[5]);bossPixelLine(x-w+1,y-3,x-1,y+1,p[4]);
 bossPixelRect(x+1,y-5,2,2,p[1]);
}
// Deliberately uneven tongues and two-tone embers, never a vector teardrop.
function bossPixelFlame(x,y,height,p,frame=0,seed=0){
 const h=Math.max(6,Math.round(height)),w=Math.max(3,Math.min(10,Math.round(h*.19))),sway=Math.sin(frame*.8+seed)*w*.45;
 const silhouette=[[x-w*.6,y+1],[x-w,y-h*.12],[x-w*1.1,y-h*.3],[x-w*.5,y-h*.5],[x-w*.7,y-h*.7],[x+sway,y-h],[x+w*.4+sway,y-h*.72],[x+w*.25,y-h*.55],[x+w*.9,y-h*.4],[x+w,y-h*.18],[x+w*.6,y]];
 bossPixelPoly(silhouette,p[1]);
 bossPixelPoly([[x-w*.4,y],[x-w*.8,y-h*.2],[x-w*.65,y-h*.38],[x-w*.2,y-h*.51],[x-w*.4,y-h*.67],[x+sway,y-h*.9],[x+w*.15,y-h*.55],[x+w*.65,y-h*.34],[x+w*.7,y-h*.18],[x+w*.4,y]],p[3]);
 bossPixelPoly([[x-w*.25,y],[x-w*.5,y-h*.2],[x-w*.2,y-h*.42],[x+1,y-h*.62],[x+w*.45,y-h*.31],[x+w*.4,y-h*.12]],p[4]);
 bossPixelPoly([[x-1,y],[x-2,y-h*.15],[x,y-h*.34],[x+2,y-h*.13],[x+1,y]],p[5]);
 // Broken glowing tips are separate pixels, not alpha-blurred outlines.
 for(let i=0;i<2;i++){const rise=(frame*3+i*11+seed*7)%(h+9),px=x+Math.sin(i*3+seed)*w*1.6;bossPixelRect(px,y-h*.4-rise,1+(i%2),2,p[i?3:4]);}
}
function bossPixelSmoke(x,y,r,p,frame=0,seed=0){
 // Small, broken clusters leave the actor and floor visible.
 const rr=Math.max(3,Math.round(r));
 for(let row=-rr;row<=rr;row+=2){const span=Math.floor(Math.sqrt(Math.max(0,rr*rr-row*row)));for(let col=-span;col<=span;col+=2){
  const n=bossPixelNoise(Math.floor((col+rr)/2)+Math.floor((row+rr)/2)*37,seed);
  if(n<.28||((col+row+frame)%6===0&&n<.65))continue;
  bossPixelRect(x+col,y+row*.65,2,2,p[n>.85?3:row<0?2:1]);
 }}
}
function bossPixelArc(x,y,rx,ry,start,end,p,width=2,broken=false){
 const steps=Math.max(3,Math.ceil(Math.abs(end-start)*Math.max(rx,ry)/3));let prev=null;
 for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps,pt=[x+Math.cos(a)*rx,y+Math.sin(a)*ry];if(prev&&(!broken||Math.floor(i/3)%3!==2)){
  bossPixelLine(prev[0],prev[1]+1,pt[0],pt[1]+1,p[0],width+1);bossPixelLine(prev[0],prev[1],pt[0],pt[1],p[3],width);
  if(i%5<3)bossPixelRect(pt[0],pt[1]-1,2,1,p[4]);
 }prev=pt;}
}
function bossPixelBoundary(x,y,r,p,frame,warning=false){
 const n=Math.max(18,Math.ceil(r*.85)),alpha=ctx.globalAlpha;
 for(let i=0;i<n;i++){
  const a=i*Math.PI*2/n,xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;
  if(warning&&i%5===4)continue;
  bossPixelRect(xx-1,yy,3,2,p[0]);bossPixelRect(xx-1,yy-1,warning?2:3,1,p[(i+frame)%9<3?4:2]);
 }
 if(warning){ctx.globalAlpha=alpha*.5;for(let i=0;i<Math.min(28,r/2);i++){const a=i*2.399,rr=r*(.82+.13*bossPixelNoise(i,3));bossPixelRect(x+Math.cos(a)*rr,y+Math.sin(a)*rr,1,1,p[3]);}ctx.globalAlpha=alpha;}
}
function bossPixelDebris(x,y,r,p,frame,count=10,progress=.5){
 for(let i=0;i<count;i++){const a=i*2.399+bossPixelNoise(i,2),rr=r*(.25+.75*bossPixelNoise(i,4))*progress;
  const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
  bossPixelRect(px-2,py+2,5,2,p[0]);bossPixelChip(px,py-Math.sin(progress*Math.PI)*(3+bossPixelNoise(i,7)*9),p,2+Math.floor(bossPixelNoise(i,6)*2),i);
 }
}
function bossPixelRuneMotes(x,y,r,p,frame,count=7){
 for(let i=0;i<count;i++){const a=i*2.399,rr=r*(.45+.4*bossPixelNoise(i,3)),rise=(frame*2+i*7)%28;const xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.45-rise;
  bossPixelRect(xx,yy+3,2,4,p[1]);bossPixelRect(xx,yy,2,3,p[3]);if(i%3===0)bossPixelGlint(xx,yy,p,1);
 }
}
function bossPixelBolt(x,y,tx,ty,p,frame,width=2){
 const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,n=Math.max(3,Math.ceil(len/12)),points=[[x,y]];
 for(let i=1;i<n;i++){const off=(bossPixelNoise(i,frame)-.5)*15;points.push([x+dx*i/n+nx*off,y+dy*i/n+ny*off]);}points.push([tx,ty]);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];bossPixelLine(...a,...b,p[0],width+2);bossPixelLine(...a,...b,p[3],width);bossPixelLine(...a,...b,p[5],1);
  if(i%3===0){const ox=b[0]+nx*7-dx/len*8,oy=b[1]+ny*7-dy/len*8;bossPixelLine(...b,ox,oy,p[2],2);}
 }
}
function bossPixelImpact(kind,x,y,age,face=1){
 // Existing unmodified CC0 runtime sheets. Never stretch source pixels.
 const key=kind==='claw'?'drake_claw':kind==='quake'?'ground_slam':kind==='chain'?'chain_contact':'hit_spark';
 return drawEffect(key,Math.round(x),Math.round(y),age,face);
}
function bossPixelSkull(x,y,p,frame,flaming=false){
 if(flaming){bossPixelFlame(x-5,y-4,25,BOSS_PIXEL_PALETTES.fire,frame,1);bossPixelFlame(x+5,y-3,22,BOSS_PIXEL_PALETTES.fire,frame,4);}
 // Bone planes, asymmetric cracked brow, cheek shadow and articulated jaw.
 const bone=['','#343037','#696058','#a49b83','#d0c4a1','#f2e5c0'];
 const rows=['000111110000','001344443100','013455543310','134555544331','144554445431','144113411431','143001300331','013113411310','001344443100','001313131100','000133331000','000011110000'];
 const ox=Math.round(x)-6,oy=Math.round(y)-12;
 for(let yy=0;yy<rows.length;yy++)for(let xx=0;xx<rows[yy].length;xx++){const n=+rows[yy][xx];if(n)bossPixelRect(ox+xx,oy+yy,1,1,bone[n]);}
 bossPixelRect(ox+3,oy+6,1,1,p[4]);bossPixelRect(ox+8,oy+6,1,1,p[4]);
 if(frame%3===1)bossPixelRect(ox+4,oy+10,4,1,bone[1]);
}
function bossPixelDeathBlast(x,y,r,p,t,frame,age,face){
 // One existing authored burst owns the silhouette. Its original texels are
 // enlarged only by an integer, with nearest sampling; no repeated cloud ring.
 const meta=EFFECT_META.bomb_explosion,image=effectImages.bomb_explosion;
 if(image?.complete&&image.naturalWidth&&meta?.cell){
  const cell=Math.min(meta.frames-1,Math.floor(age*meta.fps/60)),scale=r>180?3:2;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=t>.6?Math.max(0,1-(t-.6)/.4):1;
  ctx.drawImage(image,cell*meta.cell[0],0,meta.cell[0],meta.cell[1],Math.round(x-meta.anchor[0]*scale),Math.round(y-meta.anchor[1]*scale),meta.cell[0]*scale,meta.cell[1]*scale);ctx.restore();
 }
 // Unequal debris velocities and short hot trails show the force moving from
 // the epicentre to the recorded radius, without painting an abstract boundary.
 const travel=r*(.08+.92*Math.pow(t,.68));
 for(let i=0;i<15;i++){
  const a=i*2.399+.2,rr=travel*(.48+.51*bossPixelNoise(i,8)),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
  const tail=(8+bossPixelNoise(i,3)*19)*(1-t*.6),nx=-Math.sin(a),ny=Math.cos(a);
  if(i%3!==0&&t<.67){
   bossPixelPoly([[px-Math.cos(a)*tail+nx*2,py-Math.sin(a)*tail+ny*2],[px+Math.cos(a)*3,py+Math.sin(a)*3],[px-Math.cos(a)*tail-nx*2,py-Math.sin(a)*tail-ny*2]],p[2]);
   bossPixelLine(px-Math.cos(a)*tail*.65,py-Math.sin(a)*tail*.65,px,py,p[4],1);
  }
  bossPixelChip(px,py-Math.sin(t*Math.PI)*13,BOSS_PIXEL_PALETTES.stone,2+i%4,i);
  if(t<.72)bossPixelRect(px,py,2,2,p[i%3?3:4]);
 }
 // A handful of asymmetrical secondary embers break away, never evenly spaced
 // sprites or flames attached to the entire outer circumference.
 if(t<.5)for(let i=0;i<5;i++){
  const a=i*2.399+1.1,rr=travel*(.38+.21*bossPixelNoise(i,2));
  bossPixelRect(x+Math.cos(a)*rr,y+Math.sin(a)*rr,3,2,p[4]);
 }
}
function bossPixelFirebird(x,y,angle,frame){
 const p=BOSS_PIXEL_PALETTES.fire,c=Math.cos(angle),s=Math.sin(angle),flap=[-1,0,1,0][frame%4];
 const point=(a,b)=>[x+a*c-b*s,y+a*s+b*c];
 const poly=(pts,color)=>bossPixelPoly(pts.map(([a,b])=>point(a,b)),color);
 // A feathered, tapered body with staggered pinions; pose changes are 4-frame stepped.
 for(const side of [-1,1]){
  poly([[-13,side*2],[-4,side*7],[2,side*(15+flap*4)],[5,side*(20+flap*4)],[7,side*8],[10,side*2]],p[0]);
  poly([[-11,side*2],[-3,side*5],[3,side*(16+flap*4)],[5,side*(17+flap*4)],[5,side*7],[9,side*2]],p[2]);
  for(let j=0;j<4;j++)poly([[-10+j*4,side*3],[-8+j*4,side*(9+j*2+flap*3)],[-5+j*4,side*(6+j*2+flap*3)],[-3+j*4,side*2]],p[j%2?3:4]);
 }
 poly([[-23,0],[-13,-5],[-5,-3],[6,-4],[10,-7],[14,-6],[15,-2],[20,0],[13,2],[10,5],[3,4],[-8,3],[-17,6]],p[1]);
 poly([[-20,0],[-9,-2],[5,-2],[11,-5],[14,-4],[13,0],[10,3],[2,2],[-8,2],[-17,4]],p[3]);
 poly([[-10,0],[5,-1],[11,-3],[13,-3],[12,0],[8,2],[0,1]],p[5]);
 const eye=point(12,-3);bossPixelRect(...eye,1,1,p[0]);
 for(let i=0;i<5;i++){const q=point(-18-i*5,Math.sin(i+frame)*3);bossPixelRect(...q,i<2?3:2,2,p[i%2?3:4]);}
}
function drawBossStatus(u){
 if(u.dead)return;const flags=bossRenderFlags(u),x=Math.round(u.x),y=Math.round(u.y),frame=Math.floor(effectClockTick/5);
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(flags&65536){const p=BOSS_PIXEL_PALETTES.ice;bossPixelBoundary(x,y+2,16,p,frame);bossPixelCrystal(x-12,y+2,24,p,-3);bossPixelCrystal(x+11,y+4,29,p,4);bossPixelCrystal(x-3,y+6,11,p,2);bossPixelRect(x-7,y-18,3,1,p[4]);}
 if(flags&131072){const p=BOSS_PIXEL_PALETTES.green;for(let i=-1;i<=1;i++){const xx=x+i*8;bossPixelLine(xx,y+4,xx-4,y-5,p[0],4);bossPixelLine(xx-4,y-5,xx+2,y-13,p[1],3);bossPixelLine(xx,y+4,xx-3,y-4,p[3],1);bossPixelPoly([[xx-1,y-9],[xx+7,y-15],[xx+6,y-9],[xx+1,y-6]],p[3]);}}
 if(flags&262144){bossPixelArc(x,y+2,13,4,.2,2.8,BOSS_PIXEL_PALETTES.stone,1,true);bossPixelRect(x-8,y+5,3,1,'#a0a898');}
 if(flags&2097152){const p=BOSS_PIXEL_PALETTES.blood;for(const i of [-1,1])bossPixelFlame(x+i*13,y+1,16+(frame+i)%4,p,frame,i+2);bossPixelRuneMotes(x,y,16,p,frame,4);}
 if(flags&524288)bossPixelFlame(x-11,y-12,13,BOSS_PIXEL_PALETTES.fire,frame,2);
 if(flags&1048576){const p=BOSS_PIXEL_PALETTES.green;for(let i=0;i<3;i++){const yy=y-8-((frame*2+i*7)%21);bossPixelRect(x+12+Math.sin(i*2+frame*.3)*3,yy,2,3,p[2]);bossPixelRect(x+12+Math.sin(i*2+frame*.3)*3,yy,1,1,p[4]);}}
 if(flags&8388608){const p=BOSS_PIXEL_PALETTES.gold;for(let i=0;i<3;i++){const a=frame*.5+i*Math.PI*2/3;bossPixelGlint(x+Math.cos(a)*10,y-35+Math.sin(a)*3,p,1);}}
 ctx.restore();
}
function drawBossEffect(f){
 const age=effectClockTick-f.tick,duration=effectLifetime(f);if(age<0||age>=duration)return;
 const t=age/duration,k=f.kind.slice(5),x=Math.round(f.x),y=Math.round(f.y),r=f.radius||30,tx=Math.round(f.targetX??x),ty=Math.round(f.targetY??y),frame=Math.floor(age/4),p=bossPixelPalette(f.color,k),face=f.face||1;
 const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=t>.88?.45:t>.75?.7:1;
 if(k==='warning'){
  ctx.globalAlpha=.65+Math.floor(t*3)*.1;bossPixelBoundary(x,y,r,p,frame,true);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;const xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;bossPixelRect(xx-2,yy-2,5,4,p[0]);bossPixelRect(xx-1,yy-1,3,2,p[t>.65?4:3]);}
 }else if(k==='beam'||k==='beam_fire'||k==='beam_ice'){
  const count=Math.max(3,Math.ceil(len/7));
  if(k==='beam_fire')for(let i=0;i<=count;i++){const q=i/count,w=5+Math.sin(i*.9+frame)*2;bossPixelFlame(x+dx*q,y+dy*q-15,w*2.5,p,frame,i);}
  else if(k==='beam_ice'){
   bossPixelLine(x,y-16,tx,ty-16,p[0],7);bossPixelLine(x,y-17,tx,ty-17,p[2],5);bossPixelLine(x,y-18,tx,ty-18,p[4],2);
   for(let i=0;i<=count;i++){const q=i/count,px=x+dx*q,py=y+dy*q-16,off=(i+frame)%3-1;bossPixelCrystal(px+nx*off*3,py+ny*off*3,7+i%3,p,face*2);}
  }else{
   const wave=frame%3-1;bossPixelLine(x,y-16,tx,ty-16,p[0],6);bossPixelLine(x,y-17,tx,ty-17,p[2],3);bossPixelLine(x,y-17+wave,tx,ty-17+wave,p[4],1);
   for(let i=0;i<6;i++){const q=((i/6+t*2)%1);bossPixelGlint(x+dx*q,y+dy*q-16,p,1);}
  }
 }else if(k==='chain'){
  bossPixelBolt(x,y-15,tx,ty-15,p,frame,2);bossPixelImpact('chain',tx,ty-15,age%14,face);
 }else if(k==='claw'||k==='slash'){
  const angle=Math.atan2(dy,dx),reach=Math.min(len,r*2),cx=x+Math.cos(angle)*reach*Math.min(.8,t),cy=y-16+Math.sin(angle)*reach*Math.min(.8,t);
  if(k==='claw'){
   if(duration<60)bossPixelImpact('claw',cx,cy,age,face);
   for(let i=-1;i<=1;i++){
    const points=[];for(let j=0;j<=8;j++){const q=j/8,a=-r*.3+q*r*.9,b=i*8-r*.3+q*r*.6+Math.sin(q*Math.PI)*r*.2;points.push([cx+a*Math.cos(angle)-b*Math.sin(angle),cy+a*Math.sin(angle)+b*Math.cos(angle)]);}
    for(let j=1;j<points.length;j++){bossPixelLine(...points[j-1],...points[j],p[0],4);bossPixelLine(...points[j-1],...points[j],p[j<5?3:2],2);if(j<4)bossPixelRect(points[j][0],points[j][1],1,1,p[5]);}
   }
  }else{
   const rad=r*(.5+.3*t),a=angle-1.3+t*.3;
   bossPixelArc(cx,cy,rad,rad,a,a+2.2,p,3,true);bossPixelArc(cx,cy,rad-6,rad-6,a+.18,a+1.7,p,1,true);
   for(let i=0;i<5;i++){const q=a+i*.45;bossPixelRect(cx+Math.cos(q)*rad,cy+Math.sin(q)*rad,2,2,p[4]);}
  }
 }else if(k==='throw'){
  if(bossPixelEffectVariant(f)==='reflection_shards'){for(let i=0;i<9;i++){const a=i*2.399,rr=r*t;bossPixelCrystal(x+Math.cos(a)*rr,y+Math.sin(a)*rr-Math.sin(t*Math.PI)*13,7+i%4,p,Math.cos(a)*3);}}
  else{const px=x+dx*t,py=y+dy*t-Math.sin(Math.PI*t)*48;for(let i=0;i<3;i++){const off=(i-1)*6;bossPixelLine(px+nx*off-dx/len*12,py+ny*off-dy/len*12,px+nx*off,py+ny*off,p[1],2);bossPixelLine(px+nx*off-dx/len*6,py+ny*off-dy/len*6,px+nx*off,py+ny*off,p[4],1);}bossPixelDebris(x,y,Math.min(r,30),BOSS_PIXEL_PALETTES.stone,frame,4,t);}
 }else if(k==='rain'){
  for(let i=0;i<9;i++){const xx=x+Math.sin(i*2.4)*r,base=y+Math.cos(i*2.4)*r*.5,q=((t*2+i/9)%1),yy=base-65+q*65;bossPixelFlame(xx,yy,13+i%3*3,p,frame,i);if(q>.82)bossPixelRect(xx-2,base,5,2,p[2]);}
 }else if(k==='fire'){
  const n=Math.min(27,Math.max(5,Math.ceil(r/7)));
  if(r>90){bossPixelDeathBlast(x,y,r,p,t,frame,age,face);}
  else{for(let i=0;i<n;i++){const a=i*2.399,rr=r*Math.sqrt((i+.5)/n)*.9;bossPixelFlame(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.55,13+bossPixelNoise(i,8)*19,p,frame,i);}}
 }else if(k==='firebird'){
  const px=x+dx*t,py=y+dy*t-16;bossPixelFirebird(px,py,Math.atan2(dy,dx),frame);
 }else if(k==='column_light'||k==='column_fire'){
  const height=Math.round(90*Math.min(1,(t+.06)*5)),half=Math.max(4,Math.round(r*(k==='column_fire'?.6:.35))),top=y-height;
  if(k==='column_fire'){for(let i=-1;i<=1;i++)bossPixelFlame(x+i*half*.65,y,height*(i===0?1:.72+.13*bossPixelNoise(i+2,frame)),p,frame,i+3);}
  else{
   // Light is a rising, broken stream: no opaque crystal body or dark outline.
   const alpha=ctx.globalAlpha;
   for(let i=-3;i<=3;i++){
    const xx=Math.round(x+i*half*.28),h=height*(i===0?1:.68+.26*bossPixelNoise(i+3,2));
    ctx.globalAlpha=alpha*(i===0?1:Math.abs(i)===1?.85:.5);
    for(let yy=0;yy<h;yy+=2){const band=(yy+frame*5+i*7)%25;if(band>17&&i!==0)continue;if(i===0&&band>21)continue;bossPixelRect(xx,y-yy,i===0?2:1,2,p[i===0?5:Math.abs(i)===1?4:3]);}
   }
   ctx.globalAlpha=alpha;
   for(let i=0;i<8;i++){const yy=y-((frame*7+i*13)%Math.max(1,height)),xx=x+(i%2?-1:1)*(half+2+(i%3));bossPixelRect(xx,yy,1,3,p[4]);if(i%3===0)bossPixelRect(xx-1,yy+1,3,1,p[5]);}
   bossPixelRect(x-4,top+3,9,1,p[4]);bossPixelRect(x-1,top,2,5,p[5]);
   bossPixelImpact('hit',x,y-2,age,face);
  }
  if(k==='column_fire')bossPixelArc(x,y,r*.65,r*.3,0,Math.PI*2,p,2,true);
  bossPixelDebris(x,y,r,BOSS_PIXEL_PALETTES.stone,frame,6,Math.min(1,t*2));
 }else if(k==='meteor'){
  const q=t*t,px=x+dx*q,py=y+dy*q-5,pp=BOSS_PIXEL_PALETTES.fire;
  for(let i=5;i>=1;i--){const xx=px-dx/len*i*r*.45,yy=py-dy/len*i*r*.45;bossPixelFlame(xx,yy,Math.max(9,r*(1.1-i*.12)),pp,frame,i);}
  const pts=[];for(let i=0;i<9;i++){const a=i*Math.PI*2/9,rr=r*(.83+bossPixelNoise(i,5)*.17);pts.push([px+Math.cos(a)*rr,py+Math.sin(a)*rr]);}
  bossPixelPoly(pts,pp[2]);bossPixelPoly(pts.map(([a,b])=>[px+(a-px)*.84,py+(b-py)*.84]),BOSS_PIXEL_PALETTES.stone[0]);
  bossPixelPoly([[px-r*.7,py-r*.35],[px-r*.2,py-r*.8],[px+r*.5,py-r*.5],[px+r*.6,py+r*.2],[px-r*.2,py+r*.6]],BOSS_PIXEL_PALETTES.stone[2]);
  bossPixelPoly([[px-r*.7,py-r*.35],[px-r*.2,py-r*.8],[px+r*.3,py-r*.5],[px-r*.15,py-r*.15]],BOSS_PIXEL_PALETTES.stone[3]);
  bossPixelLine(px-r*.3,py-r*.7,px-r*.1,py-r*.1,pp[3],2);bossPixelLine(px-r*.1,py-r*.1,px+r*.5,py+r*.4,pp[3],2);bossPixelRect(px+r*.25,py+r*.15,2,2,pp[5]);
 }else if(k==='fissure'){
  const progress=Math.min(1,(t+.04)*2),steps=Math.max(1,Math.floor(14*progress));let prev=[x,y];
  for(let i=1;i<=steps;i++){const q=i/14,off=Math.sin(i*4.1)*6,px=x+dx*q+nx*off,py=y+dy*q+ny*off;bossPixelLine(...prev,px,py,p[0],7);bossPixelLine(prev[0]-nx*3,prev[1]-ny*3,px-nx*3,py-ny*3,p[3],2);bossPixelLine(...prev,px,py,p[1],2);if(i%2){const side=i%4===1?1:-1;bossPixelLine(px,py,px+nx*side*15-dx/len*5,py+ny*side*15-dy/len*5,p[0],3);bossPixelChip(px+nx*side*14,py+ny*side*14-3,p,3,i);}prev=[px,py];}
  bossPixelImpact('quake',prev[0],prev[1],age%15,face);
 }else if(k==='breath_ice'){
  const angle=Math.atan2(dy,dx),spread=r>130?.72:.5;
  for(let i=0;i<26;i++){const q=((t*1.8+i/26)%1),theta=Math.sin(i*2.4)*spread,px=x+Math.cos(angle+theta)*r*q,py=y-16+Math.sin(angle+theta)*r*q;
   if(i%4===0)bossPixelSmoke(px,py,4+q*4,p,frame,i);else bossPixelCrystal(px,py,4+q*7,p,Math.cos(angle)*3);
  }
 }else if(k==='tail_sweep'){
  const a=t*Math.PI*2*face;
  for(let j=0;j<3;j++)bossPixelArc(x,y-8,r*(1-j*.08),r*(1-j*.08),a-.7-j*.14,a+.12-j*.14,p,j?1:4,true);
  bossPixelDebris(x,y,r,p,frame,8,Math.min(1,t+.2));
 }else if(k==='frost'){
  const count=r>45?12:7;for(let i=0;i<count;i++){const a=i*2.399,rr=r*(.3+.65*t)*(i%3===0?.45:1),h=6+(1-t)*(8+i%4*2);bossPixelCrystal(x+Math.cos(a)*rr,y-8+Math.sin(a)*rr,h,p,Math.cos(a)*4);}
 }else if(k==='quake'){
  const rr=r*Math.min(1,.35+t*.85);bossPixelBoundary(x,y,rr,p,frame);bossPixelDebris(x,y,r,p,frame,Math.min(18,Math.ceil(r/7)),Math.min(1,t+.2));
  for(let i=0;i<7;i++){const a=i*2.399,rr0=r*.2,rr1=r*(.35+.45*t),xx=x+Math.cos(a)*rr0,yy=y+Math.sin(a)*rr0;bossPixelLine(xx,yy,x+Math.cos(a+.08)*rr1,y+Math.sin(a+.08)*rr1,p[0],2);}
  bossPixelImpact('quake',x,y,age,face);
 }else if(k==='wall'){
  // Separate irregular, shaded stones; no uniform rectangular fence.
  for(let row=0;row<2;row++)for(let i=-2;i<=2;i++){const xx=x+i*r*.42+(row?3:0),yy=y-row*13,h=13+bossPixelNoise(i+2,row)*7,w=r*.22;
   bossPixelPoly([[xx-w,yy],[xx-w-2,yy-h+5],[xx-w+4,yy-h],[xx+w-3,yy-h-2],[xx+w+2,yy-h+4],[xx+w,yy]],p[0]);
   bossPixelPoly([[xx-w+1,yy-2],[xx-w,yy-h+5],[xx-w+4,yy-h+1],[xx+w-4,yy-h],[xx+w,yy-h+5],[xx+w-2,yy-2]],p[2]);
   bossPixelLine(xx-w+3,yy-h+3,xx+w-4,yy-h+1,p[4]);bossPixelLine(xx+w-2,yy-h+5,xx+w-3,yy-3,p[1],2);bossPixelRect(xx-2,yy-h*.5,4,1,p[3]);
  }
  bossPixelDebris(x,y,r,p,frame,6,.8);
 }else if(k==='thorn'){
  const count=r>60?12:7;for(let i=0;i<count;i++){const a=i*2.399,rr=r*(.35+.55*bossPixelNoise(i,5)),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.65,h=(10+bossPixelNoise(i,6)*16)*Math.min(1,(t+.15)*4),lean=Math.cos(a)*8;
   bossPixelPoly([[xx-5,yy+1],[xx-2,yy-h*.55],[xx+lean,yy-h],[xx+lean+2,yy-h+2],[xx+4,yy-3],[xx+3,yy+2]],p[0]);bossPixelPoly([[xx-3,yy],[xx-1,yy-h*.5],[xx+lean,yy-h+2],[xx+1,yy-2]],p[2]);bossPixelLine(xx-2,yy-2,xx+lean,yy-h+3,p[4]);bossPixelLine(xx,yy-6,xx+7,yy-10,p[1],2);
  }
 }else if(k==='skull'){
  const q=Math.min(1,t*1.3),px=x+dx*q,py=y+dy*q-11-Math.sin(Math.PI*q)*14;
  bossPixelRuneMotes(px,py,12,p,frame,4);bossPixelSkull(px,py,p,frame,p===BOSS_PIXEL_PALETTES.fire);
 }else if(k==='moon'){
  const rr=14,cx=x,cy=y-35,pp=p;for(let yy=-rr;yy<=rr;yy++)for(let xx=-rr;xx<=rr;xx++){
   const d0=xx*xx+yy*yy,d1=(xx-6)*(xx-6)+(yy+3)*(yy+3);if(d0<=rr*rr&&d1>(rr-2)*(rr-2))bossPixelRect(cx+xx,cy+yy,1,1,pp[d0>(rr-2)*(rr-2)?1:xx< -8?3:4]);
  }bossPixelRuneMotes(x,y,Math.min(r,50),p,frame,8);
 }else if(k==='shield'){
  // Shimmering facets wrap the body; no floating shield emblem or flat bubble.
  const rr=Math.min(29,Math.max(17,r*.35));
  for(const side of [-1,1]){bossPixelArc(x,y-17,rr,rr*.9,side<0?2: -.95,side<0?4.25:1.15,p,2,true);for(let i=0;i<3;i++){const xx=x+side*(rr-2-i%2*3),yy=y-30+i*12;bossPixelCrystal(xx,yy,6,p,side*2);}}
  bossPixelRuneMotes(x,y,rr,p,frame,4);
 }else if(k==='poison'){
  bossPixelBoundary(x,y,r,p,frame);for(let i=0;i<8;i++){const a=i*2.399,rr=r*(.35+.5*bossPixelNoise(i,3)),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.65-((frame+i*2)%8);ctx.globalAlpha=.55;bossPixelSmoke(xx,yy,Math.max(4,Math.min(10,r*.2)),p,frame,i);ctx.globalAlpha=.85;bossPixelRect(xx+2,yy-5,2,2,p[4]);}
 }else if(k==='stun'){
  for(let i=0;i<3;i++){const a=frame*.45+i*Math.PI*2/3;bossPixelGlint(x+Math.cos(a)*12,y-35+Math.sin(a)*4,BOSS_PIXEL_PALETTES.gold,i===frame%3?2:1);}
 }else if(k==='burst'){
  if(p===BOSS_PIXEL_PALETTES.fire){for(let i=0;i<12;i++){const a=i*2.399,rr=r*(.25+.6*t);bossPixelFlame(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.7,11+12*(1-t),p,frame,i);}}
  else{for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=r*(.2+.65*t),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;bossPixelLine(px-Math.cos(a)*7,py-Math.sin(a)*7,px,py,p[1],3);bossPixelLine(px-Math.cos(a)*4,py-Math.sin(a)*4,px,py,p[4],1);bossPixelChip(px,py,p,2,i);}}
  bossPixelImpact('hit',x,y-12,age,face);
 }else if(k==='grow'){
  bossPixelRuneMotes(x,y,r,p,frame,12);for(let i=0;i<4;i++){const a=i*Math.PI/2+frame*.15;bossPixelGlint(x+Math.cos(a)*r*.7,y-12+Math.sin(a)*r*.4-frame%5,p,1);}
 }else if(k==='summon'){
  bossPixelArc(x,y,r,r*.45,0,Math.PI*2,p,2,true);bossPixelRuneMotes(x,y,r,p,frame,10);bossPixelDebris(x,y,Math.min(r,25),BOSS_PIXEL_PALETTES.stone,frame,5,Math.min(1,t+.2));
 }else if(k==='ring'){
  const rr=r*(.85+.15*t);if(p===BOSS_PIXEL_PALETTES.fire||p===BOSS_PIXEL_PALETTES.blood){const n=Math.max(12,Math.min(40,Math.ceil(rr/4)));for(let i=0;i<n;i++){const a=i*Math.PI*2/n;bossPixelFlame(x+Math.cos(a)*rr,y+Math.sin(a)*rr,8+(i+frame)%4,p,frame,i);}}
  else for(let i=0;i<3;i++){const a=i*Math.PI*2/3+frame*.12;bossPixelArc(x,y,rr,rr,a,a+1.35,p,2,true);bossPixelGlint(x+Math.cos(a+1.35)*rr,y+Math.sin(a+1.35)*rr,p,1);}
 }
 ctx.restore();
}

// HP capacity is deterministic from the two bounded growth ladders and child lineage.
function bossPresentationMaxHp(u){
 if(Number.isFinite(u.bossMaxHp)&&u.bossMaxHp>0)return BossAbilities.maxHp(u);
 const base=Number(TYPES[u.k]?.hp),scale=bossRenderScale(u),owner=String(u.ownerToken||'');
 if(u.k==='slimelet'&&/\/boss:\d+$/.test(owner))return 26;
 if(u.k==='slimelet'&&/\/boss:\d+$/.test(String(u.token||'')))return 52;
 if(u.k==='ashbone_swordsman'&&/\/boss:\d+$/.test(String(u.token||'')))return 65;
 if(u.k==='stone_mason'&&/\/boss:\d+$/.test(String(u.token||'')))return 110;
 if(u.k==='accretion_burstcore')return base*(1+.04*Math.max(0,Math.min(5,Math.round((scale-1)/.08))));
 if(u.k==='bonefan_reaper')return base*(1+.025*Math.max(0,Math.min(5,Math.round((scale-1)/.06))));
 return base;
}
function bossScreenShake(effects,tick,reduced){
 if(reduced)return [0,0];const cue=effects.find(f=>f.kind==='boss_quake'&&tick>=f.tick&&tick-f.tick<=6);if(!cue)return [0,0];
 const age=tick-cue.tick,amplitude=2*(1-age/7);return [Math.sin(age*2.7+1)*amplitude,Math.cos(age*2.3+1)*amplitude];
}
function draw(){const shake=bossScreenShake(activeEffects,effectClockTick,resultReducedMotion());ctx.save();try{ctx.translate(shake[0],shake[1]);return drawBossScene();}finally{ctx.restore();}}
