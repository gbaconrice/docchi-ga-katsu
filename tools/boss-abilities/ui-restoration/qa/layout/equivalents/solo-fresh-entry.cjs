const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
context.TextEncoder=require('util').TextEncoder;context.TextDecoder=require('util').TextDecoder;
const run=s=>vm.runInContext(s,context),click=id=>elem(id).onclick({isTrusted:true});
run("globalThis.scoreCalls=0;submitFinalScore=()=>{scoreCalls++;return Promise.resolve()};");
const initialId=run('walletState.sessionId');
click('#soloStart');click('#soloStart');
assert.equal(run('walletState.sessionId'),initialId,'queued double tap resets an active run');
assert.equal(elem('#soloStart').textContent,'ひとりで遊ぶ');
console.log('PASS duplicate start taps are ignored once in game');

for(const from of ['choose','fight','result']){
 if(from==='fight'){click('#red');click('#confirm');click('#pause');}
 if(from==='result')run("walletState=SoloWallet.commitPrediction(walletState,{sessionId:walletState.sessionId,roundId:1,playerId:PLAYER,side:'A',stake:25,now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:1,outcome:'A',now:0});state='result';winner=0;");
 const oldId=run('walletState.sessionId');
 run('returnHome()');
 assert.equal(run('screenMode'),'home');assert.equal(run('state'),'choose');assert.equal(run('pausePanelOpen'),false);
 assert.equal(run('homePausedSolo'),false);assert.equal(run('scoreCalls'),0);
 const elapsed=run('elapsed');run('loop(1000);loop(8000)');assert.equal(run('elapsed'),elapsed);
 click('#soloStart');
 assert.notEqual(run('walletState.sessionId'),oldId);assert.equal(run('round'),1);assert.equal(run('mistakes'),0);assert.equal(run('correct'),0);
 assert.equal(run('currentWallet().balance'),100);assert.equal(run('walletState.completedRounds'),0);
 assert.equal(run('selectedSide'),null);assert.equal(run('selectedStakeOption'),25);assert.equal(run('state'),'choose');
 assert.equal(run('paused'),false);assert.equal(run('soloRunEnded'),false);assert.equal(run('carryStreak'),0);assert.equal(run('pendingCarryKinds'),null);
 assert.equal(elem('#confirm').disabled,true);assert.equal(elem('#soloStart').textContent,'ひとりで遊ぶ');
}
console.log('PASS home from prediction, paused battle and result always starts round 1 / 100 G with no score submission');

// A live room remains a live room, including the ability to return to spectating.
run("showScreen('home');globalThis.roomSentinel={getState:()=>multiSnapshot};multiSession=roomSentinel;multiSnapshot={phase:'battle'};globalThis.savedWallet=walletState;");
click('#soloStart');
assert.equal(run('multiSession===roomSentinel'),true);assert.equal(run('walletState===savedWallet'),true);assert.equal(run('screenMode'),'room');
assert.equal(elem('#backHome').textContent,'観戦に戻る');assert.match(elem('#roomStatus').textContent,/先に部屋から退出/);
click('#backHome');assert.equal(run('screenMode'),'game');
run('returnHome()');assert.equal(run('screenMode'),'room');assert.equal(run('multiSession===roomSentinel'),true);
assert.equal(run('exitSoloRun()'),false);assert.equal(run('walletState===savedWallet'),true);
console.log('PASS multiplayer guard, spectator return and explicit exit guard preserve the existing session');
`)(require,assert);
