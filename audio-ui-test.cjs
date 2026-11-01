const fs=require('fs'),vm=require('vm'),assert=require('assert');const h=fs.readFileSync(process.argv[2]||'index.html','utf8').replace('const battleAudio=createBattleAudio(', 'const battleAudio=createBattleAudioTest(');const nodes={};for(const m of h.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)){const id=m[2].match(/id="([^"]+)"/);if(id)nodes['#'+id[1]]={hidden:/\bhidden\b/.test(m[2]),disabled:/\bdisabled\b/.test(m[2]),setAttribute(){}}}let raf=[],images=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(const id of ['#field','#armyPreviewRed','#armyPreviewBlue'])nodes[id].getContext=()=>ctx;const c={console,TextEncoder,TextDecoder,btoa,atob,URLSearchParams,location:{search:''},document:{getElementById:id=>nodes['#'+id]||null,querySelector:s=>s==='canvas'?nodes['#field']:nodes[s]||null},requestAnimationFrame:f=>raf.push(f),Image:class{constructor(){this.complete=true;this.naturalWidth=1000;images.push(this)}}};let audioUnlocks=0; c.createBattleAudioTest=()=>new Proxy({unlockFromGesture:e=>{if(e?.isTrusted)audioUnlocks++;}},{get:(o,k)=>o[k]||(()=>{})});c.window=c;const listeners={};c.addEventListener=(type,fn)=>{listeners[type]=fn};if(process.env.NO_ENCODER)c.TextEncoder=undefined;vm.createContext(c);for(const [i,m] of [...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){new vm.Script(m[1],{filename:'inline-'+i}).runInContext(c)};if(nodes['#bootStatus']&&!nodes['#bootStatus'].hidden)throw Error('boot monitor not cleared');
const run=s=>vm.runInContext(s,c);let now=0;
function frame(n=1){for(let i=0;i<n;i++){now+=100;const q=raf;raf=[];for(const f of q)f(now)}}
function click(id){assert(nodes[id],id);assert(!nodes[id].disabled,id+' disabled');assert.equal(typeof nodes[id].onclick,'function',id+' missing handler');nodes[id].onclick()}




click('#soloStart');click('#red');click('#confirm');assert.equal(run('state'),'fight');
click('#unitsToggle');assert.equal(run('paused'),true);let n=audioUnlocks;nodes['#unitsClose'].onclick({isTrusted:true});assert.equal(run('paused'),false);assert.equal(audioUnlocks,n+1);
click('#unitsToggle');n=audioUnlocks;nodes['#unitsToggle'].onclick({isTrusted:true});assert.equal(run('paused'),false);assert.equal(audioUnlocks,n+1);
click('#pause');n=audioUnlocks;nodes['#pauseResume'].onclick({isTrusted:true});assert.equal(run('paused'),false);assert.equal(audioUnlocks,n+1);
console.log('PASS trusted unit-info and pause-panel resume gestures reach audio unlock without altering game pause state');
