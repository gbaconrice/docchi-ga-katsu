const {api}=require('./harness.cjs'),assert=require('assert');
const u=(k,side,x,y,extra={})=>({id:k+side,token:k+side,k,side,x,y,hp:api.TYPES[k].hp,cd:0,priority:.5,dead:false,...extra});
function boundary(burrowPriority,swordPriority){return api.run([u('burrower',0,200,200,{priority:burrowPriority,burrowStage:'warning',burrowUntil:1/60,burrowX:200,burrowY:400}),u('sword',1,200,225,{priority:swordPriority})],{ticks:1,events:true})}
const a=boundary(.9,.1),b=boundary(.1,.9);console.log(JSON.stringify({burrowLate:{hp:a.units[0].hp,stage:a.units[0].burrowStage,hits:a.events.filter(e=>e.type==='resolved_hit')},burrowEarly:{hp:b.units[0].hp,stage:b.units[0].burrowStage,hits:b.events.filter(e=>e.type==='resolved_hit')}}));assert.equal(a.units[0].hp,b.units[0].hp,'unique target must not become immune based on actor iteration order');
// Emerging on this tick remains untargetable for this tick's shared snapshot.
function emerge(bp,sp){return api.run([u('burrower',0,200,200,{priority:bp,burrowStage:'underground',burrowUntil:1/60,burrowX:200,burrowY:200}),u('sword',1,200,225,{priority:sp})],{ticks:1,events:true})}
assert.equal(emerge(.1,.9).units[0].hp,emerge(.9,.1).units[0].hp);
// Same-tick bomb + parent death queues exactly two owned children, never repeats.
let r=api.run([u('slime',0,200,200),u('bombbug',1,200,225)],{ticks:2,events:true});assert(r.units.every(x=>x.dead));assert.equal(r.pendingSummons.length,2);assert(r.pendingSummons.every(x=>x.k==='slimelet'&&x.ownerToken==='slime0'));assert.equal(r.events.filter(e=>e.type==='slime_split').length,1);
// The warning is a fixed destination, even if that original rear target dies.
r=api.run([u('burrower',0,100,100),u('bombbug',0,300,375,{id:'ally',token:'ally'}),u('archer',1,300,400,{hp:1,cd:99}),u('shield',1,150,280,{cd:99})],{ticks:65,events:true});const warning=r.events.find(e=>e.type==='burrow_warning'),emerged=r.events.find(e=>e.type==='burrow_emerge');assert(warning&&emerged);assert(r.units.find(x=>x.k==='archer').dead);assert(Math.abs(warning.x-emerged.x)<1e-7);assert(Math.abs(warning.y-emerged.y)<1e-7);assert.equal(r.events.filter(e=>e.type==='burrow_warning').length,1);
// Frost affects movement, not charge bonus; charge remains a single use.
const normal=api.run([u('boar',0,100,100),u('golem',1,100,400,{cd:99})],{ticks:1}),slowed=api.run([u('boar',0,100,100,{slowUntil:10,slowFactor:.55,slowImmuneUntil:10.75}),u('golem',1,100,400,{cd:99})],{ticks:1});assert(Math.abs((slowed.units[0].y-100)/(normal.units[0].y-100)-.55)<.001);
r=api.run([u('boar',0,100,100,{slowUntil:10,slowFactor:.55,slowImmuneUntil:10.75}),u('golem',1,100,400,{cd:99})],{ticks:600,events:true});assert.equal(r.events.filter(e=>e.type==='charge_impact').length,1);assert.equal(r.events.find(e=>e.type==='resolved_hit'&&e.sourceKind==='boar').amount,52);
// Healing cannot keep a detonated bomb alive. Net heal/damage can prevent a slime split.
r=api.run([u('bombbug',0,200,200,{hp:1}),u('healer',0,175,200),u('sword',1,200,222,{cd:99})],{ticks:1,events:true});assert(r.units[0].dead);assert.equal(r.units[0].hp,0);
r=api.run([u('slime',0,200,200,{hp:110}),u('healer',0,175,200),u('bombbug',1,200,225)],{ticks:1,events:true});assert.equal(r.units[0].hp,8);assert(!r.units[0].dead);assert.equal(r.pendingSummons.length,0);
console.log('PASS: burrow enter/emerge targetability order; same-tick bomb/split reservation; dead-target fixed emergence; slow+single charge; heal/bomb forced death; heal prevents lethal split');
function movement(bp){return api.run([u('boar',0,200,100,{priority:.4}),u('burrower',0,200,123,{priority:bp,burrowStage:'warning',burrowUntil:1/60,burrowX:400,burrowY:400}),u('shield',1,200,300,{priority:.6,cd:99})],{ticks:1})}
const m1=movement(.1).units[0],m2=movement(.9).units[0];assert.equal(m1.x,m2.x,'same tick-start obstacle cannot vanish for later mover');assert.equal(m1.y,m2.y);console.log('PASS: lateral avoidance also uses shared tick-start collision layer');
const baseSpawn=api.run([u('wraith',0,200,200,{priority:.4,summonCd:0}),u('shield',1,200,450,{cd:99})],{ticks:1}).pendingSummons[0];
function summonPosition(bp){return api.run([u('wraith',0,200,200,{priority:.4,summonCd:0}),u('burrower',0,baseSpawn.x,baseSpawn.y,{priority:bp,burrowStage:'warning',burrowUntil:1/60,burrowX:400,burrowY:400}),u('shield',1,200,450,{priority:.6,cd:99})],{ticks:1}).pendingSummons[0]}
const q1=summonPosition(.1),q2=summonPosition(.9);assert.equal(q1.x,q2.x,'summon placement must share tick-start obstacle layer');assert.equal(q1.y,q2.y);console.log('PASS: summon placement uses the same collision snapshot');
