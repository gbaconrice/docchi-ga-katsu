// Display-only balance: held during count-up, eased after the coins land, always restored to the settled value.
const fs=require('fs'),assert=require('assert');
let h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
const from="const html=fs.readFileSync('index.html','utf8');";assert(h.includes(from));
h=h.replace(from,`const html=fs.readFileSync('index.html','utf8').replace('const battleAudio=createBattleAudio(','const __realAudio=createBattleAudio(').replace('function audioCall(fn)','globalThis.__rec=[];const battleAudio={...__realAudio,playResultStage:(k,stage,d)=>{globalThis.__rec.push(stage+"@"+globalThis.__t);return true}};function audioCall(fn)');`);
new Function('require','assert',h+`
function run(s){return vm.runInContext(s,context)}
const bal=()=>nodes.get('#balance').textContent;
// animate() stub so coins are observable; balance node has a real-looking rect.
let coinAnims=0,flights=0,blinks=0,mode='ok';const made=[];
for(let i=0;i<32;i++){const c=elem('#resultScatter'+i);c.animate=(f,o)=>{const fl=o.easing==='ease-in-out';
 if(mode==='all-throw'||(fl&&(mode==='flight-throw'||(mode==='partial'&&i>=3))))throw new Error('animate');
 coinAnims++;if(fl)flights++;c.last={f,o};const a={cancel(){},onfinish:null};made.push(a);return a;};}
elem('#balance').animate=()=>{blinks++;return {cancel(){},onfinish:null}};
elem('#earnedFlightLayer');
function setup(entry,o={}){
 coinAnims=0;flights=0;blinks=0;made.length=0;mode=o.mode||'ok';
 elem('#balance').getBoundingClientRect=()=>o.noTarget?({left:0,right:0,top:0,bottom:0,width:0,height:0}):({left:300,right:380,top:10,bottom:30,width:80,height:20});
 elem('#breakdown').getBoundingClientRect=()=>({left:150,right:250,top:300,bottom:340,width:100,height:40});
 run("document.createRange=()=>({selectNodeContents(){},getBoundingClientRect:()=>({left:150,right:250,top:300,bottom:340,width:100,height:40}),detach(){}})");
 run("multiSession={};multiReplay={};multiPlayback={cornerCuesAt:()=>[]};screenMode='game';state='result';round=1;resultReducedMotion=()=>"+!!o.reduced+";globalThis.__rec=[]");
 run("multiSnapshot={sessionId:'s',roundId:1,phase:'result',winner:'B',participants:['p'],wallets:[],roundResults:["+JSON.stringify(entry)+"]};multiUser='p';personalResultScene=null;personalResultSeen.clear()");
 elem('#balance').textContent=run("MoneyUI.balanceText("+JSON.stringify(entry.balanceAfter)+")");
}
const at=(t,render)=>{run("globalThis.__t="+t);if(render)elem('#balance').textContent=render();run('syncPersonalResult('+t+')');return bal();};
const fin=e=>run("MoneyUI.balanceText("+JSON.stringify(e.balanceAfter)+")"),before=e=>run("MoneyUI.balanceText("+JSON.stringify(e.balanceBefore)+")");
const hit={playerId:'p',submitted:true,side:'B',correct:true,delta:25,balanceBefore:100,balanceAfter:125};
// Hit: the renderer rewrites the settled balance every frame; the display stays at 'before' until the coins land, then eases up.
setup(hit);const F=fin(hit),B=before(hit);const seen=[];
for(const t of [0,100,120,200,280,400,600,690]){seen.push(at(t,()=>F));}
assert.deepEqual([...new Set(seen)],[B],'held at pre-round balance during the count-up');
assert(coinAnims>0&&run("document.querySelector('#resultScatter0')").last.o.duration<=420,'coins fly to the balance and land by 700ms');
assert.equal(run("document.querySelector('#resultScatter0')").last.f.length,3);
let prev=-1;const ramp=[];for(const t of [700,760,820,900,1000,1049,1100,2000]){const v=at(t,()=>F);ramp.push(v);const n=Number(v.replace(/[^0-9]/g,''));assert(n>=prev,'balance never rewinds');prev=n;}
assert.equal(ramp[ramp.length-1],F);assert(ramp.some(v=>v!==B&&v!==F),'intermediate steps exist');
assert.deepEqual(run('globalThis.__rec'),['stamp@120','delta@280','balance@700']);
// Real ledger fields are untouched.
assert.equal(run('multiSnapshot.roundResults[0].balanceAfter'),125);assert.equal(run('multiSnapshot.roundResults[0].balanceBefore'),100);
// Large amount: exact, no Number rounding.
const big={...hit,delta:'10000000000000000000000001',balanceBefore:'3',balanceAfter:'10000000000000000000000004'};
setup(big);for(const t of [0,280,700,800,2000])at(t,()=>fin(big));assert.equal(bal(),fin(big));
setup(big);at(0,()=>fin(big));at(280,()=>fin(big));at(700,()=>fin(big));const mid=at(800,()=>fin(big));assert(mid!==fin(big)&&mid!==before(big));
// Interrupt mid-count: settled value immediately, nothing re-held afterwards.
setup(hit);at(0,()=>F);at(500,()=>F);run('cancelPersonalResult()');assert.equal(bal(),F);for(const t of [700,800,3000])assert.equal(at(t,()=>F),F);
// Interrupt mid-ramp.
setup(hit);for(const t of [0,280,700,800])at(t,()=>F);run('cancelPersonalResult()');assert.equal(bal(),F);
// Stall 0->5000: flight takes off on the real frame (5000), SE/ramp/cleanup follow that clock, never the stale 700ms.
setup(hit);at(0,()=>F);at(5000,()=>F);assert.equal(bal(),B);assert.equal(elem('#earnedFlightLayer').hidden,false);assert(flights>0);
at(5100,()=>F);assert.equal(bal(),B);assert.deepEqual(run('globalThis.__rec'),['stamp@5000','delta@5000']);
at(5420,()=>F);assert.deepEqual(run('globalThis.__rec'),['stamp@5000','delta@5000','balance@5420']);assert.equal(blinks,1);
at(5600,()=>F);const midv=bal();assert(midv!==B&&midv!==F);at(5800,()=>F);assert.equal(bal(),F);
// Stall during flight (frames 0,280,300 then 4000): arrival only at/after the real landing time, once.
setup(hit);for(const t of [0,280,300])at(t,()=>F);assert.equal(bal(),B);at(4000,()=>F);at(4001,()=>F);assert.equal(blinks,1);assert.deepEqual(run('globalThis.__rec'),['stamp@280','delta@280','balance@4000']);
// Interrupt in flight; late completion notices from the cancelled coins change nothing.
setup(hit);for(const t of [0,280,400])at(t,()=>F);run('cancelPersonalResult()');assert.equal(bal(),F);for(const a of made)a.onfinish?.();for(const t of [700,900,3000])at(t,()=>F);
assert.equal(bal(),F);assert.deepEqual(run('globalThis.__rec'),['stamp@280','delta@280']);assert.equal(blinks,0);
// Re-entry / reconnect of the same result: no hold, no coins, no cues.
setup(hit);for(const t of [0,300,800,1500])at(t,()=>F);run('personalResultScene=null;globalThis.__rec=[]');coinAnims=0;elem('#balance').textContent=B;
for(const t of [0,300,800,1500])at(t,()=>F);assert.equal(bal(),F);assert.equal(coinAnims,0);assert.deepEqual(run('globalThis.__rec'),[]);
// No visible wallet target: no flight, settled balance shown at once, count-up and SE order unchanged.
setup(hit,{noTarget:true});for(const t of [0,120,280,400,700,1000])at(t,()=>F);assert.equal(bal(),F);assert.equal(flights,0);assert.equal(blinks,0);assert.deepEqual(run('globalThis.__rec'),['stamp@120','delta@280']);
// Reduced motion: immediate settled balance, no coins.
setup(hit,{reduced:true});for(const t of [0,120,280,400])assert.equal(at(t,()=>F),F);assert.equal(coinAnims,0);
// Miss / 0G / zero delta: balance never held or faked.
const miss={...hit,correct:false,delta:-25,balanceAfter:75};setup(miss);for(const t of [0,280,700,1000])assert.equal(at(t,()=>fin(miss)),fin(miss));
const zero={...hit,correct:false,delta:0,balanceBefore:0,balanceAfter:0};setup(zero);for(const t of [0,280,700,1000])assert.equal(at(t,()=>fin(zero)),fin(zero));
// Wallet exists but every flight animation throws while the scatter fallback succeeds: no arrival, no held balance, no blink/SE.
for(const m of ['flight-throw','all-throw']){setup(hit,{mode:m});for(const t of [0,120,280,400,700,800,1200,2000])at(t,()=>F);assert.equal(bal(),F,m);assert.equal(flights,0,m);assert.equal(blinks,0,m);assert.deepEqual(run('globalThis.__rec'),['stamp@120','delta@280'],m);assert.equal(run('personalResultScene.balanceHold'),false,m);}
// Partial flight success: arrival happens once, from the coins that really flew.
setup(hit,{mode:'partial'});for(const t of [0,120,280,600,700,800,1100])at(t,()=>F);assert.equal(flights,3);assert.equal(blinks,1);assert.deepEqual(run('globalThis.__rec'),['stamp@120','delta@280','balance@700']);assert.equal(bal(),F);
// Ownership: the next round shows the very same text the old scene was holding (125->100: next-round balance is "100 G" == held text).
{const next=run("MoneyUI.balanceText(100)");assert.equal(next,B);
 setup(hit);for(const t of [0,280,400])at(t,()=>F);assert.equal(bal(),B);
 run("state='choose';multiSnapshot={sessionId:'s',roundId:2,phase:'predict',winner:null,participants:['p'],wallets:[],roundResults:[]}");elem('#balance').textContent=next;
 run('cancelPersonalResult()');assert.equal(bal(),next,'old scene must not overwrite the next round with 125');
 run('syncPersonalResult(900)');run('syncPersonalResult(2000)');assert.equal(bal(),next);
 // Same, but the next round is already rendering while the old scene is still current and then released by a late frame.
 setup(hit);for(const t of [0,280,400])at(t,()=>F);run("multiSnapshot.roundId=2;multiSnapshot.roundResults=[]");elem('#balance').textContent=next;
 run('syncPersonalResult(500)');run('syncPersonalResult(900)');assert.equal(bal(),next);}
// One clock: gain count-up, coin flight, deposit SE and balance ramp all start from the frame that really began the reveal.
{const G=run("credits(25n)"),bd=()=>nodes.get('#breakdown').textContent,cues=()=>run('globalThis.__rec').map(r=>String(r).split('@')[0]);
 const num=t=>Number(t.replace(/[^0-9]/g,''));
 // 0->500->700->920: reveal at 500, so the count is NOT done at 700, and finishes exactly when the coins land (920).
 setup(hit);at(0,()=>F);at(120,()=>F);at(500,()=>F);assert(num(bd())<25);at(700,()=>F);assert(num(bd())<25&&num(bd())>=1,'count still running at 700');assert(!cues().includes('balance'));assert.equal(bal(),B);
 at(919,()=>F);assert.notEqual(bd(),G);assert(!cues().includes('balance'));at(920,()=>F);assert.equal(bd(),G);assert(cues().includes('balance'));assert.equal(run("personalResultScene.stage2At"),500);
 at(1100,()=>F);assert(num(bal())>=100&&num(bal())<=125);at(1300,()=>F);assert.equal(bal(),F);assert.equal(bd(),G);
 // Gain never behind/ahead of arrival: whenever the deposit cue has fired the count is final, and never final before it was started.
 setup(hit);let prevN=0;for(let t=0;t<=2000;t+=37){at(t,()=>F);const n=num(bd());if(cues().includes('balance'))assert.equal(bd(),G);assert(n>=prevN||t<280,'count never rewinds');if(t>=280)prevN=n;}
 // 0->5000: the gain does not jump to the final value when the flight takes off; it lands at 5420 together with the SE.
 setup(hit);at(0,()=>F);at(5000,()=>F);assert.notEqual(bd(),G);assert(flights>0);at(5200,()=>F);assert.notEqual(bd(),G);assert(!cues().includes('balance'));at(5419,()=>F);assert.notEqual(bd(),G);at(5420,()=>F);assert.equal(bd(),G);assert.deepEqual(cues(),['stamp','delta','balance']);assert.equal(bal(),B);at(5800,()=>F);assert.equal(bal(),F);
 // Stall in flight (0,280,300 then 4000): count and landing complete on the same late frame.
 setup(hit);for(const t of [0,280,300])at(t,()=>F);assert.notEqual(bd(),G);at(4000,()=>F);assert.equal(bd(),G);assert(cues().includes('balance'));
 // Reduced motion: exact final amount and deposit cue at the reveal frame, no hold.
 setup(hit,{reduced:true});for(const t of [0,120,280])at(t,()=>F);assert.equal(bd(),G);assert.equal(bal(),F);assert.deepEqual(cues(),['stamp','delta','balance']);
 // Interrupt mid-count and re-display of the same result: exact final amount, no cues afterwards.
 setup(hit);for(const t of [0,280,400])at(t,()=>F);assert.notEqual(bd(),G);run('cancelPersonalResult()');assert.equal(bd(),G);assert.equal(bal(),F);for(const t of [700,1000])at(t,()=>F);assert.equal(bd(),G);assert.deepEqual(cues(),['stamp','delta']);
 setup(hit);for(const t of [0,280,400,900,1500])at(t,()=>F);run('personalResultScene=null;globalThis.__rec=[]');elem('#balance').textContent=B;for(const t of [0,300,800])at(t,()=>F);assert.equal(bd(),G);assert.equal(bal(),F);assert.deepEqual(cues(),[]);
 // Large amount stays exact through the synchronized count.
 setup(big);for(const t of [0,280,500,700,900,1500])at(t,()=>fin(big));assert.equal(nodes.get('#breakdown').textContent,run("credits(10000000000000000000000001n)"));assert.equal(bal(),fin(big));
}
console.log('PASS display balance flow: hold, coin landing, ramp, restore on interrupt/replay/no-target/reduced/miss/0G');
`)(require,assert);
