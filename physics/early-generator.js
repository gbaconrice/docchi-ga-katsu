// Optional opening generator: not installed in index.html by this candidate.
// Uses existing combat stats/costs. No simulation, player choice or winner input.
function generateEarlyArmies(seed){
 const costs={sword:3,shield:4,spear:3,archer:3,rider:8};
 const pool=Object.keys(costs);let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const a=pool[Math.floor(random()*pool.length)],others=pool.filter(k=>k!==a),b=others[Math.floor(random()*others.length)],options=[];
 for(let na=2;na<=8;na++)for(let nb=2;nb<=8;nb++)if(na*costs[a]===nb*costs[b]&&na*costs[a]>=12&&na*costs[a]<=24)options.push([na,nb]);
 const [na,nb]=options[Math.floor(random()*options.length)];
 return {armies:[Array(na).fill(a),Array(nb).fill(b)],spent:[na*costs[a],nb*costs[b]],battleSeed:seed>>>0,costs};
}
if(typeof module!=='undefined')module.exports={generateEarlyArmies};
