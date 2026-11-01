// Draft a BET and army; only the Start button commits once.
// No implicit predictions and no automatic restart after round 10.
const RESULT_READ_SECONDS=3;
let pausePanelOpen=false,pausePanelWasPaused=false;
let resultReadSeconds=0,resultReadLast=null,resultReadRound=null;
function resetResultRead(){resultReadSeconds=0;resultReadLast=null;syncResultProgress();}
function syncResultProgress(){const bar=document.querySelector("#resultProgress"),fill=document.querySelector("#resultProgressFill");if(!bar||!fill)return;bar.hidden=!!multiSession||state!=="result"||(round>=sessionRoundLimit()||soloTerminalBoundary())||screenMode!=="game";fill.setAttribute("style","transform:scaleX("+Math.max(0,1-resultReadSeconds/RESULT_READ_SECONDS)+")");}
function commitArmy(side){
 if(screenMode!=='game'||state!=='choose')return;
 if(multiSession){const s=multiSession.getState();if(s.phase!=='predict'||multiPredictionPending||s.readyIds.includes(multiUser))return;}
 selectSide(side);
}
document.querySelector('#red').onclick=()=>commitArmy(0);
document.querySelector('#blue').onclick=()=>commitArmy(1);
// Explicit Start is the only prediction commit action.
document.querySelector('#confirm').hidden=false;
document.querySelector('#confirm').onclick=()=>{if(!predictionPreview)startPrediction(false);};
function advanceResultRead(t){
 if(multiSession||state!=='result'||(round>=sessionRoundLimit()||soloTerminalBoundary())||screenMode!=='game'||document.hidden===true){resetResultRead();return;}
 if(resultReadRound!==round){resetResultRead();resultReadRound=round;}
 if(resultReadLast!==null)resultReadSeconds+=Math.max(0,(t-resultReadLast)/1000);
 resultReadLast=t;
 syncResultProgress();
 const next=document.querySelector('#next');
 next.textContent='次の戦いへ · '+Math.max(0,Math.ceil(RESULT_READ_SECONDS-resultReadSeconds));
 if(resultReadSeconds>=RESULT_READ_SECONDS){resetResultRead();nextPrediction();}
}
const flowLoop=loop;
loop=function(t){flowLoop(t);advanceResultRead(t);};
if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',resetResultRead);
const flowScreen=showScreen;
showScreen=function(next){if(next!==screenMode)resetResultRead();flowScreen(next);};

