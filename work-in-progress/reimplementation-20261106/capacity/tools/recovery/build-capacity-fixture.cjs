// Fresh nonhistorical fixture. Derive comparisons only from the supplied pre-capacity
// and capacity-only files. Never label this the missing original 2026-11-06 fixture.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {loadGame}=require('./load-game.cjs');
const [beforeFile,capacityFile,outFile]=process.argv.slice(2);
if(!beforeFile||!capacityFile||!outFile)throw Error('Usage: node build-capacity-fixture.cjs PRE_CAP_HTML CAPACITY_ONLY_HTML OUTPUT_JSON');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),before=loadGame(beforeFile),capacity=loadGame(capacityFile);
const hashExpressions=['JSON.stringify(TYPES)','JSON.stringify(COST)','combatStep.toString()','step.toString()','spawnPosition.toString()','compositionEstimator.predict.toString()','compositionEstimator.features.vector.toString()','JSON.stringify(compositionModel)','JSON.stringify(compositionFeaturePack)','JSON.stringify(compositionRuntimeSeal)',"JSON.stringify(Object.fromEntries(Object.entries(growthGenerator.catalog).map(([k,{deploymentUnits,...v}])=>[k,v])))"];
const ids=before('compositionFeaturePack.ids'),pairs=ids.map(k=>[{[k]:1},{goblin:8}]);
assert.equal(ids.length,300);
const args=[];
for(const round of [1,2,5,6,10,20])for(const previousOutcome of ['A','B','draw','invalid'])for(const seed of [1,2,4242]){
 const carryKinds=previousOutcome==='invalid'?[]:round===1?['sword']:Array(round<6?6:16).fill('wraith');
 args.push({round,streak:previousOutcome==='invalid'?0:2,carryKinds,seed,previousOutcome});
}
const fixture={provenance:{kind:'fresh-nonhistorical-reimplementation-fixture',created:'2026-11-06',preCapacitySHA256:sha(fs.readFileSync(beforeFile)),capacityOnlySHA256:sha(fs.readFileSync(capacityFile)),abilityStatus:before('TYPES.wraith.summonCharges')===4?'ability-integrated-input':'interim-exact119-without-new-abilities',description:'New evidence only. Missing historical fixture and final bytes were not recovered. Scores/mechanics are compared to supplied pre-capacity source; choices/margins to supplied capacity-only source. No runtime dependency on sibling workspaces.'},htmlOutsideScriptsSHA256:sha(fs.readFileSync(beforeFile,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')),hashes:Object.fromEntries(hashExpressions.map(e=>[e,sha(before(e))])),costs:before('JSON.parse(JSON.stringify(COST))'),reservationTypes:before("Object.entries(TYPES).filter(([k,t])=>t.summonCharges||t.bookBatchCount||t.splitCount).map(([k,t])=>({id:k,expected:Math.max(1,t.splitCount||0,1+(t.summonCharges||0)+(t.bookBatchCount||0)*(t.bookCharges||0))}))"),pairs:pairs.map(pair=>({pair,score:before(`compositionEstimator.predict(${JSON.stringify(pair)})`),metadata:before(`compositionEstimator.metadataFor(${JSON.stringify(pair)})`)})),generation:args.map(args=>{const p=capacity(`growthGenerator.generate(${JSON.stringify(args)})`);return {args,left:p.leftKinds,right:p.rightKinds,margin:p.modelDecision.predictedMargin};})};
for(const expression of hashExpressions)assert.equal(sha(capacity(expression)),fixture.hashes[expression],expression);
fs.mkdirSync(path.dirname(outFile),{recursive:true});fs.writeFileSync(outFile,JSON.stringify(fixture,null,2)+'\n');
console.log(JSON.stringify({status:'PASS fixture created',provenance:fixture.provenance,pairs:fixture.pairs.length,generation:fixture.generation.length}));
