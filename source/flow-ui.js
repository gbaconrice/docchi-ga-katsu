// Interaction contract: choose stake first, then one army tap commits once.
// No implicit predictions and no automatic restart after round 20.
const RESULT_READ_SECONDS=3;
let resultReadHeld=false;
let resultReadSeconds=0,resultReadLast=null,resultReadRound=null;
function resetResultRead(){resultReadSeconds=0;resultReadLast=null;}
function commitArmy(side){
 if(screenMode!=='game'||state!=='choose')return;
 if(multiSession){const s=multiSession.getState();if(s.phase!=='predict'||multiPredictionPending||s.readyIds.includes(multiUser))return;}
 selectSide(side);startPrediction(false);
}
document.querySelector('#red').onclick=()=>commitArmy(0);
document.querySelector('#blue').onclick=()=>commitArmy(1);
// Compatibility hook remains inert and hidden; there is no second confirmation.
document.querySelector('#confirm').hidden=true;
document.querySelector('#confirm').onclick=()=>{};
function advanceResultRead(t){
 if(multiSession||state!=='result'||round>=20||screenMode!=='game'||document.hidden===true){resetResultRead();return;}
 if(resultReadRound!==round){resetResultRead();resultReadRound=round;resultReadHeld=false;}
 if(resultReadHeld){resultReadLast=null;return;}
 if(resultReadLast!==null)resultReadSeconds+=Math.max(0,(t-resultReadLast)/1000);
 resultReadLast=t;
 const next=document.querySelector('#next');
 next.textContent='次の戦いへ · '+Math.max(0,Math.ceil(RESULT_READ_SECONDS-resultReadSeconds));
 if(resultReadSeconds>=RESULT_READ_SECONDS){resetResultRead();nextPrediction();}
}
const flowLoop=loop;
loop=function(t){flowLoop(t);advanceResultRead(t);};
if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',resetResultRead);
const flowScreen=showScreen;
showScreen=function(next){if(next!==screenMode)resetResultRead();flowScreen(next);};

function toggleResultHold(){if(multiSession||state!=='result'||round>=20)return;resultReadHeld=!resultReadHeld;resultReadLast=null;const b=document.querySelector('#resultHold');if(b)b.textContent=resultReadHeld?'自動で進むのを再開':'結果をゆっくり見る';}
const holdButton=document.querySelector('#resultHold');if(holdButton)holdButton.onclick=toggleResultHold;
// Read-only camera and units inspection. Never affects combat coordinates/RNG.
let cameraZoom=1,unitsOpen=false,unitsPausedSolo=false,unitsReturnFocus=null;
let cameraX=240,cameraY=269,cameraDrag=null;
function clampCamera(){cameraX=Math.max(240/cameraZoom,Math.min(480-240/cameraZoom,cameraX));cameraY=Math.max(269/cameraZoom,Math.min(538-269/cameraZoom,cameraY));}
const flowDraw=draw;
draw=function(){
 clampCamera();ctx.save();ctx.clearRect(0,0,480,538);
 ctx.translate(240,269);ctx.scale(cameraZoom,cameraZoom);ctx.translate(-cameraX,-cameraY);flowDraw();ctx.restore();
};
function syncCameraInput(){const el=document.querySelector('#field');if(el.style){el.style.touchAction=cameraZoom>1?'none':'auto';el.style.cursor=cameraZoom>1?(cameraDrag?'grabbing':'grab'):'default';}el.setAttribute?.('aria-label','左と右の戦闘'+(cameraZoom>1?'。拡大中はドラッグで移動、全体ボタンで戻る':''));}
function resetCamera(){cameraZoom=1;cameraX=240;cameraY=269;cameraDrag=null;syncCameraInput();draw();syncFlowControls();}
function setCameraZoom(direction){const values=[1,1.25,1.5,2],i=values.indexOf(cameraZoom);cameraZoom=values[Math.max(0,Math.min(values.length-1,i+direction))];cameraDrag=null;clampCamera();syncCameraInput();draw();syncFlowControls();}
const cameraCanvas=document.querySelector('#field');
cameraCanvas.onpointerdown=e=>{if(cameraZoom<=1||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;const r=cameraCanvas.getBoundingClientRect();const scale=Math.min(r.width/480,r.height/538);if(!(scale>0))return;cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:cameraX,cy:cameraY,scale};cameraCanvas.setPointerCapture?.(e.pointerId);e.preventDefault?.();syncCameraInput();};
cameraCanvas.onpointermove=e=>{if(!cameraDrag||cameraDrag.id!==e.pointerId)return;cameraX=cameraDrag.cx-(e.clientX-cameraDrag.x)/(cameraDrag.scale*cameraZoom);cameraY=cameraDrag.cy-(e.clientY-cameraDrag.y)/(cameraDrag.scale*cameraZoom);clampCamera();e.preventDefault?.();draw();};
function endCameraDrag(e){if(!cameraDrag||cameraDrag.id!==e.pointerId)return;cameraDrag=null;if(cameraCanvas.hasPointerCapture?.(e.pointerId))cameraCanvas.releasePointerCapture(e.pointerId);syncCameraInput();}
cameraCanvas.onpointerup=endCameraDrag;cameraCanvas.onpointercancel=endCameraDrag;cameraCanvas.onlostpointercapture=()=>{cameraDrag=null;syncCameraInput();};
const cameraSetup=setup;setup=function(seedValue){cameraZoom=1;cameraX=240;cameraY=269;cameraDrag=null;cameraSetup(seedValue);syncCameraInput();};
const cameraResetMultiRound=resetMultiRound;resetMultiRound=function(){cameraZoom=1;cameraX=240;cameraY=269;cameraDrag=null;cameraResetMultiRound();syncCameraInput();};
if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('resize',()=>{cameraDrag=null;clampCamera();syncCameraInput();draw();});
function fillUnitStats(){for(const side of [0,1]){const node=document.querySelector(side?'#unitsBlueStats':'#unitsRedStats');if(!node)continue;const groups={};for(const u of units.filter(u=>u.side===side)){const g=groups[u.k]||(groups[u.k]={count:0,alive:0,hp:0});g.count++;if(!u.dead){g.alive++;g.hp+=Math.max(0,u.hp);}}
 node.textContent=Object.entries(groups).map(([k,g])=>{const t=TYPES[k];return t.name+' ×'+g.count+'（生存 '+g.alive+'）\nHP '+Math.ceil(g.hp)+' / '+(t.hp*g.count)+' · 攻撃 '+t.dmg+' · 間隔 '+t.rate+' 秒\n'+UNIT_DETAILS[k];}).join('\n\n');const card=document.querySelector(side?'#blueStats':'#redStats');if(card)card.textContent=node.textContent;}}
