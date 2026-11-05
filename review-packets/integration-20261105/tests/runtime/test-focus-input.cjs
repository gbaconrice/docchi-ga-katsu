const assert=require('assert'),fs=require('fs'),Module=require('module');
process.env.GAME_JS=process.env.GAME_JS||__dirname+'/../dist/releases/canonical-b2305eb012904c31/game-runtime.js';
let h=fs.readFileSync(__dirname+'/vm-harness.cjs','utf8');
h=h.replace('addEventListener:noop,removeEventListener:noop,appendChild:',"addEventListener:(type,fn)=>{(n.listeners??={})[type]??=[];n.listeners[type].push(fn)},removeEventListener:noop,appendChild:");
h=h.replace('module.exports={vm,context};','module.exports={vm,context,nodes,events};');
const m=new Module(__filename);m.filename=__filename;m.paths=module.paths;m._compile(h,__filename);const {context:c,vm,nodes,events}=m.exports,get=s=>vm.runInContext(s,c),field=nodes.get('#field');let now=1000;c.performance.now=()=>now;
let capture=null;field.setPointerCapture=id=>{capture=id};field.hasPointerCapture=id=>capture===id;field.releasePointerCapture=id=>{if(capture===id){capture=null;field.onlostpointercapture({pointerId:id})}};
const pointer=(id,x=240,y=280,primary=true)=>({pointerId:id,clientX:x,clientY:y,isPrimary:primary,button:0,preventDefault(){throw Error('Tap tried to prevent default')}});
function setup(mode='auto',zoom=1){field.clientWidth=field.offsetWidth=480;field.clientHeight=field.offsetHeight=538;field.clientLeft=field.clientTop=0;field.getBoundingClientRect=()=>({left:0,top:0,width:480,height:538});get(`multiSession=null;multiPlayback=null;openSoloScreen();setup(123);units=Array.from({length:5},(_,i)=>({id:i+1,token:'u'+String(i+1).padStart(3,'0'),k:'sword',side:i%2,x:240,y:300,hp:100,cd:0,dead:false}));initialUnits=JSON.parse(JSON.stringify(units));shots=[];screenMode='game';state='fight';paused=true;multiSession=null;multiPlayback=null;cameraMode='${mode}';cameraFitScale=1;cameraZoom=${zoom};cameraX=240;cameraY=269;cameraFitBounds={left:0,top:0,right:480,bottom:538};cameraAutoBounds=null;cameraDrag=null;resetCrowdPresentation();draw()`);capture=null;}
function tap(id,x=240,y=280){field.onpointerdown(pointer(id,x,y));field.onpointerup(pointer(id,x,y));}
function camera(){return get('JSON.stringify([cameraMode,cameraZoom,cameraX,cameraY])');}
function key(){return get('crowdFocusKey');}
setup();const before=get('JSON.stringify({units,seed,shots})'),cam=camera();tap(1);assert.equal(key(),'string:u005');assert.equal(camera(),cam);assert.equal(get('JSON.stringify({units,seed,shots})'),before);assert.equal(get('crowdInspectorUI.root.hidden'),false);assert.match(get('crowdInspectorUI.name.textContent'),/左軍.*ソードマン/);assert.equal(get('crowdInspectorUI.hp.textContent'),'HP 100 / 100');
const chosen=new Set([key()]);for(let i=2;i<=5;i++){tap(i);chosen.add(key());}assert.equal(chosen.size,5);tap(6);assert.equal(key(),'string:u005');
get('crowdInspectorUI.previous.onclick()');assert.equal(key(),'string:u001');get('crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u005');get('crowdInspectorUI.clear.onclick()');assert.equal(key(),null);assert.equal(get('crowdInspectorUI.clear.disabled'),true);
console.log('PASS overview tap selects front body, five exact-stack units reachable, previous/next/clear work, names/current HP update, no camera/combat/RNG writes');

