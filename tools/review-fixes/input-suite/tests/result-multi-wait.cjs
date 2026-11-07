const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split('for(const zeroPlayer')[0];
new Function('require','assert',h+`
const run=s=>vm.runInContext(s,context,{timeout:60000});
run(\`globalThis.waitFixture=()=>{let time=1000,queue=[],host,guest;const opts={roomId:'result-wait',sessionId:'result-wait-'+Math.random(),hostId:'host',members:['host','guest'],now:()=>time};host=MultiBinding.createWalletSession({...opts,userId:'host',send:w=>queue.push(['guest','host',w])});guest=MultiProtocol.createSession({...opts,userId:'guest',send:w=>queue.push(['host','guest',w])});const flush=()=>{let n=0;while(queue.length&&n++<10000){const [to,from,w]=queue.shift();(to==='host'?host:guest).receive(from,w)}if(queue.length)throw Error('queue')};guest.hello();host.hello();flush();for(let n=1;n<=10;n++){host.openRound({roundId:n,durationMs:60000,matchup:{units:[]}});flush();host.predict('A',25);guest.predict('B',25);flush();host.startBattle({engineVersion:'test',ticks:1,winner:'draw',events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();flush();}return {host,guest,flush,wait(ms){time+=ms;host.tick();host.heartbeat();flush();guest.tick();flush();}};};\`);
run('globalThis.pending=waitFixture();pending.host.requestContinue();pending.flush();pending.wait(29999)');
assert.equal(run('pending.host.getState().phase'),'result');assert.equal(run('pending.guest.getState().phase'),'result');assert.equal(run('pending.host.getState().roundId'),10);assert(!run('multiDoubleUpDecisionsComplete(pending.host.getState())'));
assert.throws(()=>run("pending.host.openRound({roundId:11,durationMs:60000,matchup:{units:[]}})"),/continue-required/);
run('pending.wait(1)');assert(run('multiDoubleUpDecisionsComplete(pending.host.getState())'));assert(run('pending.host.getState().continueIds.includes("host")'));assert(run('pending.host.getState().cashedOutIds.includes("guest")'));assert.equal(run('pending.host.getState().wallets.find(p=>p.playerId==="guest").cashoutAmount'),100);
run("pending.host.openRound({roundId:11,durationMs:60000,matchup:{units:[]}});pending.flush()");assert.equal(run('pending.guest.getState().roundId'),11);
console.log('PASS decisions wait before 30 seconds; timeout cashes out the undecided guest and preserves host continuation');
run('globalThis.departure=waitFixture();departure.host.requestContinue();departure.flush();departure.host.memberLeft("guest");departure.flush()');
assert(run('departure.host.getState().cashedOutIds.includes("guest")'));assert.equal(run('departure.host.getState().wallets.find(p=>p.playerId==="guest").cashoutAmount'),100);assert(run('multiDoubleUpDecisionsComplete(departure.host.getState())'));
run('departure.host.openRound({roundId:11,durationMs:60000,matchup:{units:[]}});departure.flush()');assert.equal(run('departure.host.getState().roundId'),11);
run('globalThis.lost=waitFixture();lost.host.memberLeft("host");lost.guest.memberLeft("host")');assert.equal(run('lost.host.getState().phase'),'stopped');assert.equal(run('lost.guest.getState().phase'),'stopped');assert.equal(run('lost.guest.getState().stoppedReason'),'host-lost');
console.log('PASS guest departure cashes out and removes continued-round blocker; host departure cleanly stops both');
// Explicit unanimous decisions still auto-start exactly once before the timeout.
run('globalThis.all=waitFixture();all.host.requestContinue();all.guest.requestContinue();all.flush();globalThis.advanceCalls=0;globalThis.savedOpenMultiRound=openMultiRound;openMultiRound=()=>{advanceCalls++};multiSession=all.host;multiHost=true;multiAutoAdvanceRound=null;maybeAutoAdvanceDoubleUp(all.host.getState());maybeAutoAdvanceDoubleUp(all.host.getState());openMultiRound=savedOpenMultiRound');assert.equal(run('advanceCalls'),1);
console.log('PASS explicit unanimous double-up decisions initiate one host transition, not a timer');
`)(require,assert);