function toggleUnits(open){
 const panel=document.querySelector('#unitsPanel');if(!panel)return;
 if(open&&!unitsOpen){unitsReturnFocus=document.activeElement;unitsPausedSolo=!multiSession&&state==='fight'&&!paused;if(unitsPausedSolo)setPaused(true);}
 if(!open&&unitsOpen&&unitsPausedSolo){setPaused(false);unitsPausedSolo=false;}
 unitsOpen=open;panel.hidden=!open;if(open){fillUnitStats();document.querySelector('#unitsClose')?.focus?.();}else unitsReturnFocus?.focus?.();syncFlowControls();
}
function syncFlowControls(){
 const q=id=>document.querySelector(id),s=multiSession?.getState();
 q('#gameScreen')?.setAttribute('data-phase',state);
 const next=q('#next');if(next)next.hidden=!!multiSession?!multiHost:round<20;
 const hold=q('#resultHold');if(hold){hold.hidden=!!multiSession||round>=20;hold.textContent=resultReadHeld?'自動で進むのを再開':'結果をゆっくり見る';}
 const countdown=q('#resultCountdown');if(countdown)countdown.textContent=multiSession?'':round>=20?'20戦終了':state==='result'?(resultReadHeld?'自動進行を停止中':Math.max(0,Math.ceil(RESULT_READ_SECONDS-resultReadSeconds))+'秒後に次の予想へ'):'';
 for(const [id,disabled] of [['#speedDown',!!multiSession||speed<=1],['#speedUp',!!multiSession||speed>=2],['#zoomOut',cameraZoom<=1],['#zoomIn',cameraZoom>=2],['#zoomReset',cameraZoom===1]])if(q(id))q(id).disabled=disabled;
 if(unitsOpen||state==='choose')fillUnitStats();
}
for(const [id,fn] of [['#unitsToggle',()=>toggleUnits(!unitsOpen)],['#unitsClose',()=>toggleUnits(false)],['#speedDown',()=>{if(!multiSession){setSpeed(1);update();}}],['#speedUp',()=>{if(!multiSession){setSpeed(2);update();}}],['#zoomOut',()=>setCameraZoom(-1)],['#zoomIn',()=>setCameraZoom(1)],['#zoomReset',resetCamera]]){const b=document.querySelector(id);if(b)b.onclick=fn;}
const flowUpdate=update;update=function(){flowUpdate();syncFlowControls();};
const flowDisplayMulti=displayMultiState;displayMultiState=function(){flowDisplayMulti();syncFlowControls();};
const flowAdvance=advanceResultRead;advanceResultRead=function(t){if(unitsOpen){resultReadLast=null;syncFlowControls();return;}flowAdvance(t);syncFlowControls();};
syncFlowControls();syncCameraInput();

if(typeof document.addEventListener==='function')document.addEventListener('keydown',e=>{if(!unitsOpen)return;if(e.key==='Escape'){e.preventDefault();toggleUnits(false);}else if(e.key==='Tab'){e.preventDefault();document.querySelector('#unitsClose')?.focus?.();}});
