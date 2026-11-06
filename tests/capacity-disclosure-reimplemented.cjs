// Fresh independent regression contract. VM only: not historical-source recovery,
// browser/mobile/FPS verification, or current win-probability calibration.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {loadGame}=require('../tools/recovery/load-game.cjs');
const game=path.resolve(process.env.GAME_HTML||process.argv[2]||path.join(__dirname,'../index.html'));
const fixturePath=path.resolve(process.env.CAPACITY_FIXTURE||process.argv[3]||path.join(__dirname,'fixtures/capacity-disclosure-reimplemented.json'));
const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8')),run=loadGame(game);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const generate=args=>run(`growthGenerator.generate(${JSON.stringify(args)})`),deployment=ks=>run(`growthGenerator.deploymentCount(${JSON.stringify(ks)})`),fit=ks=>run(`growthGenerator.fit(${JSON.stringify(ks)})!==null`);
const changed=['candle_archdeacon','glasswing_sting_moth','shellburst_arcade','wraith','rune_exorcist'],bosses=run('[...BOSS_KINDS]');
const metadata=pair=>run(`compositionEstimator.metadataFor(${JSON.stringify(pair)})`),compose=ks=>Object.fromEntries([...new Set(ks)].map(k=>[k,ks.filter(x=>x===k).length]));
function assertDisclosure(pair,meta){
 const ids=[...new Set(pair.flatMap(a=>Object.keys(a)))],abilities=ids.filter(k=>changed.includes(k)).sort(),retuned=ids.filter(k=>bosses.includes(k)).sort();
 assert.equal(meta.calibrated,false);assert.equal(meta.confidenceClaim,false);assert.deepEqual(meta.scoreInterval,[-1,1]);
 assert.deepEqual(meta.changedAbilityTypeIds,abilities);assert.deepEqual(meta.retunedBossTypeIds,retuned);
 assert(meta.note.includes('未校正'));assert(meta.note.includes('勝率'));assert(meta.note.includes('信頼区間ではありません'));assert(meta.calibratedStatus.includes('not recalibrated'));
 for(const k of [...abilities,...retuned])assert(meta.untrainedTypeIds.includes(k));
 assert.equal(meta.predictionStatus,abilities.length?'NOMINAL_ONLY_CHANGED_ABILITIES':'NOMINAL_ONLY_RETUNED_BOSSES');
}
function assertPlan(args,p){
 assert(deployment(p.rightKinds)<=32,'new challenger exceeds reservation32');
 if(args.carryKinds.length)assert.deepEqual(p.leftKinds,args.carryKinds,'carry changed');else assert(deployment(p.leftKinds)<=32,'new incumbent exceeds reservation32');
 assert(Number.isFinite(p.modelDecision.predictedMargin));assert(p.leftPositions.concat(p.rightPositions).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 for(const kinds of [p.leftKinds,p.rightKinds])assert(kinds.filter(k=>bosses.includes(k)).length<=1,'boss cap');
}

test('fresh fixture provenance and unchanged mechanics, prices, complete model',()=>{
 assert.equal(fixture.provenance.kind,'fresh-nonhistorical-reimplementation-fixture');
 assert(/^[a-f0-9]{64}$/.test(fixture.provenance.preCapacitySHA256));
 for(const [expression,expected] of Object.entries(fixture.hashes))assert.equal(sha(run(expression)),expected,expression);
 assert.equal(sha(fs.readFileSync(game,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')),fixture.htmlOutsideScriptsSHA256,'HTML/CSS outside scripts changed');
 assert.deepEqual(run('JSON.parse(JSON.stringify(COST))'),fixture.costs);
 assert.equal(run('TEAM_CAP'),64);assert.equal(run('CREATED_TOTAL_CAP'),512);
 if(process.env.REQUIRE_NEW_ABILITIES==='1'){
  assert.equal(fixture.provenance.abilityStatus,'ability-integrated-input');assert.equal(run('TYPES.wraith.summonCharges'),4);assert.equal(run('COST.wraith'),9);
 }
});
test('all 300 pre-cap scores unchanged and ordinary metadata retained',()=>{
 assert.equal(fixture.pairs.length,300);
 for(const row of fixture.pairs){assert.equal(run(`compositionEstimator.predict(${JSON.stringify(row.pair)})`),row.score);
  if(!row.pair.flatMap(a=>Object.keys(a)).some(k=>changed.includes(k)||bosses.includes(k)))assert.deepEqual(metadata(row.pair),row.metadata);
 }
});
test('five changed abilities, all 46 bosses, mixed geometry/tail preserve provenance',()=>{
 assert.equal(bosses.length,46);
 for(const k of [...changed,...bosses]){const pair=[{[k]:1},{goblin:8}];assertDisclosure(pair,metadata(pair));}
 const tail=fixture.pairs.find(row=>row.metadata.untrainedTypeIds.length&&!Object.keys(row.pair[0]).some(k=>changed.includes(k)||bosses.includes(k))).pair[0];
 for(const extra of [tail,{skullflare_triad:1}]){
  const pair=[{shellburst_arcade:1,basalt_titan:1,...extra},{goblin:8}],meta=metadata(pair),old=metadata([extra,{goblin:8}]);assertDisclosure(pair,meta);
  for(const k of old.untrainedTypeIds)assert(meta.untrainedTypeIds.includes(k));assert.deepEqual(meta.geometryIds,old.geometryIds);
 }
});
test('summon/split boundaries, frozen catalog, ordinary/boss/headcount/packing rules',()=>{
 generate({round:10,streak:0,carryKinds:['goblin'],seed:4242,previousOutcome:'A'});
 for(const [k,n,cost] of [['wraith',6,5],['bone_crown_lich',4,7],['goblin',32,1]]){assert(fit(Array(n).fill(k)));assert(!fit(Array(n+1).fill(k)));assert.equal(deployment([k]),cost);}
 assert(fit([...Array(30).fill('goblin'),'slime']));assert(!fit([...Array(31).fill('goblin'),'slime']));assert.equal(deployment(['slime']),2);
 assert(!fit(['slime','golem']));assert(!fit(['unknown']));assert(!fit(null));assert(fit([]));
 assert(run('Object.isFrozen(growthGenerator.catalog)&&Object.values(growthGenerator.catalog).every(Object.isFrozen)'));
 assert(run("GrowthGenerator.createGenerator({giant:{cost:1,estimateCost:1,radius:300}}).fit(['giant'])===null"));
 assert.deepEqual(run('[1,2,3,4,5,6,7,9,10,20].map(r=>GrowthGenerator.createGenerator(growthGenerator.catalog).headcountCapFor(r))'),[8,8,12,12,18,18,24,24,32,32]);
 generate({round:1,streak:0,carryKinds:[],seed:42,previousOutcome:'invalid'});assert(fit(Array(8).fill('goblin')));assert(!fit(Array(9).fill('goblin')));
 if(fixture.provenance.abilityStatus==='ability-integrated-input')for(const row of fixture.reservationTypes)assert.equal(deployment([row.id]),row.expected,row.id);
 else console.log('LIMIT interim fixture: wraith reservation5 anticipates final four-summon ability; full runtime contract deferred.');
});
test('sorted-signature over-cap carry is immutable; replacements and fresh rounds reset',()=>{
 const carry=[...Array(4).fill('wraith'),...Array(16).fill('sword')],args={round:10,streak:2,carryKinds:carry,seed:9931,previousOutcome:'B'};
 const p=generate(args);assertPlan(args,p);assert.equal(deployment(p.leftKinds),36);assert(fit([...carry].reverse()));
 assert(!fit([...carry.slice(0,-1),'goblin']));assert(!fit([...carry,'sword']));assert(!fit(carry.slice(0,-1)));
 assert(run(`(()=>{const a=Object.freeze(Array(16).fill('wraith')),p=growthGenerator.generate({round:6,streak:2,carryKinds:a,seed:2,previousOutcome:'B'});return JSON.stringify(p.leftKinds)===JSON.stringify(a)&&Object.isFrozen(p)&&Object.isFrozen(p.leftKinds)&&growthGenerator.deploymentCount(p.leftKinds)===80&&growthGenerator.deploymentCount(p.rightKinds)<=32&&!!growthGenerator.fit(a);})()`));
 assert(!fit(carry));
 const largestArgs={round:20,streak:5,carryKinds:Array(32).fill('wraith'),seed:31692,previousOutcome:'A'};assertPlan(largestArgs,generate(largestArgs));assert(fit(largestArgs.carryKinds));
 generate({round:10,streak:0,carryKinds:[],seed:2,previousOutcome:'invalid'});assert(!fit(Array(16).fill('wraith')));
 // A carry exemption only bypasses reservation capacity, not the pre-existing caps.
 for(const bad of [Array(33).fill('sword'),['golem','slime'],Array(65).fill('goblin')])assert.throws(()=>generate({round:10,streak:2,carryKinds:bad,seed:2,previousOutcome:'A'}),/CARRY_DOES_NOT_FIT/);
});
test('72 fresh pinned cap-only choices/margins match and all metadata propagates',()=>{
 assert.equal(fixture.generation.length,72);
 for(const row of fixture.generation){const p=generate(row.args);assertPlan(row.args,p);assert.deepEqual(p.leftKinds,row.left);assert.deepEqual(p.rightKinds,row.right);assert.equal(p.modelDecision.predictedMargin,row.margin);assert.deepEqual(generate(row.args),p);
  const m=metadata([compose(p.leftKinds),compose(p.rightKinds)]);
  for(const field of ['predictionStatus','untrainedTypeIds','geometryIds','changedAbilityTypeIds','retunedBossTypeIds','calibratedStatus','note'])if(m[field]!==undefined)assert.deepEqual(p.modelDecision[field],m[field],field);
  assert.equal(p.modelDecision.calibrated,m.calibrated??false);assert.equal(p.modelDecision.confidenceClaim,m.confidenceClaim??false);assert.deepEqual(p.modelDecision.scoreInterval,m.scoreInterval??null);
 }
});
let generatedCount=0,maxNewReservation=0,carryPreserved=0;
test('160 new generation cases: zero over-cap, finite positions, unchanged carries',()=>{
 for(const round of [1,2,5,6,10,20,30,50])for(let i=0;i<20;i++){
  const cap=round<=2?8:round<=4?12:round<=6?18:round<=9?24:32;
  const kinds=[[],Array(cap).fill('archer'),Array(Math.min(cap,16)).fill('wraith'),Array(Math.min(cap,4)).fill('bone_crown_lich'),['slime',...Array(Math.min(cap-1,7)).fill('goblin')]][i%5];
  const args={round,streak:kinds.length?i%5:0,carryKinds:kinds,seed:(31692+Math.imul(i+1,2654435761)+round*101)>>>0,previousOutcome:kinds.length?['A','B','draw'][i%3]:'invalid'};
  const p=generate(args);assertPlan(args,p);generatedCount++;if(kinds.length)carryPreserved++;maxNewReservation=Math.max(maxNewReservation,deployment(p.rightKinds),kinds.length?0:deployment(p.leftKinds));
 }
 assert.equal(generatedCount,160);
});
console.log(JSON.stringify({PASS:true,groups:passed,fixtureKind:fixture.provenance.kind,abilityStatus:fixture.provenance.abilityStatus,gameSHA256:sha(fs.readFileSync(game)),generatedCount,maxNewReservation,carryPreserved,overCap:0,limits:'Fresh VM checks only; not exact historical recovery, browser/mobile/FPS evidence or model recalibration.'}));
