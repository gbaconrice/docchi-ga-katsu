'use strict';
const assert=require('assert');const {vm,context}=require('./result-controls-harness.js');context.assert=assert;
vm.runInContext(`
function room(offset=45000){
 let time=100000,q=[],guest;const opts={roomId:'countdown',sessionId:'countdown-session',hostId:'host'};
 const host=MultiBinding.createWalletSession({...opts,userId:'host',now:()=>time,send:w=>q.push(['guest','host',w])});
 const newGuest=()=>MultiProtocol.createSession({...opts,userId:'guest',now:()=>time+offset,send:w=>q.push(['host','guest',w])});guest=newGuest();
 const flush=()=>{let n=0;while(q.length&&n++<10000){const [to,from,w]=q.shift();(to==='host'?host:guest).receive(from,w)}assert.equal(q.length,0)};
 guest.hello();host.hello();flush();
 const finish=(n,winner='draw')=>{host.openRound({roundId:n,durationMs:10000,matchup:{units:[{id:'a',side:0,k:'sword',x:120,y:269,hp:100,dead:false},{id:'b',side:1,k:'archer',x:360,y:269,hp:100,dead:false}]}});flush();for(const id of ['host','guest']){const p=host.getState().wallets.find(x=>x.playerId===id);if(!p.cashedOut&&p.terminalReason!=='bankrupt')(id==='host'?host:guest).predict(id==='host'?'A':'B',MoneyUI.defaultStake(p.balance,n));}flush();host.startBattle({engineVersion:'test',ticks:1,winner,events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();flush()};
 const syncClock=()=>{host.heartbeat();guest.requestClockSync();flush()};
 return {host,get guest(){return guest},flush,finish,syncClock,now:()=>time,advance:ms=>time+=ms,rejoin(){guest.close();guest=newGuest();guest.hello();flush()},takeQueue:()=>q.splice(0),deliver:items=>{q.push(...items);flush()}};
}
function attach(r,asHost=true){multiSession=asHost?r.host:r.guest;multiHost=asHost;multiUser=asHost?'host':'guest';multiAdapter=null;mockGuest=null;mockQueue=[];multiSnapshot=multiSession.getState();multiShownWallets=multiSnapshot.wallets;multiRoundSeen=multiSnapshot.roundId;multiInitial=multiSnapshot.matchup?.units||[];initialKinds=[0,1].map(side=>multiInitial.filter(u=>u.side===side).map(u=>u.k));multiBusy=false;multiRecording=false;multiPlayback=null;multiReplay=null;multiLastPump=r.now();multiHeartbeat=r.now();multiError='';screenMode='game';round=multiSnapshot.roundId||1;multiUnavailableRound=null;}
function seconds(session){return multiNextRoundSeconds(session.getState(),session.getPlaybackClock())}


for(const id of ['pausePanel','unitsPanel','reaction-bar'])document.querySelector('#'+id).hidden=true;
for(const panel of ['pause','unitsToggle','reactionToggle']){
 const r=room();r.finish(1);attach(r);multiAdapter={getRoomId:()=> 'countdown',sendReaction:()=>true,getProfile:()=>null};displayMultiState();
 const q=id=>document.querySelector('#'+id);q(panel).onclick({preventDefault(){},stopPropagation(){}});
 assert(panel==='pause'?pausePanelOpen:panel==='unitsToggle'?unitsOpen:reactionOpen,panel+' opens in result');
 const ledger=JSON.stringify(r.host.getLedger()),deadline=r.host.getState().nextRoundAt;r.advance(29999);pumpMulti(r.now());assert.equal(r.host.getState().roundId,1);assert.equal(r.host.getState().nextRoundAt,deadline);assert.equal(JSON.stringify(r.host.getLedger()),ledger);
 r.advance(1);pumpMulti(r.now());r.flush();assert.equal(r.host.getState().roundId,2);assert.equal(r.guest.getState().roundId,2);assert.equal(r.host.getState().phase,'predict');assert(!pausePanelOpen&&!unitsOpen&&!reactionOpen);assert(q('pausePanel').hidden&&q('unitsPanel').hidden&&q('reaction-bar').hidden);const revision=r.host.getState().revision;for(let i=0;i<5;i++)pumpMulti(r.now());assert.equal(r.host.getState().revision,revision);console.log('PASS '+panel+' leaves authoritative 30-second deadline and one advance intact');
}
`,context);
