  register('gauntlet_combo_guard','双拳衝波','拳を二度打ち込み、最後の衝撃波で前方の敵を押し返す。',{motion:'gauntlet',range:28,cooldown:192,windup:30,powerScale:3.2,
    interrupt(u){u.bossState.fistCombo=null;},
    tick(u,c){const combo=u.bossState.fistCombo;if(!combo)return false;if(!live(combo.target,c)||!c.enemies(u).includes(combo.target)){u.bossState.fistCombo=null;return false;}return c.tick<=combo.until;},
    cast(u,t,c){
      if(!t||!live(t,c)||!c.enemies(u).includes(t))return;
      const aim=direction(u,t),combo={target:t,until:c.tick+24,aim};u.bossState.fistCombo=combo;
      const valid=n=>live(u,n)&&u.bossState.fistCombo===combo&&!BossAbilities.blocked(u,n.tick)&&live(t,n)&&n.enemies(u).includes(t);
      const punch=(n,index)=>{
        if(!valid(n)){u.bossState.fistCombo=null;return;}
        // Contact is rechecked at each punch; dodged or departed targets are not hit remotely.
        const reached=n.gap(u,t)<=40;
        n.event(u,index===0?'左拳':'右拳',reached?t:null,{stage:index});
        const end=reached?t:{x:u.x+aim.x*55,y:u.y+aim.y*55};
        fx(u,n,'fist_strike',u,{targetX:end.x,targetY:end.y,duration:10,radius:16,color:index===0?'#ffbf52':'#ffe090'});
        if(reached)hit(u,t,n,.35,null,0,'boss_melee');
      };
      punch(c,0);
      later(u,c,12,n=>punch(n,1));
      later(u,c,24,n=>{
        if(!valid(n)){u.bossState.fistCombo=null;return;}
        const end={x:u.x+aim.x*110,y:u.y+aim.y*110};
        n.event(u,'双拳の衝撃波',null,{stage:2});
        fx(u,n,'fist_wave',u,{targetX:end.x,targetY:end.y,radius:110,duration:14,color:'#ffc561'});
        for(const v of n.cone(u,end,95,.65,5)){hit(u,v,n,.8);n.push(u,v,45);}
        u.bossState.fistCombo=null;
      });
    }
  });
