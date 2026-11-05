const fs=require('fs'),assert=require('assert');
// Existing VM/DOM harness: synthetic control-flow tests, not real-browser visual QA.
const h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
context.TextEncoder=require('util').TextEncoder;context.TextDecoder=require('util').TextDecoder;
const run=s=>vm.runInContext(s,context),click=id=>elem(id).onclick({isTrusted:true});
run("globalThis.scoreCalls=0;submitFinalScore=()=>{scoreCalls++;return Promise.resolve()};");
click('#red');click('#confirm');
const originalId=run('walletState.sessionId');
click('#pause');assert.equal(run('paused'),true);click('#pauseResume');
assert.equal(run('paused'),false);assert.equal(run('walletState.sessionId'),originalId);assert.equal(run('state'),'fight');
console.log('PASS pause/resume retains the active run');
run('returnHome()');assert.equal(elem('#soloStart').textContent,'つづきから');
click('#soloStart');assert.equal(run('walletState.sessionId'),originalId);assert.equal(run('paused'),false);
console.log('PASS ordinary home navigation still resumes');

// Controlled second-round fixture reproduces the public case: one win, 125 G, round 2.
run("walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:1,outcome:'A',now:0});state='result';winner=0;nextPrediction();showScreen('game')");
click('#blue');click('#confirm');const secondId=run('walletState.sessionId');
assert.equal(run('currentWallet().balance'),125);assert.equal(run('round'),2);
click('#pause');click('#pauseExit');
assert.equal(run('screenMode'),'home');assert.equal(run('soloRunEnded'),true);
assert.equal(elem('#soloStart').textContent,'ひとりで遊ぶ');assert.equal(run('pausePanelOpen'),false);
assert.notEqual(run('state'),'fight');assert.equal(run('homePausedSolo'),false);
const exitedElapsed=run('elapsed');run('loop(1000);loop(5000)');assert.equal(run('elapsed'),exitedElapsed);
assert.equal(run('scoreCalls'),0);
click('#soloStart');
assert.notEqual(run('walletState.sessionId'),secondId);assert.equal(run('round'),1);
assert.equal(run('currentWallet().balance'),100);assert.equal(run('walletState.completedRounds'),0);
assert.equal(run('state'),'choose');assert.equal(run('paused'),false);assert.equal(run('selectedSide'),null);assert.equal(run('pendingCarryKinds'),null);
assert.equal(run('carryStreak'),0);assert.equal(run('soloRunEnded'),false);assert.equal(elem('#confirm').disabled,true);
click('#red');click('#confirm');assert.equal(run('paused'),false);assert.equal(run('state'),'fight');
console.log('PASS explicit exit stops the run, sends no score, and starts a fresh round 1 / 100 G');

// The non-combat phase also permits moving directly from Exit into an offline mock room.
click('#pause');click('#pauseExit');run('beginMock()');assert.equal(run('!!multiSession'),true);
console.log('PASS exit does not leave the room-entry fight guard stuck');
run('multiSession.close();mockGuest.close();multiSession=null;mockGuest=null;multiSnapshot=null;mockQueue=[];');

for(const terminal of ['cashout','bankrupt']){
 run(\"walletState=SoloWallet.createSession({sessionId:'terminal-\"+terminal+\"',playerIds:[PLAYER],config:{initialBalance:\"+(terminal==='bankrupt'?0:100)+\"}});for(let n=1;n<=10;n++){walletState=SoloWallet.openRound(walletState,{sessionId:walletState.sessionId,roundId:n,deadline:100});walletState=SoloWallet.commitPrediction(walletState,{sessionId:walletState.sessionId,roundId:n,playerId:PLAYER,side:'A',stake:\"+(terminal==='bankrupt'?0:10)+\",now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:n,outcome:'draw',now:0})}round=10;state='result';soloRunEnded=false;screenMode='game';\");
 if(terminal==='cashout')click('#cashOut');click('#next');
 assert.equal(run('screenMode'),'home');assert.equal(elem('#soloStart').textContent,'ひとりで遊ぶ');
 click('#soloStart');assert.equal(run('round'),1);assert.equal(run('currentWallet().balance'),100);assert.equal(run('state'),'choose');
}
console.log('PASS normal cashout and bankruptcy endings still restart cleanly');

run("walletState=SoloWallet.createSession({sessionId:'extension-exit',playerIds:[PLAYER]});for(let n=1;n<=10;n++){walletState=SoloWallet.openRound(walletState,{sessionId:walletState.sessionId,roundId:n,deadline:100});walletState=SoloWallet.commitPrediction(walletState,{sessionId:walletState.sessionId,roundId:n,playerId:PLAYER,side:'A',stake:10,now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:n,outcome:'draw',now:0})}round=10;state='result';winner=null;soloRunEnded=false;screenMode='game';");
click('#continueRun');assert.equal(run('round'),11);click('#red');click('#confirm');
const scoreBeforeExit=run('scoreCalls');click('#pause');click('#pauseExit');
assert.equal(run('scoreCalls'),scoreBeforeExit);assert.equal(elem('#soloStart').textContent,'ひとりで遊ぶ');
click('#soloStart');assert.equal(run('round'),1);assert.equal(run('currentWallet().balance'),100);
console.log('PASS extension battle exit also restarts at round 1 without submitting a score');

run("globalThis.leaveCalls=0;leaveMulti=()=>{leaveCalls++;multiSession=null;return Promise.resolve()};multiSession={};state='fight';pausePanelOpen=false;");
const soloEndedBeforeMultiExit=run('soloRunEnded');click('#pause');click('#pauseExit');
assert.equal(run('leaveCalls'),1);assert.equal(run('soloRunEnded'),soloEndedBeforeMultiExit);
console.log('PASS multiplayer exit still calls the existing leave path');

`)(require,assert);
