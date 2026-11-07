'use strict';
// Execute the actual immutable six-file release in the same DOM stub used by boot-smoke.
// This verifies loader/runtime integration, not pixels, real network, or physical devices.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {makeConfig,entryLoaderSource}=require('./entry-loader.cjs');
const release=path.resolve(process.argv[2]||'');assert(process.argv[2],'Usage: test-entry-loader-release.cjs RELEASE_DIRECTORY');
const manifest=JSON.parse(fs.readFileSync(path.join(release,'manifest.json'),'utf8'));
const config=makeConfig({base:manifest.releaseBase,cssFile:manifest.css.file,scripts:manifest.loadOrder.map(file=>{
 const record=manifest.scripts.find(s=>s.file===file),ids={0:'host-layout-config',3:'game-runtime',4:'home-ambience-controller'};
 return {file,id:record?ids[record.index]:undefined};
})});
const harness=fs.readFileSync(path.join(__dirname,'input-suite/tests/boot-smoke.cjs'),'utf8').split('for(let i=0;i<scripts.length;i++)')[0];
const sourceFiles=new Map(manifest.loadOrder.map(file=>[manifest.releaseBase+file,fs.readFileSync(path.join(release,file),'utf8')]));
for(const failStep of [-1,0,1,2,3,4,5]){
 const fakeFs=Object.create(fs);fakeFs.readFileSync=(f,...a)=>f==='index.html'?'':fs.readFileSync(f,...a);
 const env=new Function('require',harness+';return {context,doc,elem,nodes,events,pendingImages};')(name=>name==='fs'?fakeFs:require(name));
 const {context,doc,elem,nodes,events}=env;const requests=[],executions=new Map(),timers=new Map();let serial=0,ready=0,reloads=0;
 doc.baseURI=manifest.releaseBase+'gravity-entry.html';doc.readyState='loading';doc.scripts=[];doc.currentScript=null;
 context.URL=URL;context.CustomEvent=class{constructor(type){this.type=type}};
 context.setTimeout=fn=>{const id=++serial;timers.set(id,fn);return id};context.clearTimeout=id=>timers.delete(id);
 context.location.href=doc.baseURI;context.location.reload=()=>reloads++;
 doc.createElement=function(tag){const node=elem('fixture-node-'+ ++serial);node.tagName=tag.toUpperCase();node.remove=()=>{node.removed=true};if(tag==='template')node.content={cloneNode:()=>({})};return node};
 doc.dispatchEvent=function(event){if(event.type==='docchi:entry-ready')ready++;for(const listener of events[event.type]||[])listener(event)};
 doc.head={appendChild(node){requests.push(node);if(node.tagName==='SCRIPT')doc.scripts.push(node);return node}};
 for(const id of ['entryStatus','entryMessage','entryRetry']){const n=elem('#'+id);n.attributes={};n.setAttribute=(k,v)=>{n.attributes[k]=String(v)};n.remove=()=>{n.removed=true};}
 vm.runInContext('Object.hasOwn=undefined;Array.prototype.at=undefined',context);
 vm.runInContext(entryLoaderSource(config),context,{filename:'entry-loader.js'});
 doc.readyState='interactive';doc.dispatchEvent({type:'DOMContentLoaded'});
 requests.find(n=>n.rel==='stylesheet').onload();
 let failed=false;
 for(let pass=0;pass<9&&!ready;pass++){
  const script=requests.filter(n=>n.tagName==='SCRIPT').at(-1);assert(script);
  const step=manifest.loadOrder.findIndex(f=>manifest.releaseBase+f===script.src);assert(step>=0);
  if(step===failStep&&!failed){
   failed=true;for(const listener of events['window:error']||[])listener({target:script});script.onerror();assert.equal(elem('#entryStatus').attributes['data-state'],'retry');
   assert(!elem('#entryStatus').removed,'The shell must preserve the loading/retry overlay.');
   const before=requests.length;elem('#entryRetry').onclick();elem('#entryRetry').onclick();assert.equal(requests.length,before+1);continue;
  }
  executions.set(script.src,(executions.get(script.src)||0)+1);
  assert.equal(executions.get(script.src),1,'A script must never execute twice.');
  try{vm.runInContext(sourceFiles.get(script.src),context,{filename:script.src,timeout:15000})}
  catch(error){for(const listener of events['window:error']||[])listener({filename:script.src,lineno:1,message:error.message});throw error;}
  assert(!elem('#entryStatus').removed,'The shell must not remove the overlay before all files finish.');
  script.onload();
 }
 assert.equal(ready,1);assert.equal(elem('#bootStatus').hidden,true,'Recovered resource errors must not leave a stale boot banner.');assert.equal(executions.size,6);assert(elem('#entryStatus').removed);assert.equal(reloads,0);
 for(const id of ['#soloStart','#red','#confirm']){assert.equal(typeof nodes.get(id).onclick,'function');nodes.get(id).onclick({isTrusted:true});}
 const actual=vm.runInContext('({screenMode,state,choice})',context);assert.equal(actual.screenMode,'game');assert.equal(actual.state,'fight');assert.equal(actual.choice,0);
 console.log('PASS actual six-file loader, modern APIs absent, exactly-once boot and battle; failure step',failStep);
}
console.log('ENTRY_LOADER_RELEASE_PASS 7 cases; actual release code in DOM fixtures.');
