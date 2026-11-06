// Recovered from this worker's conversation on 2026-11-06 after workspace loss.
// Historical original: ability-integration-20261106/candidate/tests/ability-integration-cross.cjs
// Place alongside reflect-cascade.cjs; pass candidate HTML as argv[2] if needed.
// Historical run: 7 focused PASS, 0 FAIL, plus 2 startup checks. NOT rerun on recovered HTML.
// Independent integration checks. Canonical pose parity is checked numerically;
// actual browser rendering and real-network behavior still need separate QA.
const fs = require('fs'), path = require('path'), assert = require('assert');
const game = path.resolve(process.argv[2] || path.join(__dirname, '../index.html'));
const harness = fs.readFileSync(path.join(__dirname, 'reflect-cascade.cjs'), 'utf8')
  .split("for(const id of ['#red'")[0]
  .replace("fs.readFileSync('index.html','utf8')", 'fs.readFileSync(' + JSON.stringify(game) + ',"utf8")');
const {context, vm} = new Function('require', 'assert', harness + '\nreturn {context,vm};')(require, assert);
Object.assign(context, {TextEncoder, TextDecoder, btoa, atob});
const run = code => {
  const v = vm.runInContext(code, context, {timeout: 60000});
  const json=JSON.stringify(v);
  return json === undefined ? null : JSON.parse(json);
};
run(`globalThis.crossOriginalTypes=JSON.parse(JSON.stringify(TYPES));
globalThis.restoreCrossTypes=()=>{for(const k of Object.keys(TYPES)){for(const f of Object.keys(TYPES[k]))delete TYPES[k][f];Object.assign(TYPES[k],crossOriginalTypes[k]);}};
globalThis.crossBody=(token,k,side,x,y=220,hp=1000,extra={})=>({id:token,token,k,side,x,y,hp,cd:999,priority:token.charCodeAt(0)/100,dead:hp<=0,originForward:side?-1:1,...extra});
globalThis.crossReset=roster=>{restoreCrossTypes();for(const t of Object.values(TYPES)){t.speed=0;t.hp=1000;}units=roster;shots=[];pendingSummons=[];combatEvents=[];elapsed=0;state='fight';winner=null;choice=null;battleEnvironment=null;initialUnits=JSON.parse(JSON.stringify(units));BattleInsights.start(initialUnits);resetBattleLogObservation();};
globalThis.crossTick=()=>{combatEvents=[];resetBattleLogObservation();combatStep(1/60);return {events:combatEvents,observed:battleLogObserved,units,tick:Math.round(elapsed*60)};};
globalThis.crossExpose=u=>Object.assign(u,{exposureStartTick:1,exposureUntilTick:121,exposureImmuneUntilTick:211,exposureMultiplier:1.2,exposureSourceToken:'source'});`);
let failures = 0, passed = 0;
function test(name, body) {
  try { body(); passed++; console.log('PASS', name); }
  catch (e) { failures++; console.error('FAIL', name, e.stack); }
}
const near = (a,b) => assert(Math.abs(a-b)<1e-8, `${a} != ${b}`);

test('boss attack and exposure multiply exactly once', () => {
  const r = run(`(()=>{crossReset([crossBody('boss','frosthorn_rhino',0,200,220,1000,{cd:0}),crossExpose(crossBody('victim','sword',1,230))]);const expected=TYPES.frosthorn_rhino.dmg*TYPES.frosthorn_rhino.bossDamageScale*1.2;const out=crossTick();return {expected,scale:TYPES.frosthorn_rhino.bossDamageScale,hp:units[1].hp,hits:out.events.filter(e=>e.type==='resolved_hit'&&e.sourceToken==='boss')};})()`);
  assert(r.scale>1); assert.equal(r.hits.length,1); near(r.hits[0].amount,r.expected); near(1000-r.hp,r.expected);
});

test('exposed victim still receives exactly 30 death-burst damage', () => {
  const r = run(`(()=>{crossReset([crossBody('burst','shellburst_arcade',0,200,220,1,{poisonNextAt:0,poisonUntil:1,poisonDps:2,poisonSourceToken:'victim'}),crossExpose(crossBody('victim','sword',1,230))]);return crossTick();})()`);
  const hit=r.events.filter(e=>e.type==='resolved_hit'&&e.delivery==='death_explosion');
  assert.equal(hit.length,1); assert.equal(hit[0].amount,30); assert.equal(r.units[1].hp,970);
});

