/* Development-only, local rendering fixtures. Include only from qa-entry.html,
   after the game's classic scripts. Never load from the public game entry.
   These mutate only this disposable frame; no native SDK, transport or score API. */
(() => {
  'use strict';
  const nativeRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  let beforeField = null;
  const q = id => document.getElementById(id);
  function box(id) {
    const n = q(id); if (!n) return null;
    const r = n.getBoundingClientRect(), s = getComputedStyle(n);
    return {left:r.left, right:r.right, top:r.top, bottom:r.bottom,
      width:r.width, height:r.height, hidden:n.hidden, display:s.display,
      scrollWidth:n.scrollWidth, clientWidth:n.clientWidth,
      scrollHeight:n.scrollHeight, clientHeight:n.clientHeight};
  }
  function measure() {
    const card=box('resultPanel'), log=box('battleLog'), field=box('field'), game=box('gameScreen');
    const overlap=card&&log&&card.left<log.right-.5&&card.right>log.left+.5&&card.top<log.bottom-.5&&card.bottom>log.top+.5;
    return {fixture:api.kind, realIOS:false, realSDK:false, phase:state, round,
      viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},
      game, card, log, field, beforeField, amount:box('breakdown'), logButton:box('battleLogResult'), next:box('next'),
      checks:{cardAboveHistory:!overlap,cardWithinGame:card&&card.top>=game.top-.5&&card.bottom<=game.bottom+.5,
        noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth&&card.scrollWidth<=card.clientWidth+1,
        amountOwnRow:box('breakdown').bottom<=box('battleLogResult').top+.5,
        retainedMap:!beforeField||['left','top','width','height'].every(k=>Math.abs(beforeField[k]-field[k])<1),
        countdownHidden:q('resultProgress').hidden},
      text:{winner:q('resultWinner').textContent,message:q('message').textContent,amount:q('breakdown').textContent,next:q('next').textContent}};
  }
  function reset() {
    if (!api.ready) throw new Error('QA fixtures are not ready');
    cancelPersonalResult(); setBattleLogOpen(false);
    multiSession=null;multiAdapter=null;mockGuest=null;mockQueue=[];multiSnapshot=null;
    multiPlayback=null;multiReplay=null;multiHost=false;multiRecording=false;multiBusy=false;
    showScreen('home');openSoloScreen();commitArmy(0);startPrediction();
    syncCrowdInspector();syncBattleLog(1000,true);draw();
    beforeField=box('field');
  }
  function finish(outcome,mode='solo') {
    winner=outcome==='A'?0:outcome==='B'?1:null;state='result';
    update();syncPersonalResult(2000);syncPersonalResult(4000);syncPersonalResult(6000);
    syncCrowdInspector();syncBattleLog(6000,true);draw();
    api.kind=mode+'-'+outcome;return measure();
  }
  function solo(outcome='A') {
    reset();walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:1,outcome,now:0});
    return finish(outcome);
  }
  function finalRound(zero=false) {
    reset();const id='qa-final-'+(zero?'zero':'positive');
    walletState=SoloWallet.createSession({sessionId:id,playerIds:[PLAYER],config:{initialBalance:zero?0:100}});
    for(let n=1;n<=10;n++){
      walletState=SoloWallet.openRound(walletState,{sessionId:id,roundId:n,deadline:100});
      walletState=SoloWallet.commitPrediction(walletState,{sessionId:id,roundId:n,playerId:PLAYER,side:'A',stake:zero?0:25,now:0});
      walletState=SoloWallet.settleRound(walletState,{sessionId:id,roundId:n,outcome:n===10?(zero?'B':'A'):'draw',now:0});
    }
    round=10;return finish(zero?'B':'A',zero?'solo-final-zero':'solo-final');
  }
  function multiplayer(outcome='A') {
    solo(outcome);
    const longName='とても長い参加者の名前ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    multiUser='qa-me';multiHost=false;
    multiSnapshot={sessionId:'qa-multi-'+outcome,roundId:1,phase:'result',winner:outcome,participants:['qa-me',...Array.from({length:7},(_,i)=>longName+(i+1))],
      wallets:[{playerId:longName,balance:125,cashedOut:true,cashoutAmount:'123456789012345678901234567890'}],
      roundResults:[{playerId:'qa-me',submitted:true,side:outcome,stake:25,correct:true,delta:25,balanceBefore:100,balanceAfter:125}]};
    // No transport exists in this rendering-only fixture. Do not call a pump.
    multiSession={getState:()=>multiSnapshot};multiReplay={};multiPlayback={cornerCuesAt:()=>[]};
    personalResultScene=null;syncPersonalResult(1000);syncPersonalResult(3000);
    q('resultPanel').hidden=false;q('next').hidden=true;
    q('multiResultsList').textContent=Array.from({length:8},(_,i)=>longName+(i+1)+'：的中 +25 G · 残高125 G').join('\n');
    q('multiResults').hidden=false;q('battleInsights').hidden=true;
    q('battleInsights').textContent='';
    api.kind='multi-long-'+outcome;return measure();
  }
  const api=window.DocchiQa={ready:false,kind:'none',measure,solo,finalRound,multiplayer,
    // Run the complete presentation frame, not advanceResultRead's intermediate state.
    waitTenMinutes(){if(multiSession)throw new Error('Use a solo fixture for elapsed-time QA');for(const t of [10000,30000,600000])loop(t);return measure()},
    scrollResult(){q('resultPanel').scrollTop=q('resultPanel').scrollHeight;return measure()},
    openLog(){setBattleLogOpen(true,q('battleLogResult'));return {visible:!q('battleLogHistory').hidden,...measure()}},
    closeLog(){setBattleLogOpen(false);return {visible:!q('battleLogHistory').hidden,...measure()}},
    next(){if(!multiSession)q('next').click();return measure()},
    run(kind){switch(kind){case 'solo-left':return solo('A');case 'solo-right':return solo('B');case 'solo-draw':return solo('draw');case 'solo-final':return finalRound(false);case 'solo-final-zero':return finalRound(true);case 'multi-left':return multiplayer('A');case 'multi-right':return multiplayer('B');default:throw new Error('Unknown QA fixture: '+kind)}}};
  // Drain the one frame queued before these fixtures were loaded, then freeze.
  nativeRaf(()=>{api.ready=true;window.dispatchEvent(new Event('docchi-qa-ready'));});
})();

