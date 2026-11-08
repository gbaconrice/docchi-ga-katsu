'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
process.env.GAME_HTML=path.resolve(process.argv[2]||process.env.GAME_HTML||path.join(__dirname,'../../index.html'));
const {ev,context,nodes}=require(process.env.ENGINE_HARNESS||process.env.HARNESS_PATH||process.env.GAME_HARNESS||path.resolve(__dirname,'../../tools/boss-abilities/tests/harness.cjs'));
context.assert=assert;
const q=id=>context.document.querySelector(id);
let count=0;function test(label,fn){fn();count++;console.log('PASS '+label);}

ev(`globalThis.labelFixture=(phase='battle',host=true)=>{
 multiError='';multiUnavailableRound=null;multiBusy=false;multiRecording=false;roomEntryPending=false;roomExitPending=false;
 multiUser=host?'host':'guest';multiHost=host;multiPlayback=null;multiReplay=null;screenMode='game';
 multiSnapshot={phase,roundId:2,participants:['host','guest'],spectators:[],departedIds:[],cashedOutIds:[],readyIds:[],continueIds:[],wallets:[{playerId:'host',balance:100},{playerId:'guest',balance:100}],roundResults:[],confirmedSides:[],winner:'A'};
 multiSession={getState:()=>multiSnapshot,getPlaybackClock:()=>({known:false,ready:false})};
 multiAdapter={isNativeJoined:()=>true,getHostId:()=>'host',getRoomId:()=>'test',getProfile:()=>null};
 document.querySelector('#roomStatus').textContent='';document.querySelector('#roomScoreStatus').textContent='';
 document.querySelector('#multiSummary').textContent='routine summary must not leak';
 state=phase==='predict'?'choose':['settle','result'].includes(phase)?'result':'fight';
};`);

