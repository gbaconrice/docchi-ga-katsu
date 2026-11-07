'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const input=path.resolve(process.env.GAME_HTML||process.env.COUNTER_HTML||process.argv[2]||'index.html');
const source=fs.readFileSync(input,'utf8');
assert(/id="crowdFocusName"[^>]*>タップで詳細確認<\/span>/.test(source));
assert(/id="crowdFocusHP"[^>]*\bhidden[^>]*><\/span>/.test(source));
assert(!source.includes('生存 左'),'No army-count copy or hidden relocation');
const harness=fs.readFileSync('tests/crowd-counter.cjs','utf8').split("const assert=require('assert');")[0];
const h=new Function('require',harness.replace("fs.readFileSync(process.env.COUNTER_HTML||'index.html','utf8')",`fs.readFileSync(${JSON.stringify(input)},'utf8')`)+";return {context,nodes,events,pendingImages,ev:s=>vm.runInContext(s,context,{timeout:60000})};")(require),run=h.ev,read=s=>JSON.parse(run('JSON.stringify('+s+')'));
const noop=()=>{};
run(`globalThis.copyUnit=(k,id=0,side=0)=>({id,token:'copy:'+id,k,side,x:100+100*id,y:200,hp:TYPES[k].hp,dead:false,originForward:side?-1:1,cd:100,priority:.1});
 globalThis.copyReady=()=>{screenMode='game';state='fight';multiSession=null;multiPlayback=null;multiRecording=false;paused=true;document.hidden=false;shots=[];initialUnits=[];cameraMode='overview';cameraFitScale=1;cameraZoom=1;cameraX=CAMERA_CENTER.x;cameraY=CAMERA_CENTER.y;resetCrowdPresentation();};
 copyReady();units=[copyUnit('sword',0),copyUnit('archer',1,1)];resetBattleLog(units);draw();`);
