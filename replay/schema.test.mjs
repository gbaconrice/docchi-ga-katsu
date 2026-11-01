import assert from 'node:assert/strict';
import {createCompactRecorder,createPlayback,COMPACT_VERSION,ROLES,FX_KINDS} from './compact-replay.mjs';
const unit=(id,side=0,k='sword',extra={})=>({id,side,k,token:String(id),x:100,y:120,hp:100,dead:false,...extra});
const clone=x=>JSON.parse(JSON.stringify(x));
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name)};
function simple(){const r=createCompactRecorder();r.capture(0,{units:[unit(0)],shots:[]});r.capture(1,{units:[unit(0)],shots:[]},true);return r.finish({ticks:1,winner:'A'})}
test('25 role roundtrip + 12-field metadata rows',()=>{
 assert.equal(ROLES.length,25);assert.equal(ROLES[17],'slimelet');
 const us=ROLES.map((k,i)=>unit(i,i%2,k,{ownerToken:i===17?'parent-slime':null})),r=createCompactRecorder();r.capture(0,{units:us,shots:[]});const replay=r.finish({ticks:0,winner:'draw'});
 assert(replay.initial.every(u=>u.length===12));assert.deepEqual(createPlayback(replay).at(0).units.map(u=>u.k).sort(),[...ROLES].sort());assert.equal(createPlayback(replay).at(0).units.find(u=>u.k==='slimelet').ownerToken,'parent-slime');
});
test('exact off-sample flags + critical position, not guest-simulated',()=>{
 const u=unit(0),r=createCompactRecorder({positionEvery:6});r.capture(0,{units:[u],shots:[]});u.presentationFlags=1;u.x=101;r.capture(1,{units:[u],shots:[]});u.presentationFlags=7;u.x=102;r.capture(2,{units:[u],shots:[]});u.presentationFlags=0;r.capture(3,{units:[u],shots:[]});const replay=r.finish({ticks:3,winner:'draw'}),p=createPlayback(replay);
 assert(replay.events[1][1][0][1]&64);assert.equal(p.at(1).units[0].presentationFlags,1);assert.equal(p.at(1).units[0].x,101);assert.equal(p.at(2).units[0].presentationFlags,7);assert.equal(p.at(3).units[0].presentationFlags,0);
});
test('statusFor recorder option and capture override',()=>{
 const u=unit(0,0,'boar',{special:4}),r=createCompactRecorder({statusFor:u=>u.special});r.capture(0,{units:[u],shots:[]});r.capture(1,{units:[u],shots:[],statusFor:()=>2});const p=createPlayback(r.finish({ticks:1,winner:'draw'}));assert.equal(p.at(0).units[0].presentationFlags,4);assert.equal(p.at(1).units[0].presentationFlags,2);
});
test('all vector FX including initial events retain endpoint and exact tick',()=>{
 const r=createCompactRecorder(),fx=FX_KINDS.map((kind,i)=>({kind,x:100,y:120,face:i%2?-1:1,tick:0,targetX:150+i,targetY:200+i}));r.capture(0,{units:[unit(0)],shots:[{side:0,k:'frostmage',x:20,y:30,angle:1}],effects:fx});const replay=r.finish({ticks:0,winner:'A'}),frame=createPlayback(replay).at(0);
 assert.equal(frame.effects.length,FX_KINDS.length);assert(replay.events[0][5].every(f=>f.length===7));frame.effects.forEach((f,i)=>{assert.equal(f.targetX,150+i);assert.equal(f.targetY,200+i);assert.equal(f.tick,0)});assert.equal(frame.shots[0].k,'frostmage');assert.equal(frame.shots[0].angle,1);
});
test('endpoint defaults and aliases are deterministic',()=>{
 const r=createCompactRecorder();r.capture(0,{units:[],shots:[],effects:[{kind:'hit_spark',x:2,y:3},{kind:'chain_arc',x:4,y:5,toX:8,toY:9}]});const e=createPlayback(r.finish({ticks:0,winner:'draw'})).at(0).effects;assert.deepEqual(e.map(f=>[f.targetX,f.targetY]),[[2,3],[8,9]]);
});
test('same-tick parent death and two finite slime children preserve ownership',()=>{
 const parent=unit('p',0,'slime'),enemy=unit('e',1),r=createCompactRecorder();r.capture(0,{units:[parent,enemy],shots:[]});parent.dead=true;parent.hp=0;const children=[0,1].map(i=>unit('p/split:'+i,0,'slimelet',{ownerToken:'p'}));r.capture(1,{units:[parent,enemy,...children],shots:[],effects:[{kind:'slime_split',x:100,y:120,tick:1}]});r.capture(37,{units:[parent,enemy,...children],shots:[]},true);const p=createPlayback(r.finish({ticks:37,winner:'A'}));assert.equal(p.at(1).units.filter(u=>u.k==='slimelet').length,2);assert(p.at(1).units.filter(u=>u.k==='slimelet').every(u=>u.ownerToken==='p'));assert(!p.at(37).units.some(u=>u.id==='p'));
});
test('both red and blue active caps reject 65 live units',()=>{
 for(const side of [0,1]){const r=createCompactRecorder();assert.throws(()=>r.capture(0,{units:Array.from({length:65},(_,i)=>unit(i,side)),shots:[]}),/active-team-cap/);const x=simple();x.initial=Array.from({length:65},(_,i)=>[i,side,0,100,100,100,0,0,1,String(i),null,0]);x.maxEntities=512;assert.throws(()=>createPlayback(x),/initial-cap|active-team-cap/)}
});
test('invalid flags, endpoints, caps, duplicate and immutable IDs reject',()=>{
 for(const flags of [-1,64,NaN,1.5])assert.throws(()=>createCompactRecorder().capture(0,{units:[unit(0,0,'sword',{presentationFlags:flags})],shots:[]}));
 for(const patch of [{targetX:Infinity},{targetY:10001},{tick:1},{face:0}])assert.throws(()=>createCompactRecorder().capture(0,{units:[],shots:[],effects:[{kind:'chain_arc',x:0,y:0,...patch}]}));
 assert.throws(()=>createCompactRecorder({maxUnits:513}));assert.throws(()=>createCompactRecorder({positionEvery:0}));assert.throws(()=>createCompactRecorder().capture(0,{units:[unit(0),unit(0)],shots:[]}));
 const u=unit(0),r=createCompactRecorder();r.capture(0,{units:[u],shots:[]});u.k='boar';assert.throws(()=>r.capture(1,{units:[u],shots:[]}),/immutable-unit-metadata/);
});
test('malformed v7 replay data rejects',()=>{
 const mutations=[r=>r.engineVersion='v6-monsters-dynamic10fps-v1',r=>r.initial[0].pop(),r=>r.initial[0][11]=64,r=>r.winner='X',r=>r.events[1][1]=[[0,64,64]],r=>r.events[1][1]=[[0,128,1]],r=>r.events[1][5]=[[7,0,0,1,1,Infinity,0]],r=>r.events[1][5]=[[7,0,0,1,2,0,0]],r=>r.events[1][5]=[[7,0,0,1,1]],r=>r.maxEntities=513,r=>r.positionEvery=0];for(const mutate of mutations){const r=clone(simple());mutate(r);assert.throws(()=>createPlayback(r));}
});
test('retired record cannot be reused as living entity',()=>{
 const u=unit('retired'),r=createCompactRecorder();r.capture(0,{units:[u],shots:[]});u.dead=true;u.hp=0;r.capture(1,{units:[u],shots:[]});r.capture(37,{units:[u],shots:[]});assert.throws(()=>r.capture(38,{units:[unit('retired')],shots:[]}),/reused-id/);
});
test('spawn transition checks resulting active cap, including blue',()=>{
 const r=createCompactRecorder(),us=Array.from({length:64},(_,i)=>unit(i,1));r.capture(0,{units:us,shots:[]});us[0].dead=true;us[0].hp=0;us.push(unit('replacement',1,'slimelet',{ownerToken:'0'}));r.capture(1,{units:us,shots:[]});const replay=r.finish({ticks:1,winner:'draw'});assert.equal(createPlayback(replay).at(1).units.filter(u=>!u.dead).length,64);const bad=clone(replay);bad.events[1][1]=[];assert.throws(()=>createPlayback(bad),/active-team-cap/);
});
console.log(JSON.stringify({pass:true,tests:passed,version:COMPACT_VERSION,roles:ROLES.length,fxKinds:FX_KINDS.length}));
