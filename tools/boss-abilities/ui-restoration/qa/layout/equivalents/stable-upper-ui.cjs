'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path'),vm=require('vm');
const dir=process.cwd(), file=process.env.GAME_HTML||path.join(dir,'index.html');
const html=fs.readFileSync(file,'utf8');
const harness=fs.readFileSync(path.join(dir,'tests/bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')",'htmlInput');
new Function('require','htmlInput','assert',harness+`
 const run=s=>vm.runInContext(s,context,{timeout:30000});
 const n=id=>nodes.get('#'+id);
 function visible(label){for(const id of ['battleChoice','battleClock','unitsToggle','reactionToggle','pause','soundToggle'])assert.equal(n(id).hidden,false,label+' keeps '+id);}
 visible('solo choose');
 assert.equal(n('battleClock').textContent,'');
 assert.equal(n('battleChoice').textContent,'予想：未選択');
 assert(!n('pause').disabled&&!n('reactionToggle').disabled&&!n('unitsToggle').disabled);
 run('selectSide(1)');assert.equal(n('battleChoice').textContent,'予想：右');
 run('startPrediction()');visible('solo fight');assert(!n('pause').disabled&&!n('unitsToggle').disabled&&!n('reactionToggle').disabled);
 run('elapsed=4.4;syncFormation();openPausePanel();syncReactions()');visible('solo pause');assert(n('reactionToggle').disabled);assert.equal(n('battleClock').textContent,'4.4秒 · 1×');
 run('closePausePanel();syncReactions()');assert(!n('reactionToggle').disabled);
 run("walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:round,outcome:'B',now:0});winner=1;state='result';update();syncPersonalResult(2000);syncReactions();");
 visible('solo result');assert.equal(n('battleChoice').textContent,'予想：右');assert.equal(n('battleClock').textContent,'4.4秒 · 1×');assert(!n('pause').disabled&&!n('reactionToggle').disabled&&!n('unitsToggle').disabled);
 for(const t of [4000,10000,600000])run('loop('+t+')');visible('solo result after delay');assert.equal(run('state'),'result');
 run('nextPrediction()');visible('next solo choose');assert.equal(n('battleChoice').textContent,'予想：未選択');assert.equal(n('battleClock').textContent,'');
 // Render-only multi fixtures use no SDK, transport, payment or score APIs.
 run("multiUser='you';multiAdapter={getProfile:id=>({name:id}),sendReaction:()=>true,getRoomId:()=> 'fixture'};multiSnapshot={sessionId:'stable-qa',roundId:2,phase:'predict',participants:['you','p2','p3','p4','p5','p6','p7','p8'],spectators:['watcher'],departedIds:[],confirmedSides:[],roundResults:[]};multiSession={getState:()=>multiSnapshot};selectedSide=null;state='choose';syncFlowControls();syncReactions();syncOwnBattleChoice();");
 visible('multi choose');assert.equal(n('participantRailWrap').hidden,false);
 run("selectedSide=0;multiSnapshot.confirmedSides=[{userId:'you',side:'A'}];syncOwnBattleChoice()");assert.equal(n('battleChoice').textContent,'予想：左');
 run("state='fight';multiSnapshot.phase='battle';multiPlayback=null;syncFlowControls();syncStableBattleClock()");assert.equal(n('battleClock').textContent,'再生待ち');run("state='result';syncStableBattleClock()");assert.equal(n('battleClock').textContent,'記録なし');
 run("state='fight';multiSnapshot.phase='battle';multiPlayback={};multiLastSceneTick=264;syncFlowControls();syncReactions();syncOwnBattleChoice()");visible('multi fight');assert.equal(n('participantRailWrap').hidden,false);assert(!n('pause').disabled&&!n('unitsToggle').disabled&&!n('reactionToggle').disabled);
 run("state='result';multiSnapshot.phase='result';multiSnapshot.roundResults=[{playerId:'you',side:'A'}];syncFlowControls();syncReactions();syncOwnBattleChoice()");visible('multi result');assert.equal(n('participantRailWrap').hidden,false);assert.equal(n('battleChoice').textContent,'予想：左');assert.equal(n('battleClock').textContent,'4.4秒 · 1×');assert(!n('pause').disabled&&!n('reactionToggle').disabled&&!n('unitsToggle').disabled);
 run("multiSnapshot.phase='predict';multiSnapshot.roundResults=[];multiSnapshot.confirmedSides=[];selectedSide=null;state='choose';syncFlowControls();syncReactions();syncOwnBattleChoice()");visible('next multi choose');assert.equal(n('participantRailWrap').hidden,false);assert.equal(n('battleChoice').textContent,'予想：未選択');
 run("state='fight';multiSnapshot.phase='battle';multiSnapshot.confirmedSides=[];multiUser='watcher';syncFlowControls();syncReactions();syncOwnBattleChoice()");visible('spectator');assert.equal(n('battleChoice').textContent,'予想：なし');
 console.log('PASS solo choose/fight/pause/result/delayed result/next; multi choose/fight/result/next; spectator; visible disabled controls and persistent participants');
 for(const id of ['#app','#gameScreen']){const node=nodes.get(id);node.attributes={};node.setAttribute=(k,v)=>{node.attributes[k]=String(v)};node.getAttribute=k=>node.attributes[k]??null;}
 run("showScreen('game');syncReactions()");assert.equal(nodes.get('#app').getAttribute('data-game-visible'),'true');assert.equal(nodes.get('#gameScreen').getAttribute('data-participants'),'true');
 run("multiSession=null;multiSnapshot=null;multiPlayback=null;showScreen('home');openSoloScreen();const stableFinalId='stable-final';walletState=SoloWallet.createSession({sessionId:stableFinalId,playerIds:[PLAYER],config:{initialBalance:100}});for(let n=1;n<=10;n++){walletState=SoloWallet.openRound(walletState,{sessionId:stableFinalId,roundId:n,deadline:100});walletState=SoloWallet.commitPrediction(walletState,{sessionId:stableFinalId,roundId:n,playerId:PLAYER,side:'A',stake:25,now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:stableFinalId,roundId:n,outcome:n===10?'A':'draw',now:0});}round=10;choice=0;winner=0;state='result';update();syncPersonalResult(4000);syncReactions();syncBattleLog(4000,true)");
 visible('solo tenth result');for(const id of ['battleLogResult','extensionChoices','cashOut','continueRun'])assert.equal(n(id).hidden,false,'solo tenth '+id);assert(!n('cashOut').disabled&&!n('continueRun').disabled);assert.equal(nodes.get('#gameScreen').getAttribute('data-participants'),'false');
 run("multiUser='you';multiSnapshot={sessionId:'stable-final-multi',roundId:10,totalRounds:10,phase:'result',winner:'A',participants:['you','p2'],spectators:[],departedIds:[],continueIds:[],cashedOutIds:[],wallets:[{playerId:'you',balance:125,cashedOut:false}],confirmedSides:[{userId:'you',side:'A'}],roundResults:[{playerId:'you',submitted:true,side:'A',stake:25,correct:true,delta:25,balanceBefore:100,balanceAfter:125}]};multiSession={getState:()=>multiSnapshot};multiPlayback={};multiReplay={ticks:264};round=10;syncFlowControls();syncExtensionControls();syncPersonalResult(4000);syncReactions();syncBattleLog(4000,true)");
 visible('multi tenth result');for(const id of ['battleLogResult','extensionChoices','cashOut','continueRun'])assert.equal(n(id).hidden,false,'multi tenth '+id);assert(!n('cashOut').disabled&&!n('continueRun').disabled);assert.equal(nodes.get('#gameScreen').getAttribute('data-participants'),'true');
 run("showScreen('home')");assert.equal(nodes.get('#app').getAttribute('data-game-visible'),'false');assert.equal(nodes.get('#gameScreen').getAttribute('data-participants'),'false');
 console.log('PASS explicit screen/participant attributes; tenth-round solo/multi choices and log entry remain exposed');

`)(require,html,assert);
assert.equal((html.match(/id="gameToolbar"/g)||[]).length,1);
assert(html.indexOf('id="gameToolbar"')<html.indexOf('<section id="comparison"'));
assert(html.indexOf('id="participantRailWrap"')<html.indexOf('<section id="comparison"'));
assert(!html.includes('Result controls already hide.'));
assert(html.includes('grid-template-columns:minmax(0,1fr) max-content 44px 44px 44px;'));
assert(html.includes('max(env(safe-area-inset-top, 0px), var(--gravity-top-inset, 0px))'));
assert(html.includes('font-size:26px;')&&html.includes('font-size:13px;')&&html.includes('font-weight:500;'));
console.log('PASS single persistent toolbar/rail outside variable content, readable header sizes and Gravity inset rules');

assert(html.includes('#app[data-game-visible="true"] > #multiStatusRow'));
assert(html.includes('max-height:min(68%,calc(100% - 126px));'));
assert(html.includes('#app #gameScreen[data-personal-result="true"][data-participants="true"] #resultPanel'));
assert(html.includes('max-height:min(68%,calc(100% - 170px));'));
assert(!html.includes('#app:has(#gameScreen:not([hidden])) > #multiStatusRow'));
assert(!html.includes(':has(> #participantRailWrap:not([hidden]))'));
assert(/#gameScreen\[data-personal-result="true"\] #resultPanel \{[^}]*min-height:0;[^}]*overflow-y:auto;/s.test(html));
let cases=0;
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]])for(const top of [74,98])for(const bottom of [0,34])for(const multi of [false,true]){
 const restored=html.slice(html.indexOf('/* reference-layout-restoration-20261107 */'));const baseReserve=Number(restored.match(/max-height:min\(68%,calc\(100% - (\d+)px\)\);/)[1]),upper=baseReserve-16+(multi?40+4:0),reserve=upper+16;
 assert.equal(reserve,baseReserve+(multi?44:0));
 const gameHeight=height-top-bottom-18-(multi?52:0),resultHeight=Math.min(gameHeight*.68,gameHeight-reserve);
 assert(gameHeight-8-resultHeight>=upper+8-.0001);assert(resultHeight>=44);cases++;
}
console.log('PASS '+cases+' static CSS box-model cases keep result below persistent upper UI; browser geometry is separately verified');
