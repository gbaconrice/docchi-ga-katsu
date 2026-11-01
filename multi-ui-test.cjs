const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),script=html.match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1],nodes={},scheduled=[];let now=100000,scriptLoads=0;
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const q=s=>nodes[s]??=((s==='canvas'||s==='#field')?{getContext:()=>ctx}:{hidden:false,disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v}});
const Clock=class extends Date{static now(){return now}};
const c={TextEncoder,TextDecoder,btoa,atob,Date:Clock,document:{querySelector:q,createElement(){scriptLoads++;return{}},head:{appendChild(){}}},Math,requestAnimationFrame:fn=>scheduled.push(fn)};vm.createContext(c);vm.runInContext(script,c);vm.runInContext("openSoloScreen()",c);
const run=s=>vm.runInContext(s,c);
assert.equal(scriptLoads,0);assert.equal(run('multiSession'),null);
run('beginMock()');assert.equal(run('multiSnapshot.phase'),'lobby');assert.equal(run('multiSnapshot.participants.length'),2);
run('openMultiRound()');assert.equal(run('multiSnapshot.phase'),'predict');assert(!q('#comparison').hidden);assert.equal(run('multiSnapshot.matchup.maxInitialUnits'),64);
run('selectSide(0);selectStake(25);startPrediction()');
now+=100;run('pumpMulti(Date.now())');assert.equal(run('multiSession.getLedger().completedRounds'),1);assert.equal(q('#balance').textContent,'100 G');
for(let i=0;i<1000&&run('multiSession.getState().phase')!=='result';i++){now+=100;run('pumpMulti(Date.now())')}
run('drainMock()');assert.equal(run('multiSession.getState().phase'),'result');assert.equal(run('mockGuest.getState().phase'),'result');
assert.deepEqual(JSON.parse(run('JSON.stringify(multiSession.getState().wallets)')),JSON.parse(run('JSON.stringify(mockGuest.getState().wallets)')));
assert.equal(run('JSON.stringify(multiSession.getReplay())'),run('JSON.stringify(mockGuest.getReplay())'));
assert.equal(run('multiSession.getLedger().completedRounds'),1);
assert.equal(scriptLoads,0);
run('nextPrediction()');assert.equal(run('multiSession.getState().roundId'),2);assert.equal(run('selectedSide'),null);assert.equal(run('selectedStake'),0);
// Deadline skips missing choices, no automatic stake.
now+=30001;run('pumpMulti(Date.now())');
for(let i=0;i<1000&&run('multiSession.getState().phase')!=='result';i++){now+=100;run('pumpMulti(Date.now())')}
assert.equal(run('multiSession.getLedger().completedRounds'),2);
assert.equal(run('multiSession.getLedger().ledger[1].entries[0].stake'),0);
assert.equal(run('multiSession.getLedger().ledger[1].entries[0].delta'),0);
console.log('PASS: zero startup SDK calls, local 2-client room/round, explicit predictions, canonical replay byte equality, host-only settlement wallet equality, deadline skip, round reset, no external room calls');
