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


const capture=t=>{const r=at(t);return {...r,gain:elem('#breakdown').textContent,countComplete:run('personalResultScene.countComplete'),cues:run('globalThis.__rec').map(x=>x.stage+'@'+x.t)}};
setup(hit);report.late500=[0,500,700,919,920,1100,1270].map(capture);assert.equal(report.late500[1].gain,'+1 G');assert.equal(report.late500[2].gain,'+18 G');assert.equal(report.late500[3].gain,'+24 G');assert.equal(report.late500[4].gain,'+25 G');assert.deepEqual(report.late500[4].cues,['stamp@500','delta@500','balance@920']);assert.equal(report.late500[6].balance,'125 G');
setup(hit);report.late5000=[0,5000,5200,5419,5420,5600,5770].map(capture);assert.equal(report.late5000[1].gain,'+1 G');assert.equal(report.late5000[2].gain,'+18 G');assert.equal(report.late5000[3].gain,'+24 G');assert.equal(report.late5000[4].gain,'+25 G');assert.deepEqual(report.late5000[4].cues,['stamp@5000','delta@5000','balance@5420']);assert.equal(report.late5000[6].balance,'125 G');
let seed=123456789;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed};
for(let i=0;i<80;i++){const reveal=280+rand()%10000;setup(hit);const ledger=run('JSON.stringify(multiSnapshot)');at(0);at(reveal);let prev=1;for(const fraction of [0,1,31,110,210,360,419]){at(reveal+fraction);const gain=Number(elem('#breakdown').textContent.replace(/[^0-9]/g,''));assert(gain>=prev&&gain<25);prev=gain;assert.equal(bal(),'100 G');assert.equal(run('personalResultScene.arrivalDone'),false);assert.equal(run('personalResultScene.stage2At'),reveal)}at(reveal+420);assert.equal(elem('#breakdown').textContent,'+25 G');assert.equal(run('personalResultScene.arrivalDone'),true);assert.equal(run('globalThis.__rec').filter(x=>x.stage==='balance').length,1);at(reveal+770);assert.equal(bal(),'125 G');assert.equal(run('JSON.stringify(multiSnapshot)'),ledger)}report.randomRevealCases=80;
// Exact interpolation of a large integer, not merely exact endpoint.
setup({...hit,delta:'10000000000000000000000001',balanceBefore:'3',balanceAfter:'10000000000000000000000004'});at(0);at(5000);at(5420);at(5595);const p=run('personalResultScene.rampProgress'),exact=3n+10000000000000000000000001n*BigInt(Math.floor(p*1000))/1000n;assert.equal(bal(),run('MoneyUI.balanceText('+JSON.stringify(exact.toString())+')'));at(5770);assert.equal(bal(),run("MoneyUI.balanceText('10000000000000000000000004')"));report.largeIntegerExact=true;
// Delayed authoritative entry uses sequence-relative timing correctly.
setup(null);for(const t of [0,500,1000])at(t);assert.equal(run('globalThis.__rec.length'),0);run('multiSnapshot.roundResults='+JSON.stringify([hit]));for(const t of [1100,1220,1380,1590,1799])at(t);assert.equal(run('personalResultScene.arrivalDone'),false);assert.equal(elem('#breakdown').textContent,'+24 G');at(1800);assert.equal(elem('#breakdown').textContent,'+25 G');assert.equal(run('personalResultScene.arrivalDone'),true);assert.deepEqual(run('globalThis.__rec').map(x=>x.stage+'@'+x.t),['stamp@1220','delta@1380','balance@1800']);at(2150);assert.equal(bal(),'125 G');report.lateEntry=true;
console.log(JSON.stringify(report,null,2));
`)(require,assert);
