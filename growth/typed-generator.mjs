/** Experimental shape-first generator. Shape draw is seed-only; no physics/outcome query. */
import{createGenerator}from'./candidate-generator.mjs';
const random=seed=>()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const unlock={goblin:3,boar:3,slime:3,bombbug:6,frostmage:6,golem:8,stormmage:10,burrower:12,drake:12,wraith:12,screech_cricket:7,reaper_mantis:7,spore_toad:9,rootwarden_treant:11,sky_harpooner:10,bounty_hound:8,siege_crab:12};
export const TYPED_CONFIG=Object.freeze({version:'shape-first-v1',lateFromRound:7,swarmProbability:.25,giantProbability:.10,swarmMin:50,swarmMax:64,giantMax:20,candidates:32});
export function createTypedGenerator(catalog,options){if(!options.estimator)throw Error('typed-model-required');const normal=createGenerator(catalog,options),cost=ks=>ks.reduce((s,k)=>s+catalog[k].estimateCost,0),actual=ks=>ks.reduce((s,k)=>s+catalog[k].cost,0),compose=ks=>Object.fromEntries([...new Set(ks)].map(k=>[k,ks.filter(v=>v===k).length]));
 function generate(args){
  const randomMode=random((args.seed^0x72f4a1b9)>>>0),modeRoll=randomMode(),requested=args.round<7?'normal':modeRoll<.25?'swarm':modeRoll<.35?'giant':'normal';
  // Prebuilt fallback avoids an unbounded retry; its left roster is exactly the frozen original generator's.
  const plan=normal.generate(args),fallback=reason=>freeze({...plan,archetypeDecision:{version:TYPED_CONFIG.version,requested,realized:'normal',fallbackReason:reason,modeRoll,candidates:0}});
  if(requested==='normal')return fallback(null);
  const stage=args.round>=10?20:1+Math.floor((args.round-1)*19/9),hasAir=plan.leftKinds.some(k=>catalog[k].air),needAir=plan.leftKinds.includes('drake');
  let pool=Object.keys(catalog).sort().filter(k=>stage>=(unlock[k]||1)&&(hasAir||k!=='drake'));
  if(requested==='swarm'&&plan.leftKinds.every(k=>k==='drake'))return fallback('swarm-ineligible-all-air-opponent');
  const lo=plan.band[0],hi=plan.band[1],target=Math.round(plan.estimatedCosts[0]*options.rightMultiplier),r=random((args.seed^0xc2851a3d)>>>0),large=pool.filter(k=>catalog[k].radius>=25),cheap=pool.filter(k=>catalog[k].cost<=3),a=compose(plan.leftKinds),candidates=[];let minCountImpossible=0,fitFailures=0;
  for(let sample=0;sample<32;sample++){
   let kinds;
   if(requested==='swarm'){const fixed=['goblin','screech_cricket'].filter(k=>cheap.includes(k)),third=cheap.filter(k=>!fixed.includes(k)&&(!needAir||catalog[k].air));if(fixed.length!==2||!third.length)continue;kinds=[...fixed,third[Math.floor(r()*third.length)]];}
   else{if(large.length<2)continue;const shuffled=large.slice().sort();for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}const first=shuffled.slice(0,2),third=pool.filter(k=>!first.includes(k)&&(!needAir||catalog[k].air));if(!third.length)continue;kinds=[...first,third[Math.floor(r()*third.length)]];}
   const prices=kinds.map(k=>catalog[k].estimateCost),minPrice=Math.min(...prices),maxPrice=Math.max(...prices),lower=Math.max(kinds.length,requested==='swarm'?50:3,Math.ceil(lo/maxPrice)),upper=Math.min(requested==='swarm'?64:20,Math.floor(hi/minPrice));if(lower>upper){minCountImpossible++;continue;}
   const n=lower+Math.floor(r()*(upper-lower+1)),roster=kinds.slice();
   while(roster.length<n){const remaining=n-roster.length-1,spent=cost(roster);const allowed=kinds.filter(k=>{const next=spent+catalog[k].estimateCost;return next+remaining*minPrice<=hi&&next+remaining*maxPrice>=lo&&normal.fit([...roster,k])});if(!allowed.length)break;roster.push(allowed[Math.floor(r()*allowed.length)]);}
   if(roster.length!==n||cost(roster)<lo||cost(roster)>hi||!normal.fit(roster)){fitFailures++;continue;}
   if(requested==='giant'&&roster.filter(k=>catalog[k].radius>=25).length<Math.ceil(n/2))continue;
   if(roster.filter(k=>k==='healer').length>Math.max(1,Math.floor(n*.35)))continue;
   const margin=options.estimator.predict([a,compose(roster)]);if(!Number.isFinite(margin))throw Error('typed-invalid-model');candidates.push({roster,margin,sample});
  }
  if(!candidates.length)return fallback(minCountImpossible===32?'count-budget-infeasible':'no-feasible-typed-roster');
  candidates.sort((a,b)=>Math.abs(a.margin)-Math.abs(b.margin)||Math.abs(cost(a.roster)-target)-Math.abs(cost(b.roster)-target)||a.sample-b.sample);const best=candidates[0],right=best.roster;
  return freeze({...plan,generatorVersion:'shape-first-model-candidate-v1',rightKinds:right,rightPositions:normal.fit(right).map(p=>({...p,x:480-p.x})),estimatedCosts:[plan.estimatedCosts[0],cost(right)],actualCosts:[plan.actualCosts[0],actual(right)],modelDecision:{modelId:options.estimator.modelId||'candidate-unstamped',predictedMargin:best.margin,candidateCount:candidates.length,selection:'shape first, absolute predicted margin; no solver'},archetypeDecision:{version:TYPED_CONFIG.version,requested,realized:requested,fallbackReason:null,modeRoll,candidates:candidates.length,minCountImpossible,fitFailures,normalFallbackPool:32,typedPool:32}});
 }
 return Object.freeze({generate,fit:normal.fit,estimateCost:normal.estimateCost,catalog:normal.catalog});
}
