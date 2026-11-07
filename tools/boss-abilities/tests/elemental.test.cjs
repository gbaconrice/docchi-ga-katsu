'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const registry={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../modules/elemental.js'),'utf8'),{BossAbilities:{register(k,s){assert.ok(!registry[k]);registry[k]=s;}}});
const expected=['emberwing_drake','skullflare_triad','flamering_magus','shockplate_drake','thunderhorn_beast','stormhorn_tripler','darkfan_clawlord','plated_dualdragon','flameburst_mythron','willyee_frost_dragon','frostbreath_lizard','triad_chimera','cinder_tailbeast','emberfist_pillarer','veteran_flamewing','spore_toad','siege_crab'];
function world(k){
 const u={k,id:'boss',x:100,y:100,hp:1000,bossState:{}};
 const foes=Array.from({length:30},(_,i)=>({id:i,x:125+i%6*8,y:90+Math.floor(i/6)*6,hp:1000}));
 const log={damage:[],status:[],effect:[],zone:[],move:[],scheduled:[]},pending=[];
 const c={tick:0,field:{w:480,h:538},rawHp:v=>v.hp,token:v=>v.id,power:(_,m=1)=>50*m,enemies:()=>foes.filter(v=>v.hp>0),gap:(a,b)=>Math.max(0,Math.hypot(a.x-b.x,a.y-b.y)-20),nearest:()=>foes.find(v=>v.hp>0),
 targets:(u,r,cap=8,p=u)=>foes.filter(v=>v.hp>0&&Math.hypot(v.x-p.x,v.y-p.y)<=r+20).slice(0,cap),
 cone:(u,t,r,angle,cap)=>foes.filter(v=>v.hp>0).slice(0,cap),line:(u,t,l,w,cap)=>foes.filter(v=>v.hp>0).slice(0,cap),
 damage:(u,v,n)=>log.damage.push({v,n,time:c.tick}),status:(u,v,kind,duration,strength)=>log.status.push({v,kind,duration,strength}),
 effect:(u,kind,x,y,opts)=>log.effect.push({kind,x,y,...opts}),zone:(u,kind,x,y,opts)=>log.zone.push({kind,x,y,...opts}),move:(...a)=>log.move.push(a),
 schedule:(u,delay,fn)=>{assert.ok(Number.isInteger(delay)&&delay>=0&&delay<=120);pending.push({at:c.tick+delay,fn});log.scheduled.push(delay);}};
 function flush(){for(let n=0;pending.length;n++){assert.ok(n<100,'finite schedule');pending.sort((a,b)=>a.at-b.at);const x=pending.shift();c.tick=x.at;x.fn(c);}}
 return{u,t:foes[0],foes,c,log,flush,s:registry[k]};
}
test('17 complete card specs and bounded tuning',()=>{assert.equal(Object.keys(registry).length,17);for(const k of expected){const s=registry[k];assert.ok(s.name&&s.description&&s.tag&&s.color,k);assert.ok(s.cooldown>=145&&s.cooldown<=240);assert.ok(s.windup>=24&&s.windup<=90);}});
for(const k of expected){test(k+' produces bounded payload, tolerates missing target and source death',()=>{
 const w=world(k),{s,u,t,c,log}=w;s.cast(u,null,c);assert.equal(log.damage.length+log.zone.length+log.scheduled.length,0);s.cast(u,t,c);w.flush();
 if(s.tick){for(let i=1;i<=150;i++){c.tick=i;s.tick(u,c);}}
 assert.ok(log.damage.length+log.zone.length>0,k+' combat effect');assert.ok(log.damage.length<=32,k+' bounded hit count');
 assert.ok(log.damage.every(h=>Number.isFinite(h.n)&&h.n>0&&h.n<=65));
 assert.ok(log.zone.every(z=>z.cap<=6&&z.duration<=210&&z.interval>=15&&z.damage<=10));
 assert.ok(log.status.every(s=>s.duration<=150));assert.ok(log.scheduled.length<=6);
 const dead=world(k);dead.u.hp=0;dead.s.cast(dead.u,dead.t,dead.c);dead.flush();assert.equal(dead.log.damage.length+dead.log.zone.length+dead.log.scheduled.length,0);
 });}
