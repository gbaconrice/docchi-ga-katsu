/* Elemental bosses: bounded, deterministic replacements for legacy attacks. */
(function () {
  'use strict';
  const fire = '#ff823d', ice = '#92e6ff', storm = '#d2b8ff';
  const live = (u,c) => !!u && c.rawHp(u) > 0;
  const legal = (u,t,c) => live(u,c) && live(t,c) && c.enemies(u).includes(t);
  const hit = (u,t,c,m=1) => c.damage(u,t,c.power(u,m));
  const fx = (u,c,kind,p,options={}) => c.effect(u,kind,p.x,p.y,options);
  const burn = (u,t,c,d=90,m=.16) => c.status(u,t,'burn',d,c.power(u,m));
  function register(k,s) {
    const cast=s.cast;
    s.cast=function(u,t,c){ if(legal(u,t,c)) cast(u,t,c); };
    BossAbilities.register(k,Object.assign({tag:'範囲',color:fire,powerScale:1.6},s));
  }
  function blast(u,p,c,r,m,kind='burst',cap=5) {
    fx(u,c,kind,p,{radius:r,color:kind==='frost'?ice:fire,duration:24});
    c.targets(u,r,cap,p).forEach(t=>hit(u,t,c,m));
  }
  register('emberwing_drake',{
    name:'旋回火雨',description:'敵の上空を旋回し、追尾する火の雨を連続で降らせる。',range:30,cooldown:210,windup:30,
    cast(u,t,c){u.bossState.orbit={target:t,start:c.tick,end:c.tick+180,angle:Math.atan2((u.y-t.y)/25,(u.x-t.x)/(38*(u.originForward||1)))};fx(u,c,'rain',t,{radius:42,duration:180,color:fire});},
    tick(u,c){const s=u.bossState.orbit;if(!s)return false;if(c.tick>=s.end||!legal(u,s.target,c)){delete u.bossState.orbit;return false;}
      const a=(s.angle||0)+(c.tick-s.start)*Math.PI/75;
      c.move(u,s.target.x+Math.cos(a)*38*(u.originForward||1),s.target.y+Math.sin(a)*25,4);
      if((c.tick-s.start)%20===0){blast(u,s.target,c,35,.1125,'rain',4);}
      return true;
    }
  });
  register('skullflare_triad',{
    name:'三骸炎牙',description:'三つの頭蓋骨が別々の敵に噛みつき、炎を残す。',range:125,cooldown:165,windup:28,
    cast(u,t,c){c.targets(u,150,3).forEach(v=>{fx(u,c,'skull',u,{targetX:v.x,targetY:v.y,duration:30,color:fire});hit(u,v,c,1);burn(u,v,c,120,.2);});}
  });
  register('flamering_magus',{
    name:'拡大火輪',description:'広がる火の輪が周囲の敵を一度ずつ焼く。',range:70,cooldown:150,windup:36,
    cast(u,t,c){const center={x:u.x,y:u.y},seen=new Set();for(let i=0;i<4;i++)c.schedule(u,i*12,cc=>{
      if(!live(u,cc))return;const radius=32+i*25;fx(u,cc,'ring',center,{radius,duration:16,color:fire});
      cc.targets(u,radius,12,center).filter(v=>!seen.has(cc.token(v))).slice(0,Math.max(0,8-seen.size)).forEach(v=>{seen.add(cc.token(v));hit(u,v,cc,.85);});
    });}
  });
  register('shockplate_drake',{
    name:'雷鎧連鎖',description:'雷の鎧をまとい、放電が近くの敵へ次々と連鎖する。',range:85,cooldown:180,windup:48,color:storm,
    cast(u,t,c){c.status(u,u,'barrier',90,.18);fx(u,c,'shield',u,{radius:38,duration:90,color:storm});
      let from=u, next=t;const seen=new Set();for(let i=0;i<5&&next;i++){
        fx(u,c,'chain',from,{targetX:next.x,targetY:next.y,duration:24,color:storm});hit(u,next,c,.9*Math.pow(.8,i));seen.add(c.token(next));from=next;
        next=c.targets(u,70,12,from).find(v=>!seen.has(c.token(v)));
      }
    }
  });
  register('thunderhorn_beast',{
    name:'落雷角撃',description:'角で突いた敵の周囲に落雷を呼ぶ。',range:35,cooldown:165,windup:42,color:storm,
    cast(u,t,c){hit(u,t,c,.7);fx(u,c,'slash',t,{radius:22,duration:15,color:storm});const p={x:t.x,y:t.y};fx(u,c,'warning',p,{radius:58,duration:18,color:storm});
      c.schedule(u,18,cc=>{if(live(u,cc)){fx(u,cc,'chain',p,{targetX:p.x,targetY:0,duration:20,color:storm});blast(u,p,cc,58,.55,'quake',5);}});}
  });
  register('stormhorn_tripler',{
    name:'三連雷角',description:'三連続の角攻撃を放ち、最後の一撃で周囲に落雷を起こす。',range:36,cooldown:180,windup:24,color:storm,
    cast(u,t,c){for(let i=0;i<3;i++)c.schedule(u,i*18,cc=>{if(!legal(u,t,cc)||cc.gap(u,t)>65)return;hit(u,t,cc,.4);fx(u,cc,'slash',t,{radius:24+i*7,duration:16,color:storm});if(i===2){blast(u,t,cc,60,.45,'quake',5);fx(u,cc,'chain',t,{targetX:t.x,targetY:0,duration:24,color:storm});}});}
  });
  register('darkfan_clawlord',{
    name:'治癒封じの爪痕',description:'地面に残る闇の爪痕が敵を傷つけ、その上では回復を完全に封じる。',range:65,cooldown:180,windup:30,color:'#a66aea',
    cast(u,t,c){fx(u,c,'claw',t,{radius:46,duration:180,color:'#a66aea'});c.zone(u,'claw',t.x,t.y,{radius:46,duration:180,interval:15,damage:c.power(u,.06),status:'curse',statusDuration:18,strength:1,cap:5});}
  });
  register('plated_dualdragon',{
    name:'炎氷交差ブレス',description:'二つの頭が炎と氷を同時に吐き、交差点を爆発させる。',range:110,cooldown:180,windup:42,
    cast(u,t,c){const p={x:t.x,y:t.y};const dx=t.x-u.x,dy=t.y-u.y,len=Math.hypot(dx,dy)||1;
      const origins=[{x:u.x-dy/len*16,y:u.y+dx/len*16},{x:u.x+dy/len*16,y:u.y-dx/len*16}];
      origins.forEach((o,i)=>fx(u,c,'beam',o,{targetX:p.x,targetY:p.y,duration:30,color:i?ice:fire}));
      c.line(u,t,150,35,5).forEach(v=>{hit(u,v,c,.55);burn(u,v,c,60,.12);c.status(u,v,'freeze',30);});
      c.schedule(u,24,cc=>{if(live(u,cc))blast(u,p,cc,40,.55);});}
  });
  register('flameburst_mythron',{
    name:'灼熱溶岩域',description:'その場に溶岩を広げ、中心に近い敵ほど激しく焼く。',range:50,cooldown:210,windup:42,
    cast(u,t,c){u.bossState.lavaUntil=c.tick+150;fx(u,c,'fire',u,{radius:85,duration:150,color:fire});
      c.zone(u,'fire',u.x,u.y,{radius:85,duration:150,interval:30,damage:c.power(u,.12),cap:6});
      c.zone(u,'fire',u.x,u.y,{radius:40,duration:150,interval:30,damage:c.power(u,.14),status:'burn',statusDuration:35,strength:c.power(u,.12),cap:4});},
    tick(u,c){return c.tick<(u.bossState.lavaUntil||0);}
  });
  register('willyee_frost_dragon',{
    name:'白竜の吹雪',description:'前方へ広い吹雪を吐き、巻き込んだ敵をまとめて凍結させる。',range:110,cooldown:180,windup:45,color:ice,
    cast(u,t,c){fx(u,c,'breath_ice',u,{radius:140,targetX:t.x,targetY:t.y,duration:45,color:ice});c.cone(u,t,140,.72,6).forEach(v=>{hit(u,v,c,.8);c.status(u,v,'freeze',60);});}
  });
  register('frostbreath_lizard',{
    name:'遅滞氷息',description:'前方の敵に氷の息を吐き、長めの凍結で次の攻撃を遅らせる。',range:95,cooldown:195,windup:60,color:ice,
    cast(u,t,c){fx(u,c,'breath_ice',u,{radius:120,targetX:t.x,targetY:t.y,duration:65,color:ice});c.cone(u,t,120,.5,4).forEach(v=>{hit(u,v,c,.65);c.status(u,v,'freeze',90);});}
  });
  register('triad_chimera',{
    name:'三頭独立攻撃',description:'三つの頭が別々の敵へ、噛みつき・炎・毒を同時に放つ。',range:115,cooldown:145,windup:24,
    cast(u,t,c){c.targets(u,140,3).forEach((v,i)=>{fx(u,c,['claw','fire','poison'][i],u,{targetX:v.x,targetY:v.y,radius:20,duration:30,color:['#ffe2a2',fire,'#92cf69'][i]});hit(u,v,c,[1,.65,.45][i]);if(i===1)burn(u,v,c,120,.18);if(i===2)c.status(u,v,'poison',150,c.power(u,.23));});}
  });
  register('cinder_tailbeast',{
    name:'旋尾火散らし',description:'尾を一回転させ、周囲に火の粉をまき散らす。',range:75,cooldown:165,windup:30,
    cast(u,t,c){for(let i=0;i<6;i++){const a=i*Math.PI/3;fx(u,c,'throw',u,{targetX:u.x+Math.cos(a)*95,targetY:u.y+Math.sin(a)*95,duration:24,color:fire});}fx(u,c,'tail_sweep',u,{radius:95,duration:26,color:fire});c.targets(u,95,6).forEach(v=>{hit(u,v,c,.7);burn(u,v,c,90,.15);});}
  });
  register('emberfist_pillarer',{
    name:'追撃火柱',description:'敵の動きを追って、三本の火柱を時間差で噴き上げる。',range:135,cooldown:195,windup:36,
    cast(u,t,c){for(let i=0;i<3;i++)c.schedule(u,i*28,cc=>{if(!live(u,cc))return;const v=legal(u,t,cc)?t:cc.nearest(u);if(!v||cc.gap(u,v)>190)return;
      const p={x:v.x,y:v.y};fx(u,cc,'warning',p,{radius:30,duration:16,color:fire});cc.schedule(u,16,ccc=>{if(live(u,ccc))blast(u,p,ccc,30,.4,'column_fire',3);});});}
  });
  register('veteran_flamewing',{
    name:'双鳥交差爆炎',description:'二羽の炎鳥が敵の上で交差し、その交点を爆発させる。',range:130,cooldown:170,windup:36,
    cast(u,t,c){const p={x:t.x,y:t.y};[-1,1].forEach(s=>fx(u,c,'throw',{x:p.x-65,y:p.y+s*45},{targetX:p.x+65,targetY:p.y-s*45,duration:30,color:fire,label:'炎鳥'}));
      fx(u,c,'warning',p,{radius:52,duration:30,color:fire});c.schedule(u,30,cc=>{if(live(u,cc))blast(u,p,cc,52,1.15,'burst',5);});}
  });
  register('spore_toad',{
    name:'拡散毒霧',description:'徐々に広がる毒霧を残し、踏み込んだ敵を毒に侵す。',range:100,cooldown:240,windup:40,color:'#8dce68',powerScale:2,
    cast(u,t,c){c.zone(u,'poison',t.x,t.y,{radius:30,grow:60,duration:210,interval:30,damage:c.power(u,.1),status:'poison',statusDuration:75,strength:c.power(u,.65),cap:6});}
  });
  register('siege_crab',{
    name:'全域貫通光線',description:'長い溜めの後、戦場の端から端まで貫く細い光線を放つ。',range:300,cooldown:240,windup:90,color:'#ffdaa1',
    cast(u,t,c){const dx=t.x-u.x,dy=t.y-u.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
      const extent=Math.hypot(c.field.w,c.field.h);const back={x:u.x-ux*extent,y:u.y-uy*extent};
      // Opposite rays cover the complete battlefield; the union has a shared cap.
      const reverse={x:u.x-dx,y:u.y-dy};const victims=[...c.line(u,t,extent,20,8),...c.line(u,reverse,extent,20,8)];const seen=new Set();
      fx(u,c,'beam',back,{targetX:u.x+ux*extent,targetY:u.y+uy*extent,duration:36,color:'#ffdaa1'});
      for(const v of victims){if(seen.has(c.token(v)))continue;if(seen.size>=8)break;seen.add(c.token(v));hit(u,v,c,1.3);}
    }
  });
})();
