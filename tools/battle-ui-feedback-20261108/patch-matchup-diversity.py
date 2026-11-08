"""Reconstructed bounded whole-run matchup diversity, preserving carried winners."""
MODULE=r'''const MatchupHistory=(()=>{
 const armyKey=kinds=>JSON.stringify([...new Set(kinds)].sort().map(k=>[k,kinds.filter(x=>x===k).length]));
 const key=(left,right)=>JSON.stringify([armyKey(left),armyKey(right)].sort());
 function fromUnits(units){if(!Array.isArray(units)||!units.length||units.some(u=>!u||![0,1].includes(u.side)||typeof u.k!=='string'))return null;const a=units.filter(u=>u.side===0).map(u=>u.k),b=units.filter(u=>u.side===1).map(u=>u.k);return a.length&&b.length?key(a,b):null;}
 function index(history=[]){if(!Array.isArray(history)||history.some(k=>typeof k!=='string'))throw Error('INVALID_MATCHUP_HISTORY');const counts=new Map();history.forEach((k,i)=>{const old=counts.get(k);counts.set(k,{count:(old?.count||0)+1,last:i});});return counts;}
 function diversity(history=[],catalog={},left=[]){
  index(history);const uses=new Map(),armies=new Map();let previous=new Set();
  for(const pair of history){let encoded;try{encoded=JSON.parse(pair);}catch{continue;}if(!Array.isArray(encoded)||encoded.length!==2)continue;const now=new Set();for(const a of encoded){let rows;try{rows=JSON.parse(a);}catch{continue;}if(!Array.isArray(rows)||rows.some(p=>!Array.isArray(p)||p.length!==2||typeof p[0]!=='string'||!Number.isSafeInteger(p[1])||p[1]<1||p[1]>64)||rows.reduce((s,p)=>s+p[1],0)>64)continue;const roster=rows.flatMap(([k,n])=>Array(n).fill(k)),id=armyKey(roster);now.add(id);armies.set(id,roster);if(!previous.has(id))for(const k of new Set(roster))uses.set(k,(uses.get(k)||0)+1);}previous=now;}
  if(left.length)armies.set(armyKey(left),left.slice());
  const price=k=>catalog[k]?.cost||catalog[k]?.estimateCost||1,shares=roster=>{const total=roster.reduce((s,k)=>s+price(k),0),out=new Map();for(const k of roster)out.set(k,(out.get(k)||0)+price(k)/total);return out;},old=[...armies.values()].map(roster=>({id:armyKey(roster),kinds:[...new Set(roster)].sort().join('|'),shares:shares(roster),bosses:new Set(roster.filter(k=>catalog[k]?.boss))}));
  function risk(roster){const id=armyKey(roster),kinds=[...new Set(roster)].sort().join('|'),weights=shares(roster),bosses=new Set(roster.filter(k=>catalog[k]?.boss));let highest=0;for(const prior of old){if(prior.id===id)return 3;if(prior.kinds===kinds){highest=Math.max(highest,2);continue;}let overlap=0;for(const[k,w]of weights)overlap+=Math.min(w,prior.shares.get(k)||0);const sharedBosses=[...bosses].filter(k=>prior.bosses.has(k)).length;if(overlap>=.75-1e-9||sharedBosses>=2)highest=Math.max(highest,1);}return highest;}
  function stats(roster){const kinds=[...new Set(roster)],sum=kinds.reduce((n,k)=>n+(uses.get(k)||0),0);return {reusedFraction:kinds.filter(k=>uses.has(k)).length/Math.max(1,kinds.length),meanUses:sum/Math.max(1,kinds.length)};}
  return {uses,armies,risk,stats};
 }
 function pick(candidates,r,history=[],catalog={}){if(!candidates.length)throw Error('EMPTY_DIVERSITY_POOL');const run=diversity(history,catalog),weights=candidates.map(c=>1/(1+4*run.stats(c.roster).meanUses)**2),total=weights.reduce((a,b)=>a+b,0);let roll=r()*total;for(let i=0;i<candidates.length;i++){roll-=weights[i];if(roll<0)return candidates[i];}return candidates[candidates.length-1];}
 function freshPick(kinds,r,history=[],catalog={}){const run=diversity(history,catalog),fresh=kinds.filter(k=>!run.uses.has(k)),choices=fresh.length?fresh:kinds;return pick(choices.map(k=>({kind:k,roster:[k]})),r,history,catalog).kind;}
 function select(left,candidates,history=[],catalog={}){
  const seen=index(history),unique=[...new Map(candidates.map(c=>[key(left,c.roster),c])).values()],fresh=unique.filter(c=>!seen.has(key(left,c.roster)));let choices=fresh,minimumUses=null;
  if(!choices.length){minimumUses=Math.min(...unique.map(c=>seen.get(key(left,c.roster))?.count||0));const least=unique.filter(c=>(seen.get(key(left,c.roster))?.count||0)===minimumUses),oldest=Math.min(...least.map(c=>seen.get(key(left,c.roster))?.last??-1));choices=least.filter(c=>(seen.get(key(left,c.roster))?.last??-1)===oldest);}
  const run=diversity(history,catalog,left),risk=Math.min(...choices.map(c=>run.risk(c.roster)));choices=choices.filter(c=>run.risk(c.roster)===risk);const reused=Math.min(...choices.map(c=>run.stats(c.roster).reusedFraction));choices=choices.filter(c=>run.stats(c.roster).reusedFraction===reused);
  return {candidates:choices,decision:{version:'run-kind-diversity-v2',previousCards:history.length,uniqueCandidates:unique.length,unseenCandidates:fresh.length,repeatRetained:!fresh.length,reason:!fresh.length?'bounded-legal-candidate-pool-exhausted':risk?'near-repeat-pool-exhausted':null,nearRepeatRetained:risk>0,nearRepeatRisk:risk,reusedKindFraction:reused,minimumUses}};
 }
 return Object.freeze({armyKey,key,fromUnits,index,diversity,pick,freshPick,select});
})();
'''
def patch(source):
    if "version:'run-kind-diversity-v2'" in source:return source
    def replace(old,new,count=1):
        nonlocal source
        found=source.count(old)
        assert found==count, f'diversity anchor {found} != {count}: {old[:110]}'
        source=source.replace(old,new)
    a=source.index('const MatchupHistory=(()=>{');b=source.index('const TypedGrowthGenerator=',a);source=source[:a]+MODULE+source[b:]
    replace('function generate({round,streak,carryKinds,seed,previousOutcome=null,challengerMultiplier=null})', 'function generate({round,streak,carryKinds,seed,previousOutcome=null,challengerMultiplier=null,matchupHistory=[]})')
    replace('left.push(starters[Math.floor(r()*starters.length)]);', 'left.push(MatchupHistory.freshPick(starters,r,matchupHistory,catalog));')
    replace('addKinds.push(extra[Math.floor(r()*extra.length)])', 'addKinds.push(MatchupHistory.freshPick(extra,r,matchupHistory,catalog))')
    replace('left.push(choices[Math.floor(r()*choices.length)]);', 'left.push(MatchupHistory.freshPick(choices,r,matchupHistory,catalog));',2)
    replace('args.matchupHistory||[]),pickable=historySelection.candidates', 'args.matchupHistory||[],catalog),pickable=historySelection.candidates')
    replace('best=pickable[Math.floor(pickRandom()*pickable.length)]', 'best=MatchupHistory.pick(pickable,pickRandom,args.matchupHistory||[],catalog)')
    replace('const historySelection=MatchupHistory.select(left,historyPool,history);', 'const historySelection=MatchupHistory.select(left,historyPool,history,catalog);')
    replace('const roster=base.slice();roster[i]=k;', 'const roster=base.map(old=>old===base[i]?k:old);',2)
    replace('const history=args.matchupHistory||[],historyIndex=MatchupHistory.index(history);', 'const history=args.matchupHistory||[],historyIndex=MatchupHistory.index(history),historyDiversity=MatchupHistory.diversity(history,catalog,left);')
    replace('if(history.length&&!historyPool.some(c=>!historyIndex.has(MatchupHistory.key(left,c.roster))))', 'if(history.length&&!historyPool.some(c=>!historyIndex.has(MatchupHistory.key(left,c.roster))&&historyDiversity.risk(c.roster)===0))')
    old='let best=pickFrom[0];if(near.length)best=near[Math.floor(pickRandom()*near.length)];else for(const c of pickFrom.slice(1))if(Math.abs(cost(c.roster)-target)<Math.abs(cost(best.roster)-target))best=c;'
    new='const closest=Math.min(...pickFrom.map(c=>Math.abs(cost(c.roster)-target))),weightedChoices=near.length?near:pickFrom.filter(c=>Math.abs(cost(c.roster)-target)===closest);let best=MatchupHistory.pick(weightedChoices,pickRandom,history,catalog);'
    replace(old,new)
    return source
