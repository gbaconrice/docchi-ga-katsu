// Independent read-only source/runtime audit. Writes only its result JSON.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks'),crypto=require('crypto');
const root=__dirname,html=fs.readFileSync(root+'/index.html','utf8'),source=fs.readFileSync(root+'/source/solo-v3.template','utf8');
const script=html.match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1];
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),nodes={};const q=s=>nodes[s]??=((s==='canvas'||s==='#field')?{getContext:()=>ctx}:{setAttribute(){},value:'',hidden:false,disabled:false});
let randomSeed=1;const math=Object.create(Math);math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296};
const c={TextEncoder,TextDecoder,btoa,atob,Math:math,document:{querySelector:q},requestAnimationFrame:()=>{}};vm.createContext(c);vm.runInContext(script,c);const run=s=>vm.runInContext(s,c);
run(`update=()=>{};draw=()=>{};
function auditSetup(roundNo,s,carry,streak){round=roundNo;carryStreak=streak;pendingCarryKinds=carry&&[...carry];setup(s);return auditFormation();}
function auditFormation(){return {round,carryStreak,budgets:JSON.parse(JSON.stringify(budgets)),leftArmyCost,units:JSON.parse(JSON.stringify(initialUnits)),types:JSON.parse(JSON.stringify(TYPES)),costs:{...COST}};}
function auditBattle(){selectSide(round%2);selectStake(0);startPrediction();let ticks=0,peak=[0,0],maxRecords=[0,0];while(state==='fight'&&ticks<3602){step(1/60);ticks++;for(let side=0;side<2;side++){const live=units.filter(u=>u.side===side&&!u.dead).length+pendingSummons.filter(u=>u.side===side).length;peak[side]=Math.max(peak[side],live);maxRecords[side]=Math.max(maxRecords[side],units.filter(u=>u.side===side).length+pendingSummons.filter(u=>u.side===side).length);}}return {winner,ticks,elapsed,state,peak,maxRecords,completed:walletState.completedRounds,balance:currentWallet().balance,correctCount:currentWallet().correctCount,spawned:units.some(u=>u.ownerToken)};}
`);
function plain(v){return JSON.parse(JSON.stringify(v))}
function inspect(f){const {round,units,types,costs}=f;const teams=[0,1].map(side=>units.filter(u=>u.side===side)),cap=round===1?8:round<=5?12:round<=11?16:round<=16?24:32;for(const a of teams){assert(a.length>0&&a.length<=cap);assert(a.every(u=>u.hp===types[u.k].hp&&!u.dead&&!u.ownerToken&&!u.splitDone&&!u.burrowStage&&u.k!=='slimelet'));}assert.equal(new Set(units.map(u=>u.token)).size,units.length);for(let side=0;side<2;side++)assert.equal(teams[side].reduce((n,u)=>n+costs[u.k],0),f.budgets[side].spent);
 if(round>1){const target=Math.min(160,Math.max(12+2*(round-1),Math.ceil(f.leftArmyCost*(1.04+Math.min(f.carryStreak,4)*.02))+2));assert.equal(f.budgets[1].planned,target);}
 if(round>=6)assert.equal(new Set(teams[1].map(u=>u.k)).size,round<=11?2:3);
 const anti=side=>teams[side].some(u=>types[u.k].attackTargetMask.includes('air'));if(teams[0].some(u=>u.k==='drake'))assert(anti(1));if(teams[1].some(u=>u.k==='drake'))assert(anti(0));
 let overlaps=0,maxPenetration=0;for(const a of teams[0])for(const b of teams[1])if(types[a.k].collisionLayer===types[b.k].collisionLayer){const penetration=types[a.k].radius+types[b.k].radius-Math.hypot(a.x-b.x,a.y-b.y);if(penetration>0){overlaps++;maxPenetration=Math.max(maxPenetration,penetration);}}
 const right=teams[1],remaining=f.budgets[1].planned-f.budgets[1].spent,minCost=Math.min(...right.map(u=>costs[u.k]));return {cap,left:teams[0].map(u=>u.k),right:right.map(u=>u.k),planned:f.budgets[1].planned,spent:f.budgets[1].spent,leftCost:f.leftArmyCost,remaining,minCost,capLimited:remaining>=minCost&&right.length===cap,overlaps,maxPenetration};}
