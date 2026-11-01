const assert=require('assert');
const {api}=require('./harness.cjs');
const baseApi=require('./baseline-v5-harness.cjs').api;
const clone=x=>JSON.parse(JSON.stringify(x));
function u(k,side,x,y,extra={}){
 const id=extra.id??`${side}:${k}:${extra.n??0}`;
 return {k,side,x,y,hp:extra.hp??api.TYPES[k].hp,cd:extra.cd??0,priority:extra.priority??0.25,dead:false,id,token:extra.token??String(id),...extra};
}
function run(input,opt={}){return api.run(input,opt)}
function reflected(input){return input.map(v=>({...v,side:1-v.side,y:538-v.y,originForward:v.originForward===undefined?undefined:-v.originForward}))}
function byToken(result){return Object.fromEntries(result.units.map(v=>[v.token,v]))}
function compareRuns(a,b,mirror=false){
 assert.equal(a.winner,b.winner===null?null:mirror?1-b.winner:b.winner);assert.equal(a.state,b.state);assert.ok(Math.abs(a.seconds-b.seconds)<1e-9);
 const aa=byToken(a),bb=byToken(b);assert.deepEqual(Object.keys(aa).sort(),Object.keys(bb).sort());
 for(const t of Object.keys(aa)){const x=aa[t],y=bb[t];assert.equal(x.dead,y.dead,`dead ${t}`);assert.ok(Math.abs(x.hp-y.hp)<1e-6,`hp ${t}`);assert.ok(Math.abs(x.x-y.x)<1e-6,`x ${t}`);assert.ok(Math.abs(x.y-(mirror?538-y.y:y.y))<1e-6,`y ${t}: ${x.y} vs ${y.y}`)}
 const pa=a.pendingSummons.map(x=>x.token).sort(),pb=b.pendingSummons.map(x=>x.token).sort();assert.deepEqual(pa,pb);
}
function formation(k,n,side,seed=1){const xs=side===0?[90,122,154]:[326,358,390],out=[];for(let i=0;i<n;i++){const x=xs[i%3]+((seed*7+i*11)%9)-4,y=(side===0?130:408)+(side===0?1:-1)*Math.floor(i/3)*28+((seed*3+i*5)%7)-3,priority=((seed*13+i*37)%101)/101,cd=((seed*11+i*17)%30)/60;out.push(u(k,side,x,y,{id:`${side}-${k}-${i}`,token:`${side}-${k}-${i}`,priority,cd}))}return out}
function match(k0,n0,k1,n1,seed=1,opts={}){return run([...formation(k0,n0,0,seed),...formation(k1,n1,1,seed)],opts)}

