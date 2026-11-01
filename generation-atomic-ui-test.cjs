const fs=require('fs'),vm=require('vm'),assert=require('assert');const h=fs.readFileSync(process.argv[2]||'index.html','utf8');const nodes={};for(const m of h.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)){const id=m[2].match(/id="([^"]+)"/);if(id)nodes['#'+id[1]]={hidden:/\bhidden\b/.test(m[2]),disabled:/\bdisabled\b/.test(m[2]),setAttribute(){}}}let raf=[],images=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(const id of ['#field','#armyPreviewRed','#armyPreviewBlue'])nodes[id].getContext=()=>ctx;const c={console,TextEncoder,TextDecoder,btoa,atob,URLSearchParams,location:{search:''},document:{getElementById:id=>nodes['#'+id]||null,querySelector:s=>s==='canvas'?nodes['#field']:nodes[s]||null},requestAnimationFrame:f=>raf.push(f),Image:class{constructor(){this.complete=true;this.naturalWidth=1000;images.push(this)}}};c.window=c;const listeners={};c.addEventListener=(type,fn)=>{listeners[type]=fn};if(process.env.NO_ENCODER)c.TextEncoder=undefined;vm.createContext(c);for(const [i,m] of [...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){new vm.Script(m[1],{filename:'inline-'+i}).runInContext(c)};if(nodes['#bootStatus']&&!nodes['#bootStatus'].hidden)throw Error('boot monitor not cleared');
const run=s=>vm.runInContext(s,c);let now=0;
function frame(n=1){for(let i=0;i<n;i++){now+=100;const q=raf;raf=[];for(const f of q)f(now)}}
function click(id){assert(nodes[id],id);assert(!nodes[id].disabled,id+' disabled');assert.equal(typeof nodes[id].onclick,'function',id+' missing handler');nodes[id].onclick()}




click('#soloStart');
run("const actualGenerate=prepareOpening;prepareOpening=()=>{throw Error('no-feasible-opening')};");
const snapshot=()=>run('JSON.stringify({round,walletState,state,seed,units,initialUnits,initialKinds,pendingCarryKinds,carryStreak,selectedSide,selectedStake,elapsed,cameraZoom,cameraX,cameraY})');
let before=snapshot();assert.throws(()=>run('openPrediction(123)'),/no-feasible-opening/);assert.equal(snapshot(),before);
run("state='result';winner=0");before=snapshot();assert.throws(()=>run('nextPrediction()'),/no-feasible-opening/);assert.equal(snapshot(),before);
run('prepareOpening=actualGenerate');
console.log('PASS generation admission failure leaves wallet/round/carry/world/draft/camera unchanged');

run("pendingSummons=[{token:'prior-round-child'}];combatEvents=[{type:'stale'}];setup(42)");assert.equal(run('pendingSummons.length'),0);assert.equal(run('combatEvents.length'),0);console.log('PASS successful new opening clears queued prior-round children and event buffers');
run(`freshWallet();for(let r=1;r<=10;r++){walletState=SoloWallet.openRound(walletState,{sessionId:walletState.sessionId,roundId:r,deadline:Number.MAX_SAFE_INTEGER});walletState=SoloWallet.commitPrediction(walletState,{sessionId:walletState.sessionId,roundId:r,playerId:PLAYER,side:'A',stake:0,now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:r,outcome:'A',now:0});}round=10;state='result';winner=0;prepareOpening=()=>{throw Error('no-feasible-opening')};`);
before=snapshot();assert.throws(()=>run('extendSoloRun(5)'),/no-feasible-opening/);assert.equal(snapshot(),before);assert.equal(run('walletState.maxRounds'),10);run('prepareOpening=actualGenerate');console.log('PASS extension admission failure rolls back added rounds and ledger with existing carry unchanged');
run('beginMock();prepareOpening=()=>{throw Error("no-feasible-opening")};');
const multiSnapshotBefore=run('JSON.stringify({ledger:multiSession.getLedger(),protocol:multiSession.getState(),round,carryStreak,pendingCarryKinds,units,initialUnits,openingPlan,leftArmyCount,cameraFitBounds})');
assert.throws(()=>run('openMultiRound()'),/no-feasible-opening/);
assert.equal(run('JSON.stringify({ledger:multiSession.getLedger(),protocol:multiSession.getState(),round,carryStreak,pendingCarryKinds,units,initialUnits,openingPlan,leftArmyCount,cameraFitBounds})'),multiSnapshotBefore);
run('prepareOpening=actualGenerate');console.log('PASS host generation refusal restores protocol/ledger and opening metadata');
