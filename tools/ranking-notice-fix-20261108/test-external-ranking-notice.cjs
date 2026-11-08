'use strict';
// The real Money/ScoreBridge/submitFinalScore/attemptFinalScore code executes in
// an isolated VM. DOM and transport spies cannot send external score messages.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const before=fs.readFileSync(process.argv[3]||path.join(root,'terrain-emote-feedback/source-fixed-final/index.html'),'utf8');
const after=fs.readFileSync(process.argv[2]||path.join(__dirname,'../source-candidate/index.html'),'utf8');
const notice='外部ランキングには送信していません',suffix=' / 未送信の記録を再試行できます';
function block(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return s.slice(a,b);}
for(const [i,m]of [...after.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())new vm.Script(m[1],{filename:'candidate-script-'+i});
assert.equal(block(before,'const ScoreBridge=','const ReplayTransfer='),block(after,'const ScoreBridge=','const ReplayTransfer='));
function make(source,settings={}){
 const cfg={gravity:true,embedded:true,canPost:true,postThrows:false,...settings};
 const nodes=Object.fromEntries(['scoreStatus','scoreRetry','roomScoreStatus','roomScoreRetry'].map(id=>[id,{textContent:id.endsWith('Retry')?'記録を再試行':'',hidden:id!=='scoreStatus'}]));
 const sent=[],calls=[];
 const ctx=vm.createContext({document:{querySelector:id=>nodes[id.slice(1)]||null},PLAYER:'self',multiSession:null,multiUser:'self',walletState:null});
 vm.runInContext(block(source,'const Money=','const MoneyUI=')+block(source,'const ScoreBridge=','const ReplayTransfer='),ctx);
 ctx.options={isGravity:()=>cfg.gravity,isEmbedded:cfg.embedded,canPost:()=>{if(cfg.canPostThrows)throw Error('unavailable');return cfg.canPost},postMessage:cfg.noPost?undefined:(message,target)=>{sent.push({message:JSON.parse(JSON.stringify(message)),target});if(cfg.postThrows)throw Error('failed');}};
 vm.runInContext('globalThis.actualBridge=ScoreBridge.createScoreBridge(options);',ctx);
 ctx.scoreBridge={submit(input){calls.push(input);return ctx.actualBridge.submit(input)}};
 vm.runInContext(block(source,'let pendingOwnCashoutPost=', '// Online transport is opt-in.'),ctx);
 const retryStart="document.querySelector('#scoreRetry').onclick=",retryEnd="document.querySelector('#roomScoreRetry').onclick=()=>document.querySelector('#scoreRetry').onclick();";
 const a=source.indexOf(retryStart),b=source.indexOf(retryEnd,a);assert(a>=0&&b>a);vm.runInContext(source.slice(a,b+retryEnd.length),ctx);
 const snapshot=result=>JSON.parse(JSON.stringify({result,nodes:Object.fromEntries(Object.entries(nodes).map(([k,v])=>[k,{textContent:v.textContent,hidden:v.hidden}])),sent,calls,failed:vm.runInContext('[...failedScoreInputs.entries()]',ctx),failedKey:vm.runInContext('failedScoreKey',ctx)}));
 return {ctx,cfg,nodes,sent,calls,snapshot,
  attempt(input){const original=JSON.stringify(input);ctx.input=input;const result=vm.runInContext('attemptFinalScore(input)',ctx);assert.equal(JSON.stringify(input),original,'input must not mutate');assert.equal(calls.at(-1),input,'forward the exact input to ScoreBridge');return snapshot(result)},
  async submit(action,userInitiated,automaticTimeout){ctx.args=[action,userInitiated,automaticTimeout];return snapshot(await vm.runInContext('submitFinalScore(...args)',ctx));},
  retry(room=false){nodes[room?'roomScoreRetry':'scoreRetry'].onclick();return snapshot();}};
}
function eligible(overrides={}){return {sessionId:'session',playerId:'self',mode:'GRAVITY_SOLO_DOUBLEUP_V1',completedRounds:10,totalRounds:10,action:'cashout',userInitiated:true,automaticTimeout:false,players:[{playerId:'self',balance:125,cashedOut:true,cashoutRound:10,cashoutAmount:125,cashoutRequestId:'request',cashoutReason:'player'}],...overrides};}
function normalizeBaseline(s){s=structuredClone(s);for(const key of ['scoreStatus','roomScoreStatus'])s.nodes[key].textContent=s.nodes[key].textContent.replace(notice,'');s.nodes.roomScoreStatus.hidden=!s.nodes.roomScoreStatus.textContent;return s;}
let comparisons=0;
function same(a,b){assert.deepEqual(b,normalizeBaseline(a));comparisons++;}
const cases=[
 ['posted-unconfirmed',{},eligible()],
 ['standalone',{gravity:false},eligible()],
 ['standalone',{embedded:false},eligible()],
 ['user-action-required',{},eligible({userInitiated:false})],
 ['ineligible',{},eligible({action:'continue'})],
 ['ineligible',{},eligible({spectator:true})],
 ['ineligible',{},eligible({completedRounds:9,totalRounds:9})],
 ['ineligible',{},eligible({mode:'unknown'})],
 ['invalid',{},eligible({sessionId:''})],
 ['invalid',{},eligible({players:[]})],
 ['invalid',{},eligible({players:[{...eligible().players[0],cashoutAmount:124}]})],
 ['zero-not-submitted',{},eligible({players:[{...eligible().players[0],balance:0,cashoutAmount:0}]})],
 ['unsupported-precision',{},eligible({players:[{...eligible().players[0],balance:'9007199254740992',cashoutAmount:'9007199254740992'}]})],
 ['invalid',{noPost:true},eligible()],
 ['unavailable',{canPost:false},eligible()],
 ['unavailable',{canPostThrows:true},eligible()],
 ['failed',{postThrows:true},eligible()],
 ['posted-unconfirmed',{},eligible({mode:'GRAVITY_DOUBLEUP_V1',userInitiated:false,automaticTimeout:true,players:[{...eligible().players[0],cashoutReason:'decision-timeout',cashoutRequestId:'auto-decision-timeout:10'}]})],
 ['user-action-required',{},eligible({userInitiated:false,automaticTimeout:true})],
];
for(const [status,settings,input]of cases){const a=make(before,settings),b=make(after,settings),aa=a.attempt(input),bb=b.attempt(input);assert.equal(bb.result.status,status);same(aa,bb);if(status==='standalone'){assert.equal(bb.nodes.scoreStatus.textContent,'');assert.equal(bb.nodes.roomScoreStatus.textContent,'');assert.equal(bb.nodes.roomScoreStatus.hidden,true);assert.equal(bb.sent.length,0);}}
console.log('PASS actual bridge status paths, eligibility, zero/unsafe amount guards, input identity, payload/target and timeout rules');
for(const fail of ['canPost','postThrows']){
 const settings=fail==='canPost'?{canPost:false}:{postThrows:true};
 const a=make(before,settings),b=make(after,settings);
 same(a.attempt(eligible()),b.attempt(eligible()));assert.equal(b.nodes.scoreRetry.hidden,false);assert.equal(b.nodes.roomScoreRetry.hidden,false);
 a.cfg.canPost=b.cfg.canPost=true;a.cfg.postThrows=b.cfg.postThrows=false;
 same(a.retry(true),b.retry(true));assert.equal(b.nodes.scoreRetry.hidden,true);assert.equal(b.nodes.roomScoreRetry.hidden,true);
 same(a.attempt(eligible()),b.attempt(eligible()));assert.equal(b.snapshot().nodes.scoreStatus.textContent,'送信を一度試しています（受付は未確認）');
}
console.log('PASS unavailable/failed to mirrored retry to posted-unconfirmed to duplicate; successful attempts remain deduplicated');
{
 const a=make(before,{canPost:false}),b=make(after,{canPost:false});
 same(a.attempt(eligible({sessionId:'failed'})),b.attempt(eligible({sessionId:'failed'})));
 a.cfg.gravity=b.cfg.gravity=false;
 same(a.attempt(eligible({sessionId:'standalone'})),b.attempt(eligible({sessionId:'standalone'})));
 assert.equal(b.nodes.scoreStatus.textContent,suffix);assert.equal(b.nodes.roomScoreStatus.textContent,suffix);assert.equal(b.nodes.roomScoreStatus.hidden,false);assert.equal(b.nodes.scoreRetry.hidden,false);
 a.cfg.gravity=b.cfg.gravity=true;a.cfg.canPost=b.cfg.canPost=true;
 same(a.retry(),b.retry());assert.equal(b.nodes.scoreRetry.hidden,true);
}
console.log('PASS another failed score retains its existing retry suffix and both retry controls during standalone status');
(async()=>{
 const a=make(before),b=make(after);
 for(const obj of [a,b])obj.ctx.walletState={sessionId:'wallet',mode:'GRAVITY_SOLO_DOUBLEUP_V1',players:eligible().players};
 for(const args of [['continue',true,false],['cashout',true,false]])same(await a.submit(...args),await b.submit(...args));
 assert.equal(b.calls.length,1);assert.equal(b.sent.length,1);assert.deepEqual(b.sent[0],{message:{type:'gameOver',score:125},target:'*'});
 for(const obj of [a,b]){obj.ctx.multiUser='self';obj.ctx.multiSession={getState:()=>({sessionId:'multi',mode:'GRAVITY_DOUBLEUP_V1',wallets:eligible().players,participants:['self']})};}
 same(await a.submit('cashout',true,false),await b.submit('cashout',true,false));assert.equal(b.calls.at(-1).spectator,false);assert.equal(b.calls.at(-1).mode,'GRAVITY_DOUBLEUP_V1');
 for(const obj of [a,b])obj.ctx.multiSession={getState:()=>({sessionId:'watch',mode:'GRAVITY_DOUBLEUP_V1',wallets:eligible().players,participants:[]})};
 same(await a.submit('cashout',true,false),await b.submit('cashout',true,false));assert.equal(b.calls.at(-1).spectator,true);assert.equal(b.sent.length,2);
 console.log('PASS unchanged actual submitFinalScore solo/multiplayer routing, non-cashout guard and spectator gating');
 console.log('PASS '+comparisons+' paired before/after runtime comparisons and all embedded script syntax checks');
})().catch(e=>{console.error(e);process.exitCode=1});