// Base seven-kind regression: exact trajectories match the unextended collision core.
{
 const input=[u('sword',0,120,140,{id:0,token:'a',priority:.1}),u('archer',0,150,160,{id:1,token:'b',priority:.3}),u('rider',1,340,360,{id:2,token:'c',priority:.2}),u('shield',1,370,380,{id:3,token:'d',priority:.4})];
 const a=run(input,{ticks:200}),b=baseApi.run(input,{ticks:200});assert.equal(a.winner,b.winner);assert.equal(a.state,b.state);assert.equal(a.ticks,b.ticks);const aa=byToken(a),bb=byToken(b);for(const t of Object.keys(aa)){assert.ok(Math.abs(aa[t].hp-bb[t].hp)<1e-8,`legacy hp ${t}`);assert.ok(Math.abs(aa[t].x-bb[t].x)<1e-8,`legacy x ${t}`);assert.ok(Math.abs(aa[t].y-bb[t].y)<1e-8,`legacy y ${t}`)}
}
// Ground melee excludes the air layer; drake can still hit ground, and flight ignores ground bodies.
{
 const input=[u('sword',0,220,220,{id:'ground'}),u('drake',1,220,220,{id:'air'})];const r=run(input,{ticks:1});const m=byToken(r);assert.equal(m.ground.hp,75);assert.equal(m.air.hp,api.TYPES.drake.hp);assert.equal(Math.hypot(m.ground.x-m.air.x,m.ground.y-m.air.y),0);
}
// Explicit anti-air ranged mask: archer damages drake; no reliance on sprite/radius.
{
 const r=run([u('archer',0,220,200,{id:'aa'}),u('drake',1,220,320,{id:'dd'})],{ticks:90});const flyer=r.units.find(x=>x.k==='drake');assert.ok(flyer.hp<api.TYPES.drake.hp,`archer should hit flyer: ${flyer.hp}`);
}
// Wraith's magic projectile explicitly reaches the air layer too (it need not beat a drake to register valid damage).
{
 const r=run([u('wraith',0,220,200,{id:'mage'}),u('drake',1,220,320,{id:'flyer'})],{ticks:1200});const flyer=r.units.find(x=>x.k==='drake');assert.ok(flyer.hp<api.TYPES.drake.hp,`wraith should hit flyer: ${flyer.hp}`);
}
// Splash also respects the launcher's mask; the ground-only test cannon must not splash a nearby flyer.
{
 const old=api.TYPES.cannon.attackTargetMask;api.TYPES.cannon.attackTargetMask=['ground'];const r=run([u('cannon',0,220,200,{id:'cannon'}),u('sword',1,220,280,{id:'ground-target'}),u('drake',1,240,280,{id:'air-bystander'})],{ticks:120});api.TYPES.cannon.attackTargetMask=old;const m=byToken(r);assert.ok(m['ground-target'].hp<api.TYPES.sword.hp);assert.equal(m['air-bystander'].hp,api.TYPES.drake.hp);
}
// Flying bodies still collide with same-layer flyers; ground bodies remain separate.
{
 const r=run([u('drake',0,100,100,{id:'a'}),u('drake',0,100,100,{id:'b'}),u('sword',1,430,430,{id:'g'})],{ticks:1});const d=r.units.filter(x=>x.k==='drake');assert.ok(Math.hypot(d[0].x-d[1].x,d[0].y-d[1].y)>1,'air/air overlap should resolve');
}
// Variable-radius grid catches a 25+25px body overlap crossing two 48px cells.
{
 const r=run([u('golem',0,47.5,100,{id:'big-a'}),u('golem',0,96.8,100,{id:'big-b'}),u('sword',1,400,400,{id:'far'})],{ticks:1});const [a,b]=r.units;assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>49.3,'large body pair must be queried across cell delta 2');
}
// Summon enters the following tick, carries team, has deterministic parent/count token, and survives parent death in the cast tick.
{
 const input=[u('wraith',0,220,220,{id:'parent',hp:1,summonCharges:1,summonCd:0,spawnCount:0}),u('sword',1,230,220,{id:'killer'})];
 const captures=[],r=run(input,{ticks:3,captures});const t1=captures[0],t2=captures[1];const parent1=t1.units.find(x=>x.token==='parent');assert.ok(parent1.dead,'parent died on summon tick');assert.ok(t1.pendingSummons.some(x=>x.token==='parent/summon:0'&&x.side===0));assert.ok(!t1.units.some(x=>x.token==='parent/summon:0'),'not inserted mid-tick');assert.ok(t2.units.some(x=>x.token==='parent/summon:0'&&x.side===0),'inserted at next tick');assert.equal(r.state,'fight');
}
// Cap counts initial units plus summons; a full team cannot add a unit.
{
 const input=[];for(let i=0;i<31;i++)input.push(u('goblin',0,25+(i%8)*55,25+Math.floor(i/8)*40,{id:`g${i}`,priority:i/100}));input.push(u('wraith',0,430,480,{id:'cap-parent',summonCharges:3,summonCd:0}));input.push(u('shield',1,430,70,{id:'enemy'}));const r=run(input,{ticks:1});assert.equal(r.pendingSummons.length,0);assert.equal(r.units.length,33);
}
// Multiple same-tick summons receive unique tokens and deterministic, non-overlapping reserved positions.
{
 const input=[u('wraith',0,150,180,{id:'wa',summonCharges:1,summonCd:0}),u('wraith',0,150,240,{id:'wb',summonCharges:1,summonCd:0}),u('sword',1,380,220,{id:'enemy'})];const a=run(input,{ticks:1}),b=run([...input].reverse(),{ticks:1});assert.deepEqual(a.pendingSummons.map(x=>x.token).sort(),['wa/summon:0','wb/summon:0']);assert.deepEqual(a.pendingSummons.map(x=>x.token).sort(),b.pendingSummons.map(x=>x.token).sort());for(let i=0;i<a.pendingSummons.length;i++)for(let j=i+1;j<a.pendingSummons.length;j++)assert.ok(Math.hypot(a.pendingSummons[i].x-a.pendingSummons[j].x,a.pendingSummons[i].y-a.pendingSummons[j].y)>14);
}
// Reflection, reversed storage order, and prediction inputs do not alter the simulated outcome.
{
 const input=[...formation('wraith',2,0,19),...formation('drake',1,0,19),...formation('goblin',5,1,19),...formation('archer',1,1,19)];
 const a=run(input,{ticks:3601,choice:0}),rev=run([...input].reverse(),{ticks:3601,choice:1}),mir=run(reflected(input),{ticks:3601,choice:1});compareRuns(a,rev);compareRuns(a,mir,true);
}
// Timeout is a draw if every remaining unit cannot target the other's layer.
{
 const old=api.TYPES.drake.attackTargetMask;api.TYPES.drake.attackTargetMask=['air'];const r=run([u('sword',0,120,200,{id:'g'}),u('drake',1,350,350,{id:'air'})],{ticks:3601});api.TYPES.drake.attackTargetMask=old;assert.equal(r.state,'result');assert.equal(r.winner,null);assert.equal(r.ticks,3600);
}

