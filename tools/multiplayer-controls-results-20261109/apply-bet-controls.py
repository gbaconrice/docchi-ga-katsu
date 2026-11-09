"""Minimal, idempotent stage: visible multiplayer deadline and explicit confirmation.
No transport, wallet, battle, lobby or artwork changes. Supports exact inverse.
"""
from pathlib import Path
import sys
CSS='''/* multiplayer-bet-controls-20261109 */
#app #gameScreen .prediction-status:not([hidden]) {
  display:flex; justify-content:space-between; align-items:center; gap:12px;
  margin:0 0 6px; padding:0 2px; color:#f9e7ba;
  font-size:14px; line-height:1.35; font-weight:700;
  font-variant-numeric:tabular-nums;
}
#app #gameScreen .prediction-status[hidden] { display:none !important; }
'''
HTML='''        <div id="predictionStatus" class="prediction-status" hidden>
          <span id="predictionCountdown" role="timer" aria-live="off"></span>
          <span id="predictionReady" aria-live="polite" aria-atomic="true"></span>
        </div>
'''
HELPER='''// The prediction deadline belongs in the betting panel, not hidden room chrome.
function multiPredictionSeconds(s,clock){
 if(s?.phase!=='predict'||!Number.isSafeInteger(s.deadline)||!clock?.known||!Number.isFinite(clock.estimatedHostNow))return null;
 return Math.max(0,Math.ceil((s.deadline-clock.estimatedHostNow)/1000));
}
function syncMultiPredictionControls(s,clock,player,ready,pending){
 const q=id=>document.querySelector(id),status=q('#predictionStatus'),button=q('#confirm');
 const predicting=s?.phase==='predict',seconds=multiPredictionSeconds(s,clock);
 status.hidden=!predicting;
 if(!predicting)return;
 const active=(s.participants||[]).filter(id=>!(s.cashedOutIds||[]).includes(id)&&s.wallets?.find(p=>p.playerId===id)?.terminalReason!=='bankrupt');
 const count=active.filter(id=>s.readyIds.includes(id)).length;
 const countdown=seconds===null?'残り — 秒':'残り '+seconds+'秒',progress='確定 '+count+'/'+active.length;
 if(q('#predictionCountdown').textContent!==countdown)q('#predictionCountdown').textContent=countdown;
 if(q('#predictionReady').textContent!==progress)q('#predictionReady').textContent=progress;
 const label=!player?'観戦中':ready?'確定済み':pending?'送信中…':seconds===0?'締切':'予想を確定';
 if(button.textContent!==label)button.textContent=label;
 button.disabled=!player||ready||pending||seconds===0||selectedSide===null||!validPredictionStake(currentWallet().balance,selectedStake);
 button.setAttribute('aria-busy',String(!!pending&&!ready));
}
'''
PAIRS=[
 ('</style>',CSS+'</style>'),
 ('        <button id="confirm" class="cta cta-primary prediction-start" type="button" disabled>対戦開始</button>',HTML+'        <button id="confirm" class="cta cta-primary prediction-start" type="button" disabled>対戦開始</button>'),
 ("  q('#confirm').disabled=selectedSide===null||!validPredictionStake(w.balance,selectedStake);", "  q('#confirm').disabled=selectedSide===null||!validPredictionStake(w.balance,selectedStake);\n  if(!multiSession){q('#predictionStatus').hidden=true;q('#confirm').textContent='対戦開始';q('#confirm').removeAttribute('aria-busy');}"),
 ('function displayMultiState(){',HELPER+'function displayMultiState(){'),
 (" const clock=multiSession.getPlaybackClock();", " const clock=multiSession.getPlaybackClock();\n syncMultiPredictionControls(s,clock,player,ready,multiPredictionPending);"),
]
def patch(s):
 for a,b in PAIRS:
  if b in s:continue
  assert s.count(a)==1, (a[:120],s.count(a))
  s=s.replace(a,b)
 return s

def unpatch(s):
 for a,b in reversed(PAIRS):
  assert s.count(b)==1, b[:120]
  s=s.replace(b,a)
 return s

if __name__=='__main__':
 a,b=map(Path,sys.argv[1:3]);s=a.read_text();out=patch(s);assert unpatch(out)==s;b.write_text(out);print('Applied multiplayer betting UI patch; exact inverse verified.')
