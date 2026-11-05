// Reward SE/visual timing: delta cue with the count-up start, deposit cue only after the count finishes.
const fs=require('fs'),assert=require('assert');
let h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
const from="const html=fs.readFileSync('index.html','utf8');";
assert(h.includes(from));
h=h.replace(from,`const html=fs.readFileSync('index.html','utf8').replace('const battleAudio=createBattleAudio(','const __realAudio=createBattleAudio(').replace('function audioCall(fn)','globalThis.__rec=[];const battleAudio={...__realAudio,playResultStage:(k,stage,d)=>{globalThis.__rec.push({stage,t:globalThis.__t});return true}};function audioCall(fn)');`);
new Function('require','assert',h+`
function run(s){return vm.runInContext(s,context)}
for(let i=0;i<32;i++)elem('#resultScatter'+i).animate=()=>({cancel(){}});
elem('#earnedFlightLayer');
function setup(entry,reduced,noFlight){
 elem('#balance').getBoundingClientRect=()=>noFlight?({left:0,right:0,top:0,bottom:0,width:0,height:0}):({left:300,right:380,top:10,bottom:30,width:80,height:20});
 elem('#breakdown').getBoundingClientRect=()=>({left:150,right:250,top:300,bottom:340,width:100,height:40});
 run("document.createRange=()=>({selectNodeContents(){},getBoundingClientRect:()=>({left:150,right:250,top:300,bottom:340,width:100,height:40}),detach(){}})");
 run("multiSession={};multiReplay={};multiPlayback={cornerCuesAt:()=>[]};screenMode='game';state='result';round=1;resultReducedMotion=()=>"+!!reduced+";globalThis.__rec=[]");
 run("multiSnapshot={sessionId:'s',roundId:1,phase:'result',winner:'B',participants:['p'],wallets:[],roundResults:["+JSON.stringify(entry)+"]};multiUser='p';personalResultScene=null;personalResultSeen.clear()");
}
function frames(ts){for(const t of ts){run("globalThis.__t="+t);run('syncPersonalResult('+t+')');}return run('globalThis.__rec').map(r=>r.stage+'@'+r.t);}
const hit={playerId:'p',submitted:true,side:'B',correct:true,delta:25,balanceBefore:100,balanceAfter:125};
const T=[0,60,120,200,280,400,600,690,700,720,1000,2000];
// Hit: stamp@120, delta@280 (count start), balance only once the 420ms count has finished (700). Each exactly once.
setup(hit,false);assert.deepEqual(frames(T),['stamp@120','delta@280','balance@700']);
assert.equal(run("document.querySelector('#resultPanel').getAttribute('data-earn-stage')"),'arrived');
// Mid-count the panel must still report counting, never 'arrived'.
setup(hit,false);frames([0,300,500]);assert.equal(run("document.querySelector('#resultPanel').getAttribute('data-earn-stage')"),'counting');
// Late first frame after a stall still fires each cue once and in order.
setup(hit,false);assert.deepEqual(frames([0,5000,5100,5420,5500]),['stamp@5000','delta@5000','balance@5420']);
// Stall: flight starts on the real frame (5000), lands 420ms later; no instant cleanup/SE on that same frame.
setup(hit,false);frames([0,5000]);assert.deepEqual(run('globalThis.__rec').map(r=>r.stage),['stamp','delta']);assert.equal(elem('#earnedFlightLayer').hidden,false);
// Stall during flight: arrival waits for the late frame, never before 280+420.
setup(hit,false);frames([0,280,300]);assert.deepEqual(run('globalThis.__rec').map(r=>r.stage),['stamp','delta']);frames([4000]);assert.deepEqual(run('globalThis.__rec').map(r=>r.stage+'@'+r.t),['stamp@280','delta@280','balance@4000']);
// No coin can take off (no visible wallet): no deposit cue at all, delta cue unchanged.
setup(hit,false,true);assert.deepEqual(frames(T),['stamp@120','delta@280']);
// Reduced motion: no count-up, deposit with the delta.
setup(hit,true);assert.deepEqual(frames(T),['stamp@120','delta@280','balance@280']);
// Miss and 0G wrong guess: no deposit cue / no earned stage.
setup({...hit,correct:false,delta:-25,balanceAfter:75},false);assert.deepEqual(frames(T).filter(x=>x.startsWith('balance')),[]);assert.equal(run("document.querySelector('#resultPanel').getAttribute('data-earned')"),'false');
setup({...hit,correct:false,delta:0,balanceBefore:0,balanceAfter:0},false);assert.deepEqual(frames(T).filter(x=>x.startsWith('balance')),[]);
// Interrupted mid-count: cancel shows the exact final amount and never fires the deposit cue afterwards.
setup(hit,false);frames([0,300,500]);run('cancelPersonalResult()');frames([700,900,2000]);
assert.deepEqual(run('globalThis.__rec').map(r=>r.stage),['stamp','delta']);assert.equal(nodes.get('#breakdown').textContent,run("credits(25n)"));
// Re-entering the same result is a skipped scene: no second set of cues.
setup(hit,false);frames([0,300,800]);run("personalResultScene=null");run('globalThis.__rec=[]');frames([0,300,800,1500]);assert.deepEqual(run('globalThis.__rec'),[]);
console.log('PASS reward SE timing: hit/miss/0G/reduced-motion/stall/interrupt/re-entry');
`)(require,assert);
