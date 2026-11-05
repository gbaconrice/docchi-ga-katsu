'use strict';
// Independent adversarial tests. Runs the presentation helper in an isolated VM.
// No runtime, fixture, replay builder, or production reference modifications.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const helperPath = path.join(__dirname, 'corner-presentation-helper.js');
const sandbox = { console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(helperPath, 'utf8'), sandbox, { filename: helperPath });
const C = vm.runInContext('CornerPillars', sandbox);
const plain = value => JSON.parse(JSON.stringify(value));
let passed = 0;
const failed = [];
function test(name, fn) {
  try { fn(); passed++; console.log('PASS', name); }
  catch (error) { failed.push({ name, message: error.message }); console.error('FAIL', name, error.stack); }
}
const units = (kind='pillar_hammerer') => [{token:'s',k:kind,side:0,dead:false},{token:'t',k:'target',side:1,dead:false}];
const start = (kind='pillar_hammerer') => ({type:'corner_pillar_start',cornerMode:1,sourceToken:'s',targetToken:'t',actionToken:'s/corner:1',startTick:10,dueTick:10+C.CONFIG[kind].windup,face:1,x:100,y:100,zoneX:130,zoneY:120});
const release = (kind='pillar_hammerer') => ({...start(kind),type:'corner_pillar_release',tick:start(kind).dueTick,radius:C.CONFIG[kind].radius,count:C.CONFIG[kind].cap});
const end = (reason='complete',at=70,kind='pillar_hammerer') => ({...start(kind),type:'corner_pillar_end',tick:at,reason});
function fresh(kind='pillar_hammerer',options) {const l=C.createLedger(options);l.reset('epoch1');l.ingest({epoch:'epoch1',tick:10,units:units(kind),events:[start(kind)]});return l;}
function ingest(l,at,events=[],roster=units(),epoch='epoch1'){return l.ingest({epoch,tick:at,units:roster,events});}
function rejectsAtomic(l,at,events,roster=units()){const before=plain(l.records()),stats=plain(l.stats());assert.throws(()=>ingest(l,at,events,roster),/invalid-corner-/);assert.deepEqual(plain(l.records()),before);assert.deepEqual(plain(l.stats()),stats);}
function replay(rows, metadata=new Map([['s',{k:'pillar_hammerer',side:0,birthTick:0}],['t',{k:'target',side:1,birthTick:0}]]),ticks=100,maxEntities=512){return C.validateReplay(rows,{ticks,maxEntities,metadata});}
const row = ()=>['s','t','s/corner:1',10,70,130,120,70,70,'complete'];
test('exactly three supported kinds and immutable configuration',()=>{assert.deepEqual(Object.keys(C.CONFIG).sort(),['colossal_hornfist','pillar_hammerer','spectralhand_wizard']);assert(Object.isFrozen(C.CONFIG));for(const cfg of Object.values(C.CONFIG))assert(Object.isFrozen(cfg));});
for(const kind of Object.keys(C.CONFIG)) {
 test(kind+': pending warning, real release, deterministic terminal replay',()=>{const l=fresh(kind),due=start(kind).dueTick;assert.equal(l.cuesAt(9).length,0);assert.equal(l.cuesAt(10)[0].phase,'warning');assert.equal(l.cuesAt(due-0.5)[0].phase,'warning');assert.equal(l.cuesAt(due).length,0);assert.throws(()=>l.export(),/unfinished/);ingest(l,due,[end('complete',due,kind),release(kind)],units(kind));assert.equal(l.cuesAt(due)[0].phase,'contact');assert.equal(l.cuesAt(due+11.99).length,1);assert.equal(l.cuesAt(due+12).length,0);const exported=l.export();assert.equal(exported[0].length,10);const restored=replay(exported,new Map([['s',{k:kind,side:0,birthTick:0}],['t',{k:'target',side:1,birthTick:0}]]));assert(Object.isFrozen(restored));assert(Object.isFrozen(restored[0]));for(const at of [9,10,25,due-0.5,due,due+11.99,due+12])assert.deepEqual(plain(C.sample(restored,at)),plain(l.cuesAt(at)));});
 for(const patch of [{radius:999},{count:0},{count:C.CONFIG[kind].cap+1},{count:1.1},{face:-1},{zoneX:131},{zoneY:121},{targetToken:'other'},{actionToken:'s/corner:2'},{startTick:9}])test(kind+': reject release '+JSON.stringify(patch),()=>{const l=fresh(kind),due=start(kind).dueTick;rejectsAtomic(l,due,[{...release(kind),...patch},end('complete',due,kind)],units(kind));});
}
for(const patch of [{cornerMode:0},{sourceToken:''},{targetToken:'s'},{targetToken:'missing'},{actionToken:'s/corner:2'},{startTick:9},{dueTick:71},{face:0},{zoneX:NaN},{zoneX:-1},{zoneY:539},{x:Infinity}])test('reject malformed start '+JSON.stringify(patch),()=>{const l=C.createLedger();l.reset('epoch1');rejectsAtomic(l,10,[{...start(),...patch}]);});
test('duplicate start and normal pillar events cannot replace history',()=>{const l=fresh();rejectsAtomic(l,10,[start()]);ingest(l,11,[{...start(),type:'pillar_action_start'}]);assert.equal(l.records().length,1);});
test('duplicate release/end rejected atomically',()=>{const l=fresh();rejectsAtomic(l,70,[release(),release(),end()]);rejectsAtomic(l,70,[release(),end(),end()]);});
test('release needs matching complete end in same batch',()=>{const l=fresh();rejectsAtomic(l,70,[release()]);rejectsAtomic(l,70,[end()]);rejectsAtomic(l,70,[release(),end('target-dead',70)]);});
test('no premature or late release',()=>{const l=fresh();rejectsAtomic(l,69,[{...release(),tick:69},end('complete',69)]);rejectsAtomic(l,71,[{...release(),tick:71},end('complete',71)]);});
for(const reason of C.REASONS.filter(x=>x!=='complete'))test('cancellation '+reason+' retains history without contact',()=>{const l=fresh();ingest(l,25,[end(reason,25)]);assert.equal(l.cuesAt(24)[0].phase,'warning');assert.equal(l.cuesAt(25).length,0);assert.equal(l.cuesAt(70).length,0);assert.equal(l.export()[0][7],null);assert.equal(replay(l.export())[0].endReason,reason);rejectsAtomic(l,70,[release(),end()]);});
test('frozen center survives caller mutation and source motion',()=>{const l=C.createLedger();l.reset('epoch1');const e=start();ingest(l,10,[e]);e.zoneX=300;const roster=units();roster[0].x=400;roster[0].y=500;ingest(l,20,[],roster);assert.equal(l.cuesAt(20)[0].x,130);assert.equal(l.cuesAt(20)[0].y,120);assert(Object.isFrozen(l.records()[0]));assert.throws(()=>{l.records()[0].x=400;},TypeError);});
test('source death requires explicit terminal event and retains history',()=>{const l=fresh(),roster=units();roster[0].dead=true;rejectsAtomic(l,20,[],roster);ingest(l,20,[end('source-dead',20)],roster);assert.equal(l.records().length,1);assert.equal(l.cuesAt(20).length,0);rejectsAtomic(l,21,[],units());});
test('actor identity and roster duplication reject atomically',()=>{const l=fresh();for(const patch of [{k:'spectralhand_wizard'},{side:1}]){const roster=units();Object.assign(roster[0],patch);rejectsAtomic(l,20,[],roster);}rejectsAtomic(l,20,[],[...units(),units()[0]]);});
test('actor cap applies to retained historical identities',()=>{const l=fresh('pillar_hammerer',{maxActors:2});ingest(l,20,[end('battle-ended',20)]);rejectsAtomic(l,21,[],[{token:'new',k:'target',side:1}]);});
test('wrong epoch ignored and reset/clear remove all history',()=>{const l=fresh();assert.equal(ingest(l,20,[],units(),'other'),false);assert.equal(l.records().length,1);assert.throws(()=>l.reset('epoch1'),/epoch/);l.reset('epoch2');assert.equal(l.records().length,0);assert.equal(l.stats().actors,0);assert.equal(ingest(l,10,[start()],units(),'epoch2'),true);l.clear();assert.equal(l.records().length,0);assert.equal(ingest(l,10,[start()]),false);});
test('rejected batch cannot consume source identity or advance tick',()=>{const l=C.createLedger();l.reset('epoch1');rejectsAtomic(l,10,[start(),{...end('target-dead',10),actionToken:'bad'}]);assert.equal(ingest(l,10,[start()]),true);});
for(const [field,value] of [[0,''],[1,'s'],[1,'unknown'],[2,'wrong'],[3,-1],[3,10.1],[4,71],[5,NaN],[5,-1],[6,539],[7,69],[7,null],[8,69],[8,null],[9,'unknown'],[9,'target-dead']])test('reject malformed replay field '+field+'='+value,()=>{const r=row();r[field]=value;assert.throws(()=>replay([r]),/invalid-corner-/);});
test('replay tuples exact ten fields, no duplicates, bounded count',()=>{assert.throws(()=>replay([row().slice(0,9)]),/wire-shape/);assert.throws(()=>replay([[...row(),0]]),/wire-shape/);assert.throws(()=>replay([row(),row()]),/invalid-corner-/);assert.throws(()=>replay([row()],undefined,100,0),/invalid-corner-/);});
test('replay rejects future births and ambiguous identities',()=>{for(const who of ['s','t'])for(const patch of [{birthTick:11},{ambiguous:true}]){const m=new Map([['s',{k:'pillar_hammerer',side:0,birthTick:0}],['t',{k:'target',side:1,birthTick:0}]]);Object.assign(m.get(who),patch);assert.throws(()=>replay([row()],m),/invalid-corner-/);}});
test('replay rejects terminal beyond observed ticks',()=>{assert.throws(()=>replay([row()],undefined,69),/invalid-corner-/);});
test('replay canonical source ordering enforced',()=>{const m=new Map([['s',{k:'pillar_hammerer',side:0,birthTick:0}],['t',{k:'target',side:1,birthTick:0}],['a',{k:'pillar_hammerer',side:0,birthTick:0}]]);const a=row();a[0]='a';a[2]='a/corner:1';assert.equal(replay([a,row()],m).length,2);assert.throws(()=>replay([row(),a],m),/wire-order/);});
test('sample rejects invalid time without touching records',()=>{const l=fresh();for(const at of [-1,NaN,Infinity])assert.throws(()=>l.cuesAt(at),/sample-time/);assert.equal(l.records().length,1);});
test('late-start battle-ended replay allows due beyond observed maximum',()=>{const l=C.createLedger();l.reset('epoch1');const e={...start(),startTick:3599,dueTick:3659};ingest(l,3599,[e]);ingest(l,3600,[{...e,type:'corner_pillar_end',tick:3600,reason:'battle-ended'}]);const records=replay(l.export(),undefined,3600);assert.equal(records[0].dueTick,3659);assert.equal(C.sample(records,3599)[0].phase,'warning');assert.equal(C.sample(records,3600).length,0);});
test('replay rejects starts after actor death but accepts same-tick cancellation',()=>{for(const who of ['s','t']){const m=new Map([['s',{k:'pillar_hammerer',side:0,birthTick:0}],['t',{k:'target',side:1,birthTick:0}]]);m.get(who).deadTick=9;assert.throws(()=>replay([row()],m),/invalid-corner-/);m.get(who).deadTick=10;const r=row();r[7]=null;r[8]=10;r[9]=who==='s'?'source-dead':'target-dead';assert.equal(replay([r],m).length,1);}});
test('same-tick source death with explicit cancellation retains spent history',()=>{const l=C.createLedger();l.reset('epoch1');const roster=units();roster[0].dead=true;ingest(l,10,[start(),end('source-dead',10)],roster);assert.equal(l.records().length,1);assert.equal(l.cuesAt(10).length,0);assert.equal(l.export()[0][9],'source-dead');});
console.log(JSON.stringify({passed,failed:failed.length,failures:failed},null,2));
if(failed.length)process.exitCode=1;
