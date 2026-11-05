'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c=vm.createContext({});vm.runInContext(fs.readFileSync(process.env.HELPER_JS||'corner-presentation-helper.js','utf8'),c);const C=vm.runInContext('CornerPillars',c);
const units=()=>[{token:'s',k:'pillar_hammerer',side:0,dead:false},{token:'t',k:'goblin',side:1,dead:false}];
const start={type:'corner_pillar_start',cornerMode:1,sourceToken:'s',targetToken:'t',actionToken:'s/corner:1',startTick:10,dueTick:70,face:1,x:100,y:100,zoneX:130,zoneY:120};
const release={...start,type:'corner_pillar_release',tick:70,radius:20,count:1};
const end=(tick=70,reason='complete')=>({...start,type:'corner_pillar_end',tick,reason});
function fresh(started=true){const l=C.createLedger();l.reset('x');if(started)put(l,10,[start]);return l;}
function put(l,tick,events=[],roster=units(),dry=false){return l.ingest({epoch:'x',tick,events,units:roster},dry);}
function reject(l,tick,events,roster=units()){const before=JSON.stringify([l.records(),l.stats()]);assert.throws(()=>put(l,tick,events,roster),/invalid-corner-/);assert.equal(JSON.stringify([l.records(),l.stats()]),before);}
let passed=0;const results=[];function test(name,fn){fn();passed++;results.push(name);console.log('PASS',name);}
for(const i of [0,1])test('prior-dead '+i+' cannot start',()=>{const l=fresh(false),u=units();u[i].dead=true;put(l,9,[],u);reject(l,10,[start],u);});
test('prior-dead target cannot release; next-tick cancellation remains valid',()=>{const l=fresh(),u=units();u[1].dead=true;put(l,69,[],u);reject(l,70,[release,end()],u);put(l,70,[end(70,'target-dead')],u);assert.equal(l.export()[0][7],null);});
test('target-dead cancellation cannot lag two ticks',()=>{const l=fresh(),u=units();u[1].dead=true;put(l,20,[],u);reject(l,22,[end(22,'target-dead')],u);put(l,21,[end(21,'target-dead')],u);});
test('dead target cannot keep pending warning past cancellation tick',()=>{const l=fresh(),u=units();u[1].dead=true;put(l,20,[],u);reject(l,21,[],u);});
for(const i of [0,1])test('same-tick lethal contact '+i+' stays valid',()=>{const l=fresh(),u=units();u[i].dead=true;put(l,70,[release,end()],u);assert.equal(l.cuesAt(70)[0].phase,'contact');});
for(const i of [0,1])test('prior absence/reappearance '+i+' cannot start a corner',()=>{const l=fresh(false);put(l,1);put(l,5,[],units().filter((_,j)=>j!==i));reject(l,10,[start]);});
test('source disappearance requires immediate terminal event',()=>{const l=fresh(),u=units().slice(1);reject(l,20,[],u);put(l,20,[end(20,'source-dead')],u);assert.equal(l.cuesAt(20).length,0);});
test('target disappearance/reappearance cannot bridge the cast',()=>{const l=fresh();put(l,20,[],units().slice(0,1));reject(l,70,[release,end()]);put(l,21,[end(21,'target-dead')]);assert.equal(l.export()[0][7],null);});
for(const i of [0,1])test('same-tick release/removal '+i+' stays valid',()=>{const l=fresh();put(l,70,[release,end()],units().filter((_,j)=>j!==i));assert.equal(l.cuesAt(70)[0].phase,'contact');});
test('dry-run death metadata is not committed',()=>{const l=fresh(),u=units();u[1].dead=true;put(l,69,[],u,true);put(l,70,[release,end()]);assert.equal(l.cuesAt(70).length,1);});
test('reset clears death and disappearance metadata',()=>{const l=fresh(false),u=units();u[1].dead=true;put(l,1,[],u);put(l,2,[],[]);l.reset('y');assert.equal(l.ingest({epoch:'y',tick:10,units:units(),events:[start]}),true);});
const m=()=>new Map([['s',{k:'pillar_hammerer',side:0,birthTick:0}],['t',{k:'goblin',side:1,birthTick:0}]]),row=()=>['s','t','s/corner:1',10,70,130,120,70,70,'complete'];
function validate(r,meta){return C.validateReplay([r],{ticks:100,maxEntities:512,metadata:meta});}
for(const who of ['s','t'])for(const at of [5,20,69])test('wire rejects '+who+' removed at '+at,()=>{const meta=m();meta.get(who).despawnTick=at;assert.throws(()=>validate(row(),meta),/invalid-corner-/);});
for(const who of ['s','t'])test('wire permits '+who+' removal on release tick',()=>{const meta=m();meta.get(who).despawnTick=70;assert.equal(validate(row(),meta).length,1);});
test('wire target disappearance allows one-tick cancellation, not two',()=>{const meta=m();meta.get('t').despawnTick=20;const r=row();r[7]=null;r[8]=21;r[9]='target-dead';assert.equal(validate(r,meta).length,1);r[8]=22;assert.throws(()=>validate(r,meta),/invalid-corner-/);});
test('old completed contact survives later removal; identity and new events still reject',()=>{const l=fresh();put(l,70,[release,end()]);put(l,71,[],units().slice(0,1));put(l,72,[],[]);assert.equal(l.cuesAt(72)[0].phase,'contact');const changed=units();changed[0].k='spectralhand_wizard';reject(l,73,[],changed);put(l,73);reject(l,74,[{...start,startTick:74,dueTick:134}]);reject(l,74,[{...release,tick:74},end(74)]);const extra=[...units(),{token:'new',k:'pillar_hammerer',side:0,dead:false}];reject(l,74,[{...start,sourceToken:'new',actionToken:'new/corner:1',startTick:74,dueTick:134}],extra);assert.equal(l.cuesAt(81.99)[0].phase,'contact');assert.equal(l.cuesAt(82).length,0);assert.equal(l.export().length,1);});
test('old cancellation stays silent and cannot be restarted after later removal',()=>{const l=fresh();put(l,20,[end(20,'out-of-zone')]);put(l,21,[],[]);put(l,22);reject(l,23,[{...start,startTick:23,dueTick:83}]);assert.equal(l.cuesAt(23).length,0);assert.equal(l.export()[0][9],'out-of-zone');});
test('current-tick terminal still checks lifetime and rejected work is atomic',()=>{const l=fresh(),u=units();u[1].dead=true;put(l,20,[],u);reject(l,22,[end(22,'target-dead')],u);reject(l,70,[release,end()],u);put(l,21,[end(21,'target-dead')],u);assert.equal(l.export()[0][8],21);});
const report={passed,failed:0,results};fs.writeFileSync('corner-lifetime-helper-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed,failed:0}));