// Regression: a roster begun with controls must include later summons without Clear.
function addSummon(token='u006',side=1,x=400){get(`units.push({id:6,token:${JSON.stringify(token)},k:'sword',side:${side},x:${x},y:300,hp:100,cd:0,dead:false})`);}
setup();get('units=units.slice(0,2);draw();crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u001');addSummon();get('crowdInspectorUI.next.onclick();crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u006','Next must reach a later summon without Clear');assert.equal(get('crowdChoiceMode'),'all');assert.equal(get('crowdCandidateKeys.length'),0);
assert.match(get('crowdInspectorUI.name.textContent'),/（3\/3）/);
// New keys can sort before the current focus, and reverse traversal must reach them.
addSummon('u000',0);get('draw()');assert.match(get('crowdInspectorUI.name.textContent'),/（4\/4）/);get('crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u000');get('crowdInspectorUI.next.onclick();crowdInspectorUI.previous.onclick()');assert.equal(key(),'string:u000');
const rosterKeydown=field.listeners.keydown[0],rosterPress=k=>rosterKeydown({key:k,preventDefault(){}});
for(const start of ['Enter',' ','ArrowRight','ArrowLeft']){setup();get('units=units.slice(0,2);draw()');rosterPress(start);addSummon();const reached=new Set([key()]);for(let i=0;i<3;i++){rosterPress('ArrowRight');reached.add(key());}assert(reached.has('string:u006'),`${start} roster must include later summon`);assert.equal(get('crowdChoiceMode'),'all');}
// A decoded frame replaces objects but tokens remain local selection identities.
setup();get('units=units.slice(0,2);draw();crowdInspectorUI.next.onclick();units=units.map(u=>({...u,hp:73}))');addSummon();get('crowdInspectorUI.next.onclick();crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u006');get('crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u001');assert.equal(get('crowdInspectorUI.hp.textContent'),'HP 73 / 100');
// Controls must filter dead/hidden/removed units even without a rendering tick first.
get("units[1].dead=true;units.find(u=>u.token==='u006').presentationFlags=2;crowdInspectorUI.next.onclick()");assert.equal(key(),'string:u001');get("units=units.filter(u=>u.token!=='u001')");addSummon('u007',1);get('crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u007');
console.log('PASS later summons enter Next and keyboard rosters without Clear; forward/reverse traversal, live ordinal, decoded replacement and stale-unit filtering');
// Tapped overlap candidates intentionally remain a subgroup, not the live roster.
setup();get('units=units.slice(0,2);draw();crowdInspectorUI.next.onclick()');tap(101);assert.equal(get('crowdChoiceMode'),'tap');assert.equal(key(),'string:u002');addSummon();for(let i=0;i<4;i++)get('crowdInspectorUI.next.onclick()');assert.equal(get('crowdCandidateKeys.length'),2);assert.notEqual(key(),'string:u006');
// A fresh tap recomputes overlap membership, including a newly coincident summon.
addSummon('u007',0,240);tap(102);assert.equal(get('crowdCandidateKeys.length'),3);assert.equal(get('crowdChoiceMode'),'tap');
get("units=units.filter(u=>u.token==='u006');crowdInspectorUI.next.onclick()");assert.equal(key(),'string:u006');assert.equal(get('crowdChoiceMode'),'all');assert.equal(get('crowdCandidateKeys.length'),0);addSummon('u008',1);get('crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u008');
get('crowdInspectorUI.clear.onclick()');assert.equal(get('crowdChoiceMode'),'all');assert.equal(get('crowdCandidateKeys.length'),0);
console.log('PASS roster-to-tap transition, tap subgroup preserved through off-group summons, fresh taps refresh overlaps, emptied subgroup falls back to live roster');

