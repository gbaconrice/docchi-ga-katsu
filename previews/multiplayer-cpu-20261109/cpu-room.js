/* TEST ONLY. This module is not a production runtime dependency. */
(function(root,factory){const create=factory();if(typeof module==='object'&&module.exports)module.exports=create;else root.createDocchiCpuRoom=create;})(globalThis,function(){
'use strict';
return function createCpuRoom({MultiBinding,MultiProtocol,ReactionLane,MoneyUI,now=Date.now,onChange=()=>{},onReaction=()=>{},seed=61739,autoDelayMs=1600}={}){
 const hostId='test-player',roomId='cpu-test-only',sessionId='cpu-test-'+now()+'-'+seed;
 const bots=new Map(),queue=[],events=[],profiles=new Map([[hostId,{name:'テストプレイヤー'}]]);let host=null,closed=false,nextIndex=1,draining=false;
 const log=(type,details={})=>{events.push({at:now(),type,...details});if(events.length>4000)events.shift();};
 function enqueue(target,sender,wire){queue.push({target,sender,wire});}
 function drain(){if(draining)return;draining=true;try{let count=0;while(queue.length){if(++count>100000)throw Error('CPU test queue overflow');const m=queue.shift(),to=m.target===hostId?host:bots.get(m.target)?.session;if(!to)continue;const accepted=to.receive(m.sender,m.wire);let event;try{event=JSON.parse(m.wire)}catch{}if(event&&['bet','select-side','continue','cashout','hello'].includes(event.type))log(event.type,{sender:m.sender,accepted,round:event.roundId});}}finally{draining=false;}}
 host=MultiBinding.createWalletSession({requireEnvironment:true,roomId,sessionId,userId:hostId,hostId,now,send:wire=>{for(const id of bots.keys())enqueue(id,hostId,wire)},onChange});
 function add({mode='normal',cashOutRound=10+(nextIndex-1)%3}={}){
  if(closed||host.getState().phase!=='lobby'||host.getState().roundId!==null)throw Error('CPUを追加できるのは対戦開始前です');
  if(bots.size>=7)throw Error('CPUは7人までです');
  if(!['normal','idle','select-only'].includes(mode))throw Error('invalid CPU mode');
  const index=nextIndex++,id='cpu-'+index;
  const bot={id,index,mode,cashOutRound,roundSeen:null,roundSeenAt:0,selected:false,confirmed:false,decisionRound:null,reactionKey:null,session:null,reactions:null};
  profiles.set(id,{name:'CPU '+index});bots.set(id,bot);
  bot.session=MultiProtocol.createSession({requireEnvironment:true,roomId,sessionId,userId:id,hostId,now,send:wire=>enqueue(hostId,id,wire)});
  bot.reactions=ReactionLane?.createReactionChannel({roomId,sessionId,userId:id,now,getMembers:()=>host.getState().participants,send:wire=>{log('emote',{sender:id});onReaction(id,wire);return true;}});
  bot.session.hello();host.heartbeat();drain();log('joined',{sender:id});return id;
 }
 function removeLast(){
  if(host.getState().roundId!==null)throw Error('CPUを減らすにはテストルームを作り直してください');
  // Production membership keeps departed ledger seats. Recreate the room in the UI,
  // rather than inventing a remove-seat message the actual protocol does not have.
  throw Error('テストルームを作り直して人数を選んでください');
 }
 function active(s,id){const p=s.wallets?.find(p=>p.playerId===id);return s.participants.includes(id)&&!s.cashedOutIds.includes(id)&&p?.terminalReason!=='bankrupt';}
 function choose(bot,round){let x=(seed^(bot.index*0x9e3779b9)^(round*0x85ebca6b))>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)&1?'A':'B';}
 function pump(){
  if(closed)return;drain();host.tick();drain();
  for(const bot of bots.values()){
   bot.session.tick();const s=bot.session.getState();
   if(s.phase==='predict'&&s.roundId!==bot.roundSeen){bot.roundSeen=s.roundId;bot.roundSeenAt=now();bot.selected=false;bot.confirmed=false;}
   if(s.phase==='predict'&&active(s,bot.id)&&!s.readyIds.includes(bot.id)&&bot.mode!=='idle'){
    const wait=now()-bot.roundSeenAt,side=choose(bot,s.roundId);
    if(!bot.selected&&wait>=350+bot.index*120){bot.selected=bot.session.previewSelection(side);}
    if(bot.mode!=='select-only'&&!bot.confirmed&&wait>=autoDelayMs+bot.index*250){const p=s.wallets?.find(p=>p.playerId===bot.id);bot.confirmed=bot.session.predict(side,MoneyUI.defaultStake(p?.balance??100,s.roundId,10,50)??0);}
   }
   if(s.phase==='result'&&s.roundId>=10&&active(s,bot.id)&&bot.decisionRound!==s.roundId&&bot.mode==='normal'){
    bot.decisionRound=s.roundId;
    if(s.roundId>=bot.cashOutRound)bot.session.cashOut();else bot.session.requestContinue();
   }
   const key=s.roundId+':'+s.phase;
   if(bot.mode!=='idle'&&active(s,bot.id)&&['predict','battle','result'].includes(s.phase)&&bot.reactionKey!==key){
    // Delay until a new round has been rendered. The actual reaction wire is used.
    if(now()-bot.roundSeenAt>=600+bot.index*200){bot.reactionKey=key;bot.reactions?.setRound(s.roundId);bot.reactions?.react(['wow','cheer','applause','frustrated'][(bot.index+s.roundId)%4]);}
   }
  }
  drain();return snapshot();
 }
 function receiveHostReaction(wire){for(const b of bots.values()){b.reactions?.setRound(b.session.getState().roundId);b.reactions?.receive(hostId,wire);}return true;}
 function snapshot(){const s=host.getState();return {testOnly:true,roomId,sessionId,seed,state:s,bots:[...bots.values()].map(b=>({id:b.id,name:profiles.get(b.id).name,mode:b.mode,cashOutRound:b.cashOutRound,phase:b.session.getState().phase,replayReceived:!!b.session.getReplay()})),events:events.slice(-150)};}
 function close(){if(closed)return;closed=true;queue.length=0;for(const b of bots.values()){b.session.close();b.reactions?.close();}host.close();}
 return Object.freeze({host,hostId,roomId,sessionId,add,removeLast,pump,drain,snapshot,close,receiveHostReaction,getProfile:id=>profiles.get(id)||null,getBot:id=>bots.get(id)?.session||null});
};});
