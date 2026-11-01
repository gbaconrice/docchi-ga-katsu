const fs=require('fs'),vm=require('vm'),assert=require('assert');const h=fs.readFileSync(process.argv[2]||'index.html','utf8');const nodes={};for(const m of h.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)){const id=m[2].match(/id="([^"]+)"/);if(id)nodes['#'+id[1]]={hidden:/\bhidden\b/.test(m[2]),disabled:/\bdisabled\b/.test(m[2]),setAttribute(){}}}let raf=[],images=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(const id of ['#field','#armyPreviewRed','#armyPreviewBlue'])nodes[id].getContext=()=>ctx;const c={console,TextEncoder,TextDecoder,btoa,atob,URLSearchParams,location:{search:''},document:{getElementById:id=>nodes['#'+id]||null,querySelector:s=>s==='canvas'?nodes['#field']:nodes[s]||null},requestAnimationFrame:f=>raf.push(f),Image:class{constructor(){this.complete=true;this.naturalWidth=1000;images.push(this)}}};c.window=c;const listeners={};c.addEventListener=(type,fn)=>{listeners[type]=fn};if(process.env.NO_ENCODER)c.TextEncoder=undefined;vm.createContext(c);for(const [i,m] of [...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){new vm.Script(m[1],{filename:'inline-'+i}).runInContext(c)};if(nodes['#bootStatus']&&!nodes['#bootStatus'].hidden)throw Error('boot monitor not cleared');
const run=s=>vm.runInContext(s,c);let now=0;
function frame(n=1){for(let i=0;i<n;i++){now+=100;const q=raf;raf=[];for(const f of q)f(now)}}
function click(id){assert(nodes[id],id);assert(!nodes[id].disabled,id+' disabled');assert.equal(typeof nodes[id].onclick,'function',id+' missing handler');nodes[id].onclick()}

assert.equal(run('walletState'),undefined);click('#soloStart');
assert.equal(run('state'),'choose');frame(50);assert.equal(run('state'),'choose');
click('#stake25');click('#red');assert.equal(run('state'),'fight');
if(nodes['#unitsToggle']){
 const before=run('JSON.stringify({units,seed,walletState})');click('#unitsToggle');assert.equal(run('paused'),true);frame(10);assert.equal(run('JSON.stringify({units,seed,walletState})'),before);click('#unitsClose');assert.equal(run('paused'),false);
 click('#pause');click('#unitsToggle');click('#unitsClose');assert.equal(run('paused'),true);click('#pause');
 const physics=run('JSON.stringify({units,seed,walletState})');click('#zoomIn');assert.equal(run('cameraZoom'),1.25);click('#zoomOut');assert.equal(run('cameraZoom'),1);assert.equal(run('JSON.stringify({units,seed,walletState})'),physics);
 click('#speedUp');assert.equal(run('speed'),2);click('#speedDown');assert.equal(run('speed'),1);
 assert(nodes['#redStats'].textContent.includes('HP'));assert(nodes['#unitsBlueStats'].textContent.includes('間隔'));
}
const commit=run('JSON.stringify(walletState.currentRound.commits)');click('#blue');click('#red');assert.equal(run('JSON.stringify(walletState.currentRound.commits)'),commit);
assert.equal(run('walletState.currentRound.commits[0].stake'),25);
while(run('state')==='fight')frame();
assert.equal(run('walletState.completedRounds'),1);frame(10);assert.equal(run('round'),1);
run('toggleResultHold()');frame(50);assert.equal(run('round'),1);run('toggleResultHold()');
click('#gameHome');frame(50);assert.equal(run('round'),1);click('#soloStart');c.document.hidden=true;frame(50);assert.equal(run('round'),1);c.document.hidden=false;frame(20);assert.equal(run('round'),1);frame(15);assert.equal(run('round'),2);assert.equal(run('state'),'choose');assert.equal(run('selectedStake'),0);assert.equal(run('selectedSide'),null);
frame(100);assert.equal(run('state'),'choose');assert.equal(run('walletState.currentRound.commits.length'),0);
for(let r=2;r<=20;r++){click('#skip');while(run('state')==='fight')frame();assert.equal(run('walletState.completedRounds'),r);if(r<20){frame(35);assert.equal(run('round'),r+1);}}
frame(100);assert.equal(run('round'),20);assert.equal(run('state'),'result');assert.equal(run('walletState.completedRounds'),20);
console.log('PASS full inline: stake-first immediate army tap, duplicate guard, hold, home interruption, auto-next only to uncommitted round, complete 20 rounds final stop');
