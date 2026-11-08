'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const harness=process.env.ENGINE_HARNESS||process.env.HARNESS_PATH||process.env.GAME_HARNESS||path.join(root,'tools/boss-abilities/tests/harness.cjs');
const {ev,context,nodes,sha}=require(harness);
const integrated=process.argv.includes('--integrated');
const bossDiagnosticMarker=' // Boss diagnostic outcomes use existing status/kind/blocked fields, not a new replay schema.\n';
const bossFormatLine="  if(row.type==='boss_ability'){args.status=typeof d.status==='string'?d.status:'';if(d.kind==='status')template='{source} → {target}：{status}を付与';else if(d.kind==='block')template='{source} → {target}：{status}（{blocked}軽減）';}\n";
const bossFilterBranch=" if(row?.type==='boss_ability'){\n  const d=row.data||{},named=typeof d.status==='string'&&d.status.trim().length>0&&d.status.length<=80;\n  // Older rows lost the outcome name; hide them rather than inventing an action.\n  return named&&(['status','guard'].includes(d.kind)||d.kind==='block'&&Number.isFinite(d.blocked)&&d.blocked>0);\n }\n";
function normalizeBossDiagnostic(s){
 const start=s.indexOf(' function event(c,u,name,target=null,details={}){'),end=s.indexOf(' function status(c,u,v,',start);
 if(start>=0){assert(end>start);s=s.slice(0,start)+' /* Separately verified boss diagnostic event function. */\n'+s.slice(end);}
 return s.replace(bossDiagnosticMarker,'').replace(bossFormatLine,'').replace(bossFilterBranch,'');
}
context.assert=assert;context.btoa=btoa;context.atob=atob;
for(const node of nodes.values()){
 node.attributes={};node.setAttribute=function(k,v){this.attributes[k]=String(v)};
 node.getAttribute=function(k){return this.attributes[k]??null};node.removeAttribute=function(k){delete this.attributes[k]};
}
const checks=[];
function check(name,fn){fn();checks.push(name);console.log('PASS '+name)}
const html=fs.readFileSync(process.env.GAME_HTML||path.join(root,'index.html'),'utf8');
check('result area is always expanded, has no removed heading or details control',()=>{
 assert.match(html,/<div id="multiResults" class="multi-results" hidden>/);
 assert(!html.includes('参加者の結果'));assert(!/<details[^>]+id="multiResults"/.test(html));
});
ev(`globalThis.resultTestRoom=(offset=45000,initialBalance=100)=>{
 let time=100000,q=[],guest,holdChunks=false,held=[];
 const opts={roomId:'result-test',sessionId:'result-session-'+Math.random(),hostId:'host',environment:BattleFields.selectRunEnvironment(712),requireEnvironment:true};
 const host=MultiBinding.createWalletSession({...opts,userId:'host',walletConfig:{initialBalance},now:()=>time,send:w=>q.push(['guest','host',w])});
 const newGuest=()=>MultiProtocol.createSession({...opts,userId:'guest',now:()=>time+offset,send:w=>q.push(['host','guest',w])});guest=newGuest();
 const flush=()=>{let n=0;while(q.length&&n++<10000){const packet=q.shift(),[to,from,w]=packet;if(holdChunks&&JSON.parse(w).type==='replay-chunk'){held.push(packet);continue;}(to==='host'?host:guest).receive(from,w)}assert.equal(q.length,0)};
 guest.hello();host.hello();flush();
 const finish=(n,winner='draw',sides=['A','B'],stakes=null,replay=null)=>{
  host.openRound({roundId:n,durationMs:60000,matchup:{environment:opts.environment,units:[{id:'a',side:0,k:'sword',x:120,y:269,hp:100,dead:false},{id:'b',side:1,k:'archer',x:360,y:269,hp:100,dead:false}]}});flush();
  for(const [i,id]of ['host','guest'].entries()){const p=host.getState().wallets.find(x=>x.playerId===id);if(!p.cashedOut&&p.terminalReason!=='bankrupt')(id==='host'?host:guest).predict(sides[i],stakes?stakes[i]:MoneyUI.defaultStake(p.balance,n));}flush();
  host.startBattle({...replay||{engineVersion:'test',ticks:1,winner,events:[],unavailable:'replay-byte-cap'},environment:opts.environment});host.settleRound();host.showResult();flush();
 };
 return {host,get guest(){return guest},flush,finish,now:()=>time,advance:ms=>time+=ms,
 syncClock(){host.heartbeat();guest.requestClockSync();flush()},
 rejoin(){guest.close();guest=newGuest();guest.hello();flush()},
 holdChunks(){holdChunks=true},releaseChunks(){holdChunks=false;q.push(...held.splice(0));flush()},heldCount:()=>held.length};
};
globalThis.attachResultTestRoom=(r,asHost=true)=>{
 multiSession=asHost?r.host:r.guest;multiHost=asHost;multiUser=asHost?'host':'guest';multiAdapter=null;mockGuest=null;mockQueue=[];
 multiSnapshot=multiSession.getState();multiShownWallets=multiSnapshot.wallets;multiRoundSeen=multiSnapshot.roundId;multiInitial=multiSnapshot.matchup?.units||[];
 initialKinds=[0,1].map(side=>multiInitial.filter(u=>u.side===side).map(u=>u.k));multiBusy=false;multiRecording=false;multiPlayback=null;multiReplay=null;multiLastPump=r.now();multiHeartbeat=r.now();multiError='';screenMode='game';round=multiSnapshot.roundId||1;multiUnavailableRound=null;
};
globalThis.resultSeconds=session=>multiNextRoundSeconds(session.getState(),session.getPlaybackClock());`);

