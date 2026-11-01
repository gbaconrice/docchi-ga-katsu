const fs=require('fs'),vm=require('vm'),assert=require('assert');const h=fs.readFileSync(process.argv[2]||'index.html','utf8');const nodes={};for(const m of h.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)){const id=m[2].match(/id="([^"]+)"/);if(id)nodes['#'+id[1]]={hidden:/\bhidden\b/.test(m[2]),disabled:/\bdisabled\b/.test(m[2]),setAttribute(){}}}let raf=[],images=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(const id of ['#field','#armyPreviewRed','#armyPreviewBlue'])nodes[id].getContext=()=>ctx;const c={console,TextEncoder,TextDecoder,btoa,atob,URLSearchParams,location:{search:''},document:{getElementById:id=>nodes['#'+id]||null,querySelector:s=>s==='canvas'?nodes['#field']:nodes[s]||null},requestAnimationFrame:f=>raf.push(f),Image:class{constructor(){this.complete=true;this.naturalWidth=1000;images.push(this)}}};c.window=c;const listeners={};c.addEventListener=(type,fn)=>{listeners[type]=fn};if(process.env.NO_ENCODER)c.TextEncoder=undefined;vm.createContext(c);for(const [i,m] of [...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){new vm.Script(m[1],{filename:'inline-'+i}).runInContext(c)};if(nodes['#bootStatus']&&!nodes['#bootStatus'].hidden)throw Error('boot monitor not cleared');
const run=s=>vm.runInContext(s,c);let now=0;
function frame(n=1){for(let i=0;i<n;i++){now+=100;const q=raf;raf=[];for(const f of q)f(now)}}
function click(id){assert(nodes[id],id);assert(!nodes[id].disabled,id+' disabled');assert.equal(typeof nodes[id].onclick,'function',id+' missing handler');nodes[id].onclick()}


click('#soloStart');
const rows=[];
for(let r=1;r<=10;r++){
 const original=run('JSON.parse(JSON.stringify(initialUnits))');const composition=side=>original.filter(u=>u.side===side).map(u=>u.k);
 click(r%2?'#red':'#blue');click('#confirm');while(run('state')==='fight')frame();
 const winner=run('winner'),score=run('walletState.ledger[round-1]');assert.equal(score.outcome,winner===null?'draw':winner===0?'A':'B');
 rows.push(run('({round,winner,cost:[0,1].map(side=>initialUnits.filter(u=>u.side===side).reduce((n,u)=>n+COST[u.k],0)),counts:[0,1].map(side=>initialUnits.filter(u=>u.side===side).length),kinds:[0,1].map(side=>new Set(initialUnits.filter(u=>u.side===side).map(u=>u.k)).size),budgets:JSON.parse(JSON.stringify(budgets)),carryStreak})'));
 if(r===10)break;
 run('nextPrediction()');assert.equal(run('round'),r+1);
 if(winner!==null){const left=run('initialUnits.filter(u=>u.side===0).map(u=>u.k)');assert.deepEqual(Array.from(left),composition(winner));}
 assert(run('initialUnits.every(u=>u.hp===TYPES[u.k].hp&&!u.dead&&!u.parentToken&&!u.ownerToken&&!u.summonCount&&!u.splitDone&&!u.burrowStage)'));
 assert(run('new Set(initialUnits.map(u=>u.token)).size===initialUnits.length'));
 assert(run('initialUnits.every(u=>u.k!=="slimelet")'));
 if(r+1>=4)assert.equal(run('new Set(initialUnits.filter(u=>u.side===1).map(u=>u.k)).size'),r+1<7?2:3);
}
assert.equal(run('walletState.completedRounds'),10);frame(100);assert.equal(run('round'),10);assert.equal(run('state'),'result');assert.equal(run('walletState.mode'),'GRAVITY_QUICK10_V1');assert.throws(()=>run('Wallet.openRound(walletState,{sessionId:walletState.sessionId,roundId:11,deadline:999})'));

run('nextPrediction()');assert.equal(run('carryStreak'),0);assert.equal(run('pendingCarryKinds'),null);assert.equal(run('round'),1);
fs.writeFileSync('v10-carry-probe.json',JSON.stringify(rows,null,2));
console.log('PASS 10 real rounds: actual winner starting roster carries left fresh, wallet original sides settled, 2/3-kind challengers, token uniqueness, reset; probe saved');
