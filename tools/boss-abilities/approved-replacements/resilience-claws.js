  R('razorclaw_reaver',{motion:'claws',name:'双爪迎撃',tag:'防御・反撃',description:'爪を構えて前方の攻撃を受け止め、開く勢いで近くの敵へ反撃する。',color:'#f6ad94',range:75,cooldown:180,
    interrupt(u){u.bossState.clawGuard=null;},
    cast(u,t,c){
      if(!t||!live(t,c)||!c.enemies(u).includes(t))return;
      const dx=t.x-u.x,dy=t.y-u.y,d=Math.hypot(dx,dy)||1;
      u.bossState.clawGuard={start:c.tick,until:c.tick+90,dx:dx/d,dy:dy/d,absorbed:0,blocks:0,counterAt:null};
      c.event(u,'爪の構え',t);
    },
    tick(u,c){
      const g=u.bossState.clawGuard;if(!g)return false;
      if(!live(u,c)||BossAbilities.blocked(u,c.tick)){u.bossState.clawGuard=null;return false;}
      if(c.tick<(g.counterAt??g.until))return true;
      // The opening swing strikes only enemies still in the guard's forward reach.
      const end={x:u.x+g.dx*110,y:u.y+g.dy*110},targets=c.cone(u,end,85,.85,2);
      u.bossState.clawGuard=null;c.event(u,'双爪の反撃');
      c.effect(u,'claw_counter',u.x,u.y,{targetX:end.x,targetY:end.y,radius:85,duration:20,color:'#f6ad94'});
      for(const t of targets)c.damage(u,t,c.power(u,1.0)+(targets.length?g.absorbed/targets.length:0),'boss_melee');
      return true;
    },
    incoming(u,hit,c){
      const g=u.bossState.clawGuard,source=hit.source;
      if(!g||!source||source.side===u.side||!live(u,c)||BossAbilities.blocked(u,c.tick)||c.tick>=g.until||(g.counterAt!==null&&c.tick>=g.counterAt)||g.blocks>=2||['counter','reflect','intercept','boss_counter','boss_redirect','boss_dot','boss_zone'].includes(hit.delivery))return hit.amount;
      const dx=source.x-u.x,dy=source.y-u.y,d=Math.hypot(dx,dy);
      if(d>1e-8&&(dx*g.dx+dy*g.dy)/d<Math.cos(.9))return hit.amount;
      const absorbed=Math.min(60,hit.amount*.5);if(!(absorbed>0))return hit.amount;
      g.absorbed=Math.min(120,g.absorbed+absorbed);g.blocks++;g.counterAt??=Math.min(g.until,c.tick+12);
      c.event(u,'爪で防御',source,{absorbed});
      c.effect(u,'claw_block',u.x,u.y,{targetX:source.x,targetY:source.y,radius:28,duration:12,color:'#f6ad94'});
      return hit.amount-absorbed;
    }
  });
