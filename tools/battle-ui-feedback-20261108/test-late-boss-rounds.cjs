'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),harness=process.env.ENGINE_HARNESS||process.env.HARNESS_PATH||path.join(root,'tools/boss-abilities/tests/harness.cjs'),reportDir=path.resolve(process.env.REPORT_DIR||path.join(root,'verification/battle-ui-feedback-20261108/boss-tuning'));fs.mkdirSync(reportDir,{recursive:true});
function load(file){process.env.GAME_HTML=file;delete require.cache[require.resolve(harness)];return require(harness);}
const integrated=process.argv.includes('--integrated');
// The broad16-seed corpus is retained. Integrated early triples have explicit witnesses below.
const sampleSeeds=Number(process.env.BOSS_TEST_SEEDS||16);assert(Number.isSafeInteger(sampleSeeds)&&sampleSeeds>=16&&sampleSeeds<=256);
const candidate=process.env.GAME_HTML||path.join(root,'index.html');
const before=load(process.env.BASELINE_HTML||path.join(reportDir,'baseline.html')),current=load(candidate),ev=current.ev,plain=x=>JSON.parse(JSON.stringify(x)),checks=[];
function check(name,f){f();checks.push(name);console.log('PASS '+name);}
if(!integrated)check('R1–10 generator plans are identical to baseline for seeds and carried winners',()=>{
 for(const round of [1,2,5,6,9,10])for(let seed=0;seed<30;seed++){
  const args={round,seed,streak:round>1?2:0,carryKinds:round>1?['sword','shield','archer']:[],previousOutcome:round>1?'A':null};
  const run=source=>{const p=plain(source.ev(`growthGenerator.generate(${JSON.stringify(args)})`));delete p.reinforcementPolicy;return p;};assert.deepEqual(run(current),run(before));
 }
});
if(integrated)console.log('SKIP old isolated R1–10 bit-exact generator comparison: integrated matchup diversity and coverage intentionally supersede it');
check('R11+ generation is deterministic, finite and admits distinct pairs/triples without enlarging winners',()=>{
 const rows=[];for(const round of [11,12,15,16,20])for(let offset=0;offset<sampleSeeds;offset+=8){rows.push(...ev(`(()=>{const rows=[];const round=${round};for(let seed=${offset};seed<${Math.min(offset+8,sampleSeeds)};seed++)for(const carryKinds of [[],['sword','sword'],['golem','archer','sword'],['golem','iceclaw_legend','shield','archer'],['golem','iceclaw_legend','slime','shield','archer']]){
 const args={round,seed,streak:carryKinds.length?2:0,carryKinds,previousOutcome:carryKinds.length?'A':'invalid'},a=growthGenerator.generate(args),b=seed%8===0?growthGenerator.generate(args):a;
 if(JSON.stringify(a)!==JSON.stringify(b))throw Error('nondeterministic');if(carryKinds.length&&JSON.stringify(a.leftKinds)!==JSON.stringify(carryKinds))throw Error('carry changed');
 const bosses=ks=>ks.filter(k=>TYPES[k].boss);for(const ks of [a.leftKinds,a.rightKinds]){const bs=bosses(ks);if(ks.length>32||growthGenerator.deploymentCount(ks)>32||bs.length>3||bs.length!==new Set(bs).size||!growthGenerator.fit(ks))throw Error('invalid admission');}
 rows.push({round,seed,carry:carryKinds.length,left:a.leftKinds,right:a.rightKinds,leftBosses:bosses(a.leftKinds).length,rightBosses:bosses(a.rightKinds).length,costs:a.actualCosts,policy:a.diverseDecision?.lateBossDecision});}return rows;})()`));console.log('generated',round,offset+8);}
 const summary={cases:rows.length,byRound:{}};for(const round of [11,12,15,16,20]){const rs=rows.filter(r=>r.round===round);summary.byRound[round]={cases:rs.length,pairs:rs.filter(r=>r.rightBosses===2).length,triples:rs.filter(r=>r.rightBosses===3).length,ordinary:rs.filter(r=>r.rightBosses<2).length};}
 fs.writeFileSync(path.join(reportDir,'generation.json'),JSON.stringify({sha:current.sha,summary,rows},null,2));console.log(JSON.stringify(summary));for(const [round,r] of Object.entries(summary.byRound))assert(r.pairs&&r.ordinary&&((integrated&&Number(round)<=12)||r.triples),`R${round} category coverage: ${JSON.stringify(r)}`);
});
if(integrated)check('R11 and R12 explicitly admit three distinct bosses within budget and preserve the carried army',()=>{
 const rows=plain(ev(`(()=>{const rows=[];for(const round of [11,12]){const carryKinds=['golem','iceclaw_legend','slime','shield','archer'],args={round,seed:23,streak:2,carryKinds,previousOutcome:'A'},a=growthGenerator.generate(args),b=growthGenerator.generate(args),bosses=a.rightKinds.filter(k=>TYPES[k].boss),d=a.diverseDecision;
 if(JSON.stringify(a)!==JSON.stringify(b))throw Error('nondeterministic triple witness');if(JSON.stringify(a.leftKinds)!==JSON.stringify(carryKinds))throw Error('triple carry changed');
 if(bosses.length!==3||new Set(bosses).size!==3)throw Error('R'+round+' triple unavailable');for(const ks of [a.leftKinds,a.rightKinds])if(ks.length>32||growthGenerator.deploymentCount(ks)>32||!growthGenerator.fit(ks))throw Error('triple deployment admission');
 if(!OpposingSpecies.disjoint(a.leftKinds,a.rightKinds))throw Error('triple descendants overlap');
 if(a.actualCosts[1]<d.selectedActualBand[0]||a.actualCosts[1]>d.selectedActualBand[1]||a.estimatedCosts[1]<d.selectedEstimatedBand[0]||a.estimatedCosts[1]>d.selectedEstimatedBand[1])throw Error('triple budget admission');
 rows.push({round,seed:23,left:a.leftKinds,right:a.rightKinds,bosses,actualCosts:a.actualCosts,estimatedCosts:a.estimatedCosts,actualBand:d.selectedActualBand,estimatedBand:d.selectedEstimatedBand});}return rows;})()`));
 fs.writeFileSync(path.join(reportDir,'early-triple-witnesses.json'),JSON.stringify({sha:current.sha,rows},null,2));console.log(JSON.stringify(rows));
});
check('all prices and unit stats remain unchanged, apart from the separately verified display rename',()=>{const expected=plain(before.ev('TYPES'));if(integrated&&expected.goblin.name==='ゴブリン'){assert.equal(ev('TYPES.goblin.name'),'シャドウクローラー');expected.goblin.name='シャドウクローラー';}assert.deepEqual(plain(ev('TYPES')),expected);assert.deepEqual(plain(ev('BALANCE_COST')),plain(before.ev('BALANCE_COST')));});
check('R10 rejects multi-boss carries and R11 rejects duplicate bosses',()=>{
 assert.throws(()=>ev(`growthGenerator.generate({round:10,seed:1,streak:1,carryKinds:['golem','slime'],previousOutcome:'A'})`),/CARRY_DOES_NOT_FIT/);
 assert.throws(()=>ev(`growthGenerator.generate({round:11,seed:1,streak:1,carryKinds:['golem','golem'],previousOutcome:'A'})`),/CARRY_DOES_NOT_FIT/);
});
console.log(JSON.stringify({sha:current.sha,passed:checks.length,checks},null,2));
