'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(process.env.GAME_HTML||'index.html','utf8');
const harness=fs.readFileSync(path.join(process.cwd(),'tests/bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')",'htmlInput');
new Function('require','htmlInput','assert','outputPath',harness+`
const run=s=>vm.runInContext(s,context,{timeout:120000});
const opening=run(\`(()=>{
 const catalog=Object.fromEntries(['sword','shield','spear','archer','rider'].map(k=>[k,{cost:1,estimateCost:1,radius:1,air:true,earlyEligible:true,starterEligible:true}]));
 const g=TypedGrowthGenerator.createTypedGenerator(catalog,{rightMultiplier:1,estimator:{predict:()=>0}}),left=['sword'];
 const history=['shield','spear','archer','rider'].map(k=>MatchupHistory.key(left,[k]));
 const args={round:2,streak:1,carryKinds:left,seed:51,previousOutcome:'A',matchupHistory:history};
 const a=g.generate(args),b=g.generate(args);
 return {a,b,card:MatchupHistory.key(a.leftKinds,a.rightKinds),history};
})()\`);
assert.deepEqual(opening.a,opening.b);
assert.equal(opening.a.rightKinds.length,2);
assert(!opening.history.includes(opening.card));
assert(!opening.a.historyDecision.repeatRetained);
console.log('PASS opening search finds fresh admitted count after every nearest-count species is exhausted.');
const late=run(\`(()=>{
 const args={round:8,streak:7,carryKinds:Array(8).fill('golden_bowling'),seed:705773,previousOutcome:'A',avoidRight:[]};
 const first=growthGenerator.generate(args),history=[...new Set(first.diverseDecision.candidates.map(c=>MatchupHistory.key(first.leftKinds,c.roster)))];
 const next={...args,matchupHistory:history},t=Date.now(),a=growthGenerator.generate(next),ms=Date.now()-t,b=growthGenerator.generate(next);
 return {history,a,b,ms,card:MatchupHistory.key(a.leftKinds,a.rightKinds)};
})()\`);
assert.deepEqual(late.a,late.b);
assert(late.a.historyDecision.searchAttempts>0);
assert.equal(late.a.diverseDecision.selectedFamily,'history-alternative');
assert(!late.history.includes(late.card));
assert(!late.a.historyDecision.repeatRetained);
assert.deepEqual(Array.from(late.a.leftKinds),Array(8).fill('golden_bowling'));
assert(late.a.actualCosts[1]>=late.a.actualBudgetBand[0]&&late.a.actualCosts[1]<=late.a.actualBudgetBand[1]);
assert(late.a.estimatedCosts[1]>=late.a.band[0]&&late.a.estimatedCosts[1]<=late.a.band[1]);
console.log('PASS exhausted sampled pool triggers bounded single-substitution search: '+late.a.historyDecision.searchAttempts+' attempts, '+late.ms+' ms; fresh card, same incumbent, both cost bands, deterministic.');
if(outputPath)fs.writeFileSync(outputPath,JSON.stringify({opening,late},null,2));
`)(require,html,assert,process.env.MATCHUP_SEARCH_REPORT||null);
