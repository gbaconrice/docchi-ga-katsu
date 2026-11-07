const fs=require('fs'),path=require('path'),assert=require('assert');
const harness=fs.readFileSync(path.join(__dirname,'bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',harness+`
const ev=s=>vm.runInContext(s,context,{timeout:120000}),before=ev('JSON.stringify(TYPES)');
const out=ev(\`(()=>{
 function u(k,side,x,id){return{k,side,x,y:269,id,token:'verify:'+id,hp:TYPES[k].hp,cd:0,priority:id/100,dead:false,originForward:side?-1:1};}
 function reset(list){units=list;initialUnits=JSON.parse(JSON.stringify(list));initialKinds=[list.filter(x=>x.side===0).map(x=>x.k),list.filter(x=>x.side===1).map(x=>x.k)];BattleInsights.start(initialUnits);pendingSummons=[];shots=[];combatEvents=[];elapsed=0;state='fight';winner=null;choice=0;battleEnvironment=null;}
 const rows=[];
 for(const k of ['shockplate_drake','spirit_fan_wolf','gauntlet_combo_guard','repair_pylon','embergrille_monument','eggshell_repairpod']){
  const t=TYPES[k],reflect=!!t.reflectionRatio,subject=u(k,0,180,1),enemy={...u('sword',1,180+t.radius+9+2,2),hp:1000000,cd:reflect?0:100000,slowFactor:0,slowUntil:1000};
  if(reflect)subject.hp=t.hp/2;
  reset([subject,enemy]);const hits=[],heals=[];
  for(let i=0;i<600;i++){combatEvents=[];combatStep(1/60);for(const e of combatEvents){if(e.type==='resolved_hit'&&e.sourceToken==='verify:1')hits.push({amount:e.amount,delivery:e.delivery});if(e.type==='self_repair')heals.push(e.actualAmount);}if(reflect)enemy.cd=100000;}
  rows.push({k,display:buildUnitComparisonFacts(t),hits,heals});
 }return rows;
})()\`);
for(const k of ['shockplate_drake','spirit_fan_wolf','gauntlet_combo_guard']){const r=out.find(x=>x.k===k);assert(r.hits.length,k+' hits');assert.equal(Number(r.display.attackValue),r.hits[0].amount,k+' first real hit matches shown attack');}
assert.deepStrictEqual([...new Set(out.find(x=>x.k==='shockplate_drake').hits.map(h=>h.amount))],[72,96]);
assert(out.find(x=>x.k==='spirit_fan_wolf').hits.every(h=>h.amount===7));
assert.deepStrictEqual([...new Set(out.find(x=>x.k==='gauntlet_combo_guard').hits.map(h=>h.amount))],[30,84]);
for(const [k,amount] of [['repair_pylon',8.5],['embergrille_monument',12.75],['eggshell_repairpod',25.5]]){const r=out.find(x=>x.k===k);assert.equal(r.display.attackValue,'0');assert(r.display.roleNote.includes('反射'));assert(r.hits.some(h=>h.delivery==='counter'&&h.amount===amount),k+' exact reflection');assert(r.heals.length,k+' actual self repair');}
assert.equal(ev('JSON.stringify(TYPES)'),before);
console.log('PASS production combat: shock 72/96, wolf 7 per projectile, combo 30/84, all three repair roles reflect and heal; numeric UI agrees with first contact');
`)(require,assert);
