const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
for(const id of ['speed','speedUp','speedDown','battleControls'])assert(!html.includes(`id="${id}"`),id+' remains in markup');
assert(!html.includes('setSpeed('));assert(!html.includes('delta,speed'));assert(html.includes('ReplayClock.effectiveSpeed(elapsed)'));
assert(html.indexOf('class="wallet-pill"')<html.indexOf('id="soundToggle"'));assert(html.indexOf('id="soundToggle"')<html.indexOf('id="phaseTitle"'));assert(html.indexOf('id="reactionToggle"')<html.indexOf('id="pause"'));
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
const {context,nodes}=new Function('require',h+';return {context,nodes};')(require);
const run=s=>vm.runInContext(s,context);
assert.equal(run('typeof speed'),'undefined');assert.equal(run('typeof setSpeed'),'undefined');
for(const phase of ['choose','fight','result']){run(`multiSession=null;state='${phase}';syncFlowControls()`);assert.equal(nodes.get('#pause').hidden,false);assert.equal(nodes.get('#pause').disabled,false);}
run("multiSession={getState:()=>({phase:'locked'})};state='fight';syncFlowControls()");assert(!nodes.get('#pause').hidden&&nodes.get('#pause').disabled);
run("multiSession={getState:()=>({phase:'battle'})};multiPlayback={};state='fight';syncFlowControls()");assert(!nodes.get('#pause').hidden&&!nodes.get('#pause').disabled);
run("multiSession=null;multiPlayback=null;state='fight';paused=false;document.querySelector('#pause').onclick({isTrusted:true})");assert(run('paused'));assert(!nodes.get('#pausePanel').hidden);
run('document.querySelector("#pauseResume").onclick({isTrusted:true})');assert(!run('paused'));assert(nodes.get('#pausePanel').hidden);
console.log('PASS no manual speed hooks, audio beside wallet and pause after emotes, choose/result/preparation visibility, solo pause and resume');
