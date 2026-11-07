'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {sourcePath,testRoot}=require('./resolve-inputs.cjs').resolveInputs(process.argv[2]);
const source=fs.readFileSync(sourcePath,'utf8');
const harness=fs.readFileSync(path.join(testRoot,'bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')",'htmlInput');
new Function('require','htmlInput','assert',harness+`
sandbox.TextEncoder=TextEncoder;
const run=s=>vm.runInContext(s,context,{timeout:30000}),n=id=>nodes.get('#'+id),click=id=>n(id).onclick({isTrusted:true,preventDefault(){},stopPropagation(){}});
for(const id of ['unitsPanel','pausePanel','reaction-bar']){assert(new RegExp('<[^>]+id="'+id+'"[^>]* hidden').test(htmlInput),id+' markup initially hidden');doc.querySelector('#'+id).hidden=true;}
const allClosed=()=>{assert.equal(run('unitsOpen||pausePanelOpen||reactionOpen||battleLogOpen'),false);for(const id of ['unitsPanel','pausePanel','reaction-bar'])assert(n(id).hidden,id+' closed');};
const opened={pause:'pausePanelOpen',unitsToggle:'unitsOpen',reactionToggle:'reactionOpen'};
function repeatChoose(){for(const id of Object.keys(opened)){click(id);assert(run(opened[id]),id+' opens in choose');assert.equal(run('paused'),false);run('syncFlowControls();syncReactions();syncFlowControls();syncReactions()');assert(run(opened[id]),id+' survives repeated same-prediction refresh');run('closeOtherGamePanels(null);syncReactions()');allClosed();}}
let solo=0;
for(const id of Object.keys(opened)){
 run("selectSide(0);startPrediction();walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:round,outcome:'A',now:0});winner=0;state='result';update();syncReactions()");
 click(id);assert(run(opened[id]));const oldRound=run('round');run('nextPrediction();syncReactions()');assert.equal(run('round'),oldRound+1);assert.equal(run('state'),'choose');allClosed();repeatChoose();solo++;
}
let multi=0;
for(const id of Object.keys(opened)){
 run("multiUser='you';multiSnapshot={sessionId:'next-prediction-qa',roundId:2,totalRounds:10,phase:'result',deadline:123456,nextRoundAt:130000,winner:'A',participants:['you','peer'],spectators:[],departedIds:[],readyIds:[],confirmedSides:[],continueIds:[],cashedOutIds:[],roundResults:[],wallets:[{playerId:'you',balance:125,score:25,maxStake:125,correctCount:1,cashedOut:false},{playerId:'peer',balance:100,score:0,maxStake:100,correctCount:0,cashedOut:false}]};multiSession={getState:()=>multiSnapshot,getPlaybackClock:()=>({known:true,estimatedHostNow:2000,ready:false})};multiAdapter={getRoomId:()=> 'qa-room',sendReaction:()=>true,getProfile:()=>null};multiPlayback=null;multiBusy=false;multiRecording=false;displayMultiState();syncReactions()");
 click(id);assert(run(opened[id]),'multi result '+id);run("multiSnapshot.phase='predict';multiSnapshot.roundId=3;displayMultiState();syncReactions()");assert.equal(run('state'),'choose');allClosed();const snapshot=run('JSON.stringify(multiSnapshot)');repeatChoose();assert.equal(run('JSON.stringify(multiSnapshot)'),snapshot);
 // A new round received while already in choose is also a new entry.
 click(id);assert(run(opened[id]));run('multiSnapshot.roundId=4;displayMultiState();syncReactions()');allClosed();repeatChoose();multi++;
}
console.log('PASS '+solo+' actual solo nextPrediction paths; '+multi+' actual multiplayer displayMultiState paths; same-phase new round reset; every menu/info/emote can reopen and survives repeated choose refresh; deadline, phase and wallets unchanged by controls.');
`)(require,source,assert);
