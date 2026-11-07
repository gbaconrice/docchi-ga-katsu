'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync('index.html','utf8'),start=s.indexOf('const BattleFields='),fieldEnd=s.indexOf('return {FIELD_VERSION,FIELD_IDS,STRENGTHS,CANDIDATE_STRENGTH,mix32,selectRunEnvironment,validateEnvironment,sameEnvironment,movementFactor,firingReach,fieldLabel};})();',start),end=fieldEnd+168;assert(start>=0&&fieldEnd>start&&end>fieldEnd,'Exact pure BattleFields boundary');
const c=vm.createContext({});vm.runInContext(s.slice(start,end),c);
for(const percent of [4,8,12]){
 c.percent=percent;const result=vm.runInContext(`(()=>{let e;for(let i=0;i<100;i++){e=BattleFields.selectRunEnvironment(i,percent);if(e.fieldId==='crosswind_ridge')break;}if(e.fieldId!=='crosswind_ridge')throw Error('fixture');const serialized=JSON.stringify(e),copy=JSON.parse(serialized);return {label:BattleFields.fieldLabel(e),same:BattleFields.sameEnvironment(e,copy),serialized,range:BattleFields.firingReach(copy,{projectile:true},100),ground:BattleFields.movementFactor(copy,{collisionLayer:'ground'})}})()`,c);
 assert.equal(result.label,'荒野 · 射撃間合い −'+percent+'%');assert(result.same);assert(result.serialized.includes('crosswind_ridge'));assert.equal(result.range,100*(1-percent/100));assert.equal(result.ground,1);
}
assert(!s.includes('横風 · 射撃間合い'));
console.log('PASS natural terrain label, fixed ID/serialization and all three effect strengths unchanged');
