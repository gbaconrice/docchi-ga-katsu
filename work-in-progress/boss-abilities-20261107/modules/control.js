/* Control/melee bosses. All payloads are capped and use the common hit/control pipeline. */
(function () {
  const live = (u,c) => !!u && c.rawHp(u)>0;
  const later = (u,c,t,fn) => c.schedule(u,t,n=>{ if(live(u,n)) fn(n); });
  const fx = (u,c,kind,p=u,opts={}) => c.effect(u,kind,p.x,p.y,opts);
  const hit = (u,t,c,m=1,status,duration=36) => { if(!live(t,c)) return; c.damage(u,t,c.power(u,m)); if(status)c.status(u,t,status,duration); };
  function register(k,name,description,opts) { BossAbilities.register(k,Object.assign({name,description,tag:'制圧',color:'#9cc9ec',range:55,cooldown:180,windup:30,powerScale:1.4},opts)); }
  function radial(u,c,r,m,kind,duration=36,cap=6) { c.targets(u,r,cap).forEach(t=>hit(u,t,c,m,kind,duration)); }
  function direction(u,t){const dx=t.x-u.x,dy=t.y-u.y,d=Math.hypot(dx,dy)||1;return {x:dx/d,y:dy/d};}
  register('thornback_beast','八方棘縛','全方向へ棘を飛ばし、周囲の敵を短時間その場に縫い止める。',{range:95,cooldown:168,powerScale:1.7,cast(u,t,c){
    if(!t)return; fx(u,c,'thorn',u,{radius:112,duration:25}); radial(u,c,112,1,'root',42,8);
  }});
  register('roarfang_beast','震天咆哮','画面を揺らす大咆哮で周囲の敵にダメージを与え、短時間気絶させる。',{range:85,cooldown:210,windup:42,powerScale:1.25,cast(u,t,c){
    if(!t)return;fx(u,c,'quake',u,{radius:110,duration:28,label:'大咆哮'});fx(u,c,'ring',u,{radius:110,duration:30});radial(u,c,110,1,'stun',42,7);
  }});
  register('spectral_scale_dragon','幽体潜行','開幕に一度だけ幽体化して敵後衛の中央へ潜り込み、その後は爪で攻撃する。',{range:38,cooldown:110,windup:18,powerScale:1.5,
    init(u,c){u.bossState.infiltrationDone=false;},
    tick(u,c){if(!live(u,c))return false;const s=u.bossState;if(s.infiltrationDone)return false;const foes=c.enemies(u);if(!foes.length)return false;s.infiltrationDone=true;
      const ordered=foes.slice().sort((a,b)=>c.distance(u,b)-c.distance(u,a));const rear=ordered.slice(0,Math.max(1,Math.ceil(ordered.length/3)));const p={x:rear.reduce((n,v)=>n+v.x,0)/rear.length,y:rear.reduce((n,v)=>n+v.y,0)/rear.length};
      c.phase(u,30);fx(u,c,'moon',u,{targetX:p.x,targetY:p.y,duration:36,label:'幽体潜行'});fx(u,c,'warning',p,{radius:32,duration:30});s.next=c.tick+42;
      later(u,c,30,n=>{const ok=n.teleport(u,p.x,p.y);n.event(u,'infiltration',null,{success:ok});fx(u,n,'moon',u,{radius:42,duration:28});});return true;},
    cast(u,t,c){if(t){fx(u,c,'claw',t,{radius:30,duration:16});hit(u,t,c);}}
  });
  register('iceclaw_legend','砕氷三連爪','連続する爪で敵を凍らせ、最後に砕いた氷を周囲の敵へ飛ばす。',{range:40,cooldown:174,windup:24,powerScale:1.45,cast(u,t,c){
    if(!t)return;[0,12,26].forEach((delay,i)=>{const strike=n=>{if(!live(t,n)||n.gap(u,t)>85)return;fx(u,n,'claw',t,{radius:32,duration:14});hit(u,t,n,.42,i===0?'freeze':null,38);if(i===2){fx(u,n,'frost',t,{radius:60,duration:25});n.targets(u,48,4,t).filter(v=>v!==t).forEach(v=>hit(u,v,n,.45));}};if(delay)later(u,c,delay,strike);else strike(c);});
  }});
  register('gauntlet_combo_guard','敵投げ','敵一体を掴んで敵集団へ投げつけ、巻き込んだ敵を吹き飛ばす。',{range:28,cooldown:192,windup:30,powerScale:3.2,cast(u,t,c){
    if(!t)return;c.status(u,t,'stun',30);c.pull(u,t,14);fx(u,c,'claw',t,{duration:22,label:'掴む'});
    later(u,c,24,n=>{if(!live(t,n))return;const d=direction(u,t),near=n.targets(u,90,9,t).filter(v=>v!==t&&n.distance(t,v)<=100);let aim=null,best=-1;
      near.forEach(v=>{const count=n.targets(u,42,6,v).filter(w=>w!==t).length;if(count>best){best=count;aim=v;}});
      const p=aim?{x:aim.x,y:aim.y}:{x:t.x+d.x*65,y:t.y+d.y*65};fx(u,n,'throw',t,{targetX:p.x,targetY:p.y,duration:26});n.throwTo(u,t,p.x,p.y,100);hit(u,t,n,1.2);
      // Resolve collateral at the real queued landing, including heavy-target reduction and arena bounds.
      later(u,n,1,next=>{next.targets(u,42,5,t).filter(v=>v!==t).forEach(v=>{hit(u,v,next,.8);next.push(u,v,45);});});});
  }});
  register('rootwarden_treant','群縛根','地面から伸びる根で敵集団を絡め取り、短時間移動を封じる。',{range:135,cooldown:216,windup:42,powerScale:1.25,cast(u,t,c){
    if(!t)return;fx(u,c,'thorn',t,{radius:76,duration:50,label:'根縛り'});c.targets(u,65,7,t).forEach(v=>hit(u,v,c,1,'root',60));
  }});
  function chargeTick(u,c){if(!live(u,c)){u.bossState.controlCharge=null;return false;}const s=u.bossState,run=s.controlCharge;if(!run)return false;if(!live(run.target,c)||c.tick>run.until){s.controlCharge=null;return false;}
    c.move(u,run.target.x,run.target.y,5);fx(u,c,'frost',u,{radius:24,duration:8});
    if(c.gap(u,run.target)<=14){const t=run.target;s.controlCharge=null;hit(u,t,c,1.25,'freeze',42);radial(u,c,60,.55,'freeze',30,5);c.push(u,t,32);fx(u,c,'frost',u,{radius:75,duration:28});s.retreatUntil=c.tick+48;s.retreatFrom={x:t.x,y:t.y};s.next=c.tick+210;}return true;
  }
  register('frosthorn_rhino','氷角反復突進','助走して敵を角で突き上げ周囲を凍らせ、数秒ごとに後退して再突進する。',{range:135,cooldown:210,windup:30,powerScale:1.45,
    tick(u,c){const s=u.bossState;if(chargeTick(u,c))return true;if(s.retreatUntil>c.tick){const d=direction(s.retreatFrom,u);c.move(u,u.x+d.x*80,u.y+d.y*80,2.7);return true;}return false;},
    cast(u,t,c){if(!t)return;u.bossState.controlCharge={target:t,until:c.tick+100};fx(u,c,'beam',u,{targetX:t.x,targetY:t.y,duration:25,label:'氷角突進'});}
  });
  register('pillar_hammerer','進撃光柱','ハンマーから前方へ光の柱が順番に立ち上がり、命中した敵を気絶させる。',{range:155,cooldown:222,windup:54,powerScale:1.15,cast(u,t,c){
    if(!t)return;const d=direction(u,t),start={x:u.x,y:u.y},seen=new Set();for(let i=0;i<4;i++){const p={x:start.x+d.x*(35+i*45),y:start.y+d.y*(35+i*45)};fx(u,c,'warning',p,{radius:26,duration:12+i*12});later(u,c,8+i*12,n=>{fx(u,n,'beam',p,{radius:28,duration:26,label:'光柱'});n.targets(u,24,4,p).forEach(v=>{const id=n.token(v);if(seen.has(id)||seen.size>=8)return;seen.add(id);hit(u,v,n,1,'stun',32);});});}
  }});
  register('colossal_hornfist','巨拳打ち上げ','アッパーで敵を高く打ち上げ、落下した敵で周囲を巻き込む。',{range:30,cooldown:192,windup:36,powerScale:1.45,cast(u,t,c){
    if(!t)return;hit(u,t,c,.8,'airborne',42);fx(u,c,'throw',t,{targetX:t.x,targetY:t.y-70,duration:40,label:'打ち上げ'});
    later(u,c,42,n=>{if(!live(t,n))return;fx(u,n,'quake',t,{radius:65,duration:24});hit(u,t,n,.35);n.targets(u,52,5,t).filter(v=>v!==t).forEach(v=>hit(u,v,n,.65));});
  }});
  register('kilnback_pincerbeast','挟撃粉砕','ハサミで敵一体を掴んで持ち上げ、強く握り潰す。',{range:34,cooldown:210,windup:36,powerScale:1.5,cast(u,t,c){
    if(!t)return;c.pull(u,t,20);c.status(u,t,'airborne',34);fx(u,c,'claw',t,{radius:38,duration:34,label:'捕獲'});fx(u,c,'throw',t,{targetX:t.x,targetY:t.y-38,duration:30});
    later(u,c,32,n=>{if(live(t,n)){hit(u,t,n,1.3);fx(u,n,'burst',t,{radius:38,duration:23,label:'粉砕'});}});
  }});
  register('carapace_slashbeast','破盾大薙ぎ','大きく振りかぶって前方の敵を薙ぎ払い、盾を破壊して防御を崩す。',{range:75,cooldown:240,windup:66,powerScale:1.35,cast(u,t,c){
    if(!t)return;fx(u,c,'slash',u,{radius:110,targetX:t.x,targetY:t.y,duration:28,label:'破盾'});c.cone(u,t,110,.95,6).forEach(v=>{c.status(u,v,'armorbreak',120,.25);c.breakShield(u,v);hit(u,v,c);});
  }});
  register('stonepulse_kolossus','直線地裂','地面を踏み割り、前方へ走る亀裂で直線上の敵を打ち上げる。',{range:160,cooldown:204,windup:42,powerScale:1.5,cast(u,t,c){
    if(!t)return;const d=direction(u,t);fx(u,c,'quake',u,{radius:35,targetX:u.x+d.x*190,targetY:u.y+d.y*190,duration:36,label:'地裂'});fx(u,c,'beam',u,{targetX:u.x+d.x*190,targetY:u.y+d.y*190,duration:24});c.line(u,t,190,26,7).forEach(v=>hit(u,v,c,1,'airborne',36));
  }});
  register('bluefist_colossus','双拳地震','両拳を地面に叩きつけ、周囲へ広がる衝撃波で敵を気絶させる。',{range:90,cooldown:204,windup:42,powerScale:1.35,cast(u,t,c){
    if(!t)return;fx(u,c,'claw',{x:u.x-18,y:u.y+8},{radius:26,duration:18});fx(u,c,'claw',{x:u.x+18,y:u.y+8},{radius:26,duration:18});fx(u,c,'quake',u,{radius:110,duration:28});radial(u,c,105,1,'stun',38,7);
  }});
  register('spikeburst_grinder','丸まり連棘','丸くなって転がりながら、全方向へ三回続けて棘を放つ。',{range:100,cooldown:240,windup:48,powerScale:1.15,
    tick(u,c){if(u.bossState.rollUntil>c.tick){const t=c.nearest(u);if(t)c.move(u,t.x,t.y,2.2);return true;}return false;},
    cast(u,t,c){if(!t)return;u.bossState.rollUntil=c.tick+66;fx(u,c,'shield',u,{radius:25,duration:66,label:'丸まり'});[0,22,44].forEach(delay=>{const pulse=n=>{fx(u,n,'thorn',u,{radius:108,duration:20});radial(u,n,105,.48,null,0,6);};if(delay)later(u,c,delay,pulse);else pulse(c);});}
  });
  register('redhorn_dualbeast','双角背面投げ','二本の角で突進し、敵一体をすくい上げて背後へ投げ飛ばす。',{range:120,cooldown:192,windup:30,powerScale:1.8,
    tick(u,c){if(!live(u,c)){u.bossState.hornCharge=null;return false;}const s=u.bossState,r=s.hornCharge;if(!r)return false;if(!live(r.target,c)||c.tick>r.until){s.hornCharge=null;return false;}c.move(u,r.target.x,r.target.y,4.5);if(c.gap(u,r.target)<=12){s.hornCharge=null;const t=r.target;hit(u,t,c,1.2,'airborne',32);const d=direction(u,t);fx(u,c,'throw',t,{targetX:u.x-d.x*45,targetY:u.y-d.y*45,duration:30,label:'背面投げ'});c.throwTo(u,t,u.x-d.x*45,u.y-d.y*45,100);}return true;},
    cast(u,t,c){if(t){u.bossState.hornCharge={target:t,until:c.tick+100};fx(u,c,'beam',u,{targetX:t.x,targetY:t.y,duration:24,label:'双角突進'});}}
  });
  register('bluehorn_invoker','密集隕石','敵が最も密集する場所を狙い、予告の後に隕石を落とす。',{range:600,cooldown:270,windup:48,powerScale:1.45,cast(u,t,c){
    const foes=c.enemies(u);if(!foes.length)return;let best=foes[0],count=-1;for(const v of foes){const n=c.targets(u,64,8,v).length;if(n>count){best=v;count=n;}}const p={x:best.x,y:best.y};fx(u,c,'warning',p,{radius:74,duration:48,label:'隕石'});
    later(u,c,48,n=>{fx(u,n,'rain',p,{radius:74,duration:25});fx(u,n,'quake',p,{radius:74,duration:25});n.targets(u,64,8,p).forEach(v=>hit(u,v,n));});
  }});
})();
