const fs=require('fs'),vm=require('vm');const html=fs.readFileSync(process.env.COUNTER_HTML||'index.html','utf8');const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);const errors=[],events={};const noop=()=>{};const ctx=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),getImageData:()=>({data:new Uint8ClampedArray(16)})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});const nodes=new Map();function elem(id){if(!nodes.has(id)){let n={id,hidden:false,disabled:false,style:{setProperty:noop,removeProperty:noop},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},setAttribute:noop,removeAttribute:noop,getAttribute:()=>null,addEventListener:(name,fn)=>{(events[id+':'+name]??=[]).push(fn)},removeEventListener:noop,appendChild:noop,remove:noop,focus:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:480,height:538,left:0,top:0,right:480,bottom:538}),querySelector:()=>null,querySelectorAll:()=>[],getClientRects:()=>[],textContent:'',value:'',width:480,height:538};nodes.set(id,n)}return nodes.get(id)}
const doc={hidden:false,documentElement:elem('html'),body:elem('body'),querySelector:s=>elem(s),querySelectorAll:()=>[],getElementById:id=>elem('#'+id),createElement:t=>elem('new-'+t),addEventListener:(n,f)=>{(events[n]??=[]).push(f)},removeEventListener:noop};const pendingImages=[];class Img{constructor(){pendingImages.push(this);this.complete=false;this.naturalWidth=0;this.naturalHeight=0}set src(v){this._src=v}get src(){return this._src}}const sandbox={document:doc,Image:Img,console,URLSearchParams,location:{search:'',href:'http://localhost/'},navigator:{userAgent:'test'},performance:{now:()=>1000},requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,setInterval:()=>1,clearInterval:noop,localStorage:{getItem:()=>null,setItem:noop},addEventListener:(n,f)=>{(events['window:'+n]??=[]).push(f)},removeEventListener:noop,innerWidth:400,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener:noop}),ResizeObserver:class{observe(){}disconnect(){}}};sandbox.window=sandbox;sandbox.globalThis=sandbox;let context=vm.createContext(sandbox);for(let i=0;i<scripts.length;i++){try{vm.runInContext(scripts[i],context,{filename:'script-'+i+'.js',timeout:15000})}catch(e){console.log('FAIL script',i,e.stack.split('\n').slice(0,5).join('\n'));process.exit(1)}}
const assert=require('assert');
const run=code=>vm.runInContext(code,context,{timeout:15000});
const read=code=>JSON.parse(run(`JSON.stringify(${code})`));
const state=()=>read(`({mode:crowdChoiceMode,focus:crowdFocusDetails(),ordinal:crowdFocusDetails()?crowdChoiceOrdinal(crowdFocusDetails()):null,label:crowdInspectorUI.name.textContent,pool:crowdChoicePool().map(crowdKey),previousDisabled:crowdInspectorUI.previous.disabled,nextDisabled:crowdInspectorUI.next.disabled})`);
const tap=(x,y)=>run(`pickCrowdUnit({clientX:${x},clientY:${y}})`);
function expectOrdinal(count,index){const s=state();assert.equal(s.ordinal.count,count);if(index!==undefined)assert.equal(s.ordinal.index,index);assert(s.label.endsWith(`（${s.ordinal.index+1}/${count}）`),s.label);if(s.mode==='tap'){assert.equal(s.pool.length,count);assert.equal(s.pool[s.ordinal.index],s.focus.key);}return s;}
run(`
 screenMode='game';state='fight';multiSession=null;multiRecording=false;multiPlayback=null;paused=true;shots=[];initialUnits=[];
 cameraMode='overview';cameraFitScale=1;cameraZoom=1;cameraX=CAMERA_CENTER.x;cameraY=CAMERA_CENTER.y;
 resetCrowdPresentation();
 units=Array.from({length:38},(_,i)=>({id:i+1,token:'left-'+String(i+1).padStart(2,'0'),k:'sword',side:0,hp:TYPES.sword.hp,dead:false,x:i<5?80:i<17?250:400,y:i<17?160:430,originForward:1}));
 units.push(...Array.from({length:7},(_,i)=>({id:101+i,token:'right-'+String(i+1).padStart(2,'0'),k:'sword',side:1,hp:TYPES.sword.hp,dead:false,x:250,y:310,originForward:-1})));
 units.push({id:201,token:'left-archer',k:'archer',side:0,hp:TYPES.archer.hp,dead:false,x:60,y:310,originForward:1});
 draw();
`);
const untouched=run('JSON.stringify(units)');
assert.equal(run('crowdHitCandidates({x:80,y:140,pad:6}).length'),5);
tap(80,140);expectOrdinal(38);
assert.equal(run('crowdHitCandidates({x:250,y:140,pad:6}).length'),12);
tap(250,140);expectOrdinal(38);
console.log('PASS five-body and twelve-body overlaps both display the full 38-body same-army, same-kind roster');
// Repeated taps must still reach every overlapping body, not wander to distant units.
tap(80,140);const overlap=new Set(read('crowdCandidateKeys')),visitedTaps=new Set();
for(let i=0;i<5;i++){const s=expectOrdinal(38);assert(overlap.has(s.focus.key));visitedTaps.add(s.focus.key);tap(80,140);}
assert.equal(visitedTaps.size,5);
// Buttons must use exactly the denominator roster, including distant bodies.
const visitedButtons=new Set();for(let i=0;i<38;i++){const s=expectOrdinal(38);visitedButtons.add(s.focus.key);run('crowdInspectorUI.next.onclick()');}
assert.equal(visitedButtons.size,38);const beforePrevious=state();run('crowdInspectorUI.previous.onclick()');expectOrdinal(38,(beforePrevious.ordinal.index+37)%38);
run("setCrowdFocus('left-38');draw();cycleCrowdSelection(1)");expectOrdinal(38,0);run('cycleCrowdSelection(-1)');expectOrdinal(38,37);
assert.equal(run('JSON.stringify(units)'),untouched,'inspection must not write combat units');
console.log('PASS repeated overlap taps, full-roster previous/next, forward/back wrap, and read-only unit data');
// Team and kind boundaries are explicit even when the other army has the same kind.
tap(250,290);expectOrdinal(7);assert.equal(state().focus.side,1);run('cycleCrowdSelection(1)');expectOrdinal(7);
tap(60,290);expectOrdinal(1,0);assert.equal(state().focus.kind,'archer');assert(state().previousDisabled&&state().nextDisabled);
console.log('PASS opposing same-kind soldiers stay separate; singleton shows 1/1 with disabled previous/next');
// A missing, dead, zero-HP, hidden or invalidly positioned body is not selectable.
run(`setCrowdFocus('left-20');draw();units.find(u=>u.token==='left-01').dead=true;units.find(u=>u.token==='left-02').hp=0;units.find(u=>u.token==='left-03').presentationFlags=2;units.find(u=>u.token==='left-04').x=NaN;draw()`);
expectOrdinal(34,15);
run(`units.push({id:39,token:'left-39',ownerToken:'left-20',k:'sword',side:0,hp:TYPES.sword.hp,dead:false,x:380,y:300,originForward:1});draw()`);
expectOrdinal(35,15);assert(state().pool.includes('string:left-39'));
run(`units.find(u=>u.token==='left-03').presentationFlags=0;draw()`);expectOrdinal(36,16);
console.log('PASS death, zero HP, existing underground visibility rule, invalid coordinates, return to visibility and same-kind summons update immediately');
// Replay may reconstruct all objects and reorder the array each frame. Keys keep focus stable.
const beforeReplace=state();run('units=units.map(u=>({...u})).reverse();draw()');const afterReplace=expectOrdinal(36,16);assert.equal(afterReplace.focus.key,beforeReplace.focus.key);
run('multiSession={};multiPlayback={};draw()');expectOrdinal(36,16);run('multiPlayback=null;syncCrowdInspector()');assert.equal(run('crowdInspectorUI.root.hidden'),true);
run('multiPlayback={};syncCrowdInspector()');assert.equal(run('crowdInspectorUI.root.hidden'),false);expectOrdinal(36,16);
run('multiRecording=true;syncCrowdInspector()');assert.equal(run('crowdInspectorUI.root.hidden'),true);run('multiRecording=false;multiSession=null;multiPlayback=null;draw()');
console.log('PASS replacement/reordering keeps focus, multiplayer playback uses the same roster and host recording stays hidden');
// A selected death keeps the existing explicit cleared-state notice, not a stale index.
run("units.find(u=>u.token==='left-20').dead=true;draw()");assert.equal(state().focus,null);assert.equal(state().ordinal,null);assert(state().label.includes('表示が終了'));
run('cycleCrowdSelection(1)');expectOrdinal(35,0); // The first surviving body starts a fresh same-kind roster.
run('clearCrowdSelection()');assert.equal(state().focus,null);assert(!state().label.includes('（'));
run("setCrowdFocus('left-39');draw();state='result';draw()");expectOrdinal(35);
run('resetCrowdPresentation();draw()');assert.equal(state().focus,null);assert.equal(run('crowdCandidateKeys.length'),0);
run('units=[];draw()');assert(state().previousDisabled&&state().nextDisabled);assert.equal(state().focus,null);
console.log('PASS selected death, clear, results, round reset and empty battlefield cannot retain a stale counter');

