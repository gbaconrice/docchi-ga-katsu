const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split('for(const zeroPlayer')[0];
const source=fs.readFileSync('index.html','utf8'),edits=require('../tools/integration/semantic-text-colors.edits.json').edits;
let original=source;for(const e of edits.slice().reverse()){assert(original.includes(e.after),e.name);original=original.replace(e.after,e.before);}
const start=original.indexOf('function buildUnitComparisonFacts(type) {'),end=original.indexOf('\n// Presentation-only comparisons:',start);
const baseline=original.slice(start,end).replace('function buildUnitComparisonFacts(','function baselineUnitComparisonFacts(');
new Function('require','assert','baseline',h+`
const run=s=>vm.runInContext(s,context,{timeout:120000});run(baseline);
const before=run('JSON.stringify(TYPES)');
const all=JSON.parse(run('JSON.stringify(CONTENT_ROSTER.selectable.map(k=>({k,type:TYPES[k],before:baselineUnitComparisonFacts(TYPES[k]),after:buildUnitComparisonFacts(TYPES[k])})))'));
assert.equal(all.length,300);
const air=all.filter(r=>r.type.targetPriority==='air');assert.deepStrictEqual(air.map(r=>r.k).sort(),['sky_harpooner','wingblade_duelist']);
for(const row of all){
 if(row.type.targetPriority!=='air'){assert.deepStrictEqual(row.after,row.before,row.k+' non-priority facts unchanged');continue;}
 const f=row.after,index=f.traits.findIndex(x=>x.includes('飛行を優先'));
 assert(index>=0,row.k+' flying priority must be visible before trait truncation');assert.equal(f.traitTones[index],'mobility');
 assert(row.type.attackTargetMask.includes('air'));assert(row.type.attackTargetMask.includes('ground'));assert(f.traits.length<=3);
 for(const key of Object.keys(f).filter(k=>!['traits','traitTones'].includes(k)))assert.deepStrictEqual(f[key],row.before[key],row.k+' '+key);
 if(row.type.airDamageMultiplier)assert(f.traits[index].includes('飛行に'+row.type.airDamageMultiplier+'倍'));
 if(row.k==='wingblade_duelist'){assert(f.traits.includes('飛行'));assert(f.traits.includes('追撃は中断あり'));assert.equal(f.value,'2連撃');}
}
assert.equal(run('JSON.stringify(TYPES)'),before);
console.log('PASS all 300 facts: only two real air-priority descriptions change; numerical values, action tones and 298 other descriptions preserved');
for(const kind of ['sky_harpooner','wingblade_duelist'])for(const side of [0,1])for(const withAir of [true,false]){
 const result=JSON.parse(run('JSON.stringify((()=>{battleEnvironment=null;elapsed=0;state="fight";winner=null;combatEvents=[];pendingSummons=[];shots=[];const k='+JSON.stringify(kind)+',side='+side+',direction=side?-1:1;const make=(token,k,otherSide,x,cd)=>({id:token,token,k,side:otherSide,x,y:200,hp:TYPES[k].hp,cd,priority:token==="actor"?.1:token==="ground"?.2:.3,dead:false,originForward:otherSide?-1:1});units=[make("actor",k,side,200,0),make("ground","sword",1-side,200+direction*(TYPES[k].radius+TYPES.sword.radius+1),999)];if('+withAir+')units.push(make("air","drake",1-side,200+direction*(TYPES[k].radius+TYPES.drake.radius+4),999));step(1/60);return combatEvents.filter(e=>e.sourceToken==="actor"&&e.targetToken).map(e=>({type:e.type,target:e.targetToken}));})())'));
 assert(result.length,kind+' no targeting event');assert(result.some(e=>e.target===(withAir?'air':'ground')),JSON.stringify({kind,side,withAir,result}));assert(!result.some(e=>e.target!==(withAir?'air':'ground')),JSON.stringify(result));
}
assert.equal(run('JSON.stringify(TYPES)'),before,'priority verification leaves definitions unchanged');
console.log('PASS both characters on both sides select a flying enemy over nearer ground and fall back to ground when no flying enemy exists (8 real combat cases)');
`)(require,assert,baseline);