/* matchup-history-visible-qa-20261107: controlled left-win fixture only.
   Isolated QA script; never included in a production entry. No SDK or transport. */
(() => {
  'use strict';
  window.MatchupHistoryQA = Object.freeze({
    review(target=15) {
      if (!window.DocchiQa?.ready) throw Error('QAの読込後に操作してください。');
      if (![1,8,15,25].includes(target)) throw Error('Unsupported QA round');
      cancelPersonalResult();setBattleLogOpen(false);
      multiSession=null;multiSnapshot=null;multiAdapter=null;multiPlayback=null;
      multiReplay=null;multiHost=false;multiRecording=false;multiBusy=false;
      closePausePanel();if(unitsOpen)toggleUnits(false);
      round=1;mistakes=0;correct=0;homePausedSolo=false;
      freshWallet();openPrediction(700740);
      const cards=[],originalRandom=Math.random;
      try {
        for (let n=1;n<=target;n++) {
          const card=MatchupHistory.key(...initialKinds);
          if (cards.some(row=>row.card===card)) throw Error('Repeated matchup at '+n);
          if (soloMatchupHistory.length!==n) throw Error('History count mismatch');
          cards.push({round:n,seed,card,left:initialKinds[0].slice(),right:initialKinds[1].slice(),decision:openingPlan.historyDecision});
          if(n===target)break;
          const incumbent=initialKinds[0].slice();
          selectSide(0);startPrediction();
          walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:n,outcome:'A',now:0});
          winner=0;state='result';
          Math.random=()=>((700021+(n+1)*719)>>>0)/4294967296;
          if(n>=10){if(!continueSoloRun())throw Error('Extension failed');}else nextPrediction();
          if(JSON.stringify(incumbent)!==JSON.stringify(initialKinds[0]))throw Error('Incumbent changed');
        }
      } finally { Math.random=originalRandom; }
      cancelPersonalResult();setPaused(true);resetResultRead();update();showScreen('game');syncCrowdInspector();draw();
      const describe=ks=>Object.entries(ks.reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{})).map(([id,count])=>({id,name:TYPES[id].name,count}));
      return {fixture:'Controlled left wins, actual solo opening/wallet/extension path',nativeSDK:false,realCombat:false,round,uniqueCards:new Set(cards.map(x=>x.card)).size,historyLength:soloMatchupHistory.length,incumbentSide:openingPlan.incumbentSide,left:describe(initialKinds[0]),right:describe(initialKinds[1]),cardAt8:cards.find(x=>x.round===8)||null,cardAt15:cards.find(x=>x.round===15)||null,decision:openingPlan.historyDecision};
    }
  });
})();
