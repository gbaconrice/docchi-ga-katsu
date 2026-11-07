'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let prefix=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
prefix=prefix.replace('sandbox.window=sandbox;',"sandbox.parent={postMessage:m=>posts.push(m)};sandbox.location.search='?isGravity=1';sandbox.window=sandbox;");
const posts=[];const {context,sandbox,nodes}=new Function('require','posts',prefix+'\nreturn {context,sandbox,nodes};')(require,posts);context.assert=assert;
const run=s=>vm.runInContext(s,context),node=id=>nodes.get('#'+id);
run(`
const uiSeedUnits=JSON.parse(JSON.stringify(initialUnits));
let uiTime=1000,uiQueue=[],uiHost,uiGuest;
function createUiRoom(viewer='host',auto=true){
 multiSession=null;multiSnapshot=null;multiShownWallets=null;multiRoundSeen=null;multiAutoAdvanceRound=null;multiUser=viewer;multiHost=viewer==='host';multiError='';multiRecording=false;multiBusy=false;multiAdapter={getRoomId:()=>'ui-room'};lastScreenPhase=null;screenMode='game';uiTime=1000;uiQueue=[];
 const o={roomId:'ui-room',sessionId:'ui-'+Math.random(),hostId:'host',now:()=>uiTime,requireEnvironment:true};
 uiHost=MultiBinding.createWalletSession({...o,userId:'host',send:w=>uiQueue.push(['guest','host',w]),onChange:s=>{if(viewer==='host')onMultiChange(s)}});
 uiGuest=MultiProtocol.createSession({...o,userId:'guest',send:w=>uiQueue.push(['host','guest',w]),onChange:s=>{if(viewer==='guest')onMultiChange(s)}});
 multiSession=viewer==='host'?uiHost:uiGuest;multiSnapshot=multiSession.getState();uiGuest.hello();uiHost.hello();uiFlush();
 for(let n=1;n<=10;n++){
  uiHost.openRound({roundId:n,durationMs:60000,matchup:{environment:BattleFields.selectRunEnvironment(1),units:uiSeedUnits}});uiFlush();uiHost.predict('A',25);uiGuest.predict('B',25);uiFlush();uiHost.startBattle({engineVersion:'test',ticks:1,winner:'draw',environment:BattleFields.selectRunEnvironment(1),events:[],unavailable:'replay-byte-cap'});uiHost.settleRound();uiHost.showResult();uiFlush();
 }
}
function uiFlush(){let count=0;while(uiQueue.length&&count++<10000){const [to,from,w]=uiQueue.shift();(to==='host'?uiHost:uiGuest).receive(from,w);}assert.equal(uiQueue.length,0);}
`);
for(const viewer of ['host','guest']){
 const before=posts.length;run(`createUiRoom('${viewer}');assert.equal(screenMode,'game');assert.equal(multiDecisionSeconds(multiSnapshot,multiSession.getPlaybackClock()),30);uiTime+=30000;uiHost.tick();uiFlush();assert.equal(multiSnapshot.phase,'lobby');assert.equal(screenMode,'room');assert.equal(multiSession.getState().wallets.find(p=>p.playerId===multiUser).cashoutAmount,100);`);
 assert.equal(posts.length,before+1);assert.deepEqual(JSON.parse(JSON.stringify(posts.at(-1))),{type:'gameOver',score:100});assert.equal(node('beginRound').hidden,viewer!=='host');assert.equal(node('roomScoreStatus').hidden,false);assert.match(node('roomScoreStatus').textContent,/受付は未確認/);assert.equal(node('roomScoreRetry').hidden,true);
 run('onMultiChange(multiSession.getState());uiHost.heartbeat();uiFlush();');assert.equal(posts.length,before+1);console.log('PASS '+viewer+' timeout scores once and UI returns room lobby');
}
// A confirmed failure gets a visible manual retry, never an automatic retry loop.
const before=posts.length;sandbox.parent.postMessage=()=>{throw Error('blocked')};run("createUiRoom('host');uiTime+=30000;uiHost.tick();uiFlush();");assert.equal(node('roomScoreRetry').hidden,false);assert.match(node('roomScoreStatus').textContent,/再試行/);run('onMultiChange(multiSession.getState());');assert.equal(posts.length,before);sandbox.parent.postMessage=m=>posts.push(m);node('roomScoreRetry').onclick();assert.equal(posts.length,before+1);assert.equal(node('roomScoreRetry').hidden,true);console.log('PASS failed automatic score remains manually retryable in finished lobby');
// Real UI onChange callback advances immediately when one guest opted in and host times out.
sandbox.parent.postMessage=()=>{throw Error('blocked')};run("createUiRoom('host');uiGuest.requestContinue();uiFlush();uiTime+=30000;uiHost.tick();uiFlush();assert.equal(multiSnapshot.phase,'predict');assert.equal(multiSnapshot.roundId,11);assert.equal(screenMode,'game');assert.equal(multiSnapshot.wallets.find(p=>p.playerId==='host').cashoutAmount,100);assert(multiSnapshot.cashedOutIds.includes('host'));assert.equal(document.querySelector('#confirm').disabled,true);");assert.equal(node('roomScoreRetry').hidden,false);sandbox.parent.postMessage=m=>posts.push(m);node('roomScoreRetry').onclick();assert.equal(node('roomScoreRetry').hidden,true);console.log('PASS continuing guest auto-advances; timed-out host spectates and keeps score retry');
// A non-viewing participant also returns to the lobby when everybody stops.
run("createUiRoom('guest');screenMode='home';uiTime+=30000;uiHost.tick();uiFlush();assert.equal(screenMode,'room');");console.log('PASS final room transition also brings a home-screen participant back');

const postsBeforeGuest=posts.length;run("createUiRoom('guest');uiHost.requestContinue();uiFlush();uiTime+=30000;uiHost.tick();uiFlush();uiHost.openRound({roundId:11,durationMs:60000,matchup:{environment:BattleFields.selectRunEnvironment(1),units:uiSeedUnits}});uiFlush();assert.equal(multiSnapshot.phase,'predict');assert.equal(multiSnapshot.wallets.find(p=>p.playerId==='guest').cashoutAmount,100);assert.equal(document.querySelector('#confirm').disabled,true);assert.equal(screenMode,'game');");assert.equal(posts.length,postsBeforeGuest+1);console.log('PASS timed-out guest sees continuation as a spectator and submits only own gold');
