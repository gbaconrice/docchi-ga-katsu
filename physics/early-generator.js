// Optional opening generator: not installed in index.html by this candidate.
// Uses existing combat stats/costs. No simulation, player choice or winner input.
function generateEarlyArmies(seed,eligibleCosts=null,featuredKinds=null){
 const costs=eligibleCosts||{sword:3,shield:4,spear:3,archer:3,rider:8};
 const counts=(a,b)=>{const result=[];for(let na=2;na<=8;na++)for(let nb=2;nb<=8;nb++)if(na*costs[a]===nb*costs[b]&&na*costs[a]>=12&&na*costs[a]<=24)result.push([na,nb]);return result};
 const all=Object.keys(costs),pool=all.filter(a=>all.some(b=>a!==b&&counts(a,b).length));if(pool.length<2)throw Error('no-opening-pair');let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const firstPool=featuredKinds?pool.filter(k=>featuredKinds.includes(k)):pool;if(!firstPool.length)throw Error('no-featured-opening-pair');
 const a=firstPool[Math.floor(random()*firstPool.length)],others=pool.filter(k=>k!==a&&counts(a,k).length),b=others[Math.floor(random()*others.length)],options=[];
 for(let na=2;na<=8;na++)for(let nb=2;nb<=8;nb++)if(na*costs[a]===nb*costs[b]&&na*costs[a]>=12&&na*costs[a]<=24)options.push([na,nb]);
 const [na,nb]=options[Math.floor(random()*options.length)];
 const armies=[Array(na).fill(a),Array(nb).fill(b)];if(featuredKinds&&(seed&1))armies.reverse();
 return {armies,spent:[na*costs[a],nb*costs[b]],battleSeed:seed>>>0,costs};
}
if(typeof module!=='undefined')module.exports={generateEarlyArmies};
