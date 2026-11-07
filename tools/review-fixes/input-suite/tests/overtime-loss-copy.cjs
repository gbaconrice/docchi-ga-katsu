'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const candidate=path.resolve(process.env.GAME_HTML||'index.html');
const root=path.dirname(candidate);
process.chdir(root);
const oldText='全額BET：勝ち2倍／負け0／引分そのまま';
const newText='全額BET：勝ち2倍／負けその時点で終了／引分そのまま';
const html=fs.readFileSync(candidate,'utf8');
assert(!html.includes(oldText),'Old wording must be absent from the runnable source');
assert.equal(html.split(newText).length-1,1,'One shared renderer uses approved exact wording');
assert(html.includes("q('#stakeHint').textContent=round>10?'"+newText+"'"),'Round boundary unchanged');
if(process.env.OVERTIME_COPY_BASE_HTML){
 const base=fs.readFileSync(path.resolve(process.env.OVERTIME_COPY_BASE_HTML),'utf8');
 assert.equal(html.replace(newText,oldText),base,'Only the approved literal may change; preserve all game rules, CSS, DOM, terrain and score code');
}
let harness=fs.readFileSync(path.join(root,'tests/zero-result-ui.cjs'),'utf8').split("for(const id of ['#red'")[0];
harness=harness.replace("fs.readFileSync('index.html','utf8')",`fs.readFileSync(${JSON.stringify(candidate)},'utf8')`);
new Function('require','assert','oldText','newText',harness+`
const run=s=>vm.runInContext(s,context),q=id=>elem('#'+id);let checks=0;
const check=(name,f)=>{f();checks++;console.log('PASS',name)};
run(\`function overtimeCopySetup(mode,n){
 multiSession=null;multiSnapshot=null;multiAdapter=null;multiUser=null;multiPlayback=null;multiReplay=null;multiBusy=false;multiRecording=false;soloRunEnded=false;multiUnavailableRound=null;
 const id='copy-'+mode+'-'+n;walletState=SoloWallet.createSession({sessionId:id,playerIds:[PLAYER],config:{initialBalance:100}});
 round=n;state='choose';screenMode='game';selectedSide=null;selectedStakeOption=n>10?100:25;selectedStake=n>10?100:25;
 if(mode==='multi'){
  multiUser='copy-host';multiSnapshot={sessionId:id,mode:'GRAVITY_DOUBLEUP_V1',phase:'predict',roundId:n,totalRounds:Math.max(10,n),participants:[multiUser,'copy-guest'],spectators:[],continueIds:[],cashedOutIds:[],departedIds:[],readyIds:[],confirmedSides:[],roundResults:[],deadline:10000,wallets:[{playerId:multiUser,balance:100,score:0,correctCount:0,cashedOut:false},{playerId:'copy-guest',balance:100,score:0,correctCount:0,cashedOut:false}]};
  multiSession={getState:()=>multiSnapshot,getPlaybackClock:()=>({known:true,ready:true,estimatedHostNow:1000,status:'playing'}),getReplay:()=>null};
 }
 update();
}\`);
for(const mode of ['solo','multi']){
 for(const n of [1,10,11,12,99])check(mode+' round '+n+' exact copy and all-in option',()=>{
  run('overtimeCopySetup('+JSON.stringify(mode)+','+n+')');
  const t=q('stakeHint').textContent;assert(!t.includes(oldText));
  if(n>10){assert.equal(t,newText);assert(!q('stake100').hidden);assert.equal(q('stake100').textContent,'全額 · 100 G');for(const option of [0,10,25,50,75,90])assert(q('stake'+option).hidden);assert.equal(run('selectedStake'),100);}
  else {assert.equal(t,'的中 +25 G · 外れ −25 G · 引分 ±0 G');assert(!t.includes('全額BET'));}
 });
 check(mode+' ordinary round clears overtime copy after repeat update',()=>{run('overtimeCopySetup('+JSON.stringify(mode)+',11);update();overtimeCopySetup('+JSON.stringify(mode)+',1);update()');assert.equal(q('stakeHint').textContent,'的中 +25 G · 外れ −25 G · 引分 ±0 G')});
}
// Both actual wallet engines, independent of the UI stubs.
for(const engine of ['SoloWallet','Wallet'])for(const outcome of ['A','B','draw'])check(engine+' round 11 '+outcome+' settlement unchanged',()=>{
 const actual=run(\`(()=>{const W=\${engine},sessionId='copy-rule',playerId='p';let ledger=W.createSession({sessionId,playerIds:[playerId],config:{initialBalance:100}});for(let n=1;n<=10;n++){ledger=W.openRound(ledger,{sessionId,roundId:n,deadline:100});ledger=W.commitPrediction(ledger,{sessionId,roundId:n,playerId,side:'A',stake:25,now:0});ledger=W.settleRound(ledger,{sessionId,roundId:n,outcome:'draw',now:0});}ledger=W.continueDoubleUp(ledger,{sessionId,roundId:10,requestId:'copy-continue'});ledger=W.openRound(ledger,{sessionId,roundId:11,deadline:100});ledger=W.commitPrediction(ledger,{sessionId,roundId:11,playerId,side:'A',stake:100,now:0});ledger=W.settleRound(ledger,{sessionId,roundId:11,outcome:'\${outcome}',now:0});const own=W.walletView(ledger,playerId);let continueAllowed=true;try{W.continueDoubleUp(ledger,{sessionId,roundId:11,requestId:'copy-again'});}catch(e){continueAllowed=false;}return {balance:own.balance,terminalReason:own.terminalReason,continueAllowed};})()\`);
 assert.equal(actual.balance,outcome==='A'?200:outcome==='B'?0:100);assert.equal(actual.continueAllowed,outcome!=='B');if(engine==='Wallet'&&outcome==='B')assert.equal(actual.terminalReason,'bankrupt');
});
console.log(JSON.stringify({dedicatedChecks:checks,passed:checks,scope:'VM UI and actual wallet engines; no live SDK/network'}));
`)(require,assert,oldText,newText);
console.log('PASS exact copy-only preservation, unchanged terrain and all CSS/DOM');
