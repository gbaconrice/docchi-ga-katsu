/* QA-only fixture. Include after the canonical scripts; never in the public game. */
window.ResultFeedbackQA={
 run(outcome='B',choice='B'){
  multiSession=null;multiReplay=null;multiPlayback=null;multiRecording=false;predictionPreview=false;
  showScreen('home');openSoloScreen();document.querySelector(choice==='A'?'#red':'#blue').click();document.querySelector('#confirm').click();
  for(let n=0;n<30;n++)step(1/60);
  walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:round,outcome,now:0});
  winner=outcome==='A'?0:outcome==='B'?1:null;state='result';personalResultScene=null;personalResultSeen.clear();update();syncCrowdInspector();syncBattleLog(0,true);draw();
  syncPersonalResult(0);return this.measure();
 },
 at(ms){if(ms>=500&&personalResultScene&&!personalResultScene.earnedRevealed)syncPersonalResult(500);syncPersonalResult(ms);for(const a of personalResultScene?.animations||[]){try{a.pause();a.currentTime=Math.max(0,ms-(a.effect?.target?.classList?.contains('result-scatter')?500:0));}catch{}}return this.measure();},
 measure(){
  const box=id=>{const n=document.querySelector(id);if(!n)return null;const s=getComputedStyle(n),r=n.getBoundingClientRect();return {text:n.textContent,hidden:n.hidden,disabled:n.disabled,inert:n.inert,display:s.display,color:s.color,background:s.backgroundColor,fontSize:s.fontSize,zIndex:s.zIndex,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,clientHeight:n.clientHeight,scrollHeight:n.scrollHeight};};
  return {viewport:[innerWidth,innerHeight],reduced:resultReducedMotion(),amount:box('#breakdown'),winner:box('#resultWinner'),message:box('#message'),panel:box('#resultPanel'),game:box('#gameScreen'),battle:box('#field'),next:box('#next'),log:box('#battleLogResult'),oldLog:box('#battleLog'),history:box('#battleLogHistory'),wallet:box('#balance'),coin:box('.wallet-coin'),animations:personalResultScene?.animations.length,coinsFlying:personalResultScene?.coinsFlying,pageOverflow:document.documentElement.scrollWidth>innerWidth};
 },
 openLog(){document.querySelector('#battleLogResult').click();return this.measure();},
 closeLog(){document.querySelector('#battleLogClose').click();return this.measure();}
};
