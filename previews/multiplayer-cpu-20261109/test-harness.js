/* TEST-ONLY integration. Never include in production manifests. */
(function(){
'use strict';
if(window.top===window)throw Error('Open index.html for the isolated CPU test.');
let room=null,basePump=pumpMulti,busy=false;
// Prevent this test build from ever reaching native rooms or score submission.
loadNativeSDK=async function(){throw Error('CPUテスト版ではGRAVITYへ接続しません');};
submitFinalScore=async function(){return{status:'test-only-not-submitted'};};
attemptFinalScore=function(){return{status:'test-only-not-submitted'};};
function makeRoom(count=3,options={}){
 if(busy)throw Error('テストルームを準備中です');if(!Number.isInteger(count)||count<1||count>7)throw Error('CPUは1～7人です');busy=true;
 try{
  cancelReplayJob();const old=room;multiSession=null;multiAdapter=null;mockGuest=null;mockQueue=[];old?.close();
  multiUser='test-player';multiHost=true;multiError='';multiRoundSeen=null;multiPlayback=null;multiReplay=null;multiShownWallets=null;multiLastPump=0;multiHeartbeat=0;multiAutoAdvanceRound=null;lastScreenPhase=null;
  pendingOwnCashoutPost=null;pendingCarryKinds=null;pendingCarryOutcome=null;carryStreak=0;previousArmyKinds=[];initialKinds=[[],[]];initialUnits=[];openingPlan=null;units=[];shots=[];elapsed=0;choice=null;winner=null;battleEnvironment=null;round=1;state='choose';
  reactionChannel?.close();reactionChannel=null;reactionSessionKey=null;reactionOpen=false;
  room=createDocchiCpuRoom({MultiBinding,MultiProtocol,ReactionLane,MoneyUI,onChange:onMultiChange,onReaction:receiveReaction,seed:options.seed??61739});
  multiSession=room.host;
  multiAdapter={getProfile:room.getProfile,getRoomId:()=>room.roomId,getHostId:()=>room.hostId,isNativeJoined:()=>false,isRestartPending:()=>false,sendReaction:room.receiveHostReaction,exit:async()=>room.close(),restart:async()=>makeRoom(count,options)};
  for(let i=0;i<count;i++)room.add({mode:options.mode||'normal'});
  multiSnapshot=room.host.getState();displayMultiState();showScreen('room');renderMultiRoomLobby();return room.snapshot();
 }finally{busy=false;}
}
pumpMulti=function(now){if(room&&multiSession===room.host){room.pump();basePump(now);room.drain();}else basePump(now);};
// Test-only controls use the same host start and actual protocol actions as production.
window.DocchiCpuTest=Object.freeze({
 create:makeRoom,add(options){if(!room)throw Error('テストルームを作成してください');const id=room.add(options);multiSnapshot=room.host.getState();displayMultiState();renderMultiRoomLobby();return id;},
 snapshot:()=>room?.snapshot()||null,start:()=>openMultiRound(),
 emote(id){const bot=room?.getBot(id);if(!bot)return false;const s=bot.getState(),wire=JSON.stringify({protocol:ReactionLane.REACTION_PROTOCOL,version:1,mode:ReactionLane.REACTION_MODE,roomId:room.roomId,sessionId:room.sessionId,type:ReactionLane.REACTION_TYPE,roundId:s.roundId,emoji:'cheer',seq:Date.now()});return receiveReaction(id,wire);},
 manualBot(id,action){const bot=room?.getBot(id);if(!bot)throw Error('CPUがいません');if(action==='cashout')return bot.cashOut();if(action==='continue')return bot.requestContinue();return false;},
 getProfile:id=>room?.getProfile(id),revision:ContentProfile.CONTENT_REVISION
});
document.querySelector('#showMultiplayer').onclick=()=>room?showScreen('room'):makeRoom();
document.querySelector('#createRoom').onclick=()=>makeRoom();document.querySelector('#joinRoom').disabled=true;document.querySelector('#roomId').disabled=true;document.querySelector('#publicRooms').hidden=true;
window.parent.postMessage({type:'docchi-cpu-test-ready'},location.origin);
})();