check('correct predictors only, exact names, missing-profile fallback, no gold details',()=>ev(`{
 const r=resultTestRoom();r.finish(1,'A');
 multiAdapter={getProfile:id=>({name:id==='host'?'みかん':'りんご'})};
 assert.equal(multiResultText(r.host.getState(),'host'),'的中：みかん');
 const unchanged=JSON.stringify(r.host.getState());multiResultText(r.host.getState(),'guest');assert.equal(JSON.stringify(r.host.getState()),unchanged);
 multiAdapter=null;assert.equal(multiResultText(r.host.getState(),'guest'),'的中：参加者1');assert.equal(multiResultText(r.host.getState(),'host'),'的中：あなた');
}`));
check('late genuine profile refresh replaces fallback in the visible result without cache',()=>ev(`{
 const r=resultTestRoom();r.finish(1,'A');attachResultTestRoom(r);displayMultiState();assert.equal(document.querySelector('#multiResultsList').textContent,'的中：あなた');
 multiAdapter={getProfile:id=>id==='host'?{name:'QA Player One'}:null};displayMultiState();assert.equal(document.querySelector('#multiResultsList').textContent,'的中：QA Player One');multiAdapter=null;
}`));
check('eight correct players, escaped text path, losses, draw, invalid and incomplete receipts',()=>ev(`{
 multiAdapter={getProfile:id=>({name:'<b>'+id+'</b>長い名前😀'})};
 const participants=Array.from({length:8},(_,i)=>'p'+i),s={phase:'result',winner:'B',participants,roundResults:participants.map(playerId=>({playerId,submitted:true,correct:true,side:'B'}))};
 const text=multiResultText(s,'viewer');assert.equal(text,'的中：'+participants.map(id=>'<b>'+id+'</b>長い名前😀').join('、'));
 assert.equal(multiResultText({...s,winner:'draw'},'viewer'),'');assert.equal(multiResultText({...s,winner:'invalid'},'viewer'),'');
 assert.equal(multiResultText({...s,phase:'battle'},'viewer'),'');
 assert.equal(multiResultText({...s,roundResults:s.roundResults.map(e=>({...e,correct:false,side:'A'}))},'viewer'),'');
 assert.equal(multiResultText({...s,roundResults:[]},'viewer'),'');
 assert.equal(multiResultText({...s,roundResults:s.roundResults.map(e=>({...e,submitted:false}))},'viewer'),'');
 multiAdapter=null;
}`));
check('canonical multiplayer payout: winner, loser, draw, 0 G recovery, large exact amount',()=>ev(`{
 for(const [balance,outcome,sides,stakes,expected]of [
  [100,'A',['A','B'],[25,25],[125,75]],
  [100,'draw',['A','B'],[25,25],[100,100]],
  [0,'A',['A','B'],[0,0],[10,0]],
  [9007199254740991,'A',['A','B'],[9007199254740991,9007199254740991],['18014398509481982','0']]
 ]){const r=resultTestRoom(45000,balance);r.finish(1,outcome,sides,stakes);assert.deepEqual(r.host.getState().wallets.map(x=>String(x.balance)),expected.map(String));const before=JSON.stringify(r.host.getLedger());attachResultTestRoom(r);displayMultiState();assert.equal(document.querySelector('#multiResultsList').textContent,outcome==='draw'?'':'的中：あなた');assert.equal(document.querySelector('#multiResults').hidden,outcome==='draw');syncPersonalResult(1000);cancelPersonalResult();assert.equal(JSON.stringify(r.host.getLedger()),before);assert.equal(document.querySelector('#breakdown').textContent,credits(r.host.getState().roundResults.find(e=>e.playerId==='host').delta));}
}`));
check('solo win, loss, draw and zero result keep own exact delta and manual next',()=>ev(`{
 multiSession=null;multiSnapshot=null;multiAdapter=null;mockGuest=null;soloRunEnded=false;screenMode='game';
 for(const [balance,outcome,expected]of [[100,'A','+25 G'],[100,'B','−25 G'],[100,'draw','0 G'],[0,'A','+10 G'],[0,'B','0 G']]){
  const sid='solo-results-'+balance+outcome;walletState=SoloWallet.createSession({sessionId:sid,playerIds:[PLAYER],config:{initialBalance:balance}});
  walletState=SoloWallet.openRound(walletState,{sessionId:sid,roundId:1,deadline:100});walletState=SoloWallet.commitPrediction(walletState,{sessionId:sid,roundId:1,playerId:PLAYER,side:'A',stake:balance?25:0,now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:sid,roundId:1,outcome,now:0});
  state='result';round=1;choice=0;winner=outcome==='draw'?null:outcome==='A'?0:1;const before=JSON.stringify(walletState);syncPersonalResult(1000);cancelPersonalResult();assert.equal(document.querySelector('#breakdown').textContent,expected);assert.equal(document.querySelector('#multiResults').hidden,true);for(let i=0;i<5;i++)advanceResultRead(100000+i*100000);assert.equal(round,1);assert.equal(JSON.stringify(walletState),before);
 }
 nextPrediction();assert.equal(round,2);assert.equal(walletState.completedRounds,1);
}`));
check('normal 8-second deadline and post-ten 30-second decision are distinct',()=>ev(`{
 assert.equal(MultiProtocol.RESULT_WAIT_MS,8000);assert.equal(MultiProtocol.DECISION_TIMEOUT_MS,30000);
 const r=resultTestRoom();r.finish(1);assert.equal(r.host.getState().nextRoundAt,r.now()+8000);assert.equal(resultSeconds(r.host),8);assert.equal(resultSeconds(r.guest),8);
 for(let n=2;n<=10;n++)r.finish(n);assert.equal(r.host.getState().nextRoundAt,null);assert.equal(r.host.getState().decisionDeadline,r.now()+30000);
 r.advance(29999);r.syncClock();assert.equal(r.host.getState().phase,'result');assert.equal(r.host.getState().cashedOutIds.length,0);r.advance(1);r.host.tick();assert.equal(r.host.getState().phase,'lobby');assert.equal(r.host.getState().cashedOutIds.length,2);assert(r.host.getState().wallets.every(p=>p.cashoutAmount===100));
}`));
check('independent device clocks, duplicate snapshots and reconnect retain remaining time',()=>ev(`{
 for(const offset of [-50000,45000,900000]){const r=resultTestRoom(offset);r.finish(1);const at=r.host.getState().nextRoundAt,wallets=JSON.stringify(r.host.getState().wallets);r.advance(3456);assert.equal(resultSeconds(r.host),5);assert.equal(resultSeconds(r.guest),5);r.syncClock();assert.equal(r.host.getState().nextRoundAt,at);assert.throws(()=>r.host.showResult(),/not-settled/);r.rejoin();assert.equal(r.guest.getState().nextRoundAt,at);assert.equal(resultSeconds(r.guest),5);assert.equal(JSON.stringify(r.guest.getState().wallets),wallets);r.advance(4544);r.syncClock();assert.equal(resultSeconds(r.guest),0);assert.equal(r.guest.getState().roundId,1);}
 assert.equal(multiNextRoundSeconds({phase:'result',roundId:1,nextRoundAt:108000},{known:false,estimatedHostNow:999999}),null);
}`));
check('host UI rejects premature next, advances once at 8 seconds, and keeps 60-second prediction window',()=>ev(`{
 const r=resultTestRoom();r.finish(1);attachResultTestRoom(r);const ledger=JSON.stringify(r.host.getLedger());displayMultiState();assert.equal(document.querySelector('#next').disabled,true);assert(document.querySelector('#next').textContent.includes('8秒'));
 for(let i=0;i<3;i++){openMultiRound();nextPrediction();document.querySelector('#next').onclick({isTrusted:true})}assert.equal(r.host.getState().roundId,1);
 r.advance(7999);pumpMulti(r.now());assert.equal(r.host.getState().roundId,1);assert.equal(JSON.stringify(r.host.getLedger()),ledger);
 r.advance(1);pumpMulti(r.now());r.flush();assert.equal(r.host.getState().roundId,2);assert.equal(r.host.getState().phase,'predict');assert.equal(r.host.getState().deadline,r.now()+60000);assert.equal(r.guest.getState().roundId,2);assert.equal(r.host.getLedger().completedRounds,1);
 const revision=r.host.getState().revision;for(let i=0;i<5;i++){pumpMulti(r.now());openMultiRound()}assert.equal(r.host.getState().revision,revision);
 assert(r.host.predict('A',25));assert(r.guest.predict('B',25));r.flush();assert.equal(r.host.getState().phase,'locked');
}`));
check('guest never advances locally; stopped host never starts another round',()=>ev(`{
 const r=resultTestRoom();r.finish(1);attachResultTestRoom(r,false);r.advance(8000);r.syncClock();pumpMulti(r.now()+45000);openMultiRound();assert.equal(r.host.getState().roundId,1);assert.equal(r.guest.getState().roundId,1);
 r.host.memberLeft('host');r.guest.memberLeft('host');attachResultTestRoom(r);r.advance(10000);pumpMulti(r.now());assert.equal(r.host.getState().phase,'stopped');assert.equal(r.host.getState().roundId,1);
}`));
check('late replay delivery cannot erase result, reset its deadline or settle twice',()=>ev(`{
 const r=resultTestRoom();const replay=(()=>{const us=[{id:1,token:'a',k:'sword',side:0,x:100,y:200,hp:100,dead:false},{id:2,token:'b',k:'shield',side:1,x:300,y:200,hp:100,dead:false}],rec=CompactReplay.createCompactRecorder();rec.capture(0,{units:us,shots:[]});rec.capture(60,{units:us,shots:[]},true);return rec.finish({ticks:60,winner:'draw'});})();
 r.holdChunks();r.finish(1,'draw',['A','B'],[25,25],replay);assert(r.heldCount()>0);assert.equal(r.guest.getReplay(),null);assert.equal(r.host.getState().replayStartAt,r.now()+2000);
 const deadline=r.host.getState().nextRoundAt,wallets=JSON.stringify(r.host.getState().wallets);attachResultTestRoom(r,false);displayMultiState();assert.equal(document.querySelector('#multiResultsList').textContent,'');assert.equal(document.querySelector('#multiResults').hidden,true);assert.equal(document.querySelector('#message').textContent,'引き分け');assert.equal(document.querySelector('#resultPanel').hidden,false);
 r.advance(7000);r.releaseChunks();assert(r.guest.getReplay());assert.equal(r.guest.getState().phase,'result');assert.equal(r.guest.getState().nextRoundAt,deadline);assert.equal(resultSeconds(r.guest),1);assert.equal(JSON.stringify(r.guest.getState().wallets),wallets);assert.equal(r.host.getLedger().completedRounds,1);
 attachResultTestRoom(r);r.advance(1000);pumpMulti(r.now());r.flush();assert.equal(r.guest.getState().roundId,2);assert.equal(r.host.getLedger().completedRounds,1);
}`));
check('lost replay does not delay authoritative result or change wallet at transition',()=>ev(`{
 const r=resultTestRoom();r.finish(1,'A');const wallet=JSON.stringify(r.host.getState().wallets);attachResultTestRoom(r);r.advance(8000);pumpMulti(r.now());r.flush();assert.equal(r.guest.getState().roundId,2);assert.equal(JSON.stringify(r.guest.getState().wallets),wallet);assert.equal(r.host.getLedger().completedRounds,1);
}`));
check('replay chunks arriving after the next round cannot revive the old result',()=>ev(`{
 const r=resultTestRoom();const replay=(()=>{const us=[{id:1,token:'a',k:'sword',side:0,x:100,y:200,hp:100,dead:false},{id:2,token:'b',k:'shield',side:1,x:300,y:200,hp:100,dead:false}],rec=CompactReplay.createCompactRecorder();rec.capture(0,{units:us,shots:[]});rec.capture(60,{units:us,shots:[]},true);return rec.finish({ticks:60,winner:'draw'});})();
 r.holdChunks();r.finish(1,'draw',['A','B'],[25,25],replay);const old=r.guest.getState();attachResultTestRoom(r);r.advance(8000);pumpMulti(r.now());r.flush();const before=JSON.stringify(r.guest.getState());r.releaseChunks();assert.equal(JSON.stringify(r.guest.getState()),before);assert.equal(r.guest.getReplay(),null);assert.equal(r.guest.getState().roundId,2);assert.equal(r.host.getLedger().completedRounds,1);
 assert(r.guest.receive('host',MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,roomId:'result-test',sessionId:old.sessionId,type:'snapshot',state:old})));assert.equal(JSON.stringify(r.guest.getState()),before);
}`));

