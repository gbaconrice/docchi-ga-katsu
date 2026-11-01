/** Offline calibration policy injection. No simulated outcome is read when generating a roster. */
module.exports=function apply(script,cfg){
 if(!cfg||cfg.baseline)return script;
 const begin=script.indexOf('function makeArmy(r,side){'),end=script.indexOf('\nfunction setup(s)',begin);if(begin<0||end<0)throw Error('generator anchors missing');
 const original=script.slice(begin,end);let gen=original.replaceAll('COST[k]','BALANCE_COST[k]');
 const planned=/ const planned=side===1\?[^\n]+;/;
 if(!planned.test(gen))throw Error('planned budget anchor missing');
 gen=gen.replace(planned,` const planned=side===1?Math.min(160,Math.max(Math.round((12+2*(stage-1))*${cfg.floorFactor}),Math.ceil(leftArmyCost*Math.pow(${cfg.multiplier}+Math.min(carryStreak,4)*${cfg.streak},advance))+Math.round(${cfg.additive}*advance))):12+Math.min(12,Math.floor((stage-1)/2))+Math.floor(r()*5)-2;`);
 const a=gen.indexOf(' function consider(kinds){'),b=gen.indexOf('\n function combinations(',a);if(a<0||b<0)throw Error('packing anchor missing');
 gen=gen.slice(0,a)+` function consider(kinds){
  if(needAir&&!kinds.some(k=>TYPES[k].attackTargetMask?.includes('air')))return;
  // Static cost and known-roster interaction surcharge only; no battle outcome or prediction input.
  const costFor=k=>BALANCE_COST[k]+(${!!cfg.counter}&&previousArmyKinds.includes('drake')&&TYPES[k].attackTargetMask?.includes('air')?1:0)+(${!!cfg.counter}&&leftArmyCount>=12&&['stormmage','cannon','bombbug'].includes(k)?1:0)+(${!!cfg.synergy}&&k==='healer'&&kinds.some(x=>['golem','shield'].includes(x))?1:0)+(${!!cfg.synergy}&&k==='stormmage'&&kinds.some(x=>['healer','shield','frostmage'].includes(x))?1:0);
  const base=kinds.reduce((n,k)=>n+costFor(k),0),limit=planned-base;if(limit<0)return;
  const dp=Array(limit+1).fill(Infinity),prev=Array(limit+1);dp[0]=0;
  for(let v=1;v<=limit;v++)for(const k of kinds){const cost=costFor(k);if(v>=cost&&dp[v-cost]+1<dp[v]){dp[v]=dp[v-cost]+1;prev[v]=k;}}
  let value=limit;while(value>0&&dp[value]>unitCap-kinds.length)value--;
  if(dp[value]>unitCap-kinds.length)return;
  const spent=base+value,roster=[...kinds];while(value>0){const k=prev[value];roster.push(k);value-=costFor(k);}
  if(roster.filter(k=>k==='healer').length>Math.max(1,Math.floor(roster.length*${cfg.supportCap})))return;
  if(spent<bestSpent)return;if(spent>bestSpent){options.length=0;bestSpent=spent;}options.push(roster);
 }`+gen.slice(b);
 const prefix=`const BALANCE_COST=Object.fromEntries(Object.entries(COST).map(([k,v])=>[k,Math.max(1,Math.round(v*(${JSON.stringify(cfg.weights||{})}[k]||1)))]));let leftArmyCount=0;\n`;
 script=script.slice(0,begin)+prefix+gen+script.slice(end);
 script=script.replace('const leftArmy=makeArmy(r,0);','const leftArmy=makeArmy(r,0);leftArmyCount=leftArmy.length;').replace('leftArmyCost=leftArmy.reduce((n,u)=>n+COST[u.k],0);','leftArmyCost=leftArmy.reduce((n,u)=>n+BALANCE_COST[u.k],0);');
 return script;
};
