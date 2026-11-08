'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),harness=process.env.ENGINE_HARNESS||process.env.HARNESS_PATH||path.join(root,'tools/boss-abilities/tests/harness.cjs');
const candidatePath=process.env.GAME_HTML||path.join(root,'index.html'),baselinePath=process.env.BOSS_LOG_BASELINE||process.env.BASELINE_HTML;
assert(baselinePath,'Set BOSS_LOG_BASELINE to the source immediately before patch-boss-status-logs');
function load(file){process.env.GAME_HTML=file;delete require.cache[require.resolve(harness)];const h=require(harness);h.context.assert=assert;h.context.btoa=btoa;h.context.atob=atob;return h;}
const baseline=load(baselinePath),candidate=load(candidatePath),ev=candidate.ev,plain=x=>JSON.parse(JSON.stringify(x)),checks=[];
function check(name,f){f();checks.push(name);console.log('PASS '+name)}
const html=fs.readFileSync(candidatePath,'utf8'),before=fs.readFileSync(baselinePath,'utf8');
const fixture=`globalThis.bossLogFixture=(left='bluefist_colossus',right='golem',maxTicks=3600,replayOnly=false)=>{
 freshWallet();multiSession=null;multiSnapshot=null;multiRecording=false;predictionPreview=false;screenMode='game';round=11;
 BossAbilities.reset();for(const f of [resetCrowdPresentation,resetLionPresentation,resetShockPresentation,resetComboPresentation,resetCleavePresentation,resetWingPresentation,resetWave4Presentation,resetDefensePresentation,resetHighPresentation,resetStagedPresentation,resetBombPresentation])f();
 elapsed=0;shots=[];activeEffects=[];newEffects=[];visualTime=0;visualUnits=new WeakMap();state='fight';winner=null;pendingSummons=[];combatEvents=[];seed=712;battleEnvironment=BattleFields.selectRunEnvironment(712);
 const make=(k,side,x)=>({id:side+1,token:'actor'+side,k,side,x,y:269,hp:TYPES[k].hp,dead:false,cd:0,priority:side,originForward:side?-1:1});units=[make(left,0,220),make(right,1,260)];initialUnits=JSON.parse(JSON.stringify(units));multiInitial=JSON.parse(JSON.stringify(units));resetBattleLog(initialUnits);BattleInsights.start(units);
 if(replayOnly)return buildCanonicalReplay();
 const eventTrace=[],stateTrace=[],observed=[];let tick=0;
 while(tick<maxTicks&&state==='fight'){
  tick++;combatEvents=[];resetBattleLogObservation();combatStep(1/60);soloBattleLog.capture(tick,battleLogObserved,units);
  eventTrace.push(JSON.parse(JSON.stringify(combatEvents)));observed.push(...JSON.parse(JSON.stringify(battleLogObserved.filter(e=>e.type==='boss_ability'))));
  stateTrace.push(JSON.parse(JSON.stringify({tick,winner,state,units:units.map(u=>({id:u.id,token:u.token,k:u.k,side:u.side,x:u.x,y:u.y,hp:u.hp,dead:u.dead,cd:u.cd,status:u.bossStatuses,guard:u.bossState?.clawGuard})),shots,seed})));
 }
 const rows=soloBattleLog.rows();return {tick,winner,state,eventTrace,stateTrace,observed,log:soloBattleLog.snapshot(),bossRows:rows.filter(r=>r.type==='boss_ability').map(row=>({row,visible:battleLogVisibleRow(row),description:BattleLog.describe(row,soloBattleLog.catalog).sentence})),types:[...new Set(rows.map(r=>r.type))]};
};`;
baseline.ev(fixture);ev(fixture);

