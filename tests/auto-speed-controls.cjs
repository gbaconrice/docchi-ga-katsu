const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
for(const id of ['speed','speedUp','speedDown','battleControls'])assert(!html.includes(`id="${id}"`),id+' remains in markup');
assert(!html.includes('setSpeed('));assert(!html.includes('delta,speed'));assert(html.includes('ReplayClock.effectiveSpeed(elapsed)'));
assert(html.indexOf('class="wallet-pill"')<html.indexOf('id="pause"'));assert(html.indexOf('id="pause"')<html.indexOf('id="phaseTitle"'));
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
const {context,nodes}=new Function('require',h+';return {context,nodes};')(require);
const run=s=>vm.runInContext(s,context);
assert.equal(run('typeof speed'),'undefined');assert.equal(run('typeof setSpeed'),'undefined');
for(const phase of ['choose','fight','result']){run(`multiSession=null;state='${phase}';syncFlowControls()`);assert.equal(nodes.get('#pause').hidden,phase!=='fight');}
run("multiSession={getState:()=>({phase:'locked'})};state='fight';syncFlowControls()");assert(nodes.get('#pause').hidden);
run("multiSession={getState:()=>({phase:'battle'})};multiPlayback={};state='fight';syncFlowControls()");assert(!nodes.get('#pause').hidden);
run("multiSession=null;multiPlayback=null;state='fight';paused=false;document.querySelector('#pause').onclick({isTrusted:true})");assert(run('paused'));assert(!nodes.get('#pausePanel').hidden);
run('document.querySelector("#pauseResume").onclick({isTrusted:true})');assert(!run('paused'));assert(nodes.get('#pausePanel').hidden);
console.log('PASS no manual speed hooks, pause moved after wallet, choose/result/preparation visibility, solo pause and resume');