if(process.env.FREQUENCY_ONLY){
 const evidence=JSON.parse(fs.readFileSync(root+'/v9-generator-audit-results.json','utf8')),roles=plain(run('keys')),counts=Object.fromEntries(roles.map(k=>[k,{leftArmies:0,rightArmies:0,leftUnits:0,rightUnits:0}]));let matched=0;
 for(const series of evidence.series){randomSeed=series.seed;let carry=null,streak=0,seed=series.seed;
  for(const expected of series.rows){const f=plain(run(`auditSetup(${expected.round},${seed},${JSON.stringify(carry)},${streak})`)),teams=[0,1].map(side=>f.units.filter(u=>u.side===side));assert.equal(f.leftArmyCost,expected.leftCost);assert.equal(f.budgets[1].spent,expected.rightSpent);assert.equal(f.budgets[1].planned,expected.rightPlanned);assert.deepEqual(teams.map(a=>a.length),expected.counts);
   for(const side of [0,1]){const prefix=side?'right':'left';for(const k of new Set(teams[side].map(u=>u.k)))counts[k][prefix+'Armies']++;for(const u of teams[side])counts[u.k][prefix+'Units']++;}
   carry=expected.winner===null?null:teams[expected.winner].map(u=>u.k);streak=expected.winner===0?streak+1:expected.winner===1?1:0;seed=(math.random()*4294967296)>>>0;matched++;
  }
 }
 const result={matchedSavedBattles:matched,all17Seen:roles.every(k=>counts[k].rightArmies>0),counts,notes:'Generator-only reconstruction using saved actual outcomes and deterministic seed stream; no combat resimulation.'};fs.writeFileSync(root+'/v9-generator-frequency-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exit(0);
}
if(process.env.LAYOUT_ONLY){
 const cases=[['golem','golem','golem','boar','boar'],['golem','golem','golem','boar','boar','sword','sword','sword'],...[[3,3,3],[4,6,6],[6,9,9],[8,12,12]].map(([g,s,b])=>[...Array(g).fill('golem'),...Array(s).fill('sword'),...Array(b).fill('goblin')])];let checked=0;
 for(let seed=1;seed<=200;seed++)for(const carry of cases){const f=plain(run(`auditSetup(20,${seed},${JSON.stringify(carry)},4)`));for(const u of f.units){const r=f.types[u.k].radius;assert(u.x>=r&&u.x<=480-r&&u.y>=r&&u.y<=538-r);}for(let i=0;i<f.units.length;i++)for(let j=i+1;j<f.units.length;j++){const a=f.units[i],b=f.units[j];if(f.types[a.k].collisionLayer!==f.types[b.k].collisionLayer)continue;assert(Math.hypot(a.x-b.x,a.y-b.y)+.001>=f.types[a.k].radius+f.types[b.k].radius,`initial overlap ${a.k}/${b.k} seed${seed}`);}checked++;}
 const result={pass:true,checked,indexSha256:crypto.createHash('sha256').update(html).digest('hex'),cases:cases.map(x=>x.length),notes:'Initial same-layer geometry only; no full battle rerun.'};fs.writeFileSync(root+'/v9-layout-audit-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exit(0);
}
const out={indexSha256:crypto.createHash('sha256').update(html).digest('hex'),sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),sweep:{samples:0,capLimited:0,notStronger:0,overlapSamples:0,worstRemaining:0,examples:[]},series:[]};
for(let round=2;round<=20;round++)for(let seed=1;seed<=100;seed++){
 const carry=round<6?Array(3).fill('rider'):round<12?Array(8).fill('rider'):round<17?Array(16).fill('rider'):Array(16).fill('rider');
 const f=plain(run(`auditSetup(${round},${seed},${JSON.stringify(carry)},4)`)),r=inspect(f);out.sweep.samples++;if(r.capLimited)out.sweep.capLimited++;if(r.planned>r.leftCost&&r.spent<=r.leftCost)out.sweep.notStronger++;if(r.overlaps)out.sweep.overlapSamples++;out.sweep.worstRemaining=Math.max(out.sweep.worstRemaining,r.remaining);if((r.capLimited||r.overlaps)&&out.sweep.examples.length<12)out.sweep.examples.push({round,seed,...r});
}
// Explicit carried flyer remains eligible only with a counter on the challenger.
for(let seed=1;seed<=100;seed++)inspect(plain(run(`auditSetup(12,${seed},['drake','drake','archer'],2)`)));
console.log('SWEEP',JSON.stringify(out.sweep));fs.writeFileSync(root+'/v9-generator-audit-results.json',JSON.stringify(out,null,2));
const seriesCount=Number(process.env.SERIES||20);const typesBefore=run('JSON.stringify(TYPES)');
assert.equal(out.sweep.capLimited,0,'cap-induced budget waste remains');assert.equal(out.sweep.notStronger,0,'challenger fails actual-spend growth');assert.equal(out.sweep.overlapSamples,0,'cross-team starting overlap');
for(let series=1;series<=seriesCount;series++){
 randomSeed=series;run(`round=1;freshWallet();openPrediction(${series});`);const rows=[];let priorWinner=null,priorKinds=null,priorTokens=null;const t0=performance.now();
 for(let round=1;round<=20;round++){
  const f=plain(run('auditFormation()')),info=inspect(f);if(priorWinner!==null){assert.deepEqual(info.left,priorKinds);assert(f.units.filter(u=>u.side===0).every(u=>!priorTokens.includes(u.token)));}
  const bt=performance.now(),battle=plain(run('auditBattle()'));battle.ms=performance.now()-bt;assert.equal(battle.state,'result');assert(battle.peak.every(n=>n<=32));assert(battle.maxRecords.every(n=>n<=128));assert.equal(battle.completed,round);assert.equal(battle.balance,100+10*battle.correctCount);
  rows.push({round,...battle,leftCost:info.leftCost,rightPlanned:info.planned,rightSpent:info.spent,counts:[info.left.length,info.right.length],kinds:[new Set(info.left).size,new Set(info.right).size],capLimited:info.capLimited,overlaps:info.overlaps});
  priorWinner=battle.winner;priorKinds=battle.winner===null?null:(battle.winner===0?info.left:info.right);priorTokens=f.units.map(u=>u.token);if(round<20)run('nextPrediction()');
 }
 assert.equal(run('JSON.stringify(TYPES)'),typesBefore);out.series.push({seed:series,ms:performance.now()-t0,rows});if(series%5===0){fs.writeFileSync(root+'/v9-generator-audit-results.json',JSON.stringify(out,null,2));console.log('SERIES',series,'elapsedMs',Math.round(out.series.reduce((n,s)=>n+s.ms,0)));}
}
const rows=out.series.flatMap(s=>s.rows);out.summary={series:out.series.length,battles:rows.length,leftWins:rows.filter(r=>r.winner===0).length,rightWins:rows.filter(r=>r.winner===1).length,draws:rows.filter(r=>r.winner===null).length,capLimited:rows.filter(r=>r.capLimited).length,overlapStarts:rows.filter(r=>r.overlaps).length,spawnBattles:rows.filter(r=>r.spawned).length,totalMs:out.series.reduce((n,s)=>n+s.ms,0)};fs.writeFileSync(root+'/v9-generator-audit-results.json',JSON.stringify(out,null,2));console.log('PASS core invariants, findings retained:',JSON.stringify(out.summary));