let idleChecks=0;
function idle(label){const s=read(`({name:crowdInspectorUI.name.textContent,hp:crowdInspectorUI.hp.textContent,hpHidden:crowdInspectorUI.hp.hidden,clearDisabled:crowdInspectorUI.clear.disabled,focus:crowdFocusDetails(),hidden:crowdInspectorUI.root.hidden})`);assert.equal(s.hidden,false,label);assert.equal(s.name,'タップで詳細確認',label);assert.equal(s.hp,'',label);assert.equal(s.hpHidden,true,label);assert.equal(s.clearDisabled,true,label);assert.equal(s.focus,null,label);idleChecks++;}
function selected(label){const s=read(`({name:crowdInspectorUI.name.textContent,hp:crowdInspectorUI.hp.textContent,hpHidden:crowdInspectorUI.hp.hidden,clearDisabled:crowdInspectorUI.clear.disabled,focus:crowdFocusDetails()})`);assert(s.focus,label);assert(s.name.includes(s.focus.name),label);assert(s.hp.startsWith('HP '),label);assert.equal(s.hpHidden,false,label);assert.equal(s.clearDisabled,false,label);}
const key=k=>{assert(h.events['#field:keydown']?.length);for(const fn of h.events['#field:keydown'])fn({key:k,preventDefault:noop});};
const pointer=(x,y,id=1)=>run(`cameraCanvas.onpointerdown({pointerId:${id},clientX:${x},clientY:${y},button:0});cameraCanvas.onpointerup({pointerId:${id},clientX:${x},clientY:${y},button:0})`);
idle('fight initial');
for(let i=0;i<30;i++)run('draw();syncCrowdInspector()');idle('repeat render');
const untouched=run('JSON.stringify(units)');
pointer(100,180);selected('pointer selected');run('crowdInspectorUI.clear.onclick()');idle('clear button');
key('Enter');selected('keyboard selected');key('Escape');idle('escape');
run('crowdInspectorUI.next.onclick()');selected('next selected');run('crowdInspectorUI.previous.onclick()');selected('previous selected');
pointer(400,400);idle('empty field tap');assert.equal(run('JSON.stringify(units)'),untouched,'All inspection actions remain read-only');
for(const changed of ['dead=true','hp=0','presentationFlags=2','x=NaN']){
 run(`copyReady();units=[copyUnit('sword',0),copyUnit('archer',1,1)];setCrowdFocus(units[0].token);draw();units[0].${changed};draw();`);idle('selected no longer selectable '+changed);
}
run("copyReady();units=[copyUnit('sword',0),copyUnit('archer',1,1)];setCrowdFocus(units[0].token);draw();units.splice(0,1);draw()");idle('selected removed');
run("copyReady();units=[copyUnit('sword',0),copyUnit('archer',1,1)];draw();units.push(copyUnit('sword',2));units[0].hp=0;draw()");idle('reinforcement and death while idle');
run("crowdSelectionNotice='選択したキャラの表示が終了しました';syncCrowdInspector()");idle('stale notice never replaces guidance');
for(const mode of ["multiSession=null;multiPlayback=null;state='fight'","multiSession=null;multiPlayback=null;state='result'","multiSession={};multiPlayback={cornerCuesAt:()=>[]};state='fight'","multiSession={};multiPlayback={cornerCuesAt:()=>[]};state='result'"]){
 run(`copyReady();units=[copyUnit('sword',0),copyUnit('archer',1,1)];${mode};draw()`);idle(mode+' initial');
 run('setCrowdFocus(units[0].token);draw()');selected(mode+' selected');
 run('units=units.map(u=>({...u})).reverse();draw()');selected(mode+' replaced');
 run('clearCrowdSelection()');idle(mode+' clear');
 run('resetCrowdPresentation();draw()');idle(mode+' reset');
}
for(const mode of ["screenMode='home'","screenMode='game';state='choose'","screenMode='game';state='fight';multiSession={};multiPlayback=null","screenMode='game';state='fight';multiSession={};multiPlayback={cornerCuesAt:()=>[]};multiRecording=true"]){run('copyReady();'+mode+';syncCrowdInspector()');assert.equal(run('crowdInspectorUI.root.hidden'),true,mode);run('copyReady();draw()');idle(mode+' return');}
run('units=[];draw()');idle('empty battle');assert.equal(run('crowdInspectorUI.previous.disabled'),true);assert.equal(run('crowdInspectorUI.next.disabled'),true);
// Cover every unit kind: detail HP is retained and ending selection always restores only the exact guide.
const kinds=read('Object.keys(TYPES)');for(const k of kinds){run(`copyReady();units=[copyUnit(${JSON.stringify(k)},0)];resetBattleLog(units);setCrowdFocus(units[0].token);draw();syncCrowdInspector()`);selected(k);run('clearCrowdSelection()');idle(k+' clear');}
// Canceled/interrupted gestures must not replace the exact unselected guide.
run("copyReady();units=[copyUnit('sword',0)];draw()");for(const cancel of ['onpointercancel','onlostpointercapture']){run(`cameraCanvas.onpointerdown({pointerId:90,clientX:100,clientY:180,button:0});cameraCanvas.${cancel}({pointerId:90});cameraCanvas.onpointerup({pointerId:90,clientX:100,clientY:180,button:0})`);idle(cancel);}
run('cameraCanvas.onpointerdown({pointerId:91,clientX:100,clientY:180,button:0});cameraCanvas.onpointermove({pointerId:91,clientX:130,clientY:180,button:0});cameraCanvas.onpointerup({pointerId:91,clientX:130,clientY:180,button:0})');idle('drag');
for(const event of ['window:blur','#field:pointerleave','visibilitychange']){run('cameraCanvas.onpointerdown({pointerId:92,clientX:100,clientY:180,button:0})');if(event==='visibilitychange')run('document.hidden=true');for(const fn of h.events[event]||[])fn({});run('document.hidden=false;cameraCanvas.onpointerup({pointerId:92,clientX:100,clientY:180,button:0})');idle(event);}
const controls=['前のキャラを選ぶ','次のキャラを選ぶ','キャラの選択を解除','戦闘ログ。タップで履歴を開く','戦闘ログを閉じる'];for(const label of controls)assert(source.includes('aria-label="'+label+'"'),'Control accessibility retained: '+label);
console.log(JSON.stringify({result:'PASS',kinds:kinds.length,idleChecks,scenarios:['initial/repeated render','pointer/keyboard/buttons','clear/empty tap/Escape','death/zero HP/underground/invalid position/removal','reinforcements','stale notice','solo/multi fight/result/replay replacement','reset','hidden phases and return','empty battlefield','canceled/interrupted gestures','operation labels and combat-unit preservation']},null,2));
