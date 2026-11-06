// Place beside bet-ui-smoke.cjs, or set BOSS_TEST_HARNESS to that file.
// GAME_HTML optionally points to an integration candidate.
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=process.env.BOSS_TEST_HARNESS||path.join(__dirname,'bet-ui-smoke.cjs');
const harness=fs.readFileSync(source,'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')","fs.readFileSync(process.env.GAME_HTML||'index.html','utf8')");
new Function('require','assert','__dirname',harness+`
const ev=s=>vm.runInContext(s,context),before=ev('JSON.stringify(TYPES)');
const rows=JSON.parse(ev('JSON.stringify(CONTENT_ROSTER.selectable.map(k=>({k,t:TYPES[k],f:buildUnitComparisonFacts(TYPES[k]),plain:buildUnitComparisonFacts({...TYPES[k],bossDamageScale:1})})))'));
assert.equal(rows.length,300);
const poison=rows.find(r=>r.k==='spore_toad'),thorn=rows.find(r=>r.k==='thornback_beast');
assert(poison.f.traits.includes('毒12/秒・3秒'),'boss poison trait includes source multiplier');
assert(thorn.f.traits.includes('接触反撃15'),'boss counter trait includes source multiplier');
const numericDamageLabels=['攻撃','射撃','周囲','柱攻撃','前方範囲','自爆'];
for(const {k,t,f,plain} of rows){
 const scale=t.bossDamageScale||1;
 if(numericDamageLabels.includes(f.label)&&Number.isFinite(Number(plain.value)))assert.equal(Number(f.value),Number(plain.value)*scale,k+' scaled displayed attack');
 for(const field of ['hp','movement','distance','timing'])assert.equal(f[field],plain[field],k+' non-damage display unchanged '+field);
}
const synthetic=JSON.parse(ev('JSON.stringify({explosion:buildUnitComparisonFacts({...TYPES.bombbug,bossDamageScale:3}),explosionBase:TYPES.bombbug.explosionDamage,charge:buildUnitComparisonFacts({...TYPES.boar,bossDamageScale:3}),chargeBase:TYPES.boar.chargeBonus,healer:buildUnitComparisonFacts({...TYPES.healer,dmg:0,supportOnly:true,bossDamageScale:3}),healerBase:buildUnitComparisonFacts({...TYPES.healer,dmg:0,supportOnly:true})})'));
assert.equal(Number(synthetic.explosion.value),synthetic.explosionBase*3,'future boss explosion stays accurate');
assert(synthetic.charge.traits.includes('突進+'+(synthetic.chargeBase*3)),'future boss charge stays accurate');
assert.equal(synthetic.healer.value,synthetic.healerBase.value,'healing is not damage-scaled');
// Independent threshold calculation uses source damage and multiplier, not the displayed values.
const reference=JSON.parse(ev('JSON.stringify(comparisonStrengthReference())'));
const ordinary=r=>r.f.attackable&&!r.f.wide&&['攻撃','射撃'].includes(r.f.label)&&Number.isFinite(Number(r.f.value));
for(const delivery of ['melee','ranged']){
 const group=rows.filter(r=>ordinary(r)&&(r.t.projectile?'ranged':'melee')===delivery);
 const expected=group.map(r=>r.t.dmg*(r.t.bossDamageScale||1)).filter(v=>Number.isFinite(v)&&v>0).sort((a,b)=>a-b);
 assert.deepStrictEqual(reference.action[delivery],expected,delivery+' thresholds use effective damage');
 const cutoff=expected[Math.ceil(expected.length*.75)-1];
 for(const r of group){const e=JSON.parse(ev('JSON.stringify(unitComparisonEmphasis(TYPES['+JSON.stringify(r.k)+'],buildUnitComparisonFacts(TYPES['+JSON.stringify(r.k)+']),comparisonStrengthReference()))'));assert.equal(e.metrics.includes('action'),r.t.dmg*(r.t.bossDamageScale||1)>=cutoff,r.k+' highlight uses same threshold');}
}
assert.equal(ev('JSON.stringify(TYPES)'),before,'display and threshold functions cannot mutate mechanics');
// Actual production hit path agrees with the advertised poison and retaliation values.
const actual=JSON.parse(ev('JSON.stringify(('+function(){
 function u(k,side,x,id){return{k,side,x,y:269,id,token:'boss-ui:'+id,hp:TYPES[k].hp,cd:0,priority:id/100,dead:false,originForward:side?-1:1};}
 function reset(list){units=list;initialUnits=JSON.parse(JSON.stringify(list));initialKinds=[list.filter(x=>x.side===0).map(x=>x.k),list.filter(x=>x.side===1).map(x=>x.k)];BattleInsights.start(initialUnits);pendingSummons=[];shots=[];combatEvents=[];elapsed=0;state='fight';winner=null;choice=0;battleEnvironment=null;}
 reset([u('spore_toad',0,200,1),{...u('sword',1,240,2),hp:10000,cd:100000,slowFactor:0,slowUntil:1000}]);const poison=[];
 for(let i=0;i<110;i++){combatEvents=[];combatStep(1/60);for(const e of combatEvents)if(e.type==='resolved_hit'&&e.delivery==='poison')poison.push({amount:e.amount,tick:i+1});}
 reset([{...u('thornback_beast',0,200,1),cd:100000,slowFactor:0,slowUntil:1000},u('sword',1,230,2)]);combatEvents=[];combatStep(1/60);const counter=combatEvents.filter(e=>e.type==='resolved_hit'&&e.delivery==='counter').map(e=>e.amount);return{poison,counter};
}.toString()+')())'));
assert(actual.poison.length>=3);assert(actual.poison.every(e=>e.amount===6));assert.equal(actual.poison[1].tick-actual.poison[0].tick,30);assert.deepStrictEqual(actual.counter,[15]);
assert.equal(ev('JSON.stringify(TYPES)'),before,'combat fixture preserves type definitions');
console.log('PASS all 300 display facts, effective-damage thresholds/highlights, unscaled healing and source properties, actual poison12/s and retaliation15, future scaled explosion/charge');
`)(require,assert,path.dirname(source));
