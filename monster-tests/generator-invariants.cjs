const assert=require('assert'),{api}=require('./harness.cjs');
const costs={sword:3,shield:4,spear:3,archer:3,cannon:6,rider:8,healer:4,goblin:2,golem:9,drake:7,wraith:8};
let generated=0,flyers=0;
for(let round=1;round<=20;round++)for(let i=1;i<=200;i++){
 const units=api.generated(Math.imul(i,2654435761)>>>0,round),sides=[0,1].map(side=>units.filter(u=>u.side===side)),kinds=sides.map(a=>new Set(a.map(u=>u.k))),limit=round<=5?1:round<=11?2:3;
 assert(kinds.every(s=>s.size<=limit));assert(sides.every(a=>a.length>0&&a.length<=8));assert(!(kinds[0].size===1&&kinds[1].size===1&&sides[0][0].k===sides[1][0].k));
 for(let side=0;side<2;side++)if(kinds[side].has('drake')){flyers++;assert(sides[1-side].some(u=>api.TYPES[u.k].attackTargetMask.includes('air')))}
 if(round<6)assert(!units.some(u=>['goblin','golem','drake','wraith'].includes(u.k)));
 if(round<8)assert(!units.some(u=>u.k==='golem'));if(round<12)assert(!units.some(u=>u.k==='drake'));if(round<15)assert(!units.some(u=>u.k==='wraith'));
 if(round<=5)assert.equal(sides[0].reduce((n,u)=>n+costs[u.k],0),sides[1].reduce((n,u)=>n+costs[u.k],0));generated++;
}
function compare(a,b,mirrored=false){
 assert.equal(a.winner,b.winner===null?null:mirrored?1-b.winner:b.winner);assert.equal(a.ticks,b.ticks);
 const bs=new Map(b.units.map(u=>[u.token,u]));assert.equal(a.units.length,b.units.length);
 for(const u of a.units){const v=bs.get(u.token);assert(v,u.token);assert.equal(u.dead,v.dead);assert(Math.abs(u.hp-v.hp)<1e-6);assert(Math.abs(u.x-v.x)<1e-6);assert(Math.abs(u.y-(mirrored?538-v.y:v.y))<1e-6);}
 assert.deepEqual(a.pendingSummons.map(u=>u.token).sort(),b.pendingSummons.map(u=>u.token).sort());
}
for(let i=1;i<=100;i++){
 const initial=api.generated((77000000+i*7919)>>>0,6+i%15),a=api.run(initial),mirror=api.run(initial.map(u=>({...u,side:1-u.side,y:538-u.y}))),reverse=api.run([...initial].reverse()),choice=api.run(initial,{choice:1});
 compare(a,mirror,true);compare(a,reverse);compare(a,choice);
}
console.log(JSON.stringify({pass:true,generated,flyerArmies:flyers,mirrorListChoiceSeeds:100,constraints:'unlock6/8/12/15;normal≤8 initial/army;anti-air eligibility;no post-outcome reroll'}));