test('revived summoner spends only remaining charges with unique physical child tokens', () => {
  const r=run(`(()=>{crossReset([crossBody('w','wraith',0,180,220,90,{cd:0}),crossBody('p','candle_archdeacon',0,140,220,130,{cd:0}),crossBody('e','shield',1,440,220,100000)]);TYPES.shield.hp=100000;TYPES.shield.dmg=0;let births=[];for(let i=0;i<80;i++){const out=crossTick();births.push(...out.events.filter(e=>e.type==='summon_spawn').map(e=>e.childToken));}const before=units[0].summonCharges;units[0].dead=true;units[0].hp=0;for(let i=0;i<400;i++){const out=crossTick();births.push(...out.events.filter(e=>e.type==='summon_spawn').map(e=>e.childToken));}return {before,births,life:units.find(u=>u.revived),oldDead:units[0].dead};})()`);
  assert.equal(r.before,2); assert.equal(r.births.length,4); assert.equal(new Set(r.births).size,4);
  assert(r.oldDead); assert.equal(r.life.token,'w/revive:1'); assert.equal(r.life.ownerToken,'w');
  assert.equal(r.life.summonCharges,0); assert.equal(r.life.spawnCount,4);
  assert.equal(r.births.filter(t=>t.startsWith('w/revive:1/')).length,2);
});

test('three burst waves log each defeated physical unit exactly once', () => {
  const r=run(`(()=>{crossReset([crossBody('a','shellburst_arcade',0,200,220,1,{poisonNextAt:0,poisonUntil:1,poisonDps:2,poisonSourceToken:'e'}),crossBody('b','shellburst_arcade',1,230,220,30),crossBody('c','shellburst_arcade',0,260,220,30),crossBody('e','sword',1,290)]);const first=crossTick();const second=crossTick();return {first,second};})()`);
  assert.equal(r.first.events.filter(e=>e.type==='death_explode').length,3);
  for(const token of ['a','b','c']) assert.equal(r.first.observed.filter(e=>e.type==='unit_defeated'&&e.targetToken===token).length,1,token);
  assert.equal(r.second.observed.filter(e=>e.type==='unit_defeated').length,0);
  assert.equal(r.second.events.filter(e=>e.type==='death_explode').length,0);
});

test('exposure duration and immunity each emit one expiry observation', () => {
  const r=run(`(()=>{crossReset([crossBody('a','sword',0,80),crossExpose(crossBody('b','sword',1,400))]);let observed=[];for(let i=0;i<220;i++)observed.push(...crossTick().observed);return {observed,unit:units[1]};})()`);
  for(const [status,tick] of [['exposure',121],['exposureImmunity',211]]) {
    const rows=r.observed.filter(e=>e.type==='status_expired'&&e.status===status&&e.targetToken==='b');
    assert.equal(rows.length,1,status); assert.equal(rows[0].tick,tick,status);
  }
  assert.equal(r.unit.exposureUntilTick,undefined); assert.equal(r.unit.exposureImmuneUntilTick,undefined);
});

test('canonical revival log preserves child identity through replay and fresh transfer receivers', () => {
  const r=run(`(()=>{restoreCrossTypes();battleEnvironment=null;multiInitial=[crossBody('rp','candle_archdeacon',0,140,220,TYPES.candle_archdeacon.hp,{cd:0}),crossBody('rv','sword',0,210,220,1,{cd:0}),crossBody('re','sword',1,229,220,TYPES.sword.hp,{cd:0}),crossBody('ra','archer',1,320,220,TYPES.archer.hp,{cd:0})];const a=buildCanonicalReplay(),b=buildCanonicalReplay();globalThis.crossReplay=a;const log=BattleLog.createPlayback(a),rows=log.rowsAt(a.ticks),complete=rows.filter(r=>r.type==='revive_complete');return {same:JSON.stringify(a)===JSON.stringify(b),available:log.available,complete,actors:log.catalog.actors,spawns:a.events.flatMap(e=>e[3]).filter(row=>String(row[9]).endsWith('/revive:1')),unknown:log.stats().unknown};})()`);
  assert(r.same); assert(r.available); assert.equal(r.complete.length,1); assert.equal(r.spawns.length,1);
  const row=r.complete[0], actors=r.actors;
  assert.equal(actors[row.target].token,'rv/revive:1','completion targets new physical actor');
  assert.equal(actors[row.data['@original']].token,'rv','completion also links deceased original actor');
  const child=actors.find(a=>a.token==='rv/revive:1'),old=actors.find(a=>a.token==='rv');
  assert.notEqual(child.index,old.index); assert.equal(child.birth,row.tick); assert.equal(r.unknown,0);
  const transport=run(`(()=>{const packed=ReplayTransfer.packReplay(crossReplay,'cross-revival');let ms=1000;const receive=()=>{let result,sender;const receiver=ReplayTransfer.createReceiver({meta:packed.meta,sendAck:m=>sender.ack('guest',m),onComplete:r=>result=r});sender=ReplayTransfer.createSender({packed,recipients:['guest'],send:m=>receiver.receive(m),now:()=>ms});for(let i=0;i<10000&&!sender.ready();i++){ms+=150;sender.pump();}if(!sender.ready()||!result)throw Error('transfer incomplete');return result;};const first=receive(),reconnected=receive(),ticks=[0,Math.floor(crossReplay.ticks/2),crossReplay.ticks];const signature=r=>({units:ticks.map(t=>CompactReplay.createPlayback(r).at(t)),logs:ticks.map(t=>BattleLog.createPlayback(r).rowsAt(t))});return {initial:JSON.stringify(signature(first))===JSON.stringify(signature(crossReplay)),reconnect:JSON.stringify(signature(reconnected))===JSON.stringify(signature(crossReplay)),replay:JSON.stringify(first)===JSON.stringify(reconnected)};})()`);
  assert(transport.initial&&transport.reconnect&&transport.replay);
});

