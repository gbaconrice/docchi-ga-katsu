'use strict';
// GAME_HTML, ENGINE_HARNESS, BASELINE_HTML and REPORT_DIR make this test portable.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const game=path.resolve(process.env.GAME_HTML||path.join(__dirname,'../source/index.html'));
const baseline=path.resolve(process.env.BASELINE_HTML||path.join(root,'game-ui-inspect/home-audio-fix/source/index.html'));
const harness=path.resolve(process.env.ENGINE_HARNESS||path.join(root,'game-ui-inspect/test-suite/tests/harness.cjs'));
const reportDir=path.resolve(process.env.REPORT_DIR||path.join(__dirname,'../validation/zero-bet-text'));
fs.mkdirSync(reportDir,{recursive:true});
function load(file){process.env.GAME_HTML=file;delete require.cache[require.resolve(harness)];return require(harness);}
const before=load(baseline),after=load(game),checks=[],rows=[];
const plain=x=>JSON.parse(JSON.stringify(x));
function check(name,fn){fn();checks.push(name);console.log('PASS '+name);}
function readUI(h){return plain(h.ev(`(()=>{const q=s=>document.querySelector(s);return {hint:q('#stakeHint').textContent,balance:q('#balance').textContent,selectedStake,selectedStakeOption,confirmDisabled:q('#confirm').disabled,options:[0,10,25,50,75,90,100].map(n=>({option:n,text:q('#stake'+n).textContent,hidden:q('#stake'+n).hidden,disabled:q('#stake'+n).disabled}))};})()`));}
function solo(h,balance,roundId=1){
 h.ev(`multiSession=null;multiSnapshot=null;mockGuest=null;round=1;freshWallet();walletState=SoloWallet.createSession({sessionId:'zero-copy',playerIds:[PLAYER],config:{initialBalance:${balance}}});
 for(let n=1;n<${roundId};n++){walletState=SoloWallet.openRound(walletState,{sessionId:'zero-copy',roundId:n,deadline:100});walletState=SoloWallet.commitPrediction(walletState,{sessionId:'zero-copy',roundId:n,playerId:PLAYER,side:'A',stake:MoneyUI.defaultStake(currentWallet().balance,n),now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:'zero-copy',roundId:n,outcome:'draw',now:0});if(n===10)walletState=SoloWallet.continueDoubleUp(walletState,{sessionId:'zero-copy',roundId:10,requestId:'continue'});}
 round=${roundId};walletState=SoloWallet.openRound(walletState,{sessionId:'zero-copy',roundId:round,deadline:100});state='choose';screenMode='game';selectedSide=null;selectedStakeOption=${balance===0?0:roundId>10?100:25};selectedStake=MoneyUI.defaultStake(currentWallet().balance,round);update();`);
 return readUI(h);
}
function localMulti(h,zeroPlayer,viewer){
 h.ev(`multiSession=null;multiSnapshot=null;mockGuest=null;round=1;freshWallet();`);
 h.ev(`(()=>{
 const queue=[],now=()=>1000,options={roomId:'zero-copy-room',sessionId:'zero-copy-multi',hostId:'host',members:['host','guest'],now};let host,guest;
 host=MultiBinding.createWalletSession({...options,userId:'host',walletConfig:{initialBalance:${zeroPlayer==='all'?0:100}},send:wire=>queue.push([guest,'host',wire])});
 guest=MultiProtocol.createSession({...options,userId:'guest',send:wire=>queue.push([host,'guest',wire])});
 const flush=()=>{let n=0;while(queue.length&&n++<10000){const [target,sender,wire]=queue.shift();target.receive(sender,wire);}if(queue.length)throw Error('undrained queue');};
 guest.hello();host.hello();flush();
 const zeroPlayer=${JSON.stringify(zeroPlayer)};
 if(zeroPlayer==='host'||zeroPlayer==='guest')for(let n=1;n<=2;n++){
  host.openRound({roundId:n,durationMs:10000,matchup:{units:[]}});flush();
  for(const [id,session] of [['host',host],['guest',guest]]){if(!session.predict(id===zeroPlayer?'A':'B',id===zeroPlayer?50:n===1?25:31))throw Error('rejected fixture prediction');}
  flush();host.startBattle({engineVersion:'test',ticks:1,winner:'B',events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();flush();
 }
 host.openRound({roundId:zeroPlayer==='host'||zeroPlayer==='guest'?3:1,durationMs:10000,matchup:{units:[]}});flush();
 multiUser=${JSON.stringify(viewer)};multiHost=multiUser==='host';multiSession=multiHost?host:guest;multiSnapshot=multiSession.getState();multiShownWallets=multiSnapshot.wallets;multiRecording=false;multiPredictionPending=false;multiAdapter=null;screenMode='game';round=multiSnapshot.roundId;state='choose';resetMultiRound();update();
 globalThis.zeroCopyPeers={host,guest,flush};
 })()`);
 return readUI(h);
}
function compare(name,fn,zero){
 const old=fn(before),current=fn(after);rows.push({case:name,before:old.hint,after:current.hint,options:current.options});
 if(zero){assert.equal(old.hint,'0 G · 的中 +10 G · 外れ・引分 ±0 G');assert.equal(current.hint,'的中 +10 G · 外れ・引分 ±0 G');assert.equal(current.options.find(x=>x.option===0).text,'0 G');assert.equal(current.options.filter(x=>!x.hidden).length,1);assert.equal(current.options[0].disabled,false);assert.equal(current.selectedStake,0);}
 else assert.equal(current.hint,old.hint);
 assert.deepEqual({...current,hint:old.hint},old,'No other UI or option changes: '+name);
 assert(current.confirmDisabled,'Selecting a side remains mandatory: '+name);
}
check('only the zero-stake hint prefix changes in the shared UI renderer',()=>{
 const section=s=>s.slice(s.indexOf('update=function(){\n  if(!walletState)return;'),s.indexOf('let selectionPreviewTimer=null;'));
 const a=section(fs.readFileSync(baseline,'utf8')),b=section(fs.readFileSync(game,'utf8'));
 assert(a.length&&b.length);assert.equal(b,a.replace("?'0 G · 的中 +10 G · 外れ・引分 ±0 G'","?'的中 +10 G · 外れ・引分 ±0 G'"));
});
check('all wallet, stake validation and multiplayer protocol code is byte-identical',()=>{
 const a=fs.readFileSync(baseline,'utf8'),b=fs.readFileSync(game,'utf8');
 for(const [start,last] of [['const Money=','const SoloWallet='],['const MultiProtocol=','const MultiBinding=']]){const section=s=>s.slice(s.indexOf(start),s.indexOf('})();',s.indexOf(last))+5);assert(section(a).length>100);assert.equal(section(b),section(a));}
});
check('solo zero at rounds 1, 3 and 10 retains only its necessary zero option',()=>{
 for(const n of [1,3,10])compare('solo-zero-round-'+n,h=>solo(h,0,n),true);
});
check('normal, small and double-up BET hints remain unchanged',()=>{
 for(const n of [1,3,100,1000])compare('solo-balance-'+n,h=>solo(h,n),false);
 compare('solo-double-up',h=>solo(h,100,11),false);
 assert.equal(rows.at(-1).after,'全額BET：勝ち2倍／負けその時点で終了／引分そのまま');
});
check('local multiplayer all-zero, zero host, zero guest and nonzero peer use the correct hint',()=>{
 for(const viewer of ['host','guest'])compare('multi-all-zero-'+viewer,h=>localMulti(h,'all',viewer),true);
 for(const zeroPlayer of ['host','guest'])for(const viewer of ['host','guest'])compare('multi-zero-'+zeroPlayer+'-view-'+viewer,h=>localMulti(h,zeroPlayer,viewer),zeroPlayer===viewer);
 compare('multi-normal-host',h=>localMulti(h,null,'host'),false);
});
check('solo side selection and zero-stake submission survive repeated updates',()=>{
 solo(after,0,3);
 for(let n=0;n<3;n++){after.ev('update()');assert.equal(readUI(after).hint,'的中 +10 G · 外れ・引分 ±0 G');}
 after.ev('selectSide(0)');assert.equal(readUI(after).confirmDisabled,false);
 after.ev('startPrediction()');assert.equal(after.ev('walletState.currentRound.commits[0].stake'),0);assert.equal(after.ev('state'),'fight');
 after.ev('startPrediction()');assert.equal(after.ev('walletState.currentRound.commits.length'),1);
});
check('zero host and guest can submit, lock, settle and recover independently',()=>{
 for(const id of ['host','guest']){
  localMulti(after,id,id);after.ev(`selectSide(1);startPrediction();zeroCopyPeers.flush();`);
  const submitted=plain(after.ev('zeroCopyPeers.host.getLedger().currentRound.commits'));
  assert.equal(submitted.length,1);assert.equal(submitted[0].playerId,id);assert.equal(submitted[0].stake,0);
  after.ev(`(()=>{const peer=zeroCopyPeers.${id==='host'?'guest':'host'};if(!peer.predict('B',39))throw Error('peer prediction failed');zeroCopyPeers.flush();const host=zeroCopyPeers.host;host.startBattle({engineVersion:'test',ticks:1,winner:'B',events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();zeroCopyPeers.flush();multiSnapshot=multiSession.getState();update();})()`);
  assert.equal(after.ev(`zeroCopyPeers.host.getState().wallets.find(x=>x.playerId===${JSON.stringify(id)}).balance`),10);
  assert.equal(after.ev(`zeroCopyPeers.host.getState().wallets.find(x=>x.playerId!==${JSON.stringify(id)}).balance`),195);
 }
});
check('all-zero multiplayer preserves win, miss and draw payouts for both seats',()=>{
 for(const outcome of ['A','B','draw']){
  localMulti(after,'all','host');
  after.ev(`(()=>{const {host,guest,flush}=zeroCopyPeers;if(!host.predict('A',0)||!guest.predict('B',0))throw Error('zero prediction rejected');flush();host.startBattle({engineVersion:'test',ticks:1,winner:${JSON.stringify(outcome)},events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();flush();})()`);
  const wallets=plain(after.ev('zeroCopyPeers.host.getState().wallets'));
  assert.equal(wallets.find(x=>x.playerId==='host').balance,outcome==='A'?10:0);
  assert.equal(wallets.find(x=>x.playerId==='guest').balance,outcome==='B'?10:0);
  assert(wallets.every(x=>x.terminalReason===null));
  assert.deepEqual(wallets,plain(after.ev('zeroCopyPeers.guest.getState().wallets')));
 }
});
check('zero win/loss/draw recovery and round-10 bankruptcy boundary remain unchanged',()=>{
 const scenarios=h=>plain(h.ev(`(()=>{
 const rows=[];
 for(const n of [1,3,10])for(const outcome of ['A','B','draw']){
  let w=SoloWallet.createSession({sessionId:'boundary',playerIds:['p'],config:{initialBalance:0}});
  for(let r=1;r<=n;r++){w=SoloWallet.openRound(w,{sessionId:'boundary',roundId:r,deadline:100});w=SoloWallet.commitPrediction(w,{sessionId:'boundary',roundId:r,playerId:'p',side:'A',stake:0,now:0});w=SoloWallet.settleRound(w,{sessionId:'boundary',roundId:r,outcome:r===n?outcome:'draw',now:0});}
  rows.push({round:n,outcome,balance:SoloWallet.walletView(w,'p').balance,bankrupt:SoloWallet.isBankrupt(w),canFinish:SoloWallet.canFinishRun(w)});
 }return rows;})()`));
 const old=scenarios(before),current=scenarios(after);assert.deepEqual(current,old);
 for(const row of current){assert.equal(row.balance,row.outcome==='A'?10:0);assert.equal(row.bankrupt,row.round===10&&row.outcome!=='A');assert.equal(row.canFinish,row.round===10&&row.outcome!=='A');}
});
const report={result:'PASS',source:game,sha256:after.sha,baseline,baselineSha256:before.sha,checks,rows};
fs.writeFileSync(path.join(reportDir,'zero-bet-text.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:report.result,passed:checks.length,beforeAfterCases:rows.length,sha256:after.sha},null,2));
