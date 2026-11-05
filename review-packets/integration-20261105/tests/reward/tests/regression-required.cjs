const fs=require('fs'),assert=require('assert');
let h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
h=h.replace("const html=fs.readFileSync('index.html','utf8');",`const html=fs.readFileSync('index.html','utf8').replace('const battleAudio=createBattleAudio(','const __realAudio=createBattleAudio(').replace('function audioCall(fn)','globalThis.__rec=[];const battleAudio={...__realAudio,playResultStage:(k,stage,d)=>{globalThis.__rec.push({stage,t:globalThis.__t});return true}};function audioCall(fn)');`);
new Function('require','assert',h+`
function run(s){return vm.runInContext(s,context)}
const bal=()=>nodes.get('#balance').textContent;let anims=[];let failFlight=false;
for(let i=0;i<32;i++){const c=elem('#resultScatter'+i);c.animate=(frames,options)=>{if(failFlight&&options.duration<500)throw Error('flight failed');const a={id:c.id,t:run('globalThis.__t'),frames,options,cancel(){this.cancelled=true}};anims.push(a);return a;};}
elem('#balance').animate=(frames,options)=>{const a={id:'#balance',t:run('globalThis.__t'),frames,options,cancel(){this.cancelled=true}};anims.push(a);return a;};
function setup(entry,o={}){
 anims=[];failFlight=false;doc.hidden=false;
 elem('#balance').getBoundingClientRect=()=>o.noTarget?({left:0,right:0,top:0,bottom:0,width:0,height:0}):({left:300,right:380,top:10,bottom:30,width:80,height:20});
 doc.createRange=()=>({selectNodeContents(){},getBoundingClientRect:()=>({left:150,right:250,top:300,bottom:340,width:100,height:40}),detach(){}});
 run("multiSession={};multiReplay={};multiPlayback={cornerCuesAt:()=>[]};screenMode='game';state='result';round=1;resultReducedMotion=()=>"+!!o.reduced+";globalThis.__rec=[];globalThis.__t=0");
 run("multiSnapshot={sessionId:'s',roundId:1,phase:'result',winner:'B',participants:['p'],wallets:[{playerId:'p',balance:"+JSON.stringify(entry?.balanceAfter??125)+",score:25,correctCount:1}],roundResults:"+JSON.stringify(entry?[entry]:[])+"};multiUser='p';personalResultScene=null;personalResultSeen.clear();soloUpdate();");
}
function at(t){run('globalThis.__t='+t+';syncPersonalResult('+t+')');return {t,balance:bal(),stage:run("personalResultScene.stage"),flightActive:run('personalResultScene.flightActive'),layerHidden:elem('#earnedFlightLayer').hidden,held:run('personalResultScene.balanceHold'),ramp:run('personalResultScene.rampProgress')}}
const hit={playerId:'p',submitted:true,side:'B',correct:true,stake:25,delta:25,balanceBefore:100,balanceAfter:125};const report={};

let failures=0;function test(name,fn){try{fn();console.log('PASS '+name)}catch(e){failures++;console.log('FAIL '+name+': '+e.message)}}
test('normal-frame coin arrival precedes deposit',()=>{setup(hit);for(const t of [0,120,280,700])at(t);const landed=Math.max(...anims.filter(a=>a.id.startsWith('#resultScatter')).map(a=>a.t+a.options.duration+a.options.delay));assert(run('globalThis.__rec').find(x=>x.stage==='balance').t>=landed)});
test('late-reveal deposit cannot precede the newly started flight',()=>{setup(hit);for(const t of [0,500,700])at(t);const landed=Math.max(...anims.filter(a=>a.id.startsWith('#resultScatter')).map(a=>a.t+a.options.duration+a.options.delay));const deposit=run('globalThis.__rec').find(x=>x.stage==='balance');assert(!deposit||deposit.t>=landed,'deposit '+deposit?.t+' precedes coin landing '+landed)});
test('stall must not start a fresh flight and immediately hide/deposit it',()=>{setup(hit);at(0);const r=at(5000);const coins=anims.filter(a=>a.id.startsWith('#resultScatter'));if(coins.length){assert(!r.layerHidden,'fresh animations are hidden in the same call');const landed=Math.max(...coins.map(a=>a.t+a.options.duration+a.options.delay));const deposit=run('globalThis.__rec').find(x=>x.stage==='balance');assert(!deposit||deposit.t>=landed)}});
test('old scene cannot overwrite a newer authoritative result with equal text',()=>{setup(hit);run("multiSession={getPlaybackClock:()=>({ready:true,status:'playing'}),getState:()=>multiSnapshot,getReplay:()=>null};Object.assign(multiSnapshot,{readyIds:[],cashedOutIds:[],continueIds:[],departedIds:[],totalRounds:10});");at(0);const next={...hit,correct:false,delta:-25,balanceBefore:125,balanceAfter:100};run('round=2;multiSnapshot.roundId=2;multiSnapshot.roundResults='+JSON.stringify([next])+';multiSnapshot.wallets[0].balance=100;displayMultiState()');assert.equal(bal(),'100 G');assert.equal(run('currentWallet().balance'),100)});
test('failed landing plus successful fallback scatter releases held wallet',()=>{setup(hit);failFlight=true;at(0);at(280);assert.equal(run('personalResultScene.coinsFlying'),false);assert.equal(bal(),'125 G')});
test('reduced motion still has no hold or particle animation',()=>{setup(hit,{reduced:true});for(const t of [0,120,280,700]){at(t);assert.equal(bal(),'125 G')}assert.equal(anims.length,0)});
test('cancel midway restores settled wallet and suppresses later deposit',()=>{setup(hit);at(0);at(280);run('cancelPersonalResult()');assert.equal(bal(),'125 G');at(700);assert(!run('globalThis.__rec').some(x=>x.stage==='balance'))});
if(failures)throw Error(failures+' required regression assertions failed');
`)(require,assert);
