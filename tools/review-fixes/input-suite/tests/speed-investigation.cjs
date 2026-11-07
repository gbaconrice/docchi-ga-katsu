const fs=require('fs'),vm=require('vm'),assert=require('assert');
let h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
function create(){return new Function('require',h+';return {context,nodes,doc,events};')(require)}
const game=create();const run=s=>vm.runInContext(s,game.context,{timeout:30000});
const baseline=run('typeof speed')!=='undefined';
console.log('BASELINE_MANUAL_SPEED',baseline?run('speed'):'removed');
function setup(manual){run(`multiSession=null; screenMode='game';round=1;freshWallet();openPrediction(712);choose(0);units.forEach(u=>{u.hp=1e8;u.cd=1e8});${baseline?'setSpeed('+manual+');':''}resetSoloClock();`)}
const results=[];
for(const fps of [30,60,120])for(const manual of baseline?[1,2]:[1]){
 setup(manual);let sample=[];
 run('soloLoop(0)');
 for(let n=1;n<=fps*35;n++){
  run(`soloLoop(${n*1000/fps})`);
  if(n%fps===0&&[5,10,19,20,21,25,30,35].includes(n/fps))sample.push({wall:n/fps,...run('({scene:+elapsed.toFixed(4),state,clock:document.querySelector("#battleClock").textContent})')});
 }
 for(const x of sample){let want=run(`ReplayClock.advanceSceneSeconds(0,${x.wall},${manual})`);want=Math.min(60,want);assert(Math.abs(x.scene-want)<=.034,JSON.stringify({fps,manual,x,want}));}
 results.push({fps,manual,sample});
}
console.log('PASS actual solo step, 30/60/120 fps',JSON.stringify(results));
if(baseline){
 setup(1);run('elapsed=25;setSpeed(2);document.querySelector("#speedDown").onclick();');
 assert.equal(run('speed'),1);assert.equal(run('ReplayClock.effectiveSpeed(elapsed,speed)'),2);
 console.log('PASS baseline decrease button still has actual 2x at scene 25 seconds');
}
setup(1);run('soloLoop(0);soloLoop(1000);openPausePanel();soloLoop(2000)');assert(Math.abs(run('elapsed')-1)<.001);run('closePausePanel();soloLoop(3000);soloLoop(4000)');assert(Math.abs(run('elapsed')-2)<.001);
run('toggleUnits(true);soloLoop(5000)');assert(Math.abs(run('elapsed')-2)<.001);run('toggleUnits(false);soloLoop(6000);soloLoop(7000)');assert(Math.abs(run('elapsed')-3)<.001);
console.log('PASS solo pause and character details stop physics and resume without a catch-up jump');
fs.writeFileSync(baseline?'baseline-solo-measurements.json':'candidate-solo-measurements.json',JSON.stringify(results,null,2));
