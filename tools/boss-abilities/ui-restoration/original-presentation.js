// Boss cues are deterministic geometry sampled from recorded simulation events.
function bossColor(v){return typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=0xffffff?v:typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?parseInt(v.slice(1),16):0xefd7a0;}
function bossEffectData(f){return {radius:Math.max(1,Math.min(240,Number.isFinite(f.radius)?f.radius:30)),duration:Math.max(1,Math.min(600,Math.round(Number.isFinite(f.duration)?f.duration:40))),color:bossColor(f.color)};}
function effectLifetime(f){return f.kind.startsWith('boss_')?(f.duration||40):EFFECT_META[f.kind].frames/EFFECT_META[f.kind].fps*60;}
function bossPresentationFlags(u,time){if(u.dead)return 0;const tick=Math.round(time*60);let bits=0;for(const [i,k] of ['freeze','root','airborne','burn','poison','fury','phase','stun'].entries()){const s=u.bossStatuses?.[k];if(k==='phase'?u.bossPhaseUntil>tick:s&&s.start<=tick&&s.until>tick)bits|=1<<(16+i);}const scale=u.bossRadiusScale;if(Number.isFinite(scale)&&scale!==1)bits|=Math.max(1,Math.min(63,Math.round(scale*20)))<<24;return bits;}
function bossRenderFlags(u){return Number.isInteger(u.presentationFlags)?u.presentationFlags:bossPresentationFlags(u,typeof elapsed==='number'?elapsed:0);}
function bossRenderScale(u){const n=(bossRenderFlags(u)>>>24)&63;return n?n/20:1;}
function drawBossStatus(u){if(u.dead)return;const f=bossRenderFlags(u),x=u.x,y=u.y;ctx.save();ctx.lineWidth=2;
 if(f&65536){ctx.fillStyle='#8de4ff55';ctx.strokeStyle='#c5f4ff';ctx.beginPath();ctx.moveTo(x-14,y+2);ctx.lineTo(x-17,y-26);ctx.lineTo(x,y-40);ctx.lineTo(x+17,y-26);ctx.lineTo(x+14,y+2);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-8,y-23);ctx.lineTo(x+8,y-23);ctx.moveTo(x,y-31);ctx.lineTo(x,y-15);ctx.stroke();}
 if(f&131072){ctx.strokeStyle='#86b96b';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*8,y+5);ctx.lineTo(x+i*5-4,y-8);ctx.lineTo(x+i*5+3,y-16);ctx.stroke();}}
 if(f&262144){ctx.strokeStyle='#e5eaff';ctx.beginPath();ctx.ellipse(x,y,13,4,0,0,Math.PI*2);ctx.stroke();}
 if(f&2097152){ctx.strokeStyle='#ff526b';ctx.shadowColor='#ff234c';ctx.shadowBlur=12;ctx.beginPath();ctx.ellipse(x,y-12,18,24,0,0,Math.PI*2);ctx.stroke();}
 for(const [bit,color,label] of [[524288,'#ff9c47','炎'],[1048576,'#b5ea79','毒'],[8388608,'#fff19b','★']])if(f&bit){ctx.fillStyle=color;ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(label,x+(bit===1048576?12:-10),y-42);}
 ctx.restore();}
