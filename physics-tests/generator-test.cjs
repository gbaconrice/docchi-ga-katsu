const assert=require('assert'),{api}=require('./harness.cjs'),COST={sword:3,shield:4,spear:3,archer:3,cannon:6,rider:8,healer:4};
let n=0;for(let round=1;round<=20;round++)for(let i=1;i<=200;i++){
 const units=api.generated(Math.imul(i,2654435761)>>>0,round),a=units.filter(u=>u.side===0),b=units.filter(u=>u.side===1),ka=new Set(a.map(u=>u.k)),kb=new Set(b.map(u=>u.k));
 const limit=round<=5?1:round<=11?2:3;assert(ka.size<=limit&&kb.size<=limit);assert(a.length>=1&&b.length>=1&&a.length<=8&&b.length<=8);assert(!(ka.size===1&&kb.size===1&&a[0].k===b[0].k));
 if(round<=5){const ca=a.reduce((s,u)=>s+COST[u.k],0),cb=b.reduce((s,u)=>s+COST[u.k],0);assert.equal(ca,cb);assert(ca>=12&&ca<=24);assert(!units.some(u=>['cannon','healer'].includes(u.k)));}
 n++;
}
console.log('PASS: '+n+' generated battles; rounds1–5 distinct single types/equal spend12–24;6–11≤2;12–20≤3;≤8/army;no same-type-only mirror');
