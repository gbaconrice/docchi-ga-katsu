const fs=require('fs'),vm=require('vm'),assert=require('assert');
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
const factory=new Function('require',h+';return {context,nodes,doc};');
const host=factory(require),guest=factory(require);for(const g of [host,guest])Object.assign(g.context,{btoa,atob});let time=100000;const q=[];
const run=(g,s)=>vm.runInContext(s,g.context,{timeout:30000});
function make(g,id,offset){g.context.clockNow=()=>time+offset;g.context.sendWire=wire=>q.push({to:id==='host'?guest:host,from:id,wire});run(g,`globalThis.netSession=${id==='host'?'MultiBinding.createWalletSession':'MultiProtocol.createSession'}({roomId:'speed-test',sessionId:'speed-s',hostId:'host',userId:'${id}',now:clockNow,send:sendWire});`)}
make(host,'host',0);make(guest,'guest',20000);
function flush(){let n=0;while(q.length&&n++<10000){const m=q.shift();m.to.context.netSession.receive(m.from,m.wire)}assert(n<10000)}
const H=host.context.netSession,G=guest.context.netSession;G.hello();H.hello();flush();
// Valid 60-second compact record, sampled from stationary fighters. Used to isolate clock/UI, not battle balance.
const replay=run(host,`(()=>{const u=[{id:1,k:'sword',side:0,x:100,y:200,hp:100,dead:false},{id:2,k:'shield',side:1,x:300,y:200,hp:100,dead:false}],r=CompactReplay.createCompactRecorder();r.capture(0,{units:u,shots:[]});r.capture(3600,{units:u,shots:[]},true);return r.finish({ticks:3600,winner:'draw'});})()`);
H.openRound({roundId:1,durationMs:60000,matchup:{units:[]}});flush();H.predict('A',25);G.predict('B',25);flush();H.startBattle(replay);flush();
assert(G.getReplay());const start=H.getState().replayStartAt;
for(const [g,id] of [[host,'host'],[guest,'guest']])run(g,`multiSession=netSession;multiHost=${id==='host'};multiUser='${id}';multiSnapshot=netSession.getState();multiRoundSeen=1;screenMode='game';state='fight';paused=false;`);
const rows=[];
for(let ms=0;ms<=36000;ms+=100){time=start+ms;H.tick();G.tick();flush();if(ms%5000===0){H.heartbeat();flush()}
 if(ms===5000)run(guest,'openPausePanel()');
 if(ms===7000){assert.equal(run(guest,'paused'),false);run(guest,'closePausePanel();toggleUnits(true)')}
 if(ms===9000){assert.equal(run(guest,'paused'),false);run(guest,'toggleUnits(false)')}
 if(ms===10000&&run(guest,'typeof speed')!=='undefined'){const b=run(guest,'speed');run(guest,'document.querySelector("#speedUp").onclick()');assert.equal(run(guest,'speed'),b)}
 run(host,`pumpMulti(${time})`);run(guest,`pumpMulti(${time+20000})`);flush();
 const hc=H.getPlaybackClock(),gc=G.getPlaybackClock();assert.equal(hc.sceneTick,gc.sceneTick);assert.equal(run(host,'multiLastSceneTick'),run(guest,'multiLastSceneTick'));
 if([0,5000,7000,9000,10000,20000,25000,30000,35000].includes(ms))rows.push({wall:ms/1000,hostScene:hc.sceneTick/60,guestScene:gc.sceneTick/60,clock:run(guest,'document.querySelector("#battleClock").textContent')});
}
assert(!run(host,'multiError')&&!run(guest,'multiError'));console.log('PASS independent host/guest contexts, 20-second device-clock offset, speed button no-op (baseline), menu and details do not pause',JSON.stringify(rows));
// Simulate one suspended viewer while host continues: the viewer catches up locally, without moving host's clock.
time=start+36500;H.tick();G.tick();flush();const before=H.getPlaybackClock().sceneTick;run(guest,`pumpMulti(${time+20000})`);assert.equal(H.getPlaybackClock().sceneTick,before);assert.equal(run(guest,'multiLastSceneTick'),before);
console.log('PASS resumed viewer catches up locally; no effect on host');
fs.writeFileSync('multiplayer-speed-sync-results.json',JSON.stringify(rows,null,2));