// Read-only camera and units inspection. Never affects combat coordinates/RNG.
let cameraZoom=1,unitsOpen=false,unitsPausedSolo=false,unitsReturnFocus=null;
let cameraX=240,cameraY=269,cameraDrag=null,cameraFitScale=1,cameraFitBounds={left:0,top:0,right:480,bottom:538};
function centerFixedCamera(){cameraX=(cameraFitBounds.left+cameraFitBounds.right)/2;cameraY=(cameraFitBounds.top+cameraFitBounds.bottom)/2;}
const BASE_VISUAL_META={"sword": {"cell": [48, 48], "anchor": [21, 41], "visual_insets": [18, 40, 24, 0], "hover_gap": 0}, "shield": {"cell": [48, 48], "anchor": [21, 41], "visual_insets": [16, 38, 22, 0], "hover_gap": 0}, "archer": {"cell": [48, 48], "anchor": [21, 41], "visual_insets": [15, 36, 24, 0], "hover_gap": 0}, "spear": {"cell": [64, 64], "anchor": [29, 53], "visual_insets": [20, 49, 33, 0], "hover_gap": 0}, "cannon": {"cell": [64, 64], "anchor": [29, 53], "visual_insets": [22, 39, 29, 1], "hover_gap": 0}, "rider": {"cell": [64, 64], "anchor": [29, 53], "visual_insets": [24, 51, 31, 1], "hover_gap": 0}, "healer": {"cell": [64, 64], "anchor": [29, 53], "visual_insets": [17, 49, 22, 0], "hover_gap": 0}};
function configureFixedCamera(){
 cameraFitBounds={left:0,top:0,right:480,bottom:538};cameraFitScale=1;
 for(const u of initialUnits){const m=MONSTER_META[u.k]||BASE_VISUAL_META[u.k];if(!m)continue;const r=TYPES[u.k].radius||0,v=m.visual_insets||[m.anchor[0],m.anchor[1],m.cell[0]-m.anchor[0],m.cell[1]-m.anchor[1]],hover=m.hover_gap||0;cameraFitBounds.left=Math.min(cameraFitBounds.left,r-Math.max(v[0],v[2])-4);cameraFitBounds.right=Math.max(cameraFitBounds.right,480-r+Math.max(v[0],v[2])+4);cameraFitBounds.top=Math.min(cameraFitBounds.top,r-v[1]-5-hover-4);cameraFitBounds.bottom=Math.max(cameraFitBounds.bottom,538-r+v[3]-hover+4);}
 cameraFitScale=Math.min(1,480/(cameraFitBounds.right-cameraFitBounds.left),538/(cameraFitBounds.bottom-cameraFitBounds.top));cameraZoom=1;centerFixedCamera();cameraDrag=null;
}
function clampCamera(){const scale=cameraFitScale*cameraZoom,hx=240/scale,hy=269/scale,b=cameraFitBounds;cameraX=b.right-b.left<=2*hx?(b.left+b.right)/2:Math.max(b.left+hx,Math.min(b.right-hx,cameraX));cameraY=b.bottom-b.top<=2*hy?(b.top+b.bottom)/2:Math.max(b.top+hy,Math.min(b.bottom-hy,cameraY));}
const flowDraw=draw;
draw=function(){
 if(multiRecording)return;clampCamera();ctx.save();ctx.clearRect(0,0,480,538);ctx.fillStyle="#35463d";ctx.fillRect(0,0,480,538);
 ctx.translate(240,269);ctx.scale(cameraFitScale*cameraZoom,cameraFitScale*cameraZoom);ctx.translate(-cameraX,-cameraY);flowDraw();ctx.restore();
};
function syncCameraInput(){const el=document.querySelector('#field');if(el.style){el.style.touchAction=cameraZoom>1?'none':'auto';el.style.cursor=cameraZoom>1?(cameraDrag?'grabbing':'grab'):'default';}el.setAttribute?.('aria-label','左と右の戦闘'+(cameraZoom>1?'。拡大中はドラッグで移動、全体ボタンで戻る':''));}
function resetCamera(){cameraZoom=1;centerFixedCamera();cameraDrag=null;syncCameraInput();draw();syncFlowControls();}
function setCameraZoom(direction){const values=[1,1.25,1.5,2],i=values.indexOf(cameraZoom);cameraZoom=values[Math.max(0,Math.min(values.length-1,i+direction))];cameraDrag=null;clampCamera();syncCameraInput();draw();syncFlowControls();}
const cameraCanvas=document.querySelector('#field');
cameraCanvas.onpointerdown=e=>{if(cameraZoom<=1||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;const r=cameraCanvas.getBoundingClientRect();const scale=Math.min(r.width/480,r.height/538);if(!(scale>0))return;cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:cameraX,cy:cameraY,scale};cameraCanvas.setPointerCapture?.(e.pointerId);e.preventDefault?.();syncCameraInput();};
cameraCanvas.onpointermove=e=>{if(!cameraDrag||cameraDrag.id!==e.pointerId)return;cameraX=cameraDrag.cx-(e.clientX-cameraDrag.x)/(cameraDrag.scale*cameraFitScale*cameraZoom);cameraY=cameraDrag.cy-(e.clientY-cameraDrag.y)/(cameraDrag.scale*cameraFitScale*cameraZoom);clampCamera();e.preventDefault?.();draw();};
function endCameraDrag(e){if(!cameraDrag||cameraDrag.id!==e.pointerId)return;cameraDrag=null;if(cameraCanvas.hasPointerCapture?.(e.pointerId))cameraCanvas.releasePointerCapture(e.pointerId);syncCameraInput();}
cameraCanvas.onpointerup=endCameraDrag;cameraCanvas.onpointercancel=endCameraDrag;cameraCanvas.onlostpointercapture=()=>{cameraDrag=null;syncCameraInput();};
const cameraSetup=setup;setup=function(seedValue,prepared){cameraZoom=1;cameraX=240;cameraY=269;cameraDrag=null;cameraSetup(seedValue,prepared);configureFixedCamera();syncCameraInput();draw();};
const cameraResetMultiRound=resetMultiRound;resetMultiRound=function(){cameraZoom=1;cameraX=240;cameraY=269;cameraDrag=null;cameraResetMultiRound();syncCameraInput();};
if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('resize',()=>{cameraDrag=null;clampCamera();syncCameraInput();draw();});
// Copy-only override for fillUnitStats; append after screen-ui.js and flow-ui.js.
// It leaves the simulation untouched and reports the opening composition/basic stats.
function fillUnitStats() {
  const traits = {
    sword: '', shield: '射撃耐性', spear: '長射程', archer: '遠距離',
    cannon: '範囲攻撃', rider: '高速', healer: '回復', goblin: '小型',
    golem: '', drake: '飛行', wraith: '小鬼召喚', boar: '突進',
    bombbug: '自爆', frostmage: '鈍足', stormmage: '連鎖攻撃',
    burrower: '潜行', slime: '2体分裂', slimelet: '',screech_cricket:'攻撃遅延',reaper_mantis:'一度受け流し',spore_toad:'毒',rootwarden_treant:'射撃防壁',sky_harpooner:'対空',bounty_hound:'子狩り',siege_crab:'単体砲撃'
  };
  if (typeof UNIT_DETAILS !== 'undefined') Object.assign(UNIT_DETAILS, traits);
  if (typeof ROLE_NOTES !== 'undefined') Object.assign(ROLE_NOTES, traits);

  const opening = typeof initialUnits !== 'undefined' && initialUnits?.length
    ? initialUnits
    : (typeof units !== 'undefined' ? units : []);
  for (const side of [0, 1]) {
    const node = document.querySelector(side ? '#unitsBlueStats' : '#unitsRedStats');
    if (!node) continue;
    const counts = {};
    for (const unit of opening) {
      if (unit.side === side) counts[unit.k] = (counts[unit.k] || 0) + 1;
    }
    const text = Object.entries(counts).map(([kind, count]) => {
      const type = TYPES[kind], trait = traits[kind] || '';
      return `${type.name} ×${count}\nHP ${type.hp} · 攻${type.dmg} · 間隔${type.rate}秒${trait ? ' · ' + trait : ''}`;
    }).join('\n');
    node.textContent = text;
    const card = document.querySelector(side ? '#blueStats' : '#redStats');
    if (card) card.textContent = text;
  }
}