setup('auto',1.5);const autoCam=camera();tap(10,240,285);assert(key());assert.equal(camera(),autoCam);assert.equal(capture,null);
setup('auto',1.5);field.onpointerdown(pointer(11,240,280));field.onpointermove(pointer(11,242,281));field.onpointerup(pointer(11,242,281));assert(key());assert.equal(get('cameraMode'),'auto');
setup('auto',1.5);field.onpointerdown(pointer(12));let moves=0;const move={...pointer(12,255,280),preventDefault(){moves++}};field.onpointermove(move);assert.equal(get('cameraMode'),'manual');field.onpointerup(move);assert.equal(key(),null);assert.equal(get('cameraMode'),'manual');assert(moves>0);
setup('auto',1.5);const cancelCam=camera();field.onpointerdown(pointer(13));field.onpointermove({...pointer(13,255,280),preventDefault(){}});field.onpointercancel(pointer(13));assert.equal(key(),null);assert.equal(camera(),cancelCam);
setup('auto',1.5);field.onpointerdown(pointer(14));field.onpointerdown(pointer(15,260,280,false));field.onpointerup(pointer(14));assert.equal(key(),null);assert.equal(get('cameraMode'),'auto');
setup('auto',1.5);field.onpointerdown(pointer(16));field.onlostpointercapture(pointer(16));field.onpointerup(pointer(16));assert.equal(key(),null);
setup();field.onpointerdown(pointer(17));now+=601;field.onpointerup(pointer(17));assert.equal(key(),null);
setup();field.onpointerdown({...pointer(18),button:2});field.onpointerup({...pointer(18),button:2});assert.equal(key(),null);
setup();field.onpointerdown(pointer(19));field.listeners.pointerleave[0]();field.onpointerup(pointer(19));assert.equal(key(),null);
setup();field.onpointerdown(pointer(20));events['window:blur'].at(-1)();field.onpointerup(pointer(20));assert.equal(key(),null);
setup();field.onpointerdown(pointer(21));get('document.hidden=true');events.visibilitychange.forEach(fn=>fn());get('document.hidden=false');field.onpointerup(pointer(21));assert.equal(key(),null);
console.log('PASS tap/jitter retain auto; drag stays manual; canceled drag restores camera; pinch/secondary/cancel/lost capture/leave/blur/hidden/long press/right-click never focus');
setup();const keydown=field.listeners.keydown[0];let prevented=0;keydown({key:'Enter',preventDefault(){prevented++}});assert(key());const first=key();keydown({key:'ArrowRight',preventDefault(){prevented++}});assert.notEqual(key(),first);keydown({key:'ArrowLeft',preventDefault(){prevented++}});assert.equal(key(),first);keydown({key:'Escape',preventDefault(){prevented++}});assert.equal(key(),null);assert.equal(prevented,4);
setup();tap(30);get("units.find(u=>crowdKey(u)===crowdFocusKey).hp=31.2;draw()");assert.equal(get('crowdInspectorUI.hp.textContent'),'HP 32 / 100');get("units.find(u=>crowdKey(u)===crowdFocusKey).dead=true;draw()");assert.equal(key(),null);assert.match(get('crowdInspectorUI.name.textContent'),/表示が終了/);get('setup(456)');assert.equal(key(),null);assert.equal(get('crowdCandidateKeys.length'),0);
setup();get("state='choose';syncCrowdInspector()");assert.equal(get('crowdInspectorUI.root.hidden'),true);tap(31);assert.equal(key(),null);
setup();get('multiSession={};multiPlayback=null;syncCrowdInspector()');assert.equal(get('crowdInspectorUI.root.hidden'),true);tap(32);assert.equal(key(),null);get('multiPlayback={cornerCuesAt:()=>[]};syncCrowdInspector()');assert.equal(get('crowdInspectorUI.root.hidden'),false);
console.log('PASS keyboard selection/clear, HP changes, death, reset, preview/online-wait gating; no aria-live HP spam');
// Actual canvas CSS includes a border and can letterbox its intrinsic image.
setup();field.offsetWidth=482;field.offsetHeight=640;field.clientWidth=480;field.clientHeight=638;field.clientLeft=1;field.clientTop=1;field.getBoundingClientRect=()=>({left:10,top:20,width:482,height:640});
// Content is 480x638, with 50 CSS px letterbox above and below the 480x538 picture.
let p=get('crowdCanvasPoint({clientX:251.5,clientY:351})');assert.equal(p.x,240);assert.equal(p.y,280);assert.equal(get('crowdCanvasPoint({clientX:251,clientY:30})'),null);tap(33,251.5,351);assert(key());
console.log('PASS border/letterbox pointer-to-world transform and out-of-picture rejection');