test('firewing circles tracked foe and rains repeatedly',()=>{const w=world('emberwing_drake');w.s.cast(w.u,w.t,w.c);for(let i=0;i<180;i++){w.c.tick=i;assert.equal(w.s.tick(w.u,w.c),true);}assert.equal(w.log.move.length,180);assert.equal(w.log.damage.length,36);w.c.tick=180;assert.equal(w.s.tick(w.u,w.c),false);});
test('three skulls bite separate targets and burn',()=>{const w=world('skullflare_triad');w.s.cast(w.u,w.t,w.c);assert.equal(new Set(w.log.damage.map(h=>h.v.id)).size,3);assert.equal(w.log.status.filter(s=>s.kind==='burn').length,3);});
test('expanding ring never hits same target twice and caps total at8',()=>{const w=world('flamering_magus');w.s.cast(w.u,w.t,w.c);w.flush();assert.equal(new Set(w.log.damage.map(h=>h.v.id)).size,w.log.damage.length);assert.ok(w.log.damage.length<=8);assert.deepEqual(w.log.effect.map(e=>e.radius),[32,57,82,107]);});
test('lightning armor and chain cap',()=>{const w=world('shockplate_drake');w.s.cast(w.u,w.t,w.c);assert.equal(w.log.status[0].kind,'barrier');assert.equal(w.log.damage.length,5);assert.equal(new Set(w.log.damage.map(h=>h.v.id)).size,5);assert.ok(w.log.damage.at(-1).n<w.log.damage[0].n);});
test('horn impact followed by warned lightning area',()=>{const w=world('thunderhorn_beast');w.s.cast(w.u,w.t,w.c);assert.equal(w.log.damage.length,1);w.flush();assert.equal(w.log.damage.length,6);assert.ok(w.log.effect.some(e=>e.kind==='warning'));});
test('three horn hits then final lightning',()=>{const w=world('stormhorn_tripler');w.s.cast(w.u,w.t,w.c);w.flush();assert.deepEqual([...new Set(w.log.damage.map(h=>h.time))],[0,18,36]);assert.equal(w.log.damage.length,8);});
test('dark claw persistent damage blocks all healing',()=>{const w=world('darkfan_clawlord');w.s.cast(w.u,w.t,w.c);const z=w.log.zone[0];assert.equal(z.status,'curse');assert.equal(z.strength,1);assert.ok(z.statusDuration>=z.interval);assert.ok(z.damage>0);});
test('dual dragon emits two simultaneous breath colors then explosion',()=>{const w=world('plated_dualdragon');w.s.cast(w.u,w.t,w.c);assert.equal(w.log.effect.filter(e=>e.kind==='beam').length,2);assert.ok(w.log.status.some(s=>s.kind==='freeze'));assert.ok(w.log.status.some(s=>s.kind==='burn'));w.flush();assert.ok(w.log.effect.some(e=>e.kind==='burst'));});
test('lava holds position and overlaps stronger inner damage',()=>{const w=world('flameburst_mythron');w.s.cast(w.u,w.t,w.c);assert.equal(w.s.tick(w.u,w.c),true);assert.equal(w.log.zone.length,2);assert.ok(w.log.zone[1].radius<w.log.zone[0].radius);assert.ok(w.log.zone[1].damage>w.log.zone[0].damage);w.c.tick=150;assert.equal(w.s.tick(w.u,w.c),false);});
test('blizzard freezes a group and lizard gives longer attack interruption',()=>{for(const [k,n,d]of[['willyee_frost_dragon',6,60],['frostbreath_lizard',4,90]]){const w=world(k);w.s.cast(w.u,w.t,w.c);assert.equal(w.log.status.length,n);assert.ok(w.log.status.every(s=>s.kind==='freeze'&&s.duration===d));}});
test('chimera simultaneous distinct bite/fire/poison victims',()=>{const w=world('triad_chimera');w.s.cast(w.u,w.t,w.c);assert.equal(new Set(w.log.damage.map(h=>h.v.id)).size,3);assert.equal(new Set(w.log.damage.map(h=>h.time)).size,1);assert.deepEqual(w.log.status.map(s=>s.kind),['burn','poison']);assert.notEqual(w.log.status[0].v.id,w.log.status[1].v.id);});
test('tail scatters six embers around full circle',()=>{const w=world('cinder_tailbeast');w.s.cast(w.u,w.t,w.c);assert.equal(w.log.effect.filter(e=>e.kind==='throw').length,6);assert.equal(w.log.damage.length,6);assert.equal(w.log.status.length,6);});
test('pillars chase moving target with three separately warned impacts',()=>{const w=world('emberfist_pillarer');w.s.cast(w.u,w.t,w.c);w.t.x=170;w.flush();assert.equal(w.log.effect.filter(e=>e.kind==='warning').length,3);assert.ok(w.log.effect.filter(e=>e.kind==='warning').every(e=>e.x===170));assert.deepEqual([...new Set(w.log.damage.map(h=>h.time))],[16,44,72]);});
test('two crossing birds explode at same fixed crossing',()=>{const w=world('veteran_flamewing');w.s.cast(w.u,w.t,w.c);const birds=w.log.effect.filter(e=>e.kind==='throw');assert.equal(birds.length,2);assert.equal(birds[0].y,birds[1].targetY);assert.equal(birds[1].y,birds[0].targetY);w.flush();assert.equal(w.log.damage.length,5);});
test('fog expands, poisons, and expires before another cast',()=>{const w=world('spore_toad');w.s.cast(w.u,w.t,w.c);const z=w.log.zone[0];assert.ok(z.grow>0);assert.equal(z.status,'poison');assert.ok(z.duration<w.s.cooldown);});
test('beam uses arena diagonal length and two opposite rays with shared cap',()=>{const w=world('siege_crab');let calls=[];w.c.line=(u,t,l,width,cap)=>{calls.push({t,l,width,cap});return w.foes.slice(calls.length===1?0:8,calls.length===1?8:16);};w.s.cast(w.u,w.t,w.c);assert.equal(calls.length,2);assert.ok(calls.every(x=>x.l>=Math.hypot(480,538)));assert.equal(w.log.damage.length,8);});
test('delayed effects cancel on source death',()=>{for(const k of ['flamering_magus','thunderhorn_beast','stormhorn_tripler','plated_dualdragon','emberfist_pillarer','veteran_flamewing']){const w=world(k);w.s.cast(w.u,w.t,w.c);const before=w.log.damage.length;w.u.hp=0;w.flush();assert.equal(w.log.damage.length,before,k);}});

