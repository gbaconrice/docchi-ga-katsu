from pathlib import Path
import sys
MARK='/* prediction-entry-reset-20261107 */'
def patch(s):
 if MARK in s: return s
 old='grid-template-columns:minmax(0,1fr) max-content minmax(88px,1fr) 44px;'
 assert s.count(old)==2
 s=s.replace(old,'grid-template-columns:minmax(0,1fr) max-content 88px 44px;')
 old="function syncFlowControls(){\n const q=id=>document.querySelector(id),s=multiSession?.getState();"
 new="""/* prediction-entry-reset-20261107 */
var flowControlsViewKey;
function syncFlowControls(){
 const q=id=>document.querySelector(id),s=multiSession?.getState();
 const viewKey=screenMode==='game'?[multiSession?'multi':'solo',s?.sessionId||walletState?.sessionId||'',state,multiSession?s?.roundId:round].join(':'):screenMode;
 const enteredPrediction=screenMode==='game'&&state==='choose'&&flowControlsViewKey!==undefined&&flowControlsViewKey!==viewKey;
 flowControlsViewKey=viewKey;
 if(enteredPrediction)closeOtherGamePanels(null);"""
 assert s.count(old)==1
 return s.replace(old,new)
if __name__=='__main__':
 src,dst=map(Path,sys.argv[1:]); assert src.resolve()!=dst.resolve()
 dst.write_text(patch(src.read_text()))
