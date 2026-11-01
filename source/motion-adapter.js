// Cosmetic phase cues only. Never gate a commit, tick, result or next-round action.
const battleMotion=createBattleMotion({document,matchMedia:typeof matchMedia==='function'?matchMedia.bind(globalThis):undefined});
let motionSuspended=false;
function motionCall(fn){try{return fn();}catch(_){/* Optional animation must remain harmless. */}}
function motionBattleKey(){return (multiSession?multiSnapshot?.sessionId:walletState?.sessionId)+':'+round;}
function syncBattleMotion(){
 const suspended=multiRecording||screenMode!=='game'||predictionPreview||pausePanelOpen||unitsOpen||document.hidden===true;
 if(suspended){if(!motionSuspended)motionCall(()=>battleMotion.cancel());motionSuspended=true;return;}
 motionSuspended=false;const key=motionBattleKey();
 if(state==='choose')motionCall(()=>battleMotion.enterPrediction(key));
 else if(state==='fight'&&(!multiSession||multiPlayback))motionCall(()=>battleMotion.startBattle(key));
 else if(state==='result'&&(multiSession||walletState?.completedRounds===round)){
  const delta=multiSession?null:walletState.ledger[round-1]?.entries[0]?.delta;
  motionCall(()=>battleMotion.showResult(key,{delta}));
 }
}
const motionSelect=selectSide;selectSide=function(side){const before=selectedSide;motionSelect(side);if(state==='choose'&&selectedSide===side&&before!==side&&!predictionPreview)motionCall(()=>battleMotion.selectSide(side));};
const motionLoop=loop;loop=function(t){motionLoop(t);syncBattleMotion();};
const motionPreview=setPredictionPreview;setPredictionPreview=function(value){if(value)motionCall(()=>battleMotion.cancel());motionPreview(value);syncBattleMotion();};

const motionScreen=showScreen;showScreen=function(next){motionScreen(next);syncBattleMotion();};
const motionUpdate=update;update=function(){motionUpdate();syncBattleMotion();};
const motionMultiDisplay=displayMultiState;displayMultiState=function(){motionMultiDisplay();syncBattleMotion();};
