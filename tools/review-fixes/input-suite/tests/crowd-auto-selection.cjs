'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const input=path.resolve(process.env.GAME_HTML||process.env.COUNTER_HTML||process.argv[2]||'index.html'),source=fs.readFileSync(input,'utf8');
assert(!source.includes('選択したキャラの表示が終了しました'));assert(!source.includes('生存 左'));
const harness=fs.readFileSync('tests/crowd-counter.cjs','utf8').split("const assert=require('assert');")[0];
const h=new Function('require',harness.replace("fs.readFileSync(process.env.COUNTER_HTML||'index.html','utf8')",`fs.readFileSync(${JSON.stringify(input)},'utf8')`)+";return {context,ev:s=>vm.runInContext(s,context,{timeout:60000})};")(require),run=h.ev,read=s=>JSON.parse(run('JSON.stringify('+s+')'));
run(`globalThis.autoUnit=(id,k='sword',side=0)=>({id,token:'auto:'+String(id).padStart(3,'0'),k,side,x:80+id*50,y:220,hp:TYPES[k].hp,dead:false,originForward:side?-1:1,cd:100,priority:.1});
 globalThis.autoReady=(side=0)=>{screenMode='game';state='fight';multiSession=null;multiPlayback=null;multiRecording=false;paused=true;shots=[];initialUnits=[];cameraMode='overview';cameraFitScale=1;cameraZoom=1;cameraX=CAMERA_CENTER.x;cameraY=CAMERA_CENTER.y;resetCrowdPresentation();units=[autoUnit(1,'sword',side),autoUnit(2,'sword',side),autoUnit(3,'archer',side),autoUnit(4,'shield',1-side)];resetBattleLog(units);crowdChoiceMode='tap';crowdCandidateKeys=[crowdKey(units[0])];setCrowdFocus(units[0].token);draw();};autoReady();`);
