    function ingestCombatEvents(events, meta = {}) {
      const key=keyOf(meta.battleId || currentBattle);
      if(!key || key!==currentBattle || phase!=='battle' || !enabled())return 0;
      if(meta.tick!==undefined && meta.tick!==null && !remember(batches,batchOrder,key+':'+String(meta.tick),MAX_BATCHES))return 0;
      const list=Array.isArray(events)?events:[];
      const splitChildren=new Set(list.filter(e=>e?.type==='split_spawn').map(e=>e.childToken));
      const contacts=[],details=[],windups=[];
      const unique=new Map();
      for(const e of list){
        if(!e || typeof e.type!=='string')continue;
        let c=null;
        switch(e.type){
          case 'resolved_hit':
            if(e.delivery!=='poison' && Number(e.amount)>0)c={cue:String(e.sourceKind||'').toLowerCase()==='drake'?'drake':hitCue(e.sourceKind),rank:5,amount:Number(e.amount),lane:'impact'};
            break;
          case 'death_explode':case 'bomb_explode':c={cue:'bomb',rank:10,lane:'impact'};break;
          case 'charge_impact':c={cue:'heavy',rank:9,lane:'impact'};break;
          case 'golem_ground_contact':c={cue:'golem',rank:9,lane:'impact'};break;
          case 'chain_link':c={cue:'storm',rank:8,lane:'impact'};break;
          case 'parry_block':case 'ward_block':case 'ward_consumed':case 'aegis_block':case 'counter_barrier_block':c={cue:'shield',rank:6,lane:'impact'};break;
          case 'burrow_emerge':c={cue:'emerge',rank:5.5,lane:'impact'};break;
          case 'projectile_release':c={cue:/archer|bow|harpoon/.test(String(e.k||e.sourceKind||''))?'arrow':'magic',rank:2,lane:'release'};break;
          case 'slow_applied':c={cue:e.factor===0?'snare':'frost',rank:1,lane:'status'};break;
          case 'heal':if(Number(e.actualAmount)>0)c={cue:'heal',rank:3,lane:'status'};break;
          case 'summon_spawn':if(!splitChildren.has(e.childToken))c={cue:'summon',rank:4,lane:'status'};break;
          case 'split_spawn':c={cue:'split',rank:4,lane:'status'};break;
          case 'high_action_start':case 'pillar_action_start':case 'charged_shot_start':case 'moon_action_start':case 'combo_melee_start':case 'melee_action_start':c={cue:'windup',rank:0,lane:'windup'};break;
          case 'wave4_action_start':if(e.kind==='burst')c={cue:'windup',rank:0,lane:'windup'};break;
        }
        if(!c)continue;
        c.x=e.x;c.source=e.sourceToken||e.parentToken||'';
        if(c.lane==='windup'){
          const id=keyOf(e.actionToken);if(!id || !remember(actionKeys,actionOrder,key+':'+id,MAX_ACTION_KEYS))continue;
          windups.push(c);continue;
        }
        const id=c.lane+':'+c.cue;const previous=unique.get(id);
        if(!previous || c.rank>previous.rank || (c.rank===previous.rank&&(c.amount||0)>(previous.amount||0)))unique.set(id,c);
      }
      for(const c of unique.values())(c.lane==='impact'?contacts:details).push(c);
      const sort=(a,b)=>b.rank-a.rank || (b.amount||0)-(a.amount||0) || a.cue.localeCompare(b.cue);
      contacts.sort(sort);details.sort(sort);
      const t=now();let played=0;
      const play=(c,volume)=>playCue(c.cue,volume,{battleId:key,phase:'battle',audioLane:c.lane,x:c.x});
      // At most one contact per batch, never displaced by release or a status.
      const contact=contacts[0];
      if(contact && t-lastHitAt>=.09){
        const strength=contact.rank>=8?.88:clamp(.58+(contact.amount||1)/65,.58,.88);
        if(play(contact,strength)){lastHitAt=t;played++;}
      }
      // Detail has an independent budget, one voice total; release remains
      // much quieter than contact. Status cannot mask a same-family impact.
      const eligibleDetails=details.filter(c=>!(contact && c.cue===contact.cue) && (c.lane==='release'?t-lastReleaseAt>=.24:t-lastStatusAt>=.48) && !(c.cue==='heal' && t-lastHealAt<.52));
      // An occasional status accent cannot be starved by a constant arrow stream.
      const detail=(t-lastStatusAt>=.8?eligibleDetails.find(c=>c.lane==='status'):null)||eligibleDetails[0];
      if(detail && !(contact && contact.rank>=9)){
        if(play(detail,detail.lane==='release'?.75:.60)){
          if(detail.lane==='release')lastReleaseAt=t;else lastStatusAt=t;
          if(detail.cue==='heal')lastHealAt=t;played++;
        }
      }
      if(!contacts.length&&!details.length&&windups.length&&t-lastWindupAt>=.72){
        if(playCue('windup',.66,{battleId:key,phase:'battle'})){lastWindupAt=t;played++;}
      }
      return played;
    }
