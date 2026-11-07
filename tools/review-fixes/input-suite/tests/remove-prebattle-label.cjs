'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const dir = process.cwd();
const input = process.env.GAME_HTML || path.join(dir, 'index.html');
const harnessPath = path.join(dir, 'tests/bet-ui-smoke.cjs');
const html = fs.readFileSync(input, 'utf8');
// Fixed original function from source SHA256
// 5160ff600ee08d1688abb4a9967fb8e6b29954f8124c2bff9ac283b2b042988b.
// Keep this small fixture independent of a release directory or full baseline HTML.
const oldFn = `function syncStableBattleClock(){
 const node=document.querySelector('#battleClock');if(!node)return;
 node.hidden=false;
 if(state==='choose'){node.textContent='開始前';return;}
 if(multiSession&&!multiPlayback){node.textContent=state==='result'?'記録なし':'再生待ち';return;}
 const seconds=multiSession?multiLastSceneTick/60:elapsed;
 node.textContent=Math.min(60,Math.max(0,Number.isFinite(seconds)?seconds:0)).toFixed(1)+'秒 · '+ReplayClock.effectiveSpeed(seconds||0)+'×';
}`;
const oldLine = "if(state==='choose'){node.textContent='開始前';return;}";
const newLine = "if(state==='choose'){node.textContent='';return;}";
assert.equal(oldFn.split(oldLine).length - 1, 1, 'The fixed original function has one label to remove');
const definitions = [...html.matchAll(/function syncStableBattleClock\(\)\{[\s\S]*?\n\}/g)];
assert.equal(definitions.length, 1, 'Exactly one stable clock function must exist');
const newFn = definitions[0][0];
assert.equal(newFn, oldFn.replace(oldLine, newLine), 'The stable clock function changes only the requested choose-state label');
assert(!html.includes('開始前'));
assert(/#app #gameScreen > #gameToolbar \{[^}]*flex:0 0 52px;[^}]*min-height:52px; height:52px;/s.test(html), 'Toolbar keeps its existing reserved height');
assert(html.includes('<p id="battleClock" class="battle-clock" aria-live="off"></p>'), 'Clock node remains in its existing grid slot');
function clock(fn, values) {
  const node = {hidden:true, textContent:'stale previous result'};
  const context = {document:{querySelector:()=>node}, ReplayClock:{effectiveSpeed:s=>s>=10?2:1}, ...values};
  vm.runInNewContext(fn + ';syncStableBattleClock();', context);
  return node;
}
let cases = 0;
for(const state of ['choose','fight','result']) for(const multiSession of [null,{}]) for(const multiPlayback of [null,{}]) for(const seconds of [0,4.4,13,61,-1,NaN,Infinity]) {
  const values = {state, multiSession, multiPlayback, elapsed:seconds, multiLastSceneTick:seconds*60};
  const expected = clock(oldFn, values), actual = clock(newFn, values);
  if(state === 'choose') expected.textContent = '';
  assert.deepStrictEqual(actual, expected, 'State and elapsed-time parity: ' + JSON.stringify(values));
  assert.equal(actual.hidden, false);
  cases++;
}
vm.runInNewContext(newFn + ';syncStableBattleClock();', {document:{querySelector:()=>null}});
console.log('PASS '+cases+' choose/fight/result clock cases; missing node is safe; all non-choose behavior unchanged');
const harness = fs.readFileSync(harnessPath, 'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')", 'htmlInput');
new Function('require', 'htmlInput', 'assert', harness + `
 const run = code => vm.runInContext(code, context, {timeout:30000});
 const clockNode = nodes.get('#battleClock');
 const check = label => { assert.strictEqual(nodes.get('#battleClock'), clockNode, label+' retains the node'); assert.equal(clockNode.hidden,false,label+' retains the slot'); assert.equal(clockNode.textContent,'',label+' has no label'); };
 check('initial solo choose');
 assert.equal(nodes.get('#battleChoice').textContent,'予想：未選択');
 run('selectSide(1)'); check('selected solo choose'); assert.equal(nodes.get('#battleChoice').textContent,'予想：右');
 run('startPrediction();elapsed=4.4;syncStableBattleClock()'); assert.equal(clockNode.textContent,'4.4秒 · 1×');
 run('openPausePanel();syncStableBattleClock()'); assert.equal(clockNode.textContent,'4.4秒 · 1×');
 run('closePausePanel();syncStableBattleClock()'); assert.equal(clockNode.textContent,'4.4秒 · 1×');
 run("walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:round,outcome:'B',now:0});winner=1;state='result';update();syncPersonalResult(2000);syncReactions()");
 assert.equal(clockNode.textContent,'4.4秒 · 1×'); assert.equal(nodes.get('#battleChoice').textContent,'予想：右');
 run('nextPrediction()'); check('next solo choose'); assert.equal(nodes.get('#battleChoice').textContent,'予想：未選択');
 run("multiUser='you';multiAdapter={getProfile:id=>({name:id}),sendReaction:()=>true,getRoomId:()=> 'fixture'};multiSnapshot={sessionId:'prebattle-qa',roundId:2,phase:'predict',participants:['you','p2'],spectators:['watcher'],departedIds:[],confirmedSides:[],roundResults:[]};multiSession={getState:()=>multiSnapshot};multiPlayback=null;selectedSide=null;state='choose';syncFlowControls();syncReactions();syncOwnBattleChoice()");
 check('multi choose'); assert.equal(nodes.get('#battleChoice').textContent,'予想：未選択');
 run("selectedSide=0;multiSnapshot.confirmedSides=[{userId:'you',side:'A'}];syncOwnBattleChoice();syncStableBattleClock()"); check('confirmed multi choose'); assert.equal(nodes.get('#battleChoice').textContent,'予想：左');
 run("state='fight';multiSnapshot.phase='battle';syncFlowControls();syncStableBattleClock()"); assert.equal(clockNode.textContent,'再生待ち');
 run("state='result';syncStableBattleClock()"); assert.equal(clockNode.textContent,'記録なし');
 run("state='fight';multiPlayback={};multiLastSceneTick=264;syncFlowControls();syncStableBattleClock()"); assert.equal(clockNode.textContent,'4.4秒 · 1×');
 run("state='result';multiSnapshot.phase='result';multiSnapshot.roundResults=[{playerId:'you',side:'A'}];syncFlowControls();syncOwnBattleChoice()"); assert.equal(clockNode.textContent,'4.4秒 · 1×'); assert.equal(nodes.get('#battleChoice').textContent,'予想：左');
 run("state='choose';multiSnapshot.phase='predict';multiPlayback=null;multiSnapshot.confirmedSides=[];selectedSide=null;syncFlowControls();syncOwnBattleChoice()"); check('next multi choose'); assert.equal(nodes.get('#battleChoice').textContent,'予想：未選択');
 run("multiUser='watcher';syncFlowControls();syncOwnBattleChoice()"); check('spectator choose');
 run("state='fight';multiSnapshot.phase='battle';multiPlayback={};multiLastSceneTick=264;syncFlowControls();syncOwnBattleChoice()"); assert.equal(clockNode.textContent,'4.4秒 · 1×'); assert.equal(nodes.get('#battleChoice').textContent,'予想：なし');
 console.log('PASS full-app solo choose/select/fight/pause/result/next, multi choose/confirm/wait/fight/result/next and spectator flows');
`)(require, html, assert);
console.log('PASS exact clock-function contract, reserved toolbar layout and clock node; full-source patch scope is verified separately during integration');
