/* LOCAL QA ONLY. Never included in a production manifest or public entry. */
(function(){
 const params=new URLSearchParams(location.search),role=params.get('role');
 loadNativeSDK=async()=>{throw Error('Local QA never connects to GRAVITY');};
 submitFinalScore=async()=>({status:'test-only-not-submitted'});attemptFinalScore=()=>({status:'test-only-not-submitted'});
 const cues=[];const originalAudioCall=audioCall;
 audioCall=function(fn){return originalAudioCall(fn);};
 if(role!=='host'&&role!=='guest')return;
 const name=params.get('session')||'feedback-qa-1',id=role==='host'?'qa-host':'qa-guest',host='qa-host';
 const channel=new BroadcastChannel('docchi-'+name),bots=[],queue=[];let draining=false;
 function drain(){if(draining)return;draining=true;try{let n=0;while(queue.length&&n++<10000){const[to,from,wire]=queue.shift();to.receive(from,wire);}}finally{draining=false;}}
 function send(wire){channel.postMessage({from:id,wire});if(role==='host'){for(const bot of bots)queue.push([bot,host,wire]);setTimeout(drain,0);}}
 freshWallet();multiUser=id;multiHost=role==='host';multiError='';multiRoundSeen=null;multiPlayback=null;multiReplay=null;multiShownWallets=null;multiLastPump=0;multiHeartbeat=0;multiAutoAdvanceRound=null;lastScreenPhase=null;mockGuest=null;
 pendingOwnCashoutPost=null;pendingCarryKinds=null;pendingCarryOutcome=null;carryStreak=0;initialKinds=[[],[]];initialUnits=[];openingPlan=null;units=[];shots=[];elapsed=0;choice=null;winner=null;battleEnvironment=null;round=1;state='choose';
 const common={requireEnvironment:true,roomId:'local-feedback-qa',sessionId:name,userId:id,hostId:host,send,onChange:onMultiChange};
 multiSession=MultiBinding.createWalletSession(common);
 channel.onmessage=event=>{const message=event.data;if(message?.from!==id&&typeof message?.wire==='string')multiSession.receive(message.from,message.wire);};
 multiAdapter={getProfile:user=>({name:user==='qa-host'?'確認ホスト':user==='qa-guest'?'確認ゲスト・長い表示名テスト':user}),getRoomId:()=>common.roomId,getHostId:()=>host,isNativeJoined:()=>false,isRestartPending:()=>false,sendReaction:()=>true,exit:async()=>{channel.close();for(const bot of bots)bot.close();}};
 multiSnapshot=multiSession.getState();showScreen('room');displayMultiState();multiSession.hello();
 // Optional six local spectators/players exercise a full eight-seat pick lane.
 if(role==='host'&&params.get('bots')==='6')for(let i=0;i<6;i++){
  const user='QA '+(i+1),bot=MultiProtocol.createSession({...common,userId:user,onChange:()=>{},send:wire=>{queue.push([multiSession,user,wire]);setTimeout(drain,0);}});bots.push(bot);bot.hello();
 }
 const pump=pumpMulti;pumpMulti=function(now){drain();pump(now);for(const bot of bots){bot.tick();const state=bot.getState();if(state.phase==='predict'&&!state.readyIds.includes(botUser(bot))){const user=botUser(bot);const wallet=state.wallets?.find(row=>row.playerId===user);bot.previewSelection('A');bot.predict('A',MoneyUI.defaultStake(wallet?.balance??100,state.roundId,10,50)??0);}}drain();};
 function botUser(bot){return 'QA '+(bots.indexOf(bot)+1);}
 document.querySelector('#showMultiplayer').onclick=()=>showScreen('room');document.querySelector('#joinRoom').disabled=true;document.querySelector('#createRoom').disabled=true;
})();