test('host and guest routine prediction/preparation/replay/result bars and exits collapse',()=>{
 for(const host of [true,false])for(const phase of ['predict','locked','battle','settle','result']){
  ev(`labelFixture(${JSON.stringify(phase)},${host});renderMultiRoomLobby()`);
  assert(q('#multiStatusRow').hidden,phase);assert(q('#exitRoom').hidden,phase);assert(q('#multiSummary').hidden);assert.equal(q('#multiSummary').textContent,'');
 }
});
test('missing replay and unknown clock are ordinary waiting, not an error exception',()=>{
 ev("labelFixture('battle');multiPlayback=null;multiReplay=null;renderMultiRoomLobby()");
 assert(q('#multiStatusRow').hidden);assert(q('#exitRoom').hidden);
 ev("document.querySelector('#roomStatus').textContent='離脱者は10戦後に終了';renderMultiRoomLobby()");assert(q('#multiStatusRow').hidden);
});
test('existing explicit replay/content/exit failures retain recovery but never routine summary',()=>{
 for(const setup of ["multiError='観戦不可：テスト'", "multiSnapshot.replayError='replay-transfer-failed'", 'multiUnavailableRound=2', "document.querySelector('#roomStatus').textContent='退出失敗：テスト。もう一度退出してください。'"]){
  ev(`labelFixture('battle');${setup};renderMultiRoomLobby()`);
  assert(!q('#multiStatusRow').hidden,setup);assert(!q('#exitRoom').hidden,setup);assert(!q('#exitRoom').disabled);assert(q('#multiSummary').hidden);assert.equal(q('#multiSummary').textContent,'');
 }
 ev("labelFixture('battle');multiUnavailableRound=1;renderMultiRoomLobby()");assert(q('#multiStatusRow').hidden,'stale unavailable round');
 ev("labelFixture('battle');multiError='stale multiplayer error';multiSession=null;multiSnapshot=null;multiAdapter=null;renderMultiRoomLobby()");assert(q('#multiStatusRow').hidden,'no error bar leaking into solo');assert(q('#exitRoom').hidden);
});
test('clearing a failure collapses the row again; score-only routine duplicate stays hidden',()=>{
 ev("labelFixture('battle');multiError='テスト';renderMultiRoomLobby();multiError='';renderMultiRoomLobby()");assert(q('#multiStatusRow').hidden);
 ev("labelFixture('result');document.querySelector('#roomScoreStatus').textContent='送信できませんでした。再試行できます。';document.querySelector('#roomScoreRetry').hidden=false;renderMultiRoomLobby()");
 assert(q('#multiStatusRow').hidden); // The existing #scoreStatus/#scoreRetry remains in the result panel.
});
test('lobby and stopped recovery retain exit, start/retry states; home hides row',()=>{
 for(const phase of ['lobby','stopped']){
  ev(`labelFixture(${JSON.stringify(phase)});screenMode='room';renderMultiRoomLobby()`);
  assert(!q('#multiStatusRow').hidden);assert(!q('#exitRoom').hidden);assert.equal(q('#exitRoom').textContent,'退出してホームへ');
 }
 ev("labelFixture('lobby');screenMode='room';roomExitPending=true;renderMultiRoomLobby()");assert(q('#exitRoom').disabled);assert.equal(q('#exitRoom').textContent,'退出中…');
 ev("labelFixture('lobby');screenMode='home';renderMultiRoomLobby()");assert(q('#multiStatusRow').hidden);
});
test('empty or skipped/lost/incomplete winner receipts omit the entire result row',()=>ev(`{
 labelFixture('result');multiAdapter={getProfile:id=>({name:id==='host'?'Player One':'Player Two'})};
 const s=multiSnapshot;s.roundResults=s.participants.map(playerId=>({playerId,side:'B',submitted:true,correct:false}));
 assert.equal(multiResultText(s,'host'),'');
 s.roundResults=s.participants.map(playerId=>({playerId,side:null,submitted:false,correct:null}));assert.equal(multiResultText(s,'host'),'');
 s.roundResults=[];assert.equal(multiResultText(s,'host'),'');
 s.roundResults=[{playerId:'host',side:'A',submitted:true,correct:true}];assert.equal(multiResultText(s,'host'),'的中：Player One');
 assert.equal(multiResultText({...s,winner:'draw'},'host'),'');assert.equal(multiResultText({...s,winner:'invalid'},'host'),'');
}`));
test('header keeps actual left/right picks and choose 未選択, never no-pick fight/result',()=>{
 for(const phase of ['predict','battle','result'])for(const side of [null,'A','B']){
  ev(`labelFixture(${JSON.stringify(phase)});selectedSide=null;multiSnapshot.confirmedSides=${side?JSON.stringify([{userId:'host',side}]):'[]'};syncOwnBattleChoice()`);
  assert.equal(q('#battleChoice').hidden,side===null&&phase!=='predict');
  assert.equal(q('#battleChoice').textContent,side==='A'?'予想：左':side==='B'?'予想：右':phase==='predict'?'予想：未選択':'');
 }
 ev("labelFixture('battle');multiSession=null;state='fight';choice=null;syncOwnBattleChoice()");assert(q('#battleChoice').hidden);assert.equal(q('#battleChoice').textContent,'');
});
test('canonical timeout receipt keeps exact 0 G and ledger while removing empty label',()=>ev(`{
 let time=1000;const host=MultiBinding.createWalletSession({roomId:'labels',sessionId:'labels-receipt',hostId:'host',userId:'host',members:['host'],now:()=>time,send:()=>{}});
 host.openRound({roundId:1,durationMs:60000,matchup:{units:[]}});time=61000;host.tick();
 host.startBattle({engineVersion:'test',ticks:1,winner:'A',events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();
 multiSession=host;multiSnapshot=host.getState();multiUser='host';multiAdapter=null;multiPlayback=null;multiReplay=null;round=1;state='result';screenMode='game';multiRecording=false;multiBusy=false;
 const receipt=multiSnapshot.roundResults.find(e=>e.playerId==='host'),before=JSON.stringify(host.getLedger());
 assert.equal(receipt.submitted,false);assert.equal(String(receipt.delta),'0');
 syncPersonalResult(1000);cancelPersonalResult();
 assert.equal(document.querySelector('#message').textContent,'');assert.equal(document.querySelector('#breakdown').textContent,credits(receipt.delta));
 assert.equal(document.querySelector('#breakdown').textContent,'0 G');assert.equal(JSON.stringify(host.getLedger()),before);
 assert.equal(multiResultText(multiSnapshot,'host'),'');assert.equal(multiSnapshot.nextRoundAt,69000);
}`));
console.log('PASS '+count+' focused display/recovery tests; no native device claim');