function drawBossEffect(f){const age=effectClockTick-f.tick,d=effectLifetime(f);if(age<0||age>=d)return;const t=age/d,k=f.kind.slice(5),x=f.x,y=f.y,r=f.radius||30,tx=f.targetX??x,ty=f.targetY??y;ctx.save();ctx.strokeStyle='#'+bossColor(f.color).toString(16).padStart(6,'0');ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2.5;ctx.globalAlpha=Math.min(1,(1-t)*3);
 const line=(a,b,c,d)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();};const ring=(rr,yy=y)=>{ctx.beginPath();ctx.arc(x,yy,Math.max(1,rr),0,Math.PI*2);ctx.stroke();};
 if(k==='warning'){ctx.setLineDash([5,4]);ring(r);ctx.setLineDash([]);ctx.globalAlpha=.09+.12*t;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 else if(['beam','beam_fire','beam_ice'].includes(k)){ctx.lineWidth=k==='beam_ice'?10:14;ctx.globalAlpha=.25;line(x,y-16,tx,ty-16);ctx.globalAlpha=1-t;ctx.lineWidth=4;line(x,y-16,tx,ty-16);ctx.strokeStyle=k==='beam_fire'?'#fff0a8':'#f0fcff';ctx.lineWidth=1.5;line(x,y-16,tx,ty-16);if(k==='beam_ice')for(let i=1;i<6;i++){const a=x+(tx-x)*i/6,b=y+(ty-y)*i/6-16;line(a-4,b-5,a+4,b+5);}}
 else if(k==='chain'){ctx.beginPath();ctx.moveTo(x,y-15);for(let i=1;i<=12;i++){const q=i/12,j=i===12?0:Math.sin(i*7+Math.floor(age/4))*7;ctx.lineTo(x+(tx-x)*q+j,y+(ty-y)*q-15-j);}ctx.stroke();}
 else if(k==='claw'||k==='slash'){const angle=Math.atan2(ty-y,tx-x),length=Math.hypot(tx-x,ty-y),reach=Math.min(length,r*2),cx=x+Math.cos(angle)*reach*t,cy=y-16+Math.sin(angle)*reach*t;ctx.translate(cx,cy);ctx.rotate(angle);if(k==='claw'){for(let i=-1;i<=1;i++){ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.35,i*9-r*.3);ctx.quadraticCurveTo(r*.65,i*9,r*.3,i*9+r*.3);ctx.stroke();}}else{ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,r*(.5+.3*t),-1.2,1.2);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r*(.58+.3*t),-1.1,1.1);ctx.stroke();}}
 else if(k==='throw'){const a=x+(tx-x)*t,b=y+(ty-y)*t-Math.sin(Math.PI*t)*48;line(a,b+12,a,b-12);line(a,b-12,a-5,b-5);line(a,b-12,a+5,b-5);}
 else if(k==='rain'){for(let i=0;i<9;i++){const a=x+Math.sin(i*2.4)*r,b=y+Math.cos(i*2.4)*r*.5-65+((t+i/9)%1)*65;line(a,b,a-5,b+14);}}
 else if(k==='fire'){for(let i=-2;i<=2;i++){const a=x+i*r/3;ctx.beginPath();ctx.moveTo(a-7,y);ctx.quadraticCurveTo(a-14,y-18,a+Math.sin(age*.2+i)*7,y-28-r*.2);ctx.quadraticCurveTo(a+13,y-12,a+7,y);ctx.fill();}if(k==='firebird'){line(x,y-24,x-r,y-45);line(x,y-24,x+r,y-45);}}
 else if(k==='firebird'){const q=t,px=x+(tx-x)*q,py=y+(ty-y)*q-16,angle=Math.atan2(ty-y,tx-x),wing=10+Math.sin(age*.5)*6;ctx.translate(px,py);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-10,-wing);ctx.lineTo(-5,-2);ctx.lineTo(-19,-4);ctx.lineTo(-12,0);ctx.lineTo(-19,4);ctx.lineTo(-5,2);ctx.lineTo(-10,wing);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff3a6';line(-15,0,10,0);}
 else if(k==='column_light'||k==='column_fire'){const height=90*Math.min(1,(t+.06)*5),width=r*(k==='column_fire'?.6:.35),top=y-height;ctx.globalAlpha=.22*(1-t);ctx.fillRect(x-width,y-height,width*2,height);ctx.globalAlpha=1-t;ctx.lineWidth=width;line(x,y,x,top);ctx.strokeStyle=k==='column_fire'?'#ffe197':'#ffffe8';ctx.lineWidth=Math.max(2,width*.35);line(x,y,x,top);if(k==='column_fire'){for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*width,y);ctx.quadraticCurveTo(x+i*width+8,top+25,x+i*width-3,top-10);ctx.stroke();}}ring(r*.65);}
 else if(k==='meteor'){const q=t*t,px=x+(tx-x)*q,py=y+(ty-y)*q-5,angle=Math.atan2(ty-y,tx-x);ctx.translate(px,py);ctx.rotate(angle);ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(-r*3,-r*.5);ctx.lineTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,r);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#68594d';ctx.strokeStyle='#ffc276';ctx.beginPath();for(let i=0;i<7;i++){const a=i*Math.PI*2/7,rr=r*(i%2?.8:1);if(i)ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.stroke();line(-r*.4,-r*.5,r*.2,r*.6);}
 else if(k==='fissure'){const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,progress=Math.min(1,(t+.04)*2),steps=Math.max(1,Math.floor(14*progress));ctx.lineWidth=5;ctx.strokeStyle='#302a24';ctx.beginPath();ctx.moveTo(x,y);for(let i=1;i<=steps;i++){const q=i/14,off=Math.sin(i*4.1)*6;ctx.lineTo(x+dx*q+nx*off,y+dy*q+ny*off);}ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#f4cf87';for(let i=1;i<=steps;i++){const q=i/14,px=x+dx*q,py=y+dy*q,side=i%2?1:-1;line(px,py,px+nx*side*15-dx/len*5,py+ny*side*15-dy/len*5);}}
 else if(k==='breath_ice'){const a=Math.atan2(ty-y,tx-x),spread=r>130?.72:.5;ctx.translate(x,y-16);ctx.rotate(a);ctx.globalAlpha=.18*(1-t);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,-spread,spread);ctx.closePath();ctx.fill();ctx.globalAlpha=.85*(1-t);ctx.strokeStyle='#d8f9ff';for(let i=0;i<12;i++){const q=((t*1.8+i/12)%1),theta=Math.sin(i*2.4)*spread,px=Math.cos(theta)*r*q,py=Math.sin(theta)*r*q;line(px-3,py,px+3,py);line(px,py-3,px,py+3);}}
 else if(k==='tail_sweep'){const a=t*Math.PI*2*(f.face||1);ctx.translate(x,y-8);ctx.rotate(a);ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(r*.5,-r*.4,r,0);ctx.stroke();ctx.lineWidth=2;for(let i=0;i<7;i++){const b=-i*.18;line(Math.cos(b)*r*.7,Math.sin(b)*r*.7,Math.cos(b)*r,Math.sin(b)*r);}}
 else if(k==='frost'){for(let i=0;i<6;i++){const a=i*Math.PI/3;line(x,y-16,x+Math.cos(a)*r,y-16+Math.sin(a)*r);}ring(r*.45,y-16);}
 else if(k==='quake'){for(let i=0;i<7;i++){const a=i*2.399;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.45);ctx.lineTo(x+Math.cos(a+.15)*r,y+Math.sin(a+.15)*r);ctx.stroke();}}
 else if(k==='wall'){for(let i=-2;i<=2;i++){ctx.fillRect(x+i*r/2-r/5,y-25,r*.4,30);ctx.strokeStyle='#52463b';ctx.strokeRect(x+i*r/2-r/5,y-25,r*.4,30);}}
 else if(k==='thorn'){for(let i=0;i<7;i++){const a=i*2.399,xx=x+Math.cos(a)*r*.7,yy=y+Math.sin(a)*r*.4;ctx.beginPath();ctx.moveTo(xx-5,yy);ctx.lineTo(xx+2,yy-18);ctx.lineTo(xx+6,yy);ctx.fill();}}
 else if(k==='skull'){ctx.translate((tx-x)*Math.min(1,t*1.3),(ty-y)*Math.min(1,t*1.3)-Math.sin(Math.PI*Math.min(1,t*1.3))*14);ctx.beginPath();ctx.arc(x,y-22,13,0,Math.PI*2);ctx.fill();ctx.fillRect(x-8,y-14,16,10);ctx.fillStyle='#292b34';ctx.fillRect(x-8,y-26,5,6);ctx.fillRect(x+3,y-26,5,6);for(let i=-1;i<=1;i++)ctx.fillRect(x+i*5-1,y-9,2,5);}
 else if(k==='moon'){ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y-28,16,-1.3,1.8);ctx.stroke();ring(r*(.7+.3*t));}
 else if(k==='shield'){ctx.beginPath();ctx.moveTo(x,y-40);ctx.lineTo(x+19,y-32);ctx.lineTo(x+15,y-12);ctx.lineTo(x,y);ctx.lineTo(x-15,y-12);ctx.lineTo(x-19,y-32);ctx.closePath();ctx.stroke();}
 else if(k==='poison'){ctx.globalAlpha=.22*(1-t);for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(x+Math.sin(i*2.4)*r*.5,y-8+Math.cos(i*2.4)*r*.3,Math.max(5,r*.35),0,Math.PI*2);ctx.fill();}}
 else if(k==='stun'){ctx.font='bold 21px sans-serif';ctx.textAlign='center';ctx.fillText('★',x,y-35);}
 else if(k==='burst'){for(let i=0;i<12;i++){const a=i*Math.PI/6;line(x+Math.cos(a)*r*t,y+Math.sin(a)*r*t,x+Math.cos(a)*r*(t+.3),y+Math.sin(a)*r*(t+.3));}}
 else if(k==='grow'){ring(r*(.7+.3*t));line(x-8,y-14,x-8,y-40);line(x+8,y-14,x+8,y-40);line(x-8,y-40,x-13,y-33);line(x+8,y-40,x+13,y-33);}
 else if(k==='summon'){ring(r);ring(r*.65);for(let i=0;i<5;i++){const a=i*4*Math.PI/5,b=(i+1)*4*Math.PI/5;line(x+Math.cos(a)*r,y+Math.sin(a)*r,x+Math.cos(b)*r,y+Math.sin(b)*r);}}
 else {ring(r*(.65+.35*t));ring(r*(.3+.4*t));}
 ctx.restore();}

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
