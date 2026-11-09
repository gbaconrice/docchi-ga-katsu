/* TEST ONLY. Separate preview; never loaded by production entry points. */
(function(){
'use strict';
loadNativeSDK=async function(){throw Error('表示テストはGRAVITYへ接続しません');};
submitFinalScore=async function(){return{status:'test-only-not-submitted'};};
attemptFinalScore=function(){return{status:'test-only-not-submitted'};};
pumpMulti=function(){};
window.DocchiRulesTest=Object.freeze({prepare(target=10,phase='predict',ownZero=false){
 if(!Number.isInteger(target)||target<1||target>15)throw Error('invalid test round');
 cancelReplayJob();multiSession=null;multiSnapshot=null;multiPlayback=null;multiReplay=null;multiRecording=false;multiBusy=false;multiRoundSeen=null;multiShownWallets=null;multiInitial=null;multiAutoAdvanceRound=null;mockGuest=null;mockQueue=[];freshWallet();
 multiUser='h';multiHost=true;multiAdapter={getProfile:id=>({name:id==='h'?'あなた':'参加者 '+id}),getRoomId:()=> 'qa',getHostId:()=> 'h',isRestartPending:()=>false,isNativeJoined:()=>false,sendReaction:()=>false};let now=1000000;
 multiSession=MultiBinding.createWalletSession({roomId:'qa',sessionId:'qa-15-'+Date.now(),userId:'h',hostId:'h',now:()=>now,send:()=>{},onChange:onMultiChange});
 const sid=multiSession.getState().sessionId;
 const wire=(id,type,extra={})=>MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,roomId:'qa',sessionId:sid,type,...extra});for(const id of ['b','c'])multiSession.receive(id,wire(id,'hello'));
 for(let r=1;r<=target;r++){
  multiSession.openRound({roundId:r,durationMs:60000,matchup:{units:[]}});showScreen('game');displayMultiState();
  if(r===target&&phase==='predict')break;
  const wallets=multiSession.getState().wallets;
  for(const[id,side]of [['h',ownZero?'B':'A'],['b','B'],['c','A']]){const p=wallets.find(p=>p.playerId===id),stake=id==='b'||ownZero&&id==='h'?p.balance:MoneyUI.defaultStake(p.balance,1);if(id==='h')multiSession.predict(side,stake);else multiSession.receive(id,wire(id,'bet',{roundId:r,side,stake,seq:r}));}
  multiSession.startBattle({engineVersion:'qa-ui',ticks:1,winner:'A',events:[],unavailable:'replay-byte-cap'});multiSession.settleRound();multiSession.showResult();displayMultiState();
  if(r===target&&phase==='result')break;
  now+=5000;multiSession.tick();displayMultiState();
 }
 const data={round:target,phase:multiSession.getState().phase,header:document.querySelector('#status').textContent,gold:document.querySelector('#balance').textContent,hint:document.querySelector('#stakeHint').textContent,options:[10,25,50,75,90,100].filter(n=>!document.querySelector('#stake'+n).hidden),nextWait:multiSession.getState().nextRoundAt===null?null:multiSession.getState().nextRoundAt-now,finalWait:multiSession.getState().finalResultsAt===null?null:multiSession.getState().finalResultsAt-now,extensionVisible:!document.querySelector('#extensionChoices').hidden,screen:screenMode,finalRows:[...document.querySelectorAll('.room-final-row')].map(x=>x.textContent),overflow:document.documentElement.scrollWidth>innerWidth};
 window.parent.postMessage({type:'rules-trace',data},location.origin);return data;
}});
window.addEventListener('error',e=>window.parent.postMessage({type:'rules-error',message:e.message},location.origin));
window.parent.postMessage({type:'docchi-rules-test-ready'},location.origin);
})();
