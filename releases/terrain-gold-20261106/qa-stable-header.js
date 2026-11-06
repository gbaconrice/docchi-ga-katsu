/* Development-only rendering fixture. Include after the game's scripts in a QA
   entry, never the production entry. No native SDK, transport or score API. */
(() => {
  'use strict';
  const nativeRaf=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};
  const q=id=>document.getElementById(id), ids=['gameTopline','fieldStatus','status','balance','soundToggle','gameToolbar','battleChoice','battleClock','unitsToggle','reactionToggle','pause','participantRailWrap'];
  let mode='solo',baseline=null,baselineNodes=null,rows=[];
  function info(id){const n=q(id);if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {box:[r.x??r.left,r.y??r.top,r.width,r.height].map(x=>Math.round(x*100)/100),hidden:n.hidden,display:s.display,visible:!n.hidden&&s.display!=='none'&&r.width>0&&r.height>0,disabled:!!n.disabled,text:n.textContent.trim().slice(0,150)};}
  function overlap(a,b){if(!a?.visible||!b?.visible)return false;const[x,y,w,h]=a.box,[x2,y2,w2,h2]=b.box;return x<x2+w2-.5&&x+w>x2+.5&&y<y2+h2-.5&&y+h>y2+.5;}
  function measure(){const nodes=Object.fromEntries(ids.map(id=>[id,info(id)])),card=info('resultPanel');
    const stable=Object.fromEntries(ids.filter(id=>id!=='participantRailWrap'||mode==='multi').map(id=>[id,!baseline||nodes[id].box.every((x,i)=>Math.abs(x-baseline[id].box[i])<.6)]));
    const visible=ids.filter(id=>id!=='participantRailWrap'||mode==='multi').every(id=>nodes[id]?.visible);
    const out={kind:mode+'-'+state,renderingOnly:true,realIOS:false,realSDK:false,viewport:[innerWidth,innerHeight],inset:getComputedStyle(document.documentElement).getPropertyValue('--gravity-top-inset'),nodes,card,checks:{upperUIVisible:visible,sameDOMNodes:!baselineNodes||ids.every(id=>baselineNodes[id]===q(id)),sameUpperPositions:Object.values(stable).every(Boolean),stable,noHorizontalPageOverflow:document.documentElement.scrollWidth<=innerWidth+1,resultClearOfHeader:!ids.some(id=>overlap(card,nodes[id])),toolbar44px:['unitsToggle','reactionToggle','pause','soundToggle'].every(id=>nodes[id].box[2]>=44&&nodes[id].box[3]>=44)}};
    rows.push(out);return out;
  }
  function reset(nextMode='solo'){
    if(!api.ready)throw Error('StableHeaderQA is not ready');
    cancelPersonalResult();setBattleLogOpen(false);if(pausePanelOpen)closePausePanel();if(unitsOpen)toggleUnits(false);
    multiSession=null;multiAdapter=null;mockGuest=null;mockQueue=[];multiSnapshot=null;multiPlayback=null;multiReplay=null;multiHost=false;multiRecording=false;multiBusy=false;multiPredictionPending=false;
    showScreen('home');openSoloScreen();mode=nextMode;baseline=null;baselineNodes=null;rows=[];
    if(mode==='multi'){
      multiUser='qa-you';const names=['qa-you','qa-hana','qa-taro','qa-four','qa-five','qa-six','qa-seven','qa-eight'];
      const wallets=names.map(playerId=>({playerId,balance:100,score:0,correctCount:0,cashedOut:false,terminalReason:null}));
      multiSnapshot={sessionId:'qa-stable-header',roundId:1,totalRounds:10,phase:'predict',participants:names,spectators:['qa-watch'],departedIds:[],cashedOutIds:[],continueIds:[],readyIds:[],confirmedSides:[],selectionPreviews:[],roundResults:[],wallets,deadline:Date.now()+60000,environment:battleEnvironment,winner:null};
      multiShownWallets=wallets;
      multiSession={getState:()=>multiSnapshot,getPlaybackClock:()=>({known:true,ready:true,status:'playing',estimatedHostNow:Date.now(),uncertaintyMs:0,sceneTick:multiLastSceneTick,resultAt:Date.now()}),getReplay:()=>null};
      multiAdapter={getRoomId:()=> 'QA-local',getProfile:id=>({name:id==='qa-you'?'確認ユーザー':id==='qa-hana'?'長い参加者の名前を確認':id}),sendReaction:()=>false};
      showScreen('game');update();
    }
    syncFlowControls();syncReactions();syncCrowdInspector();syncBattleLog(1000,true);draw();
    const out=measure();baseline=out.nodes;baselineNodes=Object.fromEntries(ids.map(id=>[id,q(id)]));return out;
  }
  function fight(){if(!api.ready)throw Error('Not ready');
    if(mode==='solo'){selectSide(0);startPrediction();}
    else{state='fight';multiSnapshot.phase='battle';multiSnapshot.confirmedSides=[{userId:multiUser,side:'A'}];multiSnapshot.readyIds=[multiUser];multiPlayback={cornerCuesAt:()=>[]};multiReplay={ticks:264};}
    elapsed=4.4;multiLastSceneTick=264;update();syncFlowControls();syncReactions();syncCrowdInspector();syncBattleLog(2000,true);draw();return measure();
  }
  function result(){if(state!=='fight')fight();
    if(mode==='solo')walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:round,outcome:'A',now:0});
    else{multiSnapshot.phase='result';multiSnapshot.winner='A';multiSnapshot.resultAt=Date.now();multiSnapshot.roundResults=[{playerId:multiUser,submitted:true,side:'A',stake:25,correct:true,delta:25,balanceBefore:100,balanceAfter:125}];multiSnapshot.wallets[0]={...multiSnapshot.wallets[0],balance:125,correctCount:1};}
    state='result';winner=0;update();syncPersonalResult(2000);syncPersonalResult(5000);syncReactions();syncCrowdInspector();syncBattleLog(5000,true);draw();return measure();
  }
  const api=window.StableHeaderQA={ready:false,choose:reset,fight,result,measure,
    cycle(kind='solo'){reset(kind);fight();result();return {kind,rows,passed:rows.every(x=>Object.values(x.checks).filter(v=>typeof v==='boolean').every(Boolean))};},
    finalRound(kind='solo'){
      reset(kind);fight();
      if(mode==='solo'){
        const sessionId='qa-stable-final';walletState=SoloWallet.createSession({sessionId,playerIds:[PLAYER],config:{initialBalance:100}});
        for(let n=1;n<=10;n++){walletState=SoloWallet.openRound(walletState,{sessionId,roundId:n,deadline:100});walletState=SoloWallet.commitPrediction(walletState,{sessionId,roundId:n,playerId:PLAYER,side:'A',stake:25,now:0});walletState=SoloWallet.settleRound(walletState,{sessionId,roundId:n,outcome:n===10?'A':'draw',now:0});}
        round=10;state='result';winner=0;choice=0;update();syncPersonalResult(1000);syncPersonalResult(4000);syncReactions();syncBattleLog(4000,true);return measure();
      }
      multiSnapshot.roundId=10;round=10;return result();
    },
    next(){if(mode==='solo'){nextPrediction();}else{cancelPersonalResult();multiSnapshot={...multiSnapshot,roundId:multiSnapshot.roundId+1,phase:'predict',confirmedSides:[],readyIds:[],roundResults:[],winner:null};state='choose';selectedSide=null;multiPlayback=null;multiReplay=null;update();}syncReactions();return measure();},
    pause(){if(state!=='fight')throw Error('Use fight first');openPausePanel();syncReactions();return measure();},
    resume(){closePausePanel();syncReactions();return measure();},
    log(){setBattleLogOpen(true,q('battleLogResult'));return measure();},
    closeLog(){setBattleLogOpen(false);return measure();},
    inset(n=98){if(![0,74,98].includes(n))throw Error('Use 0, 74 or 98');document.documentElement.style.setProperty('--gravity-top-inset',n+'px');baseline=null;baselineNodes=null;return measure();},
    checks(){return rows;}
  };
  const ready=()=>{api.ready=true;window.dispatchEvent(new Event('docchi-stable-header-ready'));};
  // The shared QA harness may already own/freeze requestAnimationFrame.
  if(window.DocchiQa){if(window.DocchiQa.ready)ready();else window.addEventListener('docchi-qa-ready',ready,{once:true});}
  else nativeRaf(ready);
})();