let checks=0;
function chosen(id,side,label){const s=read(`({d:crowdFocusDetails(),name:crowdInspectorUI.name.textContent,hp:crowdInspectorUI.hp.textContent,hpHidden:crowdInspectorUI.hp.hidden,clear:crowdInspectorUI.clear.disabled,mode:crowdChoiceMode,pool:crowdChoicePool().map(crowdKey),ordinal:crowdFocusDetails()?crowdChoiceOrdinal(crowdFocusDetails()):null,frame:[...crowdFrame.values()].filter(e=>e.focused).map(e=>e.key),previous:crowdInspectorUI.previous.disabled,next:crowdInspectorUI.next.disabled})`);assert(s.d,label);assert.equal(s.d.unit.id,id,label);assert.equal(s.d.side,side,label);assert(s.name.includes(s.d.name),label);assert(!s.name.includes('同種生存'),label);assert.equal(s.hp,'HP '+s.d.hp+' / '+s.d.maxHP,label);assert.equal(s.hpHidden,false,label);assert.equal(s.clear,false,label);assert.deepEqual(s.frame,[s.d.key],label);assert(s.pool.includes(s.d.key),label);if(s.mode==='tap'){assert.equal(s.pool.length,s.ordinal.count,label);assert.equal(s.pool[s.ordinal.index],s.d.key,label);assert.equal(s.previous,s.ordinal.count<=1,label);assert.equal(s.next,s.ordinal.count<=1,label);}checks++;return s;}
function idle(label){assert.equal(run('crowdFocusDetails()'),null,label);assert.equal(run('crowdInspectorUI.name.textContent'),'タップで詳細確認',label);assert.equal(run('crowdInspectorUI.hp.textContent'),'',label);assert.equal(run('crowdInspectorUI.hp.hidden'),true,label);assert.equal(run('crowdInspectorUI.clear.disabled'),true,label);checks++;}
for(const side of [0,1]){
 run(`autoReady(${side});units[0].dead=true;draw()`);chosen(2,side,'same kind ally');
 run('units[1].hp=0;draw()');chosen(3,side,'different kind ally');
 run('units[2].dead=true;draw()');idle('all own team dead; enemy never chosen');
 run('units[0].dead=false;units[0].hp=TYPES.sword.hp;draw()');idle('revival after total loss does not steal explicit unselected state');
 run(`autoReady(${side});units[0].hp=0;draw()`);chosen(2,side,'zero HP before dead flag');
 run('units[0].hp=TYPES.sword.hp;units[0].dead=false;draw()');chosen(2,side,'original revival cannot steal current ally');
 run('units[1].dead=true;draw()');chosen(3,side,'subsequent death stays same army');
 run('units[2].dead=true;draw()');chosen(1,side,'wrap to revived ally');
 run(`autoReady(${side});units.push(autoUnit(5,'archer',${side}));units[0].dead=true;units[1].dead=true;units[2].dead=true;draw()`);chosen(5,side,'summon present on death frame');
 run(`autoReady(${side});units[0].dead=true;units[1].dead=true;draw()`);chosen(3,side,'simultaneous deaths skip all corpses');
 run(`autoReady(${side});setCrowdFocus(units[2].token);draw();units[2].dead=true;draw()`);chosen(1,side,'stable key wrap');
}
for(const state of ['fight','result']){
 run(`autoReady();state=${JSON.stringify(state)};units[0].dead=true;draw()`);chosen(2,0,'solo '+state+' death');
 run(`autoReady(1);state=${JSON.stringify(state)};multiSession={};multiPlayback={cornerCuesAt:()=>[]};units=units.map(u=>({...u})).reverse();units.find(u=>u.id===1).dead=true;draw()`);chosen(2,1,'multiplayer replay '+state+' replaced/dead');
 run('units=units.filter(u=>u.id!==2).map(u=>({...u})).reverse();draw()');chosen(3,1,'multiplayer replay '+state+' removed');
 run('units=units.filter(u=>u.id!==3);draw()');idle('multiplayer own army gone '+state);
}
run('autoReady();crowdChoiceMode="all";units[0].dead=true;draw()');chosen(2,0,'keyboard/global mode death');assert.equal(run('crowdChoiceMode'),'all');
// Rendering order is not selection order; current objects are used for dead flags/HP.
for(const order of [[0,1,2,3],[3,2,1,0],[1,3,0,2]]){run(`autoReady();units=(${JSON.stringify(order)}).map(i=>({...units[i]}));units.find(u=>u.id===1).hp=0;draw()`);chosen(2,0,'reordered replay');}
run('autoReady();units[0].dead=true;const copyBefore=JSON.stringify(units);draw();globalThis.copyUnchanged=copyBefore===JSON.stringify(units)');chosen(2,0,'read only');assert.equal(run('copyUnchanged'),true);
run('autoReady();units.push(autoUnit(5));draw();units[0].dead=true;draw()');chosen(2,0,'same kind pool');run('crowdInspectorUI.next.onclick()');chosen(5,0,'next after automatic selection');run('crowdInspectorUI.previous.onclick()');chosen(2,0,'previous after automatic selection');
run('clearCrowdSelection();units.find(u=>u.id===2).dead=true;draw()');idle('explicit clear disables future automatic following');
run('autoReady();units[0].dead=true;draw();resetCrowdPresentation();units=[autoUnit(10),autoUnit(11,"archer",1)];resetBattleLog(units);draw()');idle('new round reset prevents old selection carryover');
run('autoReady();units[1].presentationFlags=2;units[0].dead=true;draw()');chosen(3,0,'existing hidden-unit eligibility preserved');
run('autoReady();units[1].x=NaN;units[0].dead=true;draw()');chosen(3,0,'invalid coordinate never selected');
const kinds=read('Object.keys(TYPES)');for(const side of [0,1])for(const k of kinds){run(`autoReady(${side});units[0].k=${JSON.stringify(k)};units[0].hp=TYPES[${JSON.stringify(k)}].hp;resetBattleLog(units);draw();units[0].dead=true;draw()`);chosen(2,side,k+' fallen side '+side);}
console.log(JSON.stringify({result:'PASS',kinds:kinds.length,sides:2,checks,scenarios:['same-team same/different kind','dead and zero-HP detection','continuous/simultaneous deaths','stable key next/wrap','allies exhausted without enemy selection','revival and summons','solo and multiplayer fight/result','replay replacement/reordering/removal','same-kind label/HP/number/button consistency','explicit clear/new round','read-only combat units','existing hidden/invalid eligibility']},null,2));