const kept='resolved_hit heal summon_spawn split_spawn guard_intercept parry_block counter_barrier_block aegis_block ward_block ward_consumed ward_granted ward_group_granted counter_barrier_activated contact_retaliation aegis_activated aegis_target_acquired haste_changed move_boost_applied move_pulse stability_aura_activated knockback_resisted repulsion_push followup_marked followup_strike buff_dispelled slow_applied slow_cleansed cadence_delayed poison_applied poison_cloud healing_pulse self_repair ration_given burrow_start burrow_emerge retreat_start charge_impact charge_counter priority_strike bomb_explode chain_link moon_pierce_contact trap_triggered combo_melee_contact guard_contact golem_ground_contact log_gap status_expired summon_expired terrain_damage trap_placed unit_defeated healing_block_applied battle_finished revive_complete death_explode exposure_applied exposure_cleansed boss_ability'.split(' ');
const hidden='book_action_start defense_action_start aegis_action_start dispel_action_start burrow_warning melee_action_start combo_melee_start charged_shot_start moon_action_start orb_action_start pillar_action_start corner_pillar_start guard_warning high_action_start wave4_action_start revive_start counter_bolt_release projectile_release pillar_release corner_pillar_release shockwave_release high_breath_release high_cleave_swing ground_burst cleave_release breath_release book_action_end dispel_action_end melee_action_end combo_melee_end charged_shot_end moon_action_end orb_action_end pillar_action_end corner_pillar_end high_action_end wave4_action_end revive_cancel trap_armed trap_expired slime_split book_batch_committed'.split(' ');
const conditional='defense_action_end aegis_action_end flight_projectile_end projectile_end orb_projectile_end moon_projectile_end counter_bolt_end'.split(' ');
check('all 108 catalog types explicitly audited, no accidental omissions',()=>{
 const actual=Array.from(ev('Object.keys(BATTLE_LOG_CATALOG)')).sort();assert.equal(actual.length,108);
 assert.deepEqual([...kept,...hidden,...conditional].sort(),actual);
 for(const type of kept)assert.equal(ev(`battleLogVisibleRow({type:${JSON.stringify(type)},data:${integrated&&type==='boss_ability'?"{kind:'status',status:'気絶'}":"{reason:'expired'}"}})`),true,type);
 for(const type of hidden)for(const reason of ['complete','expired','source-dead','target-dead','battle-ended','no-target','no-space','interrupted'])assert.equal(ev(`battleLogVisibleRow({type:${JSON.stringify(type)},data:{reason:${JSON.stringify(reason)}}})`),false,type+reason);
});
if(integrated)check('integrated boss rows show only concrete status, guard and positive measured blocks',()=>{
 for(const data of [{kind:'status',status:'気絶'},{kind:'guard',status:'爪の構え'},{kind:'block',status:'爪で防御',blocked:12.5}])assert.equal(ev(`battleLogVisibleRow({type:'boss_ability',data:${JSON.stringify(data)}})`),true);
 for(const data of [{},{name:'気絶'},{kind:'cast',status:'双拳地震'},{kind:'status',status:''},{kind:'status',status:' '},{kind:'block',status:'爪で防御',blocked:0},{kind:'block',status:'爪で防御',blocked:-1}])assert.equal(ev(`battleLogVisibleRow({type:'boss_ability',data:${JSON.stringify(data)}})`),false);
 assert(process.env.BOSS_LOG_BASELINE,'Integrated mode requires BOSS_LOG_BASELINE for exact diagnostic-change exclusions');
 const preBoss=fs.readFileSync(process.env.BOSS_LOG_BASELINE,'utf8');
 for(const addition of [bossDiagnosticMarker,bossFormatLine,bossFilterBranch]){assert.equal(html.split(addition).length-1,1,'exact boss diagnostic addition');assert.equal(preBoss.split(addition).length-1,0,'pre-boss baseline');}
 for(const [start,end]of [['const BossAbilities=(()=>{','/* Control/melee bosses.'],['function battleLogVisibleRow(row){','const BattleLog=(()=>{'],['const BattleLog=(()=>{','let battleLogObserved=']]){
  const extract=s=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));assert(preBoss.includes(start)&&preBoss.includes(end));assert.equal(normalizeBossDiagnostic(extract(html)),normalizeBossDiagnostic(extract(preBoss)),start);
 }
});
check('all projectile cleanup reasons hidden, actual blocks and active-defense endings retained',()=>{
 for(const type of conditional.slice(2)){
  for(const reason of [undefined,'contact','hit','expired','out-of-bounds','range','target-dead','target-layer','battle-ended','interrupted'])assert.equal(ev(`battleLogVisibleRow({type:${JSON.stringify(type)},data:${JSON.stringify({reason})}})`),false,type+reason);
  assert.equal(ev(`battleLogVisibleRow({type:${JSON.stringify(type)},data:{reason:'blocked'}})`),true,type);
 }
 for(const reason of ['expired','consumed'])assert.equal(ev(`battleLogVisibleRow({type:'defense_action_end',data:{kind:'barrier',reason:'${reason}'}})`),true);
 assert.equal(ev(`battleLogVisibleRow({type:'aegis_action_end',data:{reason:'complete'}})`),true);
 for(const reason of ['no-threat','no-healing','source-dead','battle-ended','complete'])assert.equal(ev(`battleLogVisibleRow({type:'defense_action_end',data:{kind:'repair',reason:'${reason}'}})`),false);
});
check('log filtering leaves recorded events and replay payload byte-for-byte unchanged',()=>ev(`{
 const us=[{id:1,token:'source',k:'sword',side:0,x:100,y:200,hp:100,dead:false},{id:2,token:'target',k:'shield',side:1,x:300,y:200,hp:100,dead:false}],log=BattleLog.createRecorder(us);
 const events=[{type:'projectile_end',sourceToken:'source',targetToken:'target',reason:'expired'},{type:'resolved_hit',sourceToken:'source',targetToken:'target',amount:12,hpAfter:88,hpMax:100},{type:'heal',sourceToken:'target',targetToken:'target',actualAmount:5,hpAfter:93,hpMax:100},{type:'revive_cancel',sourceToken:'source',reason:'source-dead'}];
 const eventBytes=JSON.stringify(events);log.capture(1,events,us);const raw=JSON.stringify(log.snapshot()),rows=log.rows(),before=JSON.stringify(rows);assert.equal(rows.length,4);assert.equal(rows.filter(battleLogVisibleRow).length,2);assert.equal(JSON.stringify(log.snapshot()),raw);assert.equal(JSON.stringify(rows),before);assert.equal(JSON.stringify(events),eventBytes);
 const rec=CompactReplay.createCompactRecorder();rec.capture(0,{units:us,shots:[]});rec.capture(60,{units:us,shots:[]},true);const replay=rec.finish({ticks:60,winner:'draw'});assert(BattleLog.attach(replay,log.snapshot()));const saved=JSON.stringify(replay),playback=BattleLog.createPlayback(replay);assert(playback.available);assert.equal(playback.rowsAt(60).length,4);assert.equal(playback.rowsAt(60).filter(battleLogVisibleRow).length,2);assert.equal(JSON.stringify(replay),saved);
}`));
check('all descriptions retain actual damage/heal/status/target and do not invent actor names',()=>ev(`{
 const c={actors:[{kind:'sword',side:0,ordinal:1},{kind:'archer',side:1,ordinal:1}]};
 for(const type of Object.keys(BATTLE_LOG_CATALOG))for(const source of [-1,0])for(const target of [-1,1]){
  const row={type,tick:60,source,target,data:{amount:12,actualAmount:5,hpAfter:80,hpMax:100,count:3,reason:'complete',reduction:.5,subhitId:1,factor:2,dps:3,remainingCharges:1,charges:1,delay:.2,multiplier:2,status:'poison',kind:'repair',name:'能力',leftAlive:1,rightAlive:1}};
  const d=BattleLog.describe(row,c);assert(!d.sentence.includes('不明'));assert(!/[→：]\\s*[→：]/.test(d.sentence));
 }
}`));
check('visible summary and history exclude cleanup rows while raw log stays complete',()=>ev(`{
 multiSession=null;multiSnapshot=null;multiRecording=false;predictionPreview=false;screenMode='game';state='result';battleLogOpen=true;battleLogRenderKey='';battleLogPageEnd=null;
 const us=[{id:1,token:'source',k:'sword',side:0,x:100,y:200,hp:100,dead:false},{id:2,token:'target',k:'shield',side:1,x:300,y:200,hp:100,dead:false}];soloBattleLog=BattleLog.createRecorder(us);soloBattleLog.capture(1,[{type:'projectile_end',sourceToken:'source',reason:'expired'},{type:'resolved_hit',sourceToken:'source',targetToken:'target',amount:12},{type:'projectile_end',sourceToken:'source',reason:'contact'}],us);
 const create=document.createElement;document.createElement=tag=>({tag,textContent:'',children:[],setAttribute(){},append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs}});
 const list=document.querySelector('#battleLogHistoryList'),summary=document.querySelector('#battleLogSource');list.replaceChildren=(...xs)=>{list.children=xs};summary.replaceChildren=(...xs)=>{summary.children=xs};
 syncBattleLog(1000,true);assert.equal(list.children.length,1);const entry=list.children[0].children[1].children.map(x=>x.textContent).join('');assert(entry.includes('12ダメージ'));assert(!entry.includes('消えた'));assert(summary.children.map(x=>x.textContent).join('').includes('12ダメージ'));assert.equal(soloBattleLog.rows().length,3);document.createElement=create;battleLogOpen=false;
}`));
if(process.env.BASELINE_HTML)check('wallet, combat, replay codec, recording, clock speed and solo handlers unchanged',()=>{
 const before=fs.readFileSync(process.env.BASELINE_HTML,'utf8');
 for(const [start,end]of [
  ['const Money=(()=>{','// No stat inflation:'],
  ['const BossAbilities=(()=>{','const ROLE_NOTES='],
  ['const ReplayClock=(()=>{','const MultiProtocol='],
  ['function startPrediction(skip=false){','// UI admission only.'],
  ['const BattleLog=(()=>{','let battleLogObserved='],
 ]){const extract=s=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));assert(before.includes(start)&&before.includes(end),start);assert.equal(integrated?normalizeBossDiagnostic(extract(html)):extract(html),integrated?normalizeBossDiagnostic(extract(before)):extract(before),start);}
});
const report={sha,mode:integrated?'integrated':'isolated',passed:checks.length,checks,catalogAudit:{types:108,alwaysRetained:kept.length-(integrated?1:0),alwaysHidden:hidden.length,conditional:conditional.length+(integrated?1:0)},timing:{normalResultMs:8000,postTenDecisionMs:30000,predictionMaxMs:60000,replayLeadMs:2000}};
if(process.env.REPORT_DIR){fs.mkdirSync(process.env.REPORT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.REPORT_DIR,'results-waits-logs.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
