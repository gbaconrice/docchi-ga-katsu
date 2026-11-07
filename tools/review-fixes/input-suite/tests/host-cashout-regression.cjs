const assert=require('assert');
const {vm,context}=require('./cashout-harness.js');context.assert=assert;
vm.runInContext(`
const suites=[];
function check(name,fn){try{fn();suites.push({name,passed:true});console.log('PASS',name)}catch(e){suites.push({name,passed:false,error:e.message});console.error('FAIL',name,e.stack)}}
function makeRoom(guestCount=1){
 let time=1000,q=[],guests={};const rejected=[];
 const opts={roomId:'room',sessionId:'session',hostId:'host',now:()=>time};
 const host=MultiBinding.createWalletSession({...opts,userId:'host',send:w=>Object.keys(guests).forEach(id=>q.push([id,'host',w]))});
 const makeGuest=id=>MultiProtocol.createSession({...opts,userId:id,send:w=>q.push(['host',id,w])});
 const flush=()=>{let n=0;while(q.length&&n++<10000){const [to,from,w]=q.shift(),m=JSON.parse(w);const ok=(to==='host'?host:guests[to]).receive(from,w);if(!ok&&m.type==='snapshot')rejected.push({to,revision:m.state.revision});}assert.equal(q.length,0,'message queue settles')};
 const sync=()=>{flush();for(const g of Object.values(guests)){assert.equal(g.getState().revision,host.getState().revision,'guest revision matches');assert.equal(JSON.stringify(g.getState()),JSON.stringify(host.getState()),'guest snapshot matches')}assert.deepEqual(rejected,[],'valid host snapshots not rejected')};
 for(let n=1;n<=guestCount;n++)guests['guest'+n]=makeGuest('guest'+n);
 for(const g of Object.values(guests))g.hello();host.hello();sync();
 const open=n=>{host.openRound({roundId:n,durationMs:10000,matchup:{units:[]}});sync()};
 const finish=winner=>{host.startBattle({engineVersion:'test',ticks:1,winner,events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();sync()};
 const predict=()=>{const s=host.getState();for(const id of s.participants){const p=s.wallets.find(p=>p.playerId===id);if(p.cashedOut||p.terminalReason==='bankrupt')continue;(id==='host'?host:guests[id]).predict(id==='host'?'A':'B',MoneyUI.defaultStake(p.balance,s.roundId));}flush();assert.equal(host.getState().phase,'locked')};
 const play=(n,winner='draw')=>{open(n);predict();finish(winner)};
 const normal=winner=>{for(let n=1;n<=10;n++)play(n,n===10?winner:'draw')};
 const continueAll=()=>{for(const id of host.getState().participants){const p=host.getState().wallets.find(p=>p.playerId===id);if(p.cashedOut||p.terminalReason==='bankrupt')continue;assert((id==='host'?host:guests[id]).requestContinue())}sync()};
 const rejoin=id=>{guests[id].close();guests[id]=makeGuest(id);guests[id].hello();sync()};
 return {host,guests,open,finish,predict,play,normal,continueAll,sync,flush,rejoin,rejected,advance:ms=>time+=ms};
}
for(const reason of ['player','room-exit'])for(const outcome of ['A','B','draw'])check('host cashout round 10: '+reason+' / '+outcome,()=>{
 const r=makeRoom();r.normal(outcome);const before=r.host.getState(),ledger=JSON.stringify(r.host.getLedger().ledger);
 assert(r.host.cashOut(reason));r.sync();const after=r.host.getState();
 assert(!after.confirmedSides.some(x=>x.userId==='host'));assert(after.confirmedSides.some(x=>x.userId==='guest1'));
 assert.equal(JSON.stringify(after.roundResults),JSON.stringify(before.roundResults));assert.equal(JSON.stringify(r.host.getLedger().ledger),ledger);
 for(const p of before.wallets){const afterPlayer=after.wallets.find(x=>x.playerId===p.playerId);assert.equal(afterPlayer.balance,p.balance);assert.equal(afterPlayer.score,p.score)}
 assert.equal(r.host.cashOut(reason),false);r.host.heartbeat();r.sync();r.rejoin('guest1');
 r.continueAll();r.play(11,'A');assert.equal(r.host.getState().wallets.find(p=>p.playerId==='host').balance,before.wallets[0].balance);
 assert.equal(r.host.getState().wallets.find(p=>p.playerId==='guest1').balance,0);
});
for(const outcome of ['A','draw'])check('host cashout after double-up '+outcome,()=>{
 const r=makeRoom();r.normal('draw');r.continueAll();r.play(11,outcome);const b=r.host.getState().wallets[0].balance;
 assert(r.host.cashOut('player'));r.sync();assert.equal(r.host.getState().wallets[0].cashoutAmount,b);r.rejoin('guest1');
});
check('eight-player cashout and continuing guests',()=>{
 const r=makeRoom(7);r.normal('draw');assert(r.host.cashOut());r.sync();
 assert(r.guests.guest1.cashOut());r.sync();r.continueAll();r.play(11,'B');
 assert.equal(r.host.getState().wallets[0].balance,100);assert.equal(r.host.getState().wallets.find(p=>p.playerId==='guest1').balance,100);
 for(let n=2;n<=7;n++)assert.equal(r.host.getState().wallets.find(p=>p.playerId==='guest'+n).balance,200);
});
check('all participants cash out once',()=>{const r=makeRoom();r.normal('draw');assert(r.host.cashOut());r.sync();assert(r.guests.guest1.cashOut());r.sync();assert.equal(r.host.getLedger().cashouts.length,2);assert.throws(()=>r.open(11),/continue-required/)});
check('cashout before round 10 remains forbidden',()=>{const r=makeRoom();r.play(1);const before=JSON.stringify(r.host.getState());assert.equal(r.host.cashOut(),false);assert.equal(r.guests.guest1.cashOut(),false);r.sync();assert.equal(JSON.stringify(r.host.getState()),before)});
check('extension exit before committing does not debit host',()=>{const r=makeRoom();r.normal('draw');r.continueAll();r.open(11);assert(r.host.cashOut('room-exit'));r.sync();r.predict();r.finish('B');assert.equal(r.host.getState().wallets[0].balance,100);assert.equal(r.host.getState().wallets[1].balance,200)});
check('extension committed host cannot escape wager',()=>{const r=makeRoom();r.normal('draw');r.continueAll();r.open(11);assert(r.host.predict('A',100));r.sync();assert.equal(r.host.cashOut('room-exit'),false);r.sync();r.guests.guest1.predict('B',100);r.sync();r.finish('B');assert.equal(r.host.getState().wallets[0].balance,0);assert.equal(r.host.getState().wallets[0].terminalReason,'bankrupt');assert.equal(r.host.cashOut('player'),false)});
check('departed guest auto-cashout remains synchronized',()=>{const r=makeRoom();r.normal('draw');r.host.memberLeft('guest1');r.sync();assert.equal(r.host.getState().wallets[1].cashoutReason,'room-exit');assert(r.host.cashOut());r.sync()});
globalThis.cashoutAuditResults=suites;
`,context);
const results=vm.runInContext('cashoutAuditResults',context);
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.passed).length,results},null,2));
process.exitCode=results.some(x=>!x.passed)?1:0;