function toggleUnits(open){
 const panel=document.querySelector('#unitsPanel');if(!panel)return;
 if(open&&!unitsOpen){unitsReturnFocus=document.activeElement;unitsPausedSolo=!multiSession&&state==='fight'&&!paused;if(unitsPausedSolo)setPaused(true);}
 if(!open&&unitsOpen&&unitsPausedSolo){setPaused(false);unitsPausedSolo=false;}
 unitsOpen=open;panel.hidden=!open;if(open){fillUnitStats();document.querySelector('#unitsClose')?.focus?.();}else unitsReturnFocus?.focus?.();syncFlowControls();
}
function syncFlowControls(){
 const q=id=>document.querySelector(id),s=multiSession?.getState();
 q('#gameScreen')?.setAttribute('data-phase',state);if(pausePanelOpen&&state!=='fight')closePausePanel();
 const next=q('#next');if(next)next.hidden=!!multiSession?!multiHost:round<sessionRoundLimit()&&!soloTerminalBoundary();
 for(const [id,disabled] of [['#speedDown',!!multiSession||speed<=1],['#speedUp',!!multiSession||speed>=2],['#zoomOut',cameraZoom<=1],['#zoomIn',cameraZoom>=2],['#zoomReset',cameraZoom===1]])if(q(id))q(id).disabled=disabled;
 if(unitsOpen||state==='choose')fillUnitStats();syncPredictionPreview();
}
for(const [id,fn] of [['#unitsToggle',()=>toggleUnits(!unitsOpen)],['#unitsClose',()=>toggleUnits(false)],['#speedDown',()=>{if(!multiSession){setSpeed(1);update();}}],['#speedUp',()=>{if(!multiSession){setSpeed(2);update();}}],['#zoomOut',()=>setCameraZoom(-1)],['#zoomIn',()=>setCameraZoom(1)],['#zoomReset',resetCamera]]){const b=document.querySelector(id);if(b)b.onclick=fn;}
const flowUpdate=update;update=function(){flowUpdate();syncFlowControls();};
const flowDisplayMulti=displayMultiState;displayMultiState=function(){flowDisplayMulti();syncFlowControls();};
const flowAdvance=advanceResultRead;advanceResultRead=function(t){if(unitsOpen){resultReadLast=null;syncFlowControls();return;}flowAdvance(t);syncFlowControls();};
syncCameraInput();

