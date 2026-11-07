// These three replacements own their licensed attack frames; no generic contact clock.
// Indices below are local to the original CC0 attack clips, reviewed in source-frames.png.
const BOSS_REPLACEMENT_ROLES=new Set(['gauntlet_combo_guard','kilnback_pincerbeast','razorclaw_reaver']);
function bossReplacementFrame(u){
 if(!BOSS_REPLACEMENT_ROLES.has(u.k))return null;
 const v=visualFor(u),reg=LICENSED_CLIP_REGISTRIES[u.k],tick=Math.round(visualTime*60),st=u.bossState||{};
 const rest=()=>VariableClips.samplePresentation(reg,{nowMs:visualTime*1000,deadAtMs:v.death===null?null:v.death*1000,hitAtMs:Number.isFinite(v.hit)?v.hit*1000:null,moving:v.moving,contactAtMs:null,anticipatedContactAtMs:null}).index;
 if(u.dead||BossAbilities.blocked(u,tick)){v.replacementAction=null;return rest();}
 const attack=n=>reg.clips.attack.frames[Math.max(0,Math.min(reg.clips.attack.frames.length-1,n))].index;
 const cast=st.cast,g=st.clawGuard,action=v.replacementAction;
 if(g&&tick<(g.counterAt??g.until)){v.face=g.dx<0?-1:1;return attack(tick-g.start<4?1:2);}
 if(cast&&tick<cast.due){
  const target=units.find(q=>String(q.token??q.id)===String(cast.target)),dx=st.pincerAim?.x??(target?target.x-u.x:v.face);
  if(dx)v.face=dx<0?-1:1;
  const p=Math.max(0,Math.min(.999,(tick-(cast.start??tick))/Math.max(1,cast.due-(cast.start??tick))));
  return attack(u.k==='gauntlet_combo_guard'?Math.min(7,Math.floor(p*8)):u.k==='kilnback_pincerbeast'?Math.min(14,Math.floor(p*15)):Math.min(2,Math.floor(p*3)));
 }
 if(action){
  const age=tick-action.tick;
  // Source death, control interruption and a cancelled unfinished fist chain cannot leave a pose behind.
  if(age<0||age>=action.duration||(u.k==='gauntlet_combo_guard'&&action.stage<2&&!st.fistCombo)){v.replacementAction=null;return rest();}
  v.face=action.face;
  let local;
  if(u.k==='gauntlet_combo_guard'){
   if(action.stage===0)local=[8,8,9,9,10,10,11,11,11,11,11,11][Math.min(age,11)];
   else if(action.stage===1)local=[12,13,14,16,17,18,19,20,22,23,24,25][Math.min(age,11)];
   else local=Math.min(34,26+Math.floor(age/2));
  }else if(u.k==='kilnback_pincerbeast')local=15+Math.min(2,Math.floor(age/4));
  else local=age<10?5+Math.min(3,Math.floor(age/3)):16+Math.min(2,Math.floor((age-10)/3));
  return attack(local);
 }
 return rest();
}
function consumeBossReplacementEvent(event,actor){
 if(!actor||!BOSS_REPLACEMENT_ROLES.has(actor.k))return;
 const kinds={boss_fist_strike:12,boss_fist_wave:18,boss_pincer_snap:12,boss_claw_counter:19};
 if(event.type!=='boss_effect'||!kinds[event.kind])return;
 const v=visualFor(actor),dx=(event.targetX??actor.x)-actor.x;
 const stage=event.kind==='boss_fist_wave'?2:event.kind==='boss_fist_strike'?(event.color==='#ffe090'||event.color===0xffe090?1:0):0;
 v.replacementAction={tick:Math.round(elapsed*60),duration:kinds[event.kind],stage,face:dx?dx<0?-1:1:v.face};
 v.face=v.replacementAction.face;
}
