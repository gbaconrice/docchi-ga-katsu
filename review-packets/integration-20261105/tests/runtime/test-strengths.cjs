const assert=require('node:assert/strict'),fs=require('fs');
if(!process.env.GAME_JS)throw Error('GAME_JS is required');const {vm,context}=require('./harness.cjs');
const result=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
 const before=JSON.stringify(TYPES),ref=comparisonStrengthReference(),rows=CONTENT_ROSTER.selectable.map(kind=>{const facts=buildUnitComparisonFacts(TYPES[kind]),emphasis=unitComparisonEmphasis(TYPES[kind],facts,ref);return {kind,facts,emphasis}});
 return {catalogSize:rows.length,unchanged:before===JSON.stringify(TYPES),ref,rows};
})())`,context));
assert.equal(result.catalogSize,300);assert(result.unchanged);
for(const {facts,emphasis} of result.rows){assert([null,'hp','action','movement','distance'].includes(emphasis.metric));assert(emphasis.trait>=-1&&emphasis.trait<facts.traits.length);if(emphasis.metric)assert(emphasis.reason);}
const e=k=>result.rows.find(x=>x.kind===k).emphasis;
assert.equal(e('shield').metric,'hp');assert.equal(e('golem').metric,'hp');assert.equal(e('archer').metric,'distance');assert.equal(e('goblin').metric,'movement');assert.equal(e('sword').metric,null);assert.equal(e('onyx_scorpion').metric,null);assert.equal(e('onyx_scorpion').trait,0);assert.equal(e('crimson_mender').metric,'action');assert.equal(e('lumen_charger').metric,'action');assert(e('lumen_charger').reason.includes('1回の基礎ダメージ'));assert.equal(e('wingblade_duelist').metric,'action');assert(e('wingblade_duelist').reason.startsWith('兵種の特徴'));
const invalid=JSON.parse(vm.runInContext(`JSON.stringify(unitComparisonEmphasis({hp:NaN,speed:Infinity,reach:undefined},{attackable:true,wide:false,label:'攻撃',value:'—',distanceLabel:'間合い',traits:[],traitTones:[]},{hp:[1,2,3,4],action:[1,2,3,4],movement:[1,2,3,4],distance:[1,2,3,4]}))`,context));assert.equal(invalid.metric,null);
const boundary=JSON.parse(vm.runInContext(`JSON.stringify(unitComparisonEmphasis({hp:3,speed:0,reach:0},{attackable:true,wide:false,label:'攻撃',value:'0',distanceLabel:'間合い',traits:[],traitTones:[]},{hp:[1,2,3,4],action:[1,2,3,4],movement:[1,2,3,4],distance:[1,2,3,4]}))`,context));assert.equal(boundary.metric,'hp');
const report={catalogSize:result.catalogSize,selective:true,selectionLimit:'One metric and one concrete trait per species',sourceTypesUnchanged:true,quartileBoundaryAndNonFiniteInputs:true,cutoffs:Object.fromEntries(Object.entries(result.ref).map(([k,a])=>[k,{count:a.length,cutoff:a[Math.ceil(a.length*.75)-1]}]))};fs.writeFileSync(__dirname+'/strength-test-results.json',JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
