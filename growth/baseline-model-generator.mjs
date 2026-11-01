/** Bounded pre-bet roster generator. No simulation, outcomes, prediction, money or I/O. */
export const GENERATOR_VERSION='reinforced-left-prototype-v1';
export const LIMITS=Object.freeze({perArmy:64,candidateSamples:32,left:8,right:232,top:10,bottom:528,gap:2});
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v};
const rnd=seed=>()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
export function createGenerator(inputCatalog,{growthPerRound=10,rightMultiplier=1,estimator=null}={}){
 if(!Number.isFinite(rightMultiplier)||rightMultiplier<=0)throw Error("INVALID_MULTIPLIER");
 if(!Number.isSafeInteger(growthPerRound)||growthPerRound<0)throw Error("INVALID_GROWTH");
 const catalog=JSON.parse(JSON.stringify(inputCatalog)),keys=Object.keys(catalog).sort();for(const k of keys){const t=catalog[k];if(!Number.isSafeInteger(t.cost)||t.cost<1||!Number.isSafeInteger(t.estimateCost)||t.estimateCost<1||!Number.isFinite(t.radius)||t.radius<=0)throw Error('INVALID_CATALOG')}freeze(catalog);
 const cost=kinds=>kinds.reduce((s,k)=>s+catalog[k].estimateCost,0),actual=kinds=>kinds.reduce((s,k)=>s+catalog[k].cost,0),maxBudget=Math.max(...keys.map(k=>catalog[k].estimateCost))*64;
 function fit(kinds){if(!Array.isArray(kinds)||kinds.length>64||kinds.some(k=>!catalog[k]))return null;const sorted=kinds.map((k,i)=>({k,i,r:catalog[k].radius})).sort((a,b)=>b.r-a.r||a.k.localeCompare(b.k)||a.i-b.i);let x=8,y=10,rowHeight=0;const placed=[];for(const u of sorted){const size=2*u.r;if(x+size>232+1e-9){x=8;y+=rowHeight+2;rowHeight=0}if(y+size>528+1e-9)return null;placed.push({k:u.k,inputIndex:u.i,x:x+u.r,y:y+u.r,radius:u.r});x+=size+2;rowHeight=Math.max(rowHeight,size)}return placed.sort((a,b)=>a.inputIndex-b.inputIndex)}
 const unlock={goblin:3,boar:3,slime:3,bombbug:6,frostmage:6,golem:8,stormmage:10,burrower:12,drake:12,wraith:12,screech_cricket:7,reaper_mantis:7,spore_toad:9,rootwarden_treant:11,sky_harpooner:10,bounty_hound:8,siege_crab:12};
 function generate({round,streak,carryKinds,seed,previousOutcome=null}){
  if(!Number.isSafeInteger(round)||round<1||!Number.isSafeInteger(streak)||streak<0||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||!Array.isArray(carryKinds)||carryKinds.some(k=>!catalog[k]))throw Error('INVALID_INPUT');
  if(![null,'A','B','draw','invalid'].includes(previousOutcome))throw Error('INVALID_PREVIOUS_OUTCOME');const fresh=previousOutcome==='draw'||previousOutcome==='invalid';if(fresh&&(carryKinds.length||streak!==0))throw Error('FRESH_ROUND_CONFLICT');if(round>1&&!carryKinds.length&&!fresh)throw Error('MISSING_CARRY');if(!fit(carryKinds))throw Error('CARRY_DOES_NOT_FIT');
  const r=rnd(seed),stage=round>=10?20:1+Math.floor((round-1)*19/9),pool=keys.filter(k=>stage>=(unlock[k]||1)&&(stage>5||['sword','shield','spear','archer','rider','goblin','boar','slime'].includes(k)));
  const base=carryKinds.slice(),left=base.slice();if(!left.length){const starters=round===1?['sword','shield','spear','archer','rider']:pool.filter(k=>k!=='healer');left.push(starters[Math.floor(r()*starters.length)]);}
  const baseCost=cost(left),target=Math.min(maxBudget,round===1?18:Math.max(baseCost+Math.max(4,Math.ceil(baseCost*.12)),18+Math.min(growthPerRound,maxBudget)*Math.min(round-1,maxBudget)));
  const oldKinds=[...new Set(left)],addKinds=oldKinds.slice();if(round>=7&&oldKinds.length<3){const extra=pool.filter(k=>!oldKinds.includes(k)&&k!=='healer');if(extra.length)addKinds.push(extra[Math.floor(r()*extra.length)]);}
  let leftAttempts=0;while(left.length<64){const candidates=addKinds.filter(k=>cost(left)+catalog[k].estimateCost<=target&&fit([...left,k]));leftAttempts+=addKinds.length;if(!candidates.length)break;const existing=candidates.filter(k=>oldKinds.includes(k));const choices=existing.length&&(r()<.85||!candidates.some(k=>!oldKinds.includes(k)))?existing:candidates;left.push(choices[Math.floor(r()*choices.length)]);}
  const leftCost=cost(left),requiredKinds=round<=3?1:round<=6?2:3,needAir=left.includes('drake'),hasAir=left.some(k=>catalog[k].air);let rightPool=pool.filter(k=>hasAir||k!=='drake');if(new Set(left).size===1&&round<=3)rightPool=rightPool.filter(k=>k!==left[0]);
  const rightTarget=Math.min(maxBudget,Math.round(leftCost*rightMultiplier)),lo=Math.floor(rightTarget*.9),hi=Math.ceil(rightTarget*1.1),samples=[];const safe=['archer','sword','shield','spear','goblin'].filter(k=>rightPool.includes(k));samples.push(safe.slice(0,requiredKinds));
  for(let i=1;i<32;i++){const a=rightPool.slice();for(let j=a.length-1;j>0;j--){const n=Math.floor(r()*(j+1));[a[j],a[n]]=[a[n],a[j]]}samples.push(i===1&&['wraith','rider','stormmage'].every(k=>rightPool.includes(k))?['wraith','rider','stormmage'].slice(0,requiredKinds):a.slice(0,requiredKinds));}
  let best=null,bestDistance=Infinity,rightAttempts=0;const representatives=[];
  for(const kinds of samples){if(kinds.length!==requiredKinds||(needAir&&!kinds.some(k=>catalog[k].air)))continue;let representative=null,representativeDistance=Infinity;const roster=kinds.slice();if(cost(roster)>hi||!fit(roster))continue;
   for(let step=0;step<=64;step++){const spent=cost(roster),support=roster.filter(k=>k==='healer').length;if(spent>=lo&&spent<=hi&&support<=Math.max(1,Math.floor(roster.length*.35))){const distance=Math.abs(spent-rightTarget);if(distance<representativeDistance){representative=roster.slice();representativeDistance=distance;}if(distance<bestDistance||(distance===bestDistance&&r()<.5)){best=roster.slice();bestDistance=distance}}
    if(roster.length===64)break;const additions=kinds.filter(k=>spent+catalog[k].estimateCost<=hi&&fit([...roster,k]));rightAttempts+=kinds.length;if(!additions.length)break;const k=additions[Math.floor(r()*additions.length)];roster.push(k);
   }
   if(representative)representatives.push(representative);
  }
  if(!best)throw Error('NO_FEASIBLE_CHALLENGER');
  let modelDecision=null;if(estimator){const compose=ks=>Object.fromEntries([...new Set(ks)].map(k=>[k,ks.filter(x=>x===k).length])),a=compose(left);const ranked=representatives.map((roster,i)=>({roster,i,margin:estimator.predict([a,compose(roster)])}));if(ranked.some(v=>!Number.isFinite(v.margin)))throw Error('INVALID_ESTIMATED_MARGIN');ranked.sort((a,b)=>Math.abs(a.margin)-Math.abs(b.margin)||Math.abs(cost(a.roster)-rightTarget)-Math.abs(cost(b.roster)-rightTarget)||a.i-b.i);best=ranked[0].roster;modelDecision={modelId:estimator.modelId||'candidate-unstamped',predictedMargin:ranked[0].margin,candidateCount:ranked.length,selection:'absolute predicted margin only; no solver'};}
  const additions=left.slice(base.length),leftPositions=fit(left),rightPositions=fit(best).map(p=>({...p,x:480-p.x}));
  return freeze({generatorVersion:estimator?'composition-ranking-candidate-v1':GENERATOR_VERSION,modelDecision,growthPerRound,rightMultiplier,round,seed,streak,previousOutcome,baseKinds:base,reinforcementKinds:additions,leftKinds:left,rightKinds:best,leftPositions,rightPositions,estimatedCosts:[leftCost,cost(best)],actualCosts:[actual(left),actual(best)],targetCost:target,band:[lo,hi],basePreserved:true,leftGrowthLimited:leftCost<target,requiredRightKinds:requiredKinds,work:{sampledCombinations:32,leftAttempts,rightAttempts}});
 }
 return Object.freeze({generate,fit,estimateCost:cost,catalog});
}
