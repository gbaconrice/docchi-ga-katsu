const fs=require('fs'),assert=require('assert');
const harness=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
const checks=`{
let q=[],host,guests={},now=1000;
const options={roomId:'selection-room',sessionId:'selection-session',hostId:'p0',now:()=>now};
host=MultiBinding.createWalletSession({...options,userId:'p0',send:w=>q.push(['all','p0',w])});
function mk(id){return MultiProtocol.createSession({...options,userId:id,send:w=>q.push(['host',id,w])})}
for(let i=1;i<8;i++)guests['p'+i]=mk('p'+i);
function flush(){let n=0;while(q.length&&n++<10000){const [to,from,w]=q.shift();if(to==='host')host.receive(from,w);else for(const guest of Object.values(guests))guest.receive(from,w)}if(q.length)throw Error('queue overflow')}
for(const guest of Object.values(guests))guest.hello();host.hello();flush();host.openRound({roundId:1,durationMs:10000,matchup:{units:[]}});flush();
const initialLedger=JSON.stringify(host.getLedger());
for(let i=0;i<8;i++){const peer=i===0?host:guests['p'+i];assert(peer.previewSelection(i%2?'B':'A'))}flush();
assert.equal(host.getState().selectedSides.length,8);assert.equal(guests.p7.getState().selectedSides.length,8);
assert.deepEqual(host.getState().readyIds,[]);assert.deepEqual(host.getState().bets,[]);assert.equal(JSON.stringify(host.getLedger()),initialLedger);
assert(!JSON.stringify(host.getState().selectedSides).includes('stake'));
assert(guests.p1.previewSelection('A'));flush();assert.equal(host.getState().selectedSides.find(x=>x.userId==='p1').side,'A');
assert(guests.p1.previewSelection(null));flush();assert(!host.getState().selectedSides.some(x=>x.userId==='p1'));assert.equal(JSON.stringify(host.getLedger()),initialLedger);
function wire(sender,patch={}){return MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,roomId:options.roomId,sessionId:options.sessionId,type:'select-side',roundId:1,seq:100,epoch:host.getState().selectionEpochs.find(x=>x.userId===sender)?.epoch,side:'B',...patch})}
assert(!host.receive('outsider',wire('p1')));assert(!host.receive('p1',wire('p1',{userId:'p2'})));assert(!host.receive('p1',wire('p1',{stake:25})));assert(!host.receive('p1',wire('p1',{roundId:2})));assert(!host.receive('p1',wire('p1',{epoch:0})));assert(!host.receive('p1',wire('p1',{side:'C'})));
assert(host.receive('p1',wire('p1')));assert(!host.receive('p1',wire('p1')));assert(!host.receive('p1',wire('p1',{seq:99})));flush();
const staleWire=wire('p1',{seq:101});host.memberLeft('p1');flush();assert(!host.getState().selectedSides.some(x=>x.userId==='p1'));assert(!host.receive('p1',staleWire));
guests.p1.close();guests.p1=mk('p1');guests.p1.hello();flush();assert(!host.receive('p1',staleWire));assert(guests.p1.previewSelection('A'));flush();assert.equal(host.getState().selectedSides.find(x=>x.userId==='p1').side,'A');
assert(guests.p1.predict('B',25));flush();assert(!host.getState().selectedSides.some(x=>x.userId==='p1'));assert.equal(host.getState().confirmedSides.find(x=>x.userId==='p1').side,'B');assert(!guests.p1.previewSelection('A'));
const snapshot=host.getState();const ledger=JSON.stringify(host.getLedger());assert.equal(snapshot.readyIds.length,1);
const malformed=JSON.parse(JSON.stringify(snapshot));malformed.revision++;malformed.selectedSides=[{userId:'p1',side:'A'}];assert(!guests.p2.receive('p0',MultiProtocol.encode({protocol:MultiProtocol.PROTOCOL,version:1,roomId:options.roomId,sessionId:options.sessionId,type:'snapshot',state:malformed})));
const observer=mk('observer');guests.observer=observer;observer.hello();flush();assert(!observer.previewSelection('A'));assert(!host.receive('observer',wire('observer')));
for(let i=0;i<8;i++){if(i===1)continue;(i===0?host:guests['p'+i]).predict('A',25)}flush();assert.equal(host.getState().phase,'locked');assert.equal(host.getState().selectedSides.length,0);assert(!host.previewSelection('B'));
host.startBattle({engineVersion:'test',ticks:1,winner:'A',events:[],unavailable:'replay-byte-cap'});host.settleRound();host.showResult();flush();host.openRound({roundId:2,durationMs:10000,matchup:{units:[]}});flush();assert.equal(host.getState().selectedSides.length,0);assert(!host.receive('p2',wire('p2')));assert(guests.p2.previewSelection('B'));flush();
guests.p2.memberLeft('p0');assert.equal(guests.p2.getState().phase,'stopped');assert(!guests.p2.previewSelection('A'));assert.equal(host.getState().participants[0],'p0');
console.log('PASS selection previews for 8 players; no BET or wallet mutation; switching and clearing');
console.log('PASS sender, epoch, round, duplicate, stale, malformed and spectator rejection');
console.log('PASS departure/reconnect stale-packet rejection, confirmation, next-round reset and host-loss stop');
}`;
new Function('require','assert',harness+'sandbox.assert=assert;vm.runInContext('+JSON.stringify(checks)+',context);')(require,assert);
