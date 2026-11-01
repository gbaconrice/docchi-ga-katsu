// Presentation-only audio; generation, physics and scoring never depend on it.
const battleAudio=createBattleAudio({document,muteButton:document.querySelector('#soundToggle')});
function audioCall(fn){try{return fn();}catch(_){/* Audio failure never interrupts play. */}}
function audioBattleKey(){return (multiSession?multiSnapshot?.sessionId:walletState?.sessionId)+':'+round;}
function resolvePersonalResultFeedback({multiSession,multiSnapshot,multiUser,choice,winner,selectedStake,soloSettlement}){
 if(multiSession&&Array.isArray(multiSnapshot?.roundResults)){
  const entry=multiSnapshot.roundResults.find(p=>p.playerId===multiUser);
  return entry?{won:entry.correct,stake:entry.stake,delta:entry.delta,authoritative:true}:{won:null,stake:null,delta:null,authoritative:true};
 }
 if(!multiSession&&soloSettlement)return {won:soloSettlement.correct,stake:soloSettlement.stake,delta:soloSettlement.delta,authoritative:true};
 const outcome=multiSession?multiSnapshot?.winner:winner===null?'draw':winner===0?'A':'B';
 const bet=multiSession?multiSnapshot?.bets?.find(p=>p.userId===multiUser):null;
 const side=multiSession?bet?.side:choice===null?null:choice===0?'A':'B';
 return {won:outcome==='draw'||outcome==='invalid'||side==null?null:side===outcome,stake:multiSession?bet?.stake:selectedStake,delta:null,authoritative:false};
}
function syncBattleAudio(){audioCall(()=>{
 const live=screenMode==='game'&&state==='fight'&&!multiRecording&&(!multiSession||!!multiPlayback);
 battleAudio.setPaused(!!paused&&!multiSession);
 if(live)battleAudio.beginBattle(audioBattleKey());
 else if(state==='result'&&screenMode==='game'){
  const soloSettlement=!multiSession?walletState?.ledger?.find(r=>r.roundId===round)?.entries?.find(e=>e.playerId===PLAYER):null;
  const feedback=resolvePersonalResultFeedback({multiSession,multiSnapshot,multiUser,choice,winner,selectedStake,soloSettlement});
  battleAudio.finishBattleForChoice(audioBattleKey(),feedback.won,{stake:feedback.stake,deferStages:feedback.authoritative});
 }else battleAudio.setPhase('idle');
});}
const audioCommit=commitArmy;commitArmy=function(side,event){
 if(screenMode!=='game'||state!=='choose'||(multiSession&&(multiPredictionPending||multiSnapshot?.readyIds.includes(multiUser))))return;
 audioCall(()=>battleAudio.playSelection(event));audioCommit(side);syncBattleAudio();
};
document.querySelector('#red').onclick=e=>commitArmy(0,e);document.querySelector('#blue').onclick=e=>commitArmy(1,e);
const audioSoloStart=document.querySelector('#soloStart').onclick;document.querySelector('#soloStart').onclick=e=>{audioCall(()=>battleAudio.unlockFromGesture(e));audioSoloStart(e);};
const audioPause=document.querySelector('#pause').onclick;document.querySelector('#pause').onclick=e=>{audioCall(()=>battleAudio.unlockFromGesture(e));audioPause(e);syncBattleAudio();};
const audioConsume=consumeCombatEvents;consumeCombatEvents=function(events){audioConsume(events);if(!multiRecording&&!multiSession)audioCall(()=>battleAudio.ingestCombatEvents(events,{battleId:audioBattleKey(),tick:Math.round(elapsed*60)}));};
let audioFXBattle=null,audioFXBirth=-1;
const audioReplay=applyReplayFrame;applyReplayFrame=function(tick){audioReplay(tick);if(!multiRecording)audioCall(()=>(()=>{const key=audioBattleKey();if(audioFXBattle!==key){audioFXBattle=key;audioFXBirth=-1;}const fresh=activeEffects.filter(f=>f.tick>audioFXBirth);if(fresh.length)audioFXBirth=Math.max(...fresh.map(f=>f.tick));return battleAudio.ingestReplayEffects(fresh,{battleId:key,tick});})());};
const audioRecord=buildCanonicalReplay;buildCanonicalReplay=function(){audioCall(()=>battleAudio.setSuppressed(true));try{return audioRecord();}finally{audioCall(()=>battleAudio.setSuppressed(false));}};
const audioLoop=loop;loop=function(t){syncBattleAudio();audioLoop(t);syncBattleAudio();};

document.querySelector('#confirm').onclick=e=>{if(state!=='choose'||selectedSide===null||predictionPreview)return;audioCall(()=>battleAudio.unlockFromGesture(e));startPrediction(false);syncBattleAudio();};

if(pauseResume){const audioResume=pauseResume.onclick;pauseResume.onclick=e=>{audioCall(()=>battleAudio.unlockFromGesture(e));audioResume(e);syncBattleAudio();};}
// Closing a paused information/menu overlay is a genuine resume gesture too.
for(const id of ['#unitsToggle','#unitsClose']){const button=document.querySelector(id);if(button){const handler=button.onclick;button.onclick=e=>{const wasPaused=paused;handler(e);if(wasPaused&&!paused)audioCall(()=>battleAudio.unlockFromGesture(e));syncBattleAudio();};}}
if(typeof document.addEventListener==='function')document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state==='fight'&&!paused&&!unitsOpen&&!pausePanelOpen&&screenMode==='game'){audioCall(()=>battleAudio.unlockFromGesture(e));syncBattleAudio();}});