// Execute the actual shared runtime, not just the ability mocks above.
function productionWorld(k){
 const TYPES=JSON.parse(fs.readFileSync(path.join(__dirname,'../baseline-roster.json'),'utf8'));
 const events=[],hits=[];
 const box={TYPES,elapsed:0,pendingSummons:[],tokenOf:u=>u.token,layerOf:u=>TYPES[u.k].collisionLayer||'ground',radiusOf:u=>TYPES[u.k].radius||10,stableOrder:(a,b)=>String(a.token).localeCompare(String(b.token)),publishCombatEvent:e=>events.push(e),observeBattleLogExtra:()=>{},comparisonNumber:n=>n,BattleInsights:{markIncomplete(){}},canTarget:()=>true};
 vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../modules/core.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../modules/elemental.js'),'utf8')+'\nglobalThis.engine=BossAbilities;',box);
 const u={k,token:'boss',side:0,x:100,y:100,hp:TYPES[k].hp,dead:false,bossState:{},originForward:1};
 const foes=Array.from({length:12},(_,i)=>({k:'sword',token:'enemy-'+i,side:1,x:145+i%4*16,y:80+Math.floor(i/4)*20,hp:100000,dead:false}));
 const units=[u,...foes],pending=new Map(),moves=new Map();let c;
 function begin(tick){box.elapsed=tick/60;c=box.engine.begin({tick,dt:1/60,units,alive:units.filter(v=>!v.dead),pending,moves,knockbacks:new Map(),collect:true,healingFactor:v=>box.engine.healingFactor(v,tick),hit(v,n,projectile,kind,token,delivery){hits.push({tick,v,n,delivery});pending.set(v,(pending.get(v)||0)-n);return v;}});return c;}
 function settle(){for(const[v,n]of pending)v.hp+=n;pending.clear();for(const[v,p]of moves)Object.assign(v,p);moves.clear();}
 function step(tick){begin(tick);box.engine.act(u,c);settle();}
 return{box,u,foes,units,events,hits,begin,settle,step,get c(){return c;},s:box.engine.spec(k)};
}
for(const k of expected)test(k+' runs through production scheduler and emits combat events',()=>{
 const w=productionWorld(k);for(let tick=1;tick<=420;tick++)w.step(tick);
 assert.ok(w.events.some(e=>e.type==='boss_ability'&&e.name===w.s.name),k+' cast event');
 assert.ok(w.hits.length>0,k+' actual runtime damage');assert.ok(w.hits.every(h=>Number.isFinite(h.n)&&h.n>0&&h.n<=600));
 assert.ok(w.events.some(e=>e.type==='boss_effect'),k+' visual event');
});
test('production freeze interrupts ordinary actions and expires',()=>{const w=productionWorld('frostbreath_lizard');w.begin(1);w.s.cast(w.u,w.foes[0],w.c);w.begin(2);assert.equal(w.box.engine.blocked(w.foes[0],2),true);assert.equal(w.box.engine.movementFactor(w.foes[0],2),0);w.begin(92);assert.equal(w.box.engine.blocked(w.foes[0],92),false);});
test('production repeating poison fog keeps poison damage cadence on refresh',()=>{const w=productionWorld('spore_toad');w.begin(1);w.s.cast(w.u,w.foes[0],w.c);for(let tick=2;tick<210;tick++){w.begin(tick);w.settle();}assert.ok(w.hits.some(h=>h.delivery==='boss_dot'),'poison must tick despite refresh every30ticks');});
test('production refreshed dark claw never briefly re-enables healing',()=>{const w=productionWorld('darkfan_clawlord');w.begin(1);w.s.cast(w.u,w.foes[0],w.c);w.begin(2);w.settle();for(let tick=3;tick<175;tick++){w.begin(tick);assert.equal(w.box.engine.healingFactor(w.foes[0],tick),0,'healing block at tick '+tick);w.settle();}});