if(typeof document.addEventListener==='function')document.addEventListener('keydown',e=>{if(!unitsOpen)return;if(e.key==='Escape'){e.preventDefault();toggleUnits(false);}else if(e.key==='Tab'){e.preventDefault();document.querySelector('#unitsClose')?.focus?.();}});

let predictionPreview=false,previewOpening=null;
function syncPredictionPreview(){
 const q=id=>document.querySelector(id),canPreview=state==='choose'&&screenMode==='game'&&(!multiSession||(multiSnapshot?.phase==='predict'&&!multiPredictionPending&&!multiSnapshot.readyIds.includes(multiUser)));
 if(!canPreview||previewOpening!==initialUnits)predictionPreview=false;
 if(state==='choose'&&(!multiSession||multiSnapshot?.phase==='predict')){q('#comparison').hidden=predictionPreview;q('#battle').hidden=!predictionPreview;q('#battleControls').hidden=true;}
 for(const id of ['#battleClock','#unitsToggle','#soundToggle'])if(q(id))q(id).hidden=predictionPreview||(id==='#battleClock'&&state!=='fight');
 if(q('#formationBack'))q('#formationBack').hidden=!predictionPreview;
 q('#gameScreen')?.setAttribute('data-field-view',String(state==='fight'||predictionPreview));
}
function setPredictionPreview(value){if(value&&state!=='choose')return;predictionPreview=!!value;previewOpening=initialUnits;if(value){cameraZoom=1;centerFixedCamera();cameraDrag=null;syncCameraInput();}syncPredictionPreview();if(predictionPreview)draw();}
document.querySelector('#formationToggle').onclick=()=>setPredictionPreview(true);
const previewBack=document.querySelector('#formationBack');if(previewBack)previewBack.onclick=()=>setPredictionPreview(false);

syncFlowControls();


function openPausePanel(){
 if(state!=='fight')return;pausePanelOpen=true;pausePanelWasPaused=paused;
 if(!multiSession)setPaused(true);
 const p=document.querySelector('#pausePanel');if(p)p.hidden=false;document.querySelector('#pauseResume')?.focus?.();
}
function closePausePanel(){if(!pausePanelOpen)return;pausePanelOpen=false;const p=document.querySelector('#pausePanel');if(p)p.hidden=true;document.querySelector('#pause')?.focus?.();if(!multiSession&&!pausePanelWasPaused)setPaused(false);}
document.querySelector('#pause').onclick=openPausePanel;
const pauseResume=document.querySelector('#pauseResume');if(pauseResume)pauseResume.onclick=closePausePanel;
const pauseExit=document.querySelector('#pauseExit');if(pauseExit)pauseExit.onclick=()=>{closePausePanel();if(multiSession)void leaveMulti().then(()=>{if(!multiSession)showScreen('home');});else returnHome();};

if(typeof document.addEventListener==='function')document.addEventListener('keydown',e=>{if(!pausePanelOpen)return;if(e.key==='Escape'){e.preventDefault();closePausePanel();}else if(e.key==='Tab'){e.preventDefault();const resume=document.querySelector('#pauseResume'),exit=document.querySelector('#pauseExit');(document.activeElement===resume?exit:resume)?.focus?.();}});