check('source audit: duration-bearing boss event exists only after successful status application',()=>{
 const runtime=before.slice(before.indexOf('const BossAbilities=(()=>{'),before.indexOf('/* Control/melee bosses.'));
 assert.equal((runtime.match(/event\(c,u,/g)||[]).length,3,'helper declaration, status call and context event forwarding');
 assert.equal((runtime.match(/v,\{duration:dur\}\)/g)||[]).length,1);
 const status=runtime.slice(runtime.indexOf(' function status('),runtime.indexOf(' function createContext('));
 assert(status.indexOf('v.bossStatuses[kind]=')<status.indexOf('event(c,u,'));assert(status.includes('event(c,u,')&&status.includes('{duration:dur});return true;'));
 // The only custom detailed event elsewhere is a measured successful claw block.
 const custom=[...before.matchAll(/c\.event\([^;\n]+/g)].map(m=>m[0]);
 assert.equal(custom.filter(s=>s.includes('{absorbed}')).length,1);
 assert.equal(custom.filter(s=>s.includes('duration')).length,0);
 for(const line of custom)assert(/s\.name\|\||爪の構え|双爪の反撃|爪で防御|紅蓮の咆哮/.test(line),line);
});

let natural;
check('natural stun retains exact emitted name, actual target and one visible row',()=>{
 natural=plain(ev(`bossLogFixture('bluefist_colossus','golem',120)`));
 const status=natural.bossRows.filter(x=>x.row.data.status==='気絶');assert(status.length>0);assert.equal(status[0].row.tick,55);assert.equal(status[0].row.data.kind,'status');assert.equal(status[0].row.source,0);assert.equal(status[0].row.target,1);assert.equal(status[0].visible,true);assert.match(status[0].description,/ブルーフィストジャイアント #1 → ロックゴーレム #1：気絶を付与/);
 const tick=natural.stateTrace.find(x=>x.tick===55),target=tick.units.find(u=>u.token==='actor1');assert.deepEqual(target.status.stun,{start:56,until:94,strength:1,sourceToken:'actor0',sourceKind:'bluefist_colossus',next:86});
 assert.equal(natural.bossRows.filter(x=>x.row.tick===55&&x.row.data.status==='気絶').length,1);
 assert(natural.eventTrace[54].some(e=>e.type==='boss_ability'&&e.name==='双拳地震'));assert(!natural.bossRows.some(x=>x.description.includes('双拳地震')||x.description.endsWith('：')));
});
check('natural guard and absorbed block remain, generic claw cast/counter announcements disappear',()=>{
 const run=plain(ev(`bossLogFixture('razorclaw_reaver','bluefist_colossus',600)`));
 const guards=run.bossRows.filter(x=>x.row.data.kind==='guard'),blocks=run.bossRows.filter(x=>x.row.data.kind==='block');assert(guards.length,'no natural guard');assert(blocks.length,'no natural claw block');
 for(const g of guards){assert.equal(g.row.data.status,'爪の構え');assert(g.visible);assert(g.row.source>=0&&g.row.target>=0);}
 for(const b of blocks){const payload=run.eventTrace[b.row.tick-1].find(e=>e.type==='boss_ability'&&e.name==='爪で防御');assert(payload);assert.equal(b.row.data.blocked,payload.absorbed);assert(b.row.data.blocked>0);assert(b.description.includes('爪で防御')&&b.description.includes('軽減'));}
 assert(!run.bossRows.some(x=>x.row.data.status==='双爪迎撃'||x.row.data.status==='双爪の反撃'));
});
check('every current status preserves its actual emitted label; failed/duplicate applications create no row',()=>ev(`{
 const labels={stun:'気絶',freeze:'凍結',root:'束縛',airborne:'打ち上げ',burn:'炎上',poison:'毒',curse:'回復封じ',armorbreak:'盾割り',haste:'加速',speed:'加速',fury:'鼓舞',barrier:'結界',reflect:'反射',taunt:'挑発'};
 for(const [kind,name]of Object.entries(labels)){
  const source={id:1,token:'s',k:'bluefist_colossus',side:0,x:100,y:200,hp:100,dead:false},target={id:2,token:'t',k:'golem',side:1,x:130,y:200,hp:100,dead:false};units=[source,target];state='fight';elapsed=0;BossAbilities.reset();resetBattleLogObservation();combatEvents=[];
  const c=BossAbilities.begin({tick:1,dt:1/60,collect:true,units,alive:units,pending:new Map(),hit(){},healingFactor:()=>1});
  assert(c.status(source,target,kind,60));const log=BattleLog.createRecorder(units);log.capture(1,battleLogObserved,units);const rows=log.rows().filter(r=>r.type==='boss_ability');assert.equal(rows.length,1);assert.equal(rows[0].data.status,name);assert.equal(rows[0].data.kind,'status');assert(battleLogVisibleRow(rows[0]));assert(BattleLog.describe(rows[0],log.catalog).sentence.endsWith(name+'を付与'));
  resetBattleLogObservation();assert.equal(c.status(source,target,kind,60),false);assert.equal(battleLogObserved.length,0);target.dead=true;assert.equal(c.status(source,target,kind,120),false);assert.equal(battleLogObserved.length,0);
 }
}`));
check('generic emission shapes stay out of diagnostic log, combat payloads still carry their exact original fields',()=>{
 for(const h of [baseline,candidate])h.ev(`globalThis.bossShapeProbe=()=>{
  const source={id:1,token:'s',k:'razorclaw_reaver',side:0,x:100,y:200,hp:100,dead:false,bossState:{clawGuard:{start:1,until:91}}},target={id:2,token:'t',k:'golem',side:1,x:130,y:200,hp:100,dead:false};units=[source,target];state='fight';elapsed=0;BossAbilities.reset();resetBattleLogObservation();combatEvents=[];
  const c=BossAbilities.begin({tick:1,dt:1/60,collect:true,units,alive:units,pending:new Map(),hit(){},healingFactor:()=>1});
  c.event(source,'双爪迎撃',target);c.event(source,'死亡時能力');c.event(source,'紅蓮の咆哮');c.event(source,'双爪の反撃');c.event(source,'爪の構え',target);c.event(source,'爪で防御',target,{absorbed:12.5});
  const log=BattleLog.createRecorder(units);log.capture(1,battleLogObserved,units);return {events:combatEvents,rows:log.rows()};
 };`);
 const a=plain(baseline.ev('bossShapeProbe()')),b=plain(ev('bossShapeProbe()'));assert.deepEqual(b.events,a.events);assert.equal(b.events.length,6);assert.equal(b.rows.length,2);assert.deepEqual(b.rows.map(r=>r.data),[{status:'爪の構え',kind:'guard'},{blocked:12.5,status:'爪で防御',kind:'block'}]);
});
check('non-collecting mechanics records each concrete outcome once without manufacturing combat events',()=>ev(`{
 const source={id:1,token:'s',k:'bluefist_colossus',side:0,x:100,y:200,hp:100,dead:false},target={id:2,token:'t',k:'golem',side:1,x:130,y:200,hp:100,dead:false};units=[source,target];state='fight';elapsed=0;BossAbilities.reset();resetBattleLogObservation();combatEvents=[];
 const c=BossAbilities.begin({tick:1,dt:1/60,collect:false,units,alive:units,pending:new Map(),hit(){},healingFactor:()=>1});c.event(source,'特殊攻撃',target);assert(c.status(source,target,'stun',30));assert.equal(combatEvents.length,0);assert.equal(battleLogObserved.length,1);assert.equal(battleLogObserved[0].status,'気絶');
}`));
check('complete natural fight physics and raw combat event bytes equal the frozen baseline',()=>{
 for(const pair of [['bluefist_colossus','golem'],['razorclaw_reaver','bluefist_colossus'],['cleaver_brute','roarfang_beast'],['moonclaw_werewolf','basalt_titan']]){
  const code=`bossLogFixture(${JSON.stringify(pair[0])},${JSON.stringify(pair[1])},3600)`,a=plain(baseline.ev(code)),b=plain(ev(code));
  assert.deepEqual(b.eventTrace,a.eventTrace,pair.join('/')+' raw events');assert.deepEqual(b.stateTrace,a.stateTrace,pair.join('/')+' physics');assert.equal(b.tick,a.tick);assert.equal(b.winner,a.winner);
 }
});

let baselineReplay,candidateReplay;
check('canonical replay physics, poses, effects and frames are exactly unchanged; only diagnostic log differs',()=>{
 const run=`bossLogFixture('bluefist_colossus','golem',3600,true)`;baselineReplay=plain(baseline.ev(run));candidateReplay=plain(ev(run));assert(!candidateReplay.unavailable);assert(!baselineReplay.unavailable);
 const a={...baselineReplay},b={...candidateReplay};delete a.battleLog;delete b.battleLog;assert.deepEqual(b,a);
 baseline.context.__replay=baselineReplay;candidate.context.__replay=candidateReplay;
 for(const tick of [0,55,120,Math.floor(candidateReplay.ticks/2),candidateReplay.ticks])assert.deepEqual(plain(ev(`CompactReplay.createPlayback(__replay).at(${tick})`)),plain(baseline.ev(`CompactReplay.createPlayback(__replay).at(${tick})`)));
});
check('existing bounded codec accepts new outcomes without fields/types/version changes, including the old reader',()=>{
 candidate.context.__newReplay=candidateReplay;baseline.context.__newReplay=candidateReplay;
 for(const h of [baseline,candidate])assert.equal(h.ev('BattleLog.createPlayback(__newReplay).available'),true);
 assert.equal(candidateReplay.battleLog.version,2);
 for(const field of ['const numericFields=','const stringFields=']){const line=s=>s.slice(s.indexOf(field),s.indexOf('\n',s.indexOf(field)));assert.equal(line(html),line(before));}
 const bounds=s=>s.slice(s.indexOf(' const MAX_ROWS=2000'),s.indexOf('\n',s.indexOf(' const MAX_ROWS=2000')));assert.equal(bounds(html),bounds(before));
 assert(ev('CompactReplay.replayByteLength(__newReplay.battleLog)<=BattleLog.MAX_LOG_BYTES'));assert(ev('CompactReplay.replayByteLength(__newReplay)<=CompactReplay.MAX_REPLAY_BYTES'));
});
check('legacy blank boss rows remain readable raw data but never display fabricated status or empty spam',()=>{
 candidate.context.__oldReplay=baselineReplay;
 const old=plain(ev(`(()=>{const p=BattleLog.createPlayback(__oldReplay),rows=p.rowsAt(__oldReplay.ticks),boss=rows.filter(r=>r.type==='boss_ability');return {available:p.available,bossCount:boss.length,visibleBoss:boss.filter(battleLogVisibleRow).length,other:rows.filter(r=>r.type!=='boss_ability').length,raw:JSON.stringify(__oldReplay)};})()`));
 assert(old.available);assert(old.bossCount>0);assert.equal(old.visibleBoss,0);assert(old.other>0);assert.equal(old.raw,JSON.stringify(baselineReplay));
 for(const data of [{},{name:'気絶'},{kind:'status',status:''},{kind:'status',status:' '},{kind:'cast',status:'双拳地震'},{kind:'block',status:'爪で防御',blocked:0}])assert.equal(ev(`battleLogVisibleRow({type:'boss_ability',data:${JSON.stringify(data)}})`),false);
});
check('replay transport and reconnect retain concrete outcomes and canonical wallet exactly once',()=>ev(`{
 let now=100000,q=[],guest;const replay=__newReplay,opts={roomId:'boss-log',sessionId:'boss-log-session',hostId:'host',environment:replay.environment,requireEnvironment:true};
 const host=MultiBinding.createWalletSession({...opts,userId:'host',now:()=>now,send:w=>q.push(['guest','host',w])});
 const freshGuest=()=>MultiProtocol.createSession({...opts,userId:'guest',now:()=>now+45000,send:w=>q.push(['host','guest',w])});guest=freshGuest();
 const flush=()=>{let n=0;while(q.length&&n++<20000){const [to,from,w]=q.shift();(to==='host'?host:guest).receive(from,w)}assert.equal(q.length,0)};
 const transfer=()=>{for(let i=0;i<20&&!guest.getReplay();i++){now+=100;host.tick();guest.tick();flush();}assert(guest.getReplay());};
 guest.hello();host.hello();flush();host.openRound({roundId:1,durationMs:60000,matchup:{environment:replay.environment,units:[]}});flush();host.predict('A',25);guest.predict('B',25);flush();host.startBattle(replay);flush();transfer();host.settleRound();host.showResult();flush();
 const wallets=JSON.stringify(host.getState().wallets),deadline=host.getState().nextRoundAt,raw=JSON.stringify(guest.getReplay().battleLog);assert.equal(raw,JSON.stringify(replay.battleLog));
 guest.close();guest=freshGuest();guest.hello();flush();transfer();assert.equal(JSON.stringify(guest.getState().wallets),wallets);assert.equal(host.getLedger().completedRounds,1);assert.equal(guest.getState().nextRoundAt,deadline);assert.equal(JSON.stringify(guest.getReplay().battleLog),raw);
 const p=BattleLog.createPlayback(guest.getReplay()),rows=p.rowsAt(replay.ticks).filter(r=>r.type==='boss_ability'&&battleLogVisibleRow(r));assert(rows.some(r=>r.data.status==='気絶'));assert(!rows.some(r=>!r.data.status));
}`));
check('money, combat implementation outside diagnostic helper, status application, codec and protocol are untouched',()=>{
 const block=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
 for(const [a,b]of [['const Money=(()=>{','// No stat inflation:'],[' function status(c,u,v,','/* Control/melee bosses.'],['/* Control/melee bosses.','function publishCombatEvent(event){'],['const ReplayClock=(()=>{','const MultiProtocol='],['const MultiProtocol=(()=>{','const MultiBinding='],[' const numericFields=',' const actorText=']]){
  assert(before.includes(a)&&before.includes(b),'missing byte-preservation anchor');assert.equal(block(html,a,b),block(before,a,b),a);
 }
});
const result={sha:candidate.sha,baselineSha:baseline.sha,passed:checks.length,checks,changes:'Existing diagnostic fields only; combat events and replay frames byte-identical',naturalStun:natural.bossRows.find(x=>x.row.data.status==='気絶')};
if(process.env.REPORT_DIR){fs.mkdirSync(process.env.REPORT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.REPORT_DIR,'boss-status-logs.json'),JSON.stringify(result,null,2));}
console.log(JSON.stringify(result,null,2));
