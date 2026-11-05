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


setup(hit);at(0);at(5000);report.stalledCount={gain:elem('#breakdown').textContent,countComplete:run('personalResultScene.countComplete'),balance:bal(),arrivalDone:run('personalResultScene.arrivalDone'),flightStart:run('personalResultScene.stage2At'),coinLastEnd:Math.max(...anims.filter(a=>a.id.startsWith('#resultScatter')).map(a=>a.t+a.options.duration+a.options.delay))};assert.equal(report.stalledCount.gain,'+1 G');assert.equal(report.stalledCount.countComplete,false);assert.equal(report.stalledCount.balance,'100 G');assert.equal(report.stalledCount.arrivalDone,false);assert.equal(report.stalledCount.coinLastEnd,5420);
setup(hit);at(0);at(500);at(700);report.partialLateCount={gain:elem('#breakdown').textContent,countComplete:run('personalResultScene.countComplete'),balance:bal(),arrivalDone:run('personalResultScene.arrivalDone'),coinLastEnd:Math.max(...anims.filter(a=>a.id.startsWith('#resultScatter')).map(a=>a.t+a.options.duration+a.options.delay))};assert.equal(report.partialLateCount.gain,'+18 G');assert.equal(report.partialLateCount.countComplete,false);assert.equal(report.partialLateCount.arrivalDone,false);assert.equal(report.partialLateCount.coinLastEnd,920);
setup(hit);at(0);at(280);run('globalThis.oldScene=personalResultScene');run("multiSnapshot.sessionId='new-session';personalResultScene=null");elem('#balance').textContent='100 G';run('releaseHeldBalance(oldScene)');assert.equal(bal(),'100 G');assert.equal(run('oldScene.balanceHold'),false);
setup(hit);at(0);at(280);run("multiUser='someone-else'");elem('#balance').textContent='100 G';run('cancelPersonalResult()');assert.equal(bal(),'100 G');
setup(hit);at(0);at(280);run("showScreen('home')");assert.equal(bal(),'125 G');assert.equal(run('personalResultScene.cancelled'),true);
setup(hit);at(0);at(280);doc.hidden=true;at(400);assert.equal(bal(),'125 G');doc.hidden=false;at(700);assert.equal(bal(),'125 G');assert.equal(run('personalResultScene.balanceHold'),false);assert.equal(run('globalThis.__rec').some(x=>x.stage==='balance'),false);
// WAAPI null-return and absent methods cannot create a phantom deposit or hold.
for(const mode of ['missing','null','throw']){setup(hit);for(let i=0;i<32;i++){const n=elem('#resultScatter'+i);if(mode==='missing')delete n.animate;else n.animate=()=>{if(mode==='throw')throw Error('failed');return null;};}for(const t of [0,120,280,700,1050,2000])at(t);assert.equal(bal(),'125 G',mode);assert.equal(run('personalResultScene.balanceHold'),false,mode);assert.equal(run('globalThis.__rec').some(x=>x.stage==='balance'),false,mode);assert.equal(elem('#earnedFlightLayer').hidden,true,mode);}
report.lifecycle='same-text newer session, viewer change, home navigation, visibility, null/absent/throwing animations passed';
console.log(JSON.stringify(report,null,2));
`)(require,assert);
