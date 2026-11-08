"""Draws retire both initial armies; deterministic fresh generation, no combat changes."""
def patch(source):
    def replace(old, new, count=1):
        nonlocal source
        found = source.count(old)
        if found != count:
            raise ValueError(f'draw patch anchor expected {count}, found {found}: {old[:100]}')
        source = source.replace(old, new)
    replace("winner-initial-carry-no-add-v2-draw-retains-left", "winner-initial-carry-no-add-v3-draw-fresh", 2)
    replace("draw:'retain-initial-left-full-heal'", "draw:'fresh-both-armies'")
    replace("const fresh=previousOutcome==='invalid';if(previousOutcome==='draw'&&!carryKinds.length)throw Error('DRAW_REQUIRES_INCUMBENT_INITIAL');", "const fresh=previousOutcome==='invalid'||previousOutcome==='draw';")
    # Only draws use a bounded deterministic seed walk. Do not reroll a winning
    # incumbent, change prices, or inspect simulation outcomes to choose a card.
    anchor = " function generate(args){const plan=generateCore(args);const meta="
    replacement = """ function generateDrawFresh(args){
  if(!Number.isSafeInteger(args.seed)||args.seed<0||args.seed>0xffffffff||!Array.isArray(args.carryKinds))throw Error('INVALID_INPUT');
  if(args.carryKinds.length||args.streak!==0)throw Error('FRESH_ROUND_CONFLICT');
  const retired=args.avoidArmies||[],retiredKeys=new Set(retired.filter(a=>Array.isArray(a)&&a.length).map(signature)),seen=MatchupHistory.index(args.matchupHistory||[]);
  for(let attempt=0;attempt<64;attempt++){
   const candidateSeed=(args.seed+Math.imul(attempt,0x9e3779b9))>>>0,plan=generateCore({...args,seed:candidateSeed});
   if(retiredKeys.has(signature(plan.leftKinds))||retiredKeys.has(signature(plan.rightKinds))||seen.has(MatchupHistory.key(plan.leftKinds,plan.rightKinds)))continue;
   return freeze({...plan,drawFreshDecision:{version:'draw-fresh-both-v1',requestedSeed:args.seed,selectedSeed:candidateSeed,attempts:attempt+1,retiredArmies:retiredKeys.size}});
  }
  throw Error('NO_FRESH_DRAW_MATCHUP');
 }
 function generate(args){const plan=args.previousOutcome==='draw'?generateDrawFresh(args):generateCore(args);const meta="""
    replace(anchor,replacement)
    # Ignore stale carry at the UI boundary, and use the authoritative matchup
    # for a host, rather than replay-mutated entities or client-local state.
    replace("const nextSeed=s>>>0,base=pendingCarryKinds?[...pendingCarryKinds]:[],generated=", "const requestedSeed=s>>>0,base=pendingCarryOutcome==='draw'?[]:pendingCarryKinds?[...pendingCarryKinds]:[],drawUnits=pendingCarryOutcome==='draw'&&multiSession?multiSession.getState()?.matchup?.units:null,retiredArmies=drawUnits?[0,1].map(side=>drawUnits.filter(u=>u.side===side).map(u=>u.k)):initialKinds,generated=")
    replace("carryKinds:base,seed:nextSeed,previousOutcome:pendingCarryOutcome,", "carryKinds:base,seed:requestedSeed,previousOutcome:pendingCarryOutcome,avoidArmies:pendingCarryOutcome==='draw'?retiredArmies:null,")
    replace("}), incumbentSide=pendingCarryOutcome==='B'?1:0, mirror=", "}), nextSeed=generated.seed, incumbentSide=pendingCarryOutcome==='B'?1:0, mirror=")
    replace("pendingCarryKinds=[...initialKinds[winner===1?1:0]];carryStreak=winner===null?carryStreak:", "pendingCarryKinds=winner===null?null:[...initialKinds[winner===1?1:0]];carryStreak=winner===null?0:")
    replace("s.winner==='draw'?carryStreak:", "s.winner==='draw'?0:")
    replace("pendingCarryKinds=s.phase==='result'&&['A','B','draw'].includes(s.winner)?", "pendingCarryKinds=s.phase==='result'&&['A','B'].includes(s.winner)?")
    return source
