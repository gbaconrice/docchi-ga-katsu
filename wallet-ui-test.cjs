const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),script=html.match(/<script>([\s\S]*)<\/script>/)[1],nodes={};
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const q=s=>nodes[s]??=(s==='canvas'?{getContext:()=>ctx}:{hidden:false,disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v}});
const c={TextEncoder,TextDecoder,btoa,atob,document:{querySelector:q},Math,requestAnimationFrame:()=>{}};vm.createContext(c);vm.runInContext(script,c);
function run(s){return vm.runInContext(s,c)}
assert(q('#confirm').disabled);assert(q('#battle').hidden);assert(!q('#comparison').hidden);
run('startPrediction()');assert.equal(run('state'),'choose');assert.equal(run('walletState.currentRound.commits.length'),0);
run('selectSide(0);selectStake(25);startPrediction();startPrediction()');
assert.equal(run('walletState.currentRound.commits.length'),1);assert.equal(run('currentWallet().reserved'),25);assert(q('#comparison').hidden);assert(!q('#battle').hidden);
run("while(state==='fight')step(1/60)");
assert(!q('#resultPanel').hidden);assert(q('#battle').hidden);assert.equal(run('walletState.completedRounds'),1);
const after=run('currentWallet().balance');run('step(0)');assert.equal(run('currentWallet().balance'),after);
run('nextPrediction()');assert.equal(run('round'),2);assert.equal(run('selectedStake'),0);assert.equal(run('selectedSide'),null);
run('selectSide(1);selectStake(50);startPrediction(true)');assert.equal(run('walletState.currentRound.commits[0].stake'),0);assert.equal(run('walletState.currentRound.commits[0].side'),null);
run("while(state==='fight')step(1/60)");assert.equal(run('currentWallet().balance'),after);
// Finish all twenty by watching. Deliberately many old mistakes must not end session.
run("mistakes=99;while(round<20){nextPrediction();startPrediction(true);while(state==='fight')step(1/60)}");
assert.equal(run('round'),20);assert.equal(run('walletState.completedRounds'),20);assert.equal(q('#next').textContent,'新しく20戦を始める');
const session=run('walletState.sessionId');run('nextPrediction()');assert.notEqual(run('walletState.sessionId'),session);assert.equal(run('currentWallet().balance'),100);
// Deterministic ledger-driven zero-balance setup without mutating frozen ledger.
run(`walletState=Wallet.createSession({sessionId:'zero',playerIds:[PLAYER]});round=1;openPrediction(1);
for(let i=0;i<2;i++){selectSide(0);selectStake(50);startPrediction();walletState=Wallet.settleRound(walletState,{sessionId:'zero',roundId:round,outcome:'B',now:0});state='result';nextPrediction()}
update();`);
assert.equal(run('currentWallet().balance'),0);assert(q('#stake10').disabled);assert(!q('#stake0').disabled);
run('selectStake(50)');assert.equal(run('selectedStake'),0);
run("selectSide(0);startPrediction();walletState=Wallet.settleRound(walletState,{sessionId:'zero',roundId:round,outcome:'A',now:0});state='result';update()");
assert.equal(run('currentWallet().balance'),10);assert.equal(run('currentWallet().score'),-90);
assert(!/残機|3回外れ/.test(html.slice(0,html.indexOf('<script>'))));
assert.equal((html.match(/data:image\/png;base64,/g)||[]).length,4);
assert(!/(?:src|href)=["']https?:\/\//.test(html.slice(0,html.indexOf('<script>'))));
console.log('PASS: explicit side+stake, no implicit wager, duplicate lock, reserve, settlement once, skip, 20-round continuation, new-session reset, zero-balance recovery, signed score, phase DOM, standalone assets');
