'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.GAME_HTML=process.env.GAME_HTML||path.resolve('index.html');
const {vm,context}=require('./cashout-harness.js');context.assert=assert;
vm.runInContext(`
function makeTimedRoom(count=2){
 let time=1000,q=[],clients={};const opts={roomId:'timed-room',sessionId:'timed-session',hostId:'host',now:()=>time};
 const host=MultiBinding.createWalletSession({...opts,userId:'host',send:w=>Object.keys(clients).forEach(id=>q.push([id,'host',w]))});
 const makeGuest=id=>MultiProtocol.createSession({...opts,userId:id,now:()=>time+20000,send:w=>q.push(['host',id,w])});
 const flush=()=>{let n=0;while(q.length&&n++<10000){const [to,from,w]=q.shift(),m=JSON.parse(w);const ok=(to==='host'?host:clients[to]).receive(from,w);if(m.type==='snapshot')assert.equal(ok,true,'canonical snapshot accepted');}assert.equal(q.length,0);};
 for(let i=1;i<count;i++){clients['guest'+i]=makeGuest('guest'+i);clients['guest'+i].hello();}host.hello();flush();
 const sync=()=>{flush();for(const c of Object.values(clients))assert.equal(JSON.stringify(c.getState()),JSON.stringify(host.getState()));};
 const open=n=>{host.openRound({roundId:n,durationMs:60000,matchup:{units:[]}});sync();};
 const play=(n,winner='draw')=>{open(n);for(const id of host.getState().participants){const p=host.getState().wallets.find(p=>p.playerId===id);if(!p.cashedOut&&p.terminalReason!=='bankrupt')(id==='host'?host:clients[id]).predict(id==='host'?'A':'B',MoneyUI.defaultStake(p.balance,n));}sync();assert.equal(host.getState().phase,'locked');host.startBattle({engineVersion:'test',ticks:1,winner,events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();sync();};
 const normal=()=>{for(let n=1;n<=10;n++)play(n);};
 const advance=(ms,tick=true)=>{time+=ms;if(tick)host.tick();sync();};
 const rejoin=id=>{clients[id].close();clients[id]=makeGuest(id);clients[id].hello();sync();return clients[id];};
 return {host,clients,normal,open,play,sync,advance,rejoin,getTime:()=>time};
}
let cases=0;function check(name,f){f();cases++;console.log('PASS',name);}
check('shared deadline begins at result 10 and expires exactly at 30 seconds',()=>{
 const r=makeTimedRoom();r.normal();assert.equal(r.host.getState().decisionDeadline,31000);assert.equal(r.clients.guest1.getState().decisionDeadline,31000);
 r.advance(29999);assert.equal(r.host.getState().phase,'result');assert.equal(r.host.getLedger().cashouts.length,0);
 r.advance(1);const s=r.host.getState();assert.equal(s.phase,'lobby');assert.equal(s.roundId,10);assert.equal(s.decisionDeadline,null);assert.equal(s.wallets.length,2);
 for(const p of s.wallets){assert.equal(p.balance,100);assert.equal(p.cashoutAmount,100);assert.equal(p.cashoutReason,'decision-timeout');assert.equal(p.cashoutRequestId,'auto-decision-timeout:10');}
 assert.equal(r.host.getLedger().cashouts.length,2);assert.equal(r.host.getState().stoppedReason,null);assert.equal(r.host.requestContinue(),false);assert.equal(r.clients.guest1.requestContinue(),false);
 r.advance(60000);assert.equal(r.host.getLedger().cashouts.length,2);
});
check('all eight idle players lock balances and return lobby',()=>{const r=makeTimedRoom(8);r.normal();r.advance(30000);assert.equal(r.host.getState().phase,'lobby');assert.equal(r.host.getLedger().cashouts.length,8);assert.equal(r.host.getState().cashedOutIds.length,8);});
for(const continuing of ['host','guest1'])check(continuing+' continues while timeout player spectates with frozen gold',()=>{
 const r=makeTimedRoom();r.normal();const c=continuing==='host'?r.host:r.clients.guest1;assert(c.requestContinue());r.sync();r.advance(30000);const s=r.host.getState(),stopped=continuing==='host'?'guest1':'host';assert.equal(s.phase,'result');assert.equal(s.continueIds[0],continuing);assert.equal(s.wallets.find(p=>p.playerId===stopped).balance,100);assert(s.cashedOutIds.includes(stopped));
 r.open(11);assert.equal(r.host.getState().decisionDeadline,null);assert.equal((stopped==='host'?r.host:r.clients.guest1).requestContinue(),false);assert(c.predict('A',100));r.sync();assert.equal(r.host.getState().phase,'locked');
 r.host.startBattle({engineVersion:'test',ticks:1,winner:'A',events:[],unavailable:'replay-byte-cap'});r.host.settleRound();r.host.showResult();r.sync();assert.equal(r.host.getState().wallets.find(p=>p.playerId===continuing).balance,200);assert.equal(r.host.getState().wallets.find(p=>p.playerId===stopped).balance,100);assert.equal(r.host.getState().decisionDeadline,r.getTime()+30000);
});
check('all continue before timeout remains eligible and no cashout occurs',()=>{const r=makeTimedRoom();r.normal();r.host.requestContinue();r.clients.guest1.requestContinue();r.sync();r.advance(30000);assert.equal(r.host.getLedger().cashouts.length,0);r.open(11);assert.equal(r.host.getState().phase,'predict');});
check('clock offset and reconnect do not restart decision timer',()=>{const r=makeTimedRoom();r.normal();r.advance(15000);const g=r.rejoin('guest1');assert.equal(g.getState().decisionDeadline,31000);assert.equal(multiDecisionSeconds(g.getState(),g.getPlaybackClock()),15);r.advance(15000);assert.equal(g.getState().phase,'lobby');r.rejoin('guest1');assert.equal(r.clients.guest1.getState().wallets[1].cashoutAmount,100);});
check('host late continue at deadline loses to timeout',()=>{const r=makeTimedRoom();r.normal();r.advance(30000,false);assert.equal(r.host.requestContinue(),false);r.sync();assert.equal(r.host.getState().phase,'lobby');});
check('late guest message and forged timeout reason cannot bypass authority',()=>{const r=makeTimedRoom();r.normal();const forged=MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,roomId:'timed-room',sessionId:'timed-session',type:'cashout',roundId:10,requestId:'spoof',reason:'decision-timeout'});assert.equal(r.host.receive('guest1',forged),false);assert.equal(r.host.getLedger().cashouts.length,0);r.advance(29999);r.host.heartbeat();r.sync();r.advance(1,false);r.clients.guest1.requestContinue();r.sync();assert.equal(r.host.getState().phase,'lobby');});
check('manual stop plus idle player resolves without changing manual receipt',()=>{const r=makeTimedRoom();r.normal();assert(r.host.cashOut());r.sync();r.advance(30000);assert.equal(r.host.getState().phase,'lobby');assert.equal(r.host.getState().wallets[0].cashoutReason,'player');assert.equal(r.host.getState().wallets[1].cashoutReason,'decision-timeout');});
check('normal result timer never creates timeout cashout',()=>{const r=makeTimedRoom();r.play(1);assert.equal(r.host.getState().decisionDeadline,null);r.advance(30000);assert.equal(r.host.getState().phase,'result');assert.equal(r.host.getLedger().cashouts.length,0);});
check('bankrupt players are excluded and final overtime loss returns lobby',()=>{const r=makeTimedRoom();r.normal();r.host.cashOut();r.clients.guest1.requestContinue();r.sync();r.play(11,'A');assert.equal(r.host.getState().phase,'lobby');assert.equal(r.host.getState().wallets[1].terminalReason,'bankrupt');assert.equal(r.host.getLedger().cashouts.length,1);});
check('score bridge allows only canonical multiplayer timeout and posts local score once',()=>{
 const r=makeTimedRoom();r.normal();r.advance(30000);const s=r.host.getState(),messages=[];const b=ScoreBridge.createScoreBridge({isGravity:true,isEmbedded:true,postMessage:m=>messages.push(m)});
 const q={sessionId:s.sessionId,playerId:'guest1',players:s.wallets,mode:s.mode,completedRounds:10,totalRounds:10,action:'cashout',automaticTimeout:true};
 assert.equal(b.submit({...q,automaticTimeout:false}).status,'user-action-required');assert.equal(b.submit({...q,mode:ScoreBridge.SOLO_GAME_MODE}).status,'user-action-required');assert.equal(b.submit({...q,spectator:true}).status,'ineligible');assert.equal(b.submit({...q,playerId:'outsider'}).status,'user-action-required');assert.equal(b.submit(q).status,'posted-unconfirmed');assert.equal(messages.length,1);assert.equal(messages[0].type,'gameOver');assert.equal(messages[0].score,100);assert.equal(b.submit(q).status,'duplicate');
 assert.equal(b.submit({...q,sessionId:'large',players:s.wallets.map(p=>({...p,balance:'9007199254740992',cashoutAmount:'9007199254740992'}))}).status,'unsupported-precision');
});
console.log('PASS '+cases+' multiplayer overtime timeout cases');
`,context);
