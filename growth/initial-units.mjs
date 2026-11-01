/** Production opening unit constructor shared by HTML and offline calibration. */
export function instantiateOpening(plan,types){
 if(!plan||!Number.isSafeInteger(plan.round)||plan.round<1||!Number.isSafeInteger(plan.seed)||plan.seed<0||plan.seed>0xffffffff||!Array.isArray(plan.leftPositions)||!Array.isArray(plan.rightPositions))throw Error('invalid-opening-plan');
 let stream=plan.seed>>>0;const next=()=>{stream=(Math.imul(stream,1664525)+1013904223)>>>0;return stream/4294967296;};
 const units=[];
 for(const [side,positions] of [plan.leftPositions,plan.rightPositions].entries()){
  if(positions.length>64)throw Error('opening-army-cap');
  for(const [i,p] of positions.entries()){
   if(!types[p.k]||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('invalid-opening-unit');
   units.push({id:side*100+i,token:`r${plan.round}:s${plan.seed}:${side}:${i}`,side,k:p.k,x:p.x,y:p.y,hp:types[p.k].hp,cd:next()*.5,priority:next(),dead:false,originForward:side?-1:1});
  }
 }
 return units;
}