test('canonical frameFor captures revival channel, completion and cancellation poses tick for tick', () => {
  const results=run(`(()=>{const simulate=cancel=>{restoreCrossTypes();for(const t of Object.values(TYPES))t.speed=0;battleEnvironment=null;multiPlayback=null;multiRecording=true;multiInitial=[crossBody('priest','candle_archdeacon',0,140,220,TYPES.candle_archdeacon.hp,{cd:0}),crossBody('corpse','sword',0,180,220,0),crossBody('ally','sword',0,80,320,TYPES.sword.hp),crossBody('enemy','sword',1,440,220,TYPES.sword.hp)];const job=createCanonicalRecording(),samples=[],events=[];const sample=tick=>{const p=units.find(u=>u.token==='priest');samples.push({tick,frame:baseSpriteFrame(p),channel:p.reviveDueTick!==undefined,dead:p.dead});};sample(0);const ticks=cancel?60:110;for(let tick=1;tick<=ticks;tick++){if(cancel&&tick===45){const p=units.find(u=>u.token==='priest');p.poisonNextAt=elapsed;p.poisonUntil=elapsed+1;p.poisonDps=10000;p.poisonSourceToken='enemy';}spriteStep(1/60);sample(tick);events.push(...combatEvents.filter(e=>e.type.startsWith('revive_')));job.capture(tick);}const replay=job.finish({ticks}),playback=CompactReplay.createPlayback(replay);multiRecording=false;multiPlayback=playback;const mismatches=[],missing=[];for(const expected of samples){const priest=playback.at(expected.tick).units.find(u=>u.token==='priest');if(!priest){missing.push(expected);continue;}if(priest.pose!==expected.frame||spriteFrame(priest)!==expected.frame)mismatches.push({expected,pose:priest.pose,guestFrame:spriteFrame(priest)});}multiPlayback=null;return {cancel,samples,events,mismatches,missing};};return [simulate(false),simulate(true)];})()`);
  for(const r of results){
    assert.deepStrictEqual(r.mismatches,[],`${r.cancel?'cancel':'complete'} pose mismatches`);
    assert(r.missing.every(s=>s.dead),'living/channeling priest must remain in playback');
    assert(r.samples.filter(s=>s.channel).length>=(r.cancel?40:89),'fixture exercises a real multi-tick channel');
    assert(r.events.some(e=>e.type==='revive_start'));
    if(r.cancel){
      assert.equal(r.events.filter(e=>e.type==='revive_complete').length,0);
      assert.equal(r.events.filter(e=>e.type==='revive_cancel'&&e.reason==='source-dead').length,1);
      assert(r.samples.some(s=>s.tick===45&&s.dead&&!s.channel),'death cancels channel on the same tick');
    }else{
      assert.equal(r.events.filter(e=>e.type==='revive_complete').length,1);
      assert.equal(r.events.filter(e=>e.type==='revive_cancel').length,0);
      const done=r.events.find(e=>e.type==='revive_complete').tick;
      assert(r.samples.some(s=>s.tick===done&&!s.channel&&!s.dead),'completion exits channel on the same tick');
      assert(r.samples.filter(s=>s.tick>done).length>=10,'post-completion frames covered');
    }
  }
});

console.log('LIMITATION: Node pose/transport checks do not validate actual browser rendering or real-network reconnects.');
console.log(`SUMMARY ${passed} passed, ${failures} failed`);
if(failures)process.exitCode=1;
