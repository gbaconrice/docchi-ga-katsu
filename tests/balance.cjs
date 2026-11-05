// Matchmaking balance rules: challenger boost tiers, no rematch of the army that just lost,
// recalibrated costs present, support units untouched.
const fs=require('fs'),assert=require('assert');
const smoke=fs.readFileSync(__dirname+'/bet-ui-smoke.cjs','utf8');
const harness=smoke.slice(0,smoke.indexOf("for(const id of ['#red'"));
global.assert=assert;
new Function('require','__dirname',harness+`
 const ev=s=>vm.runInContext(s,context);
 // Boost tiers.
 assert.deepEqual(ev('[0,1,2,3,4,9].map(TypedGrowthGenerator.challengerBoost)'),ev('(B=>[1,B.newChampion,B.champion,B.champion,B.longChampion,B.longChampion])(TypedGrowthGenerator.CHALLENGER_BOOST)'));
 assert(ev('(B=>B.newChampion>1&&B.champion>=B.newChampion&&B.longChampion>=B.champion)(TypedGrowthGenerator.CHALLENGER_BOOST)'));
 // Round one uses the configured multiplier, not the later-streak boost.
 for(let seed=1;seed<=20;seed++){const plan=ev('growthGenerator.generate({round:1,streak:0,carryKinds:[],seed:'+seed+',previousOutcome:null})');const target=Math.round(plan.estimatedCosts[0]*0.96);assert.deepEqual(Array.from(plan.band),[Math.floor(target*.9),Math.ceil(target*1.1)]);}
 console.log('PASS first-round 0.96 multiplier used');
 // Recalibrated costs (spot checks from the duel fit) and support units unchanged.
 const cost=k=>ev('growthGenerator.catalog['+JSON.stringify(k)+'].cost');
 assert.equal(cost('archer'),4);assert.equal(cost('frostmage'),3);assert.equal(cost('healer'),4);
 // Challenger budget is boosted against a champion and the losing army is never sent back.
 const sig=a=>a.slice().sort().join('|');let rematchesAvoided=0,checked=0,ratio=0;
 for(let seed=1;seed<=40;seed++){
  const first=ev('growthGenerator.generate({round:1,streak:0,carryKinds:[],seed:'+seed+',previousOutcome:null})');
  const base={round:2,streak:1,carryKinds:first.leftKinds,seed:seed*7919,previousOutcome:'A'};
  const free=ev('growthGenerator.generate('+JSON.stringify(base)+')');
  const avoid=ev('growthGenerator.generate('+JSON.stringify({...base,avoidRight:free.rightKinds})+')');
  checked++;if(sig(avoid.rightKinds)!==sig(free.rightKinds))rematchesAvoided++;
  ratio+=free.estimatedCosts[1]/free.estimatedCosts[0];
 }
 assert.equal(rematchesAvoided,checked,'avoidRight must change the challenger');
 // Round 2 armies are capped at 8 units, so the boost is partly absorbed by the cap (measured champion win rate stays ~46-54%).
 assert(ratio/checked>1.01,'challenger budget should exceed champion on average: '+(ratio/checked).toFixed(3));
 console.log('PASS boost tiers, recalibrated costs, rematch avoidance '+rematchesAvoided+'/'+checked+', mean challenger/champion cost '+(ratio/checked).toFixed(3));
`)(require,__dirname);
