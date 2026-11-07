  register('kilnback_pincerbeast','巨鋏断ち','巨大なハサミを大きく構え、閉じる瞬間に目の前の敵へ重い一撃を与える。',{motion:'pincer',range:34,cooldown:178,windup:68,powerScale:1.5,
    prepare(u,t,c){u.bossState.pincerAim={...direction(u,t),target:tokenOf(t)};},
    interrupt(u){u.bossState.pincerAim=null;},
    cast(u,t,c){
      if(!t)return;
      const aim=u.bossState.pincerAim||direction(u,t),end={x:u.x+aim.x*68,y:u.y+aim.y*68};u.bossState.pincerAim=null;
      fx(u,c,'pincer_snap',u,{targetX:end.x,targetY:end.y,radius:38,duration:18,color:'#f5d36d'});
      // A single contact, not a capture. Escape, phase and side changes can make it miss.
      if(!t||!live(t,c)||!c.enemies(u).includes(t)||c.gap(u,t)>34||!c.cone(u,end,34,.7,64).includes(t))return;
      hit(u,t,c,1.3,null,0,'boss_melee');
    }
  });