setup();tap(40);assert.equal(get('crowdChoiceMode'),'tap');get('resetMultiRound()');assert.equal(key(),null);assert.equal(get('crowdCandidateKeys.length'),0);assert.equal(get('crowdChoiceMode'),'all');
setup();tap(41);const priorKey=key();assert(priorKey);const priorWorld=get('JSON.stringify({units,seed,shots})');get("state='result';multiHost=true;multiPlayback={cornerCuesAt:()=>[]};globalThis.mockRound={phase:'result',roundId:1,winner:'draw',matchup:{units:JSON.parse(JSON.stringify(units))}};multiSession={getState:()=>mockRound,openRound(){throw Error('expected round-open failure')}}");let caught=false;try{get('openMultiRound()')}catch(e){caught=/expected round-open failure/.test(e.message);}assert(caught);assert.equal(key(),priorKey);assert.equal(get('crowdChoiceMode'),'tap');assert.equal(get('crowdCandidateKeys.length'),5);assert.equal(get('JSON.stringify({units,seed,shots})'),priorWorld);
console.log('PASS multi-round reset clears focus; failed-open rollback restores focus only with its original world');

setup();get('units=units.slice(0,2);draw();crowdInspectorUI.next.onclick()');const priorRosterKey=key();get("state='result';multiHost=true;multiPlayback={cornerCuesAt:()=>[]};globalThis.mockRound={phase:'result',roundId:1,winner:'draw',matchup:{units:JSON.parse(JSON.stringify(units))}};multiSession={getState:()=>mockRound,openRound(){throw Error('expected roster-open failure')}}");caught=false;try{get('openMultiRound()')}catch(e){caught=/expected roster-open failure/.test(e.message);}assert(caught);assert.equal(key(),priorRosterKey);assert.equal(get('crowdChoiceMode'),'all');assert.equal(get('crowdCandidateKeys.length'),0);addSummon();get('crowdInspectorUI.next.onclick();crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u006');
setup();get('units=units.slice(0,2);draw();crowdInspectorUI.next.onclick();units=[];crowdInspectorUI.next.onclick()');assert.equal(key(),null);assert.equal(get('crowdChoiceMode'),'all');assert.equal(get('crowdInspectorUI.next.disabled'),true);addSummon();get('draw();crowdInspectorUI.next.onclick()');assert.equal(key(),'string:u006');
console.log('PASS rollback preserves tap/roster mode, roster remains dynamic after rollback, empty roster clears stale focus and later repopulates');

// Combined regression: both selection modes restore together with camera and corner cue state.
for (const mode of ['tap','all']) {
 setup('manual',1.5);if(mode==='tap')tap(150);else get('crowdInspectorUI.next.onclick()');
 get("cameraAutoLast=716;cameraAutoBounds={left:10,top:20,right:430,bottom:490};replayCornerCues=[{actionToken:'combined-corner-sentinel',x:11,y:22}];cornerResultOffset=19;effectClockTick=91");
 const snapshot=()=>get('JSON.stringify({crowdFocusKey,crowdChoiceMode,crowdCandidateKeys,cameraMode,cameraZoom,cameraX,cameraY,cameraFitScale,cameraFitBounds,cameraAutoLast,cameraAutoBounds,replayCornerCues,cornerResultOffset,effectClockTick,units,shots,seed})');const prior=snapshot();
 get("state='result';multiHost=true;multiPlayback={cornerCuesAt:()=>[]};globalThis.mockRound={phase:'result',roundId:1,winner:'draw',matchup:{units:JSON.parse(JSON.stringify(units))}};multiSession={getState:()=>mockRound,openRound(){throw Error('combined rollback expected')}}");
 let rolledBack=false;try{get('openMultiRound()')}catch(e){rolledBack=/combined rollback expected/.test(e.message)}assert(rolledBack);assert.equal(snapshot(),prior,mode+' rollback changed camera/corner/focus/world');
}
console.log('PASS combined tap and roster rollback restore focus/pool, all camera fields, replay corner cues, corner result offset, effect clock and world');