// Presentation-event buffer is observational only; all five core event families are emitted at their resolution ticks.
{
 const input=[u('wraith',0,170,160,{id:'w',summonCd:.1,summonCharges:1}),u('archer',0,200,165,{id:'a'}),u('golem',0,220,220,{id:'g'}),u('healer',0,180,220,{id:'h'}),u('shield',0,180,235,{id:'s',hp:80}),u('drake',1,250,260,{id:'d'}),u('sword',1,230,220,{id:'e'})];
 const plain=run(input,{ticks:200}),buffered=run(input,{ticks:200,captureEvents:true});compareRuns(plain,buffered);
 assert.equal(plain.events.length,0);const types=new Set(buffered.events.map(e=>e.type));for(const name of ['resolved_hit','heal','projectile_release','golem_ground_contact','summon_spawn'])assert.ok(types.has(name),'missing '+name);
 const hit=buffered.events.find(e=>e.type==='resolved_hit');assert.ok(hit.targetToken&&hit.sourceKind&&Number.isFinite(hit.amount)&&Number.isFinite(hit.x)&&Number.isFinite(hit.y));
 const heal=buffered.events.find(e=>e.type==='heal');assert.equal(heal.source,'h');assert.equal(heal.target,'s');assert.ok(heal.actualAmount>0&&heal.actualAmount<=13);
 const shot=buffered.events.find(e=>e.type==='projectile_release');assert.ok(shot.sourceToken&&shot.k&&shot.targetToken);
 const contact=buffered.events.find(e=>e.type==='golem_ground_contact');assert.equal(contact.sourceToken,'g');assert.equal(contact.targetToken,'e');
 const spawn=buffered.events.find(e=>e.type==='summon_spawn');assert.equal(spawn.parentToken,'w');assert.equal(spawn.childToken,'w/summon:0');
 const callbacks=[],cb=run(input,{ticks:200,onCombatEvent:e=>callbacks.push(e)});compareRuns(plain,cb);assert.deepEqual(cb.events.map(e=>e.type),callbacks.map(e=>e.type));const frozen=run(input,{ticks:200,captureEvents:true,frozenEvents:true});compareRuns(plain,frozen);
}

// The summon event fires on insertion, not on the previous tick's cast request.
{
 const captures=[],r=run([u('wraith',0,200,200,{id:'w',summonCd:.25,summonCharges:1}),u('sword',1,430,480,{id:'enemy'})],{ticks:17,captures,captureEvents:true});
 const castTick=captures.find(x=>x.ticks===16),spawnTick=captures.find(x=>x.ticks===17);
 assert.ok(castTick.pendingSummons.some(x=>x.token==='w/summon:0'));assert.ok(!castTick.events.some(e=>e.type==='summon_spawn'));
 assert.ok(spawnTick.events.some(e=>e.type==='summon_spawn'&&e.childToken==='w/summon:0'));assert.ok(r.units.some(x=>x.token==='w/summon:0'));
}
// Healing is independent of attack masks: a hurt ally still gets healed when the only enemy is an inaccessible flyer.
{
 const r=run([u('healer',0,200,200,{id:'heal'}),u('shield',0,210,205,{id:'hurt',hp:80}),u('drake',1,430,480,{id:'air'})],{ticks:1,captureEvents:true});
 const hurt=r.units.find(x=>x.token==='hurt');assert.equal(hurt.hp,93);const event=r.events.find(x=>x.type==='heal');assert.equal(event.actualAmount,13);assert.equal(event.targetToken,'hurt');
}
// Simultaneous 17 damage and 13 healing net to only 4 HP loss, but both actual events remain observable.
{
 const r=run([u('healer',0,200,200,{id:'medic'}),u('shield',0,210,200,{id:'tank',hp:95}),u('sword',1,230,200,{id:'attacker'})],{ticks:1,captureEvents:true});
 assert.equal(r.units.find(x=>x.token==='tank').hp,91);
 assert.ok(r.events.some(e=>e.type==='resolved_hit'&&e.targetToken==='tank'&&e.amount===17));
 assert.ok(r.events.some(e=>e.type==='heal'&&e.targetToken==='tank'&&e.actualAmount===13));
}

// Role/cost sanity and headless representative balance probes (no outcome sampling).
const budget=require('./index-costs.json');assert.deepEqual(['sword','shield','spear','archer','cannon','rider','healer','goblin','golem','drake','wraith'].map(k=>budget[k]),[3,4,3,3,6,8,4,2,9,7,8]);
const probes=[];
for(let seed=1;seed<=20;seed++){
 for(const [a,na,b,nb] of [['goblin',9,'golem',2],['golem',1,'sword',3],['drake',1,'sword',2],['drake',1,'archer',2],['wraith',1,'goblin',4]]){
  const r=match(a,na,b,nb,seed);probes.push({seed,a,na,b,nb,winner:r.winner,seconds:+r.seconds.toFixed(2),left:r.units.filter(x=>!x.dead).filter(x=>x.side===0).length,right:r.units.filter(x=>!x.dead).filter(x=>x.side===1).length});
 }
}
const stats={};for(const p of probes){const key=`${p.a}${p.na} vs ${p.b}${p.nb}`;(stats[key]??={n:0,leftWins:0,rightWins:0,draws:0,meanSeconds:0}).n++;stats[key].leftWins+=p.winner===0?1:0;stats[key].rightWins+=p.winner===1?1:0;stats[key].draws+=p.winner===null?1:0;stats[key].meanSeconds+=p.seconds/20}
console.log(JSON.stringify({status:'PASS',tests:16,roleCost:budget,probes:stats},null,2));
