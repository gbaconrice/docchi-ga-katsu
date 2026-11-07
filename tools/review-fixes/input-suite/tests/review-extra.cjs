const fs=require('fs'),assert=require('assert');let smoke=fs.readFileSync('tests/bet-ui-smoke.cjs','utf8'),h=smoke.slice(0,smoke.indexOf("for(const id of ['#red'"));global.assert=assert;new Function('require','__dirname',h+`
const ev=s=>vm.runInContext(s,context),sig=a=>a.slice().sort().join('|');let total=0,repeated=[],determinism=0,air=0;
for(let seed=1;seed<=20;seed++){
 const first=ev('growthGenerator.generate({round:1,streak:0,carryKinds:[],seed:'+seed+',previousOutcome:null})');
 for(const round of [2,7,10,14]){
  let input={round,streak:round<4?1:4,carryKinds:first.leftKinds,seed:seed*7919+round,previousOutcome:'A'};
  const initial=ev('growthGenerator.generate('+JSON.stringify(input)+')');input.avoidRight=initial.rightKinds;
  const x=ev('growthGenerator.generate('+JSON.stringify(input)+')'),y=ev('growthGenerator.generate('+JSON.stringify(input)+')');total++;if(sig(x.rightKinds)===sig(initial.rightKinds))repeated.push({seed,round});if(sig(x.rightKinds)!==sig(y.rightKinds))determinism++;if(x.leftKinds.some(k=>ev('!!growthGenerator.catalog['+JSON.stringify(k)+'].flying')))air++;
 }
}
if(total!==80||repeated.length||determinism)throw Error(JSON.stringify({total,repeated,determinism}));console.log('PASS 80 sampled carries avoid repeats and reproduce from same seed');
`)(require,'tests');
