/* QA entry only. Visible parent controls drive real animation frames.
   Never add this file to the public game's production entry. */
(()=>{
 if(window.parent===window)return;
 let host;try{host=window.parent.document;}catch(_){return;}
 const section=host.createElement('div');section.id='lossMotionAuditControls';
 host.querySelector('#lossMotionAuditControls')?.remove();
 const report=host.createElement('pre');report.id='lossMotionAuditReport';
 report.style.maxHeight='180px';report.style.overflow='auto';
 let captureToken=0,last=null;
 const compact=r=>r&&({correct:r.correct,viewport:r.viewport,began:r.began,sampleCount:r.samples.length,samples:[r.samples[0],r.samples.find(x=>x.now-r.began>=1000),r.samples.at(-1)].filter(Boolean)});
 const read=()=>{
  const box=id=>{const n=document.querySelector(id);if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {id,text:n.textContent.slice(0,50),rect:[r.x,r.y,r.width,r.height],hidden:n.hidden,display:s.display,visibility:s.visibility,zIndex:s.zIndex,opacity:s.opacity};};
  return {now:performance.now(),stage:personalResultScene?.stage,stage2At:personalResultScene?.stage2At,animations:personalResultScene?.animations.length,nodes:['#balance','#breakdown','#field','#fieldStage','#battle','#battleLog','#gameToolbar','#assetNoticeBattle','#resultPanel','#earnedFlightLayer',...Array.from({length:12},(_,i)=>'#resultScatter'+i)].map(box)};
 };
 const start=correct=>{
  const token=++captureToken;
  multiSession=null;multiReplay=null;multiPlayback=null;multiRecording=false;predictionPreview=false;
  showScreen('home');openSoloScreen();document.querySelector('#red').click();document.querySelector('#confirm').click();
  for(let n=0;n<30;n++)step(1/60);
  const outcome=correct?'A':'B';
  walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:round,outcome,now:0});
  winner=correct?0:1;state='result';personalResultScene=null;personalResultSeen.clear();update();syncCrowdInspector();syncBattleLog(performance.now(),true);draw();
  // Use the same high-resolution clock as the production requestAnimationFrame
  // loop. Do not jump from sync(0) directly to an arbitrary test timestamp.
  const began=performance.now();syncPersonalResult(began);
  last={correct,viewport:[innerWidth,innerHeight],began,samples:[]};report.textContent='実時間で記録中';
  const sample=()=>{
   if(token!==captureToken)return;
   last.samples.push(read());
   if(performance.now()-began<2600)requestAnimationFrame(sample);
   else report.textContent=JSON.stringify(compact(last),null,2);
  };requestAnimationFrame(sample);
 };
 for(const [title,fn] of [['外れを実時間再生',()=>start(false)],['的中を実時間再生',()=>start(true)],['演出記録を表示',()=>{report.textContent=JSON.stringify(compact(last),null,2);} ]]){
  const b=host.createElement('button');b.type='button';b.textContent=title;b.onclick=fn;section.appendChild(b);
 }
 section.appendChild(report);(host.querySelector('header')||host.body).appendChild(section);
})();
