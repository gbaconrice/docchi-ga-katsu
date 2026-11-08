'use strict';
// Exact helper behavior with no game simulation, network, timers or animation loop.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const file=path.resolve(process.argv[2]||process.env.GAME_HTML||path.join(__dirname,'../isolated/index.html'));
const source=fs.readFileSync(file,'utf8');
const matches=[...source.matchAll(/\/\/ terrain-result-clearance-20261108:[\s\S]*?\n\}\(\)\);/g)];
assert.equal(matches.length,1);const helper=matches[0][0];
function fixture({observer=true,mutation=true,raf=true,hidden=false,fonts=false}={}){
 const events={},frames=[],writes=[],observed=[],mutationTargets=[];
 let callbacks,mutationCallback,fontReady,fontDone,screenTop=158,screenHeight=366,toolbarBottom=268,toolbarHeight=44,phase='choose',reads=0;
 const screen={hidden,style:{setProperty:(k,v)=>writes.push([k,v])},getAttribute:()=>phase,getBoundingClientRect:()=>{reads++;return {top:screenTop,height:screenHeight}}};
 const field={textContent:'草原 · 補正なし'},header={},toolbar={hidden:false,getBoundingClientRect:()=>{reads++;return {bottom:toolbarBottom,height:toolbarHeight}}};
 const win={addEventListener:(k,fn)=>events[k]=fn};
 if(raf)win.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};
 if(observer)win.ResizeObserver=class{constructor(fn){callbacks=fn}observe(n){observed.push(n)}};
 if(mutation)win.MutationObserver=class{constructor(fn){mutationCallback=fn}observe(n,options){mutationTargets.push({n,options})}};
 const document={querySelector:id=>({'#gameScreen':screen,'#gameTopline':header,'#gameToolbar':toolbar,'#fieldStatus':field})[id]};
 if(fonts)document.fonts={ready:{then(fn){fontReady=fn}},addEventListener(k,fn){assert.equal(k,'loadingdone');fontDone=fn}};
 vm.runInNewContext(helper,{document,window:win,Math,Number,setInterval:()=>{throw Error('polling forbidden')},setTimeout:()=>{throw Error('timer forbidden')}});
 return {events,frames,writes,observed,mutationTargets,screen,field,set(bottom,height=44){toolbarBottom=bottom;toolbarHeight=height},zero(){screenHeight=0},restore(){screenHeight=366},phase(v){phase=v},get reads(){return reads},notify:()=>callbacks?.([]),mutate:()=>mutationCallback?.([]),fontReady:()=>fontReady?.(),fontDone:()=>fontDone?.(),flush(){while(frames.length)frames.shift()()}};
}
let f=fixture();
assert.deepEqual(f.writes,[['--result-upper-clearance','126px']]);assert.equal(f.observed.length,3);assert.equal(f.mutationTargets.length,0,'modern path does not observe per-frame text writes');
f.set(284);for(let i=0;i<100;i++)f.notify();assert.equal(f.frames.length,1);assert.equal(f.writes.length,1);
f.flush();assert.deepEqual(f.writes.at(-1),['--result-upper-clearance','142px']);
assert.equal(158+366-8-Math.min(366*.68,366-142),292); // Result top: 8px below toolbar284.
for(let i=0;i<50;i++)f.notify();f.flush();assert.equal(f.writes.length,2,'same value must not be written');
f.set(304);f.notify();f.flush();assert.equal(f.writes.at(-1)[1],'162px','extra wrapping must be measured, not breakpoint guessed');
f.set(268);f.notify();f.flush();assert.equal(f.writes.at(-1)[1],'126px','normal size returns exactly to prior reserve');
const n=f.writes.length;f.screen.hidden=true;f.set(400);f.notify();f.flush();assert.equal(f.writes.length,n);
f.screen.hidden=false;f.zero();f.notify();f.flush();assert.equal(f.writes.length,n);
f.restore();f.notify();f.flush();assert.equal(f.writes.at(-1)[1],'258px');

// Missing ResizeObserver, first shown after an initially hidden boot.
f=fixture({observer:false,hidden:true,fonts:true});assert.equal(f.reads,0);assert.equal(f.writes.length,0);
assert.equal(f.mutationTargets.length,2);assert.equal(f.mutationTargets[0].n,f.screen);assert.equal(f.mutationTargets[1].n,f.field);
assert.deepEqual(JSON.parse(JSON.stringify(f.mutationTargets[0].options)),{attributes:true,attributeFilter:['hidden','data-phase']});
assert.deepEqual(JSON.parse(JSON.stringify(f.mutationTargets[1].options)),{childList:true,characterData:true,subtree:true});
f.screen.hidden=false;f.set(284);f.mutate();assert.equal(f.frames.length,1);f.flush();assert.equal(f.writes.at(-1)[1],'142px');
const readCount=f.reads,writeCount=f.writes.length;
for(let i=0;i<1000;i++)f.mutate();assert.equal(f.frames.length,0);assert.equal(f.reads,readCount);assert.equal(f.writes.length,writeCount,'same terrain/phase must not force layout');
// A later asynchronously delivered terrain needs extra lines with no resize.
f.field.textContent='火山 · 地上に最大HP6%ダメージ/8秒';f.set(304);for(let i=0;i<100;i++)f.mutate();
assert.equal(f.frames.length,1);f.flush();assert.equal(f.writes.at(-1)[1],'162px');
f.phase('result');f.mutate();assert.equal(f.frames.length,1);f.flush();assert.equal(f.writes.at(-1)[1],'162px');
f.set(268);f.fontReady();f.fontDone();assert.equal(f.frames.length,1);f.flush();assert.equal(f.writes.at(-1)[1],'126px');
const hiddenReads=f.reads;f.screen.hidden=true;f.mutate();f.flush();assert.equal(f.reads,hiddenReads);
f.screen.hidden=false;f.set(284);f.mutate();f.flush();assert.equal(f.writes.at(-1)[1],'142px');

f=fixture({observer:false,mutation:false});f.set(284);f.events.resize();f.events.pageshow();assert.equal(f.frames.length,1);f.flush();assert.equal(f.writes.at(-1)[1],'142px');
f=fixture({observer:false,raf:false,hidden:true});f.screen.hidden=false;f.set(284);f.mutate();assert.equal(f.writes.at(-1)[1],'142px');
f=fixture({observer:false,mutation:false,raf:false});f.set(284);f.events.resize();assert.equal(f.writes.at(-1)[1],'142px');
vm.runInNewContext(helper,{document:{querySelector:()=>null},window:{},Math,Number});
console.log('PASS result layout: exact126→142→126; batching; unchanged-value guard; hidden/zero guards; missing ResizeObserver hidden→shown, async terrain and font changes; 1000 unchanged mutations cause no layout reads; no clock observer; missing RAF/observers/DOM safe; no polling');
