// Authoritative personal settlement presentation. No state/ledger/physics writes.
let personalResultScene=null;
const personalResultSeen=new Set();
function ownResultEntry(){return multiSession?multiSnapshot?.roundResults?.find(e=>e.playerId===multiUser):walletState?.ledger?.find(r=>r.roundId===round)?.entries?.find(e=>e.playerId===PLAYER);}
function cancelPersonalResult(){if(personalResultScene){personalResultScene.cancelled=true;for(const a of personalResultScene.animations)a?.cancel?.();personalResultScene.animations=[];}}
function resultAnimate(id,frames,options){if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;try{const a=document.querySelector(id)?.animate?.(frames,options);if(a)personalResultScene.animations.push(a);}catch(_){}}
function syncPersonalResult(now){
 const q=id=>document.querySelector(id),visible=state==='result'&&screenMode==='game'&&!multiRecording;
 if(!visible){cancelPersonalResult();q('#gameScreen')?.setAttribute('data-personal-result','false');return;}
 const key=audioBattleKey()+':'+(multiSession?multiUser:PLAYER),entry=ownResultEntry();
 if(!personalResultScene||personalResultScene.key!==key){
  cancelPersonalResult();const seen=personalResultSeen.has(key);personalResultSeen.add(key);if(personalResultSeen.size>40)personalResultSeen.delete(personalResultSeen.values().next().value);
  personalResultScene={key,start:null,stage:0,cancelled:seen||document.hidden===true,animations:[]};
 }
 const scene=personalResultScene,outcome=multiSession?multiSnapshot?.winner:winner===null?'draw':winner===0?'A':'B';
 const label=entry?.correct===true?'的中！':entry?.correct===false?'はずれ':outcome==='draw'?'引き分け':outcome==='invalid'?'無効':'予想なし';
 q('#message').textContent=label;q('#breakdown').textContent=Number.isSafeInteger(entry?.delta)?credits(entry.delta):'—';
 if(q('#resultWinner'))q('#resultWinner').textContent=outcome==='A'?'左の勝利':outcome==='B'?'右の勝利':'';
 if(q('#resultRanking')){q('#resultRanking').hidden=!multiSession||round<TOTAL_ROUNDS;q('#resultRanking').textContent=multiSession&&round>=TOTAL_ROUNDS?(multiSnapshot.wallets||[]).slice().sort((a,b)=>b.score-a.score).map(p=>(p.playerId===multiUser?'あなた':p.playerId)+' '+credits(p.score)).join(' · '):'';}
 q('#gameScreen')?.setAttribute('data-personal-result','true');q('#gameScreen')?.setAttribute('data-field-view','true');
 q('#resultPanel')?.setAttribute('data-final',String(round>=TOTAL_ROUNDS));
 q('#resultPanel')?.setAttribute('data-outcome',entry?.correct===true?'hit':entry?.correct===false?'miss':'neutral');
 // Keep the final canonical field visible; never fabricate a missing guest replay.
 q('#battle').hidden=!!multiSession&&!multiReplay;q('#battleControls').hidden=true;
 for(const id of ['#battleClock','#unitsToggle','#soundToggle','#reactionToggle','#formationBack'])if(q(id))q(id).hidden=true;
 if(document.hidden===true){cancelPersonalResult();return;}if(!Number.isFinite(now)||scene.cancelled)return;
 if(scene.start===null)scene.start=now;const elapsed=Math.max(0,now-scene.start);syncBattleAudio();
 const advance=(stage,at,fn)=>{if(scene.stage<stage&&elapsed>=at){scene.stage=stage;fn();}};
 advance(1,120,()=>{audioCall(()=>battleAudio.playResultStage(audioBattleKey(),'stamp'));resultAnimate('#message',[{opacity:.45,transform:'scale(.88)'},{opacity:1,transform:'scale(1.04)'},{opacity:1,transform:'scale(1)'}],{duration:200,easing:'ease-out'});});
 advance(2,280,()=>{if(Number.isSafeInteger(entry?.delta))audioCall(()=>battleAudio.playResultStage(audioBattleKey(),'delta',{delta:entry.delta,stake:entry.stake}));resultAnimate('#breakdown',[{transform:'translateY(5px)',opacity:.65},{transform:'translateY(-2px)',opacity:1},{transform:'translateY(0)',opacity:1}],{duration:230,easing:'ease-out'});});
 advance(3,450,()=>{audioCall(()=>battleAudio.playResultStage(audioBattleKey(),'balance'));if(entry?.delta!==0&&Number.isSafeInteger(entry?.delta))resultAnimate('#balance',[{opacity:.6},{opacity:1}],{duration:180});});
}
const personalUpdate=update;update=function(){personalUpdate();syncPersonalResult();};
const personalDisplay=displayMultiState;displayMultiState=function(){personalDisplay();syncPersonalResult();};
const personalLoop=loop;loop=function(t){personalLoop(t);syncPersonalResult(t);};
const personalScreen=showScreen;showScreen=function(next){if(next!=='game')cancelPersonalResult();personalScreen(next);syncPersonalResult();};
if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelPersonalResult();});