// Clear must preserve keyboard-only access to every kind, not trap it on the first kind.
run(`state='fight';resetCrowdPresentation();units=['sword','archer','shield'].map((k,i)=>({id:i+1,token:'global-'+i,k,side:0,hp:TYPES[k].hp,x:100+100*i,y:200,dead:false,originForward:1}));draw()`);
const key=k=>{assert(events['#field:keydown']?.length);for(const fn of events['#field:keydown'])fn({key:k,preventDefault:noop});};
const kinds=new Set();key('Enter');for(let i=0;i<3;i++){const s=expectOrdinal(1,0);assert.equal(s.mode,'all');assert.equal(s.pool.length,3);kinds.add(s.focus.kind);key('ArrowRight');}
assert.deepStrictEqual([...kinds].sort(),['archer','shield','sword']);key('ArrowLeft');assert.equal(state().focus.kind,'shield');key('Escape');assert.equal(state().focus,null);
// Pointer down/up uses the same tap flow; a drag/cancel must not change focus.
run(`cameraCanvas.onpointerdown({pointerId:1,clientX:100,clientY:180,button:0});cameraCanvas.onpointerup({pointerId:1,clientX:100,clientY:180,button:0})`);expectOrdinal(1,0);assert.equal(state().mode,'tap');
const pointerFocus=state().focus.key;run(`cameraCanvas.onpointerdown({pointerId:2,clientX:200,clientY:180,button:0});cameraCanvas.onpointermove({pointerId:2,clientX:230,clientY:180,button:0});cameraCanvas.onpointerup({pointerId:2,clientX:230,clientY:180,button:0})`);assert.equal(state().focus.key,pointerFocus);
run(`cameraCanvas.onpointerdown({pointerId:3,clientX:200,clientY:180,button:0});cameraCanvas.onpointercancel({pointerId:3});cameraCanvas.onpointerup({pointerId:3,clientX:200,clientY:180,button:0})`);assert.equal(state().focus.key,pointerFocus);
console.log('PASS clear/global keyboard mode reaches all kinds; pointer tap, drag and cancel keep the same inspected identity');

// One overlap may contain both armies and several kinds. Each selected body uses its own roster.
run(`resetCrowdPresentation();units=[];for(const [side,k,n,prefix] of [[0,'sword',4,'a'],[1,'sword',2,'b'],[0,'archer',3,'c']])for(let i=0;i<n;i++)units.push({id:units.length+1,token:prefix+i,k,side,hp:TYPES[k].hp,x:200,y:200,dead:false,originForward:side?-1:1});draw()`);
tap(200,180);const mixedSelected=new Set();for(let i=0;i<9;i++){const s=state();const expected=s.focus.side===1?2:s.focus.kind==='sword'?4:3;expectOrdinal(expected);mixedSelected.add(s.focus.key);tap(200,180);}assert.equal(mixedSelected.size,9);
console.log('PASS a mixed overlap cycles all bodies while each label and previous/next pool use only the selected army and kind');
console.log('PASS all crowd-counter regression scenarios');


