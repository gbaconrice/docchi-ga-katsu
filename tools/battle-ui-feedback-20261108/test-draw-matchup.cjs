'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
// Default retains every original draw-only invariant. --integrated explicitly
// excludes whole-source equality checks because other authorized patches may
// change combat and generation. Behavioral draw/replay assertions still run.
const integrated=process.argv.includes('--integrated');
if(integrated&&process.argv.includes('--draw-only'))throw Error('Choose --integrated or --draw-only, not both');
const root=path.resolve(process.env.REPO_ROOT||path.join(__dirname,'../..'));
const baseline=path.resolve(process.env.BASELINE_HTML||path.join(root,'game-ui-inspect/home-audio-fix/source/index.html'));
const candidate=path.resolve(process.env.GAME_HTML||(process.env.REPO_ROOT?path.join(root,'index.html'):path.join(__dirname,'../validation/draw-only/index.html')));
const harness=path.resolve(process.env.HARNESS_PATH||[path.join(root,'tests/harness.cjs'),path.join(root,'game-ui-inspect/test-suite/tests/harness.cjs')].find(p=>fs.existsSync(p))||path.join(root,'tests/harness.cjs'));
for(const [name,file] of [['GAME_HTML',candidate],['HARNESS_PATH',harness],...integrated?[]:[['BASELINE_HTML',baseline]]])if(!fs.existsSync(file))throw Error(name+' is missing: '+file+'. Set '+name+' explicitly (or REPO_ROOT for repository defaults).');
function load(file){process.env.GAME_HTML=file;delete require.cache[require.resolve(harness)];const h=require(harness);if(typeof h.ev!=='function')throw Error('HARNESS_PATH must export ev(source) and sha; it must read GAME_HTML.');return h;}
const original=integrated?null:load(baseline),current=load(candidate),ev=current.ev,plain=x=>JSON.parse(JSON.stringify(x));
const excluded=integrated?['Whole winner-plan byte equality against baseline (other generation patches allowed).','Unit stats, prices and simulation entry-point equality against baseline (other combat patches allowed).']:[];
for(const reason of excluded)console.log('EXCLUDED (--integrated)',reason);
const checks=[];function check(name,fn){fn();checks.push(name);console.log('PASS',name);}
check(integrated?'normal winner remains on its original side':'normal winner carry remains byte-identical apart from policy metadata',()=>{
 for(const side of ['A','B']){const code=`(()=>{round=3;carryStreak=2;initialKinds=[['sword','sword'],['shield','shield']];pendingCarryOutcome='${side}';pendingCarryKinds=initialKinds[${side==='A'?0:1}].slice();const p=prepareOpening(428);delete p.plan.reinforcementPolicy;return p;})()`;
 const b=plain(ev(code)); // plans frozen: remove metadata in copied values
 if(!integrated){const a=plain(original.ev(code));delete a.plan.reinforcementPolicy;delete b.plan.reinforcementPolicy;assert.deepEqual(b,a);}assert.deepEqual(b.plan[side==='A'?'leftKinds':'rightKinds'],side==='A'?['sword','sword']:['shield','shield']);}
});
check('fresh draws stable across rounds and seeds; neither prior army or pair returns',()=>{
 const r=ev(`(()=>{multiSession=null;const rows=[];for(const n of [2,5,7,10,15,20])for(const s of [0,1,12,1234,4294967295]){round=n;carryStreak=8;pendingCarryOutcome='draw';pendingCarryKinds=null;initialKinds=[['sword'],['shield']];soloMatchupHistory=[];const first=prepareOpening(s);initialKinds=[first.plan.leftKinds,first.plan.rightKinds];soloMatchupHistory=[MatchupHistory.key(...initialKinds)];const a=prepareOpening(s),b=prepareOpening(s),keys=initialKinds.map(MatchupHistory.armyKey);rows.push({equal:JSON.stringify(a)===JSON.stringify(b),fresh:[a.plan.leftKinds,a.plan.rightKinds].every(k=>!keys.includes(MatchupHistory.armyKey(k))),unseen:!soloMatchupHistory.includes(MatchupHistory.key(a.plan.leftKinds,a.plan.rightKinds)),base:a.base,streak:a.plan.streak,attempts:a.plan.drawFreshDecision.attempts,seed:a.nextSeed,planSeed:a.plan.seed,healthy:a.opening.every(u=>u.hp===TYPES[u.k].hp&&!u.dead)});}return rows;})()`);
 for(const x of r){assert(x.equal&&x.fresh&&x.unseen&&x.healthy);assert.equal(x.base.length,0);assert.equal(x.streak,0);assert.equal(x.seed,x.planSeed);assert(x.attempts<=64);}assert.equal(r.length,30);
});
check('solo nextPrediction resets draw carry and streak; final round starts a clean run',()=>{
 const r=ev(`(()=>{multiSession=null;freshWallet();let seen;const saved=openPrediction;openPrediction=s=>{seen={round,pendingCarryOutcome,pendingCarryKinds,carryStreak,history:soloMatchupHistory.slice()};};try{round=2;state='result';winner=null;initialKinds=[['sword'],['shield']];carryStreak=7;nextPrediction();const draw=seen;round=sessionRoundLimit();state='result';winner=null;soloMatchupHistory=['old'];nextPrediction();return {draw,final:seen};}finally{openPrediction=saved;}})()`);
 assert.equal(r.draw.round,3);assert.equal(r.draw.pendingCarryKinds,null);assert.equal(r.draw.pendingCarryOutcome,'draw');assert.equal(r.draw.carryStreak,0);assert.equal(r.final.round,1);assert.equal(r.final.pendingCarryOutcome,null);assert.equal(r.final.history.length,0);
});
check('host draw uses authoritative prior matchup, publishes fresh full-health teams and final-round stop',()=>{
 const r=ev(`(()=>{freshWallet();round=2;pendingCarryOutcome=null;pendingCarryKinds=['sword'];initialKinds=[['sword'],['shield']];const old=prepareOpening(14).opening;let s={phase:'result',roundId:2,winner:'draw',matchup:{units:old},environment:BattleFields.selectRunEnvironment(14),continueIds:[]},published;const saved={displayMultiState,resetMultiRound,multiNextRoundSeconds,multiDoubleUpDecisionsComplete,update,draw};displayMultiState=resetMultiRound=update=draw=()=>{};multiNextRoundSeconds=()=>0;multiDoubleUpDecisionsComplete=()=>true;multiHost=true;multiAdapter=null;multiSession={getState:()=>s,getMatchupHistory:()=>[MatchupHistory.fromUnits(old)],getPlaybackClock:()=>0,openRound:o=>{published=o;s={...s,phase:'predict',roundId:o.roundId,matchup:o.matchup};}};try{initialKinds=[['irrelevant'],['irrelevant']];carryStreak=9;openMultiRound();const key=ks=>MatchupHistory.armyKey(ks),oldKeys=[0,1].map(side=>key(old.filter(u=>u.side===side).map(u=>u.k))),fresh=[0,1].every(side=>!oldKeys.includes(key(published.matchup.units.filter(u=>u.side===side).map(u=>u.k))));const healthy=published.matchup.units.every(u=>u.hp===TYPES[u.k].hp&&!u.dead),streak=carryStreak;published=null;s={...s,phase:'result',roundId:TOTAL_ROUNDS,continueIds:[]};openMultiRound();return {fresh,healthy,streak,finalStopped:published===null};}finally{({displayMultiState,resetMultiRound,multiNextRoundSeconds,multiDoubleUpDecisionsComplete,update,draw}=saved);multiSession=null;multiHost=false;}})()`);
 assert(r.fresh&&r.healthy&&r.finalStopped);assert.equal(r.streak,0);
});
check('draw-generated solo simulation and canonical replay are deterministic; reconnect frames match',()=>{
 const r=ev(`(()=>{freshWallet();round=2;carryStreak=0;pendingCarryOutcome='draw';initialKinds=[['sword'],['shield']];const p=prepareOpening(1234);battleEnvironment=BattleFields.selectRunEnvironment(1234);const simulate=()=>{setup(p.nextSeed,JSON.parse(JSON.stringify(p)));state='fight';for(let t=0;t<120;t++)spriteStep(1/60);return JSON.stringify(units);};const soloStable=simulate()===simulate();setup(p.nextSeed,JSON.parse(JSON.stringify(p)));multiInitial=JSON.parse(JSON.stringify(p.opening));const a=buildCanonicalReplay();setup(p.nextSeed,JSON.parse(JSON.stringify(p)));const b=buildCanonicalReplay();const playback=CompactReplay.createPlayback(a),ticks=[0,Math.min(120,a.ticks),a.ticks],sameFrames=ticks.every(t=>JSON.stringify(playback.at(t))===JSON.stringify(CompactReplay.createPlayback(a).at(t)));return {soloStable,replayStable:JSON.stringify(a)===JSON.stringify(b),sameFrames,ticks:a.ticks,winner:a.winner,unavailable:a.unavailable};})()`);
 assert(r.soloStable&&r.replayStable&&r.sameFrames,JSON.stringify(r));assert(!r.unavailable);assert(r.ticks>0);
});
if(!integrated)check('unit stats, prices and simulation entry points remain unchanged',()=>{
 for(const expression of ['JSON.stringify(TYPES)','JSON.stringify(BALANCE_COST)','step.toString()','spriteStep.toString()'])assert.equal(ev(expression),original.ev(expression));
});
check('draw admission still rejects invalid seeds and nonempty carry',()=>{
 assert.throws(()=>ev(`growthGenerator.generate({round:2,streak:0,carryKinds:[],seed:-1,previousOutcome:'draw'})`),/INVALID_INPUT/);
 assert.throws(()=>ev(`growthGenerator.generate({round:2,streak:0,carryKinds:['sword'],seed:1,previousOutcome:'draw'})`),/FRESH_ROUND_CONFLICT/);
});
console.log(JSON.stringify({mode:integrated?'integrated':'draw-only',source:candidate,baseline:integrated?null:baseline,harness,sha256:current.sha,passed:checks.length,excluded,checks},null,2));
