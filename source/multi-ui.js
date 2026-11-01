let nativeProfileVerified=false;
const gravityContext=globalThis.isGravity===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).get('isGravity')==='1');
const scoreBridge=ScoreBridge.createScoreBridge({isGravity:()=>gravityContext||nativeProfileVerified,isEmbedded:!!globalThis.parent&&globalThis.parent!==globalThis,postMessage:(message,target)=>globalThis.parent.postMessage(message,target)});
async function submitFinalScore(action){
 if(!multiSession&&!walletState)return {status:'ineligible'};
 const snapshot=multiSession?multiSession.getState():null;
 const input=snapshot?{sessionId:snapshot.sessionId,mode:snapshot.mode,totalRounds:TOTAL_ROUNDS,playerId:multiUser,players:snapshot.wallets,completedRounds:snapshot.phase==='result'?snapshot.roundId:0,action,spectator:!snapshot.participants.includes(multiUser)}:{sessionId:walletState.sessionId,mode:walletState.mode,totalRounds:walletState.maxRounds,playerId:PLAYER,players:walletState.players,completedRounds:walletState.completedRounds,terminalReason:walletState.terminalReason,action};
 if(input.completedRounds!==input.totalRounds||input.spectator)return {status:'ineligible'};
 if(globalThis.parent&&globalThis.parent!==globalThis&&!gravityContext&&!nativeProfileVerified){
  try{const sdk=await loadNativeSDK();let timer;const profile=await Promise.race([sdk.user.getMyUserInfo(),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),3000)})]);clearTimeout(timer);nativeProfileVerified=profile?.errno===0&&!!profile.data?.user_id;}catch{}
 }
 const result=scoreBridge.submit(input);const status=document.querySelector('#scoreStatus');if(status)status.textContent=result.status==='sent'?'純益スコア連携を実行（受付確認なし）':result.status==='failed'?'スコア連携に失敗しました。ゲームは継続できます。':result.status==='standalone'?'スコア未送信：オフラインまたはGRAVITY接続未確認':'';return result;
}
// Online transport is opt-in. Default startup performs no native API or CDN call.
let multiSession=null,multiAdapter=null,multiHost=false,multiUser=null,multiSnapshot=null,multiBusy=false,multiRecording=false;
let multiPredictionPending=false;
let multiLastSceneTick=0;
let multiShownWallets=null,multiBattleWaitAt=0;
let multiInitial=null,multiReplay=null,multiPlayback=null,multiPlaybackStarted=0,multiRoundSeen=null,multiLastPump=0,multiHeartbeat=0,mockGuest=null,mockQueue=[],multiError='';
const soloUpdate=update,soloStart=startPrediction,soloNext=nextPrediction,soloLoop=loop,soloWallet=currentWallet,baseSpriteFrame=spriteFrame;
currentWallet=function(){if(!multiSession)return soloWallet();const shown=['locked','battle'].includes(multiSnapshot?.phase)?multiShownWallets:multiSnapshot?.wallets;const p=shown?.find(p=>p.playerId===multiUser)||{balance:100,score:0,correctCount:0};return {...p,maxStake:Math.min(50,p.balance),reserved:0};};
spriteFrame=function(u){return multiPlayback&&Number.isInteger(u.pose)?u.pose:baseSpriteFrame(u)};
function displayMultiState(){
 if(!multiSession||!multiSnapshot||multiRecording)return;
 const s=multiSnapshot,q=id=>document.querySelector(id),player=s.participants.includes(multiUser),ready=s.readyIds.includes(multiUser);
 round=s.roundId||1;
 if(s.phase==='predict')state='choose';else if(['locked','battle'].includes(s.phase))state='fight';else if(['settle','result'].includes(s.phase))state='result';else state='choose';
 soloUpdate();
 q('#comparison').hidden=s.phase!=='predict';q('#battle').hidden=s.phase!=='battle'||!multiPlayback;q('#resultPanel').hidden=!['settle','result'].includes(s.phase);
 q('#pause').hidden=false;q('#speed').hidden=true;
 q('#confirm').disabled=selectedSide===null||ready||multiPredictionPending||!player||s.phase!=='predict';
 q('#red').disabled=q('#blue').disabled=ready||multiPredictionPending||!player;
 for(const n of [0,10,25,50])q('#stake'+n).disabled=ready||multiPredictionPending||!player||n>currentWallet().maxStake;
 q('#beginRound').hidden=!(multiHost&&s.phase==='lobby');q('#exitRoom').hidden=false;
 const role=player?(multiHost?'ホスト':'参加者'):'観戦のみ';
 q('#roomStatus').textContent=(mockGuest?'練習相手と観戦 / ':('部屋コード '+(multiAdapter?.getRoomId()||'—')+' / '))+role+' / '+s.participants.length+'人 / '+s.phase+(ready?' / 予想受付済み':multiPredictionPending?' / 予想送信中（受付確認待ち）':'')+(s.phase==='predict'?' / あと約'+Math.max(0,Math.ceil((s.deadline-Date.now())/1000))+'秒':'')+(multiError?' / '+multiError:'')+(s.replayError?' / 観戦記録の転送障害（確定結果は維持）':'');
 q('#phaseTitle').textContent=s.phase==='lobby'?'参加者待ち':s.phase==='predict'?'みんなで予想':s.phase==='locked'?'予想締切・戦闘記録を準備':s.phase==='battle'?(multiPlayback?'同じ戦闘記録を観戦':'戦闘記録を受信中'):s.phase==='stopped'?'通信を停止しました':'今回の結果';
 q('#hits').textContent=currentWallet().correctCount+' / '+(s.phase==='result'||s.phase==='settle'?round:round-1);if(!player){q('#balance').textContent='—';q('#profit').textContent='—';q('#hits').textContent='観戦';}
 if(s.phase==='result'||s.phase==='settle'){
  q('#message').textContent=s.winner==='invalid'?'戦闘が無効（ホスト確定通知）':s.winner==='draw'?'引き分け':(s.winner==='A'?'左':'右')+'の勝利';
  const ranks=(s.wallets||[]).slice().sort((a,b)=>b.score-a.score);
  let prior=null,rankNo=0;
  q('#breakdown').textContent=ranks.map((p,i)=>{if(p.score!==prior)rankNo=i+1;prior=p.score;return rankNo+'位 '+(p.playerId===multiUser?'あなた':p.playerId)+'：純益 '+credits(p.score)+' / 残高 '+p.balance+' G / 正解 '+p.correctCount;}).join('\n');
  q('#next').hidden=!multiHost;q('#next').disabled=s.phase!=='result';q('#next').textContent=round>=TOTAL_ROUNDS?'10戦終了・ひとり用へ戻る':'ホスト：次の戦いへ';
 }
 if(s.phase==='battle'){const clock=multiSession.getPlaybackClock();if(!clock.ready)q('#phaseTitle').textContent=clock.status==='waiting-replay'?'戦闘記録を受信中':'観戦の時計を確認中';else if(clock.status==='waiting-start')q('#phaseTitle').textContent='共有開始時刻を待っています';q('#roomStatus').textContent+=' / '+(clock.ready?'共有時刻で再生（推定誤差±'+Math.round(clock.uncertaintyMs||0)+'ms）':'時計または記録の確認待ち');}
 if(s.phase==='stopped'){q('#comparison').hidden=true;q('#battle').hidden=true;q('#resultPanel').hidden=true;q('#roomStatus').textContent='停止：'+s.stoppedReason+'。未精算の予約は差し引きません。退出して戻れます。';}
}
update=function(){if(multiRecording)return;if(multiSession)displayMultiState();else soloUpdate();};
function onMultiChange(s){if(s.phase==='predict'||s.phase==='result'||s.phase==='settle')multiShownWallets=s.wallets;if(s.phase==='battle'&&multiSnapshot?.phase!=='battle')multiBattleWaitAt=Date.now();multiSnapshot=s;if(s.roundId!==multiRoundSeen){multiRoundSeen=s.roundId;resetMultiRound();if(!multiHost&&s.matchup?.units){units=JSON.parse(JSON.stringify(s.matchup.units));initialUnits=JSON.parse(JSON.stringify(units));initialKinds=[0,1].map(side=>units.filter(u=>u.side===side).map(u=>u.k));configureFixedCamera();}}if(multiSession)displayMultiState();}
function resetMultiRound(){multiLastSceneTick=0;multiPredictionPending=false;multiReplay=null;multiPlayback=null;multiPlaybackStarted=0;selectedSide=null;selectedStake=0;}
function publicMatchup(){return {engineVersion:CompactReplay.COMPACT_VERSION,runMode:RUN_MODE,totalRounds:TOTAL_ROUNDS,units:units.map(u=>({id:u.id,side:u.side,k:u.k,x:u.x,y:u.y,hp:u.hp,dead:false})),maxInitialUnits:128,maxActiveUnits:128,maxCreatedEntities:512};}
function openMultiRound(){
 if(!multiHost||!multiSession)return;const s=multiSession.getState();if(!['lobby','result'].includes(s.phase)||s.roundId>=TOTAL_ROUNDS)return;
 const nextRound=s.roundId===null?1:s.roundId+1;const priorWorld={round,carryStreak,pendingCarryKinds,initialKinds,initialUnits,previousArmyKinds,leftArmyCost,leftArmyCount,openingPlan,units,shots,elapsed,choice,winner,state,seed,visualTime,visualUnits,activeEffects,newEffects,effectClockTick,last,acc,selectedSide,selectedStake,multiInitial,multiRoundSeen,multiLastSceneTick,multiPredictionPending,multiReplay,multiPlayback,multiPlaybackStarted,multiRecording,pendingSummons,combatEvents,cameraZoom,cameraX,cameraY,cameraDrag,cameraFitScale,cameraFitBounds,budgets:budgets.slice()};
 try{carryStreak=s.phase==='result'?(s.winner==='A'?carryStreak+1:s.winner==='B'?1:0):0;pendingCarryKinds=s.phase==='result'&&(s.winner==='A'||s.winner==='B')?multiInitial.filter(u=>u.side===(s.winner==='A'?0:1)).map(u=>u.k):null;round=nextRound;resetMultiRound();multiRecording=true;try{setup((Math.random()*4294967296)>>>0)}finally{multiRecording=false}round=nextRound;multiRoundSeen=round;multiInitial=JSON.parse(JSON.stringify(units));
 multiSession.openRound({roundId:round,durationMs:30000,matchup:publicMatchup()});multiSnapshot=multiSession.getState();displayMultiState();
 }catch(error){const current=multiSession.getState();if(current.roundId!==nextRound||current.phase!=='predict'){({round,carryStreak,pendingCarryKinds,initialKinds,initialUnits,previousArmyKinds,leftArmyCost,leftArmyCount,openingPlan,units,shots,elapsed,choice,winner,state,seed,visualTime,visualUnits,activeEffects,newEffects,effectClockTick,last,acc,selectedSide,selectedStake,multiInitial,multiRoundSeen,multiLastSceneTick,multiPredictionPending,multiReplay,multiPlayback,multiPlaybackStarted,multiRecording,pendingSummons,combatEvents,cameraZoom,cameraX,cameraY,cameraDrag,cameraFitScale,cameraFitBounds,budgets}=priorWorld);}throw error;}
}
let replayJobToken=0;
function cancelReplayJob(){replayJobToken++;multiRecording=false;multiBusy=false;if(typeof battleAudio!=='undefined')audioCall(()=>battleAudio.setSuppressed(false));}
function createCanonicalRecording(){
 units=JSON.parse(JSON.stringify(multiInitial));pendingSummons=[];shots=[];elapsed=0;visualTime=0;visualUnits=new WeakMap();activeEffects=[];newEffects=[];effectClockTick=0;state='fight';winner=null;choice=null;
 const recorder=CompactReplay.createCompactRecorder(),read=()=>({units,shots,poseFor:baseSpriteFrame,facingFor:u=>visualFor(u).face,movingFor:u=>visualFor(u).moving,effects:newEffects,statusFor:u=>CompactReplay.fourSpeciesPresentationFlags(u,elapsed,visualFor(u).moving)});let recordingError=null;
 try{recorder.capture(0,read());}catch(e){if(e.message!=='replay-byte-cap')throw e;recordingError=e.message;}
 return {capture(tick){if(recordingError)throw Error(recordingError);recorder.capture(tick,read(),state==='result');},finish({ticks,recordingError:laterError}){const outcome=winner===null?'draw':winner===0?'A':'B';recordingError=recordingError||laterError;
  if(!recordingError){try{const replay=recorder.finish({ticks,winner:outcome});replay.geometry={field:[480,538],radii:{...RADII},reach:{...REACH},layers:Object.fromEntries(Object.keys(TYPES).map(k=>[k,TYPES[k].collisionLayer])),activePerTeam:TEAM_CAP,maxCreatedEntities:512};CompactReplay.createPlayback(replay);return replay;}catch(e){if(e.message!=='replay-byte-cap')throw e;recordingError=e.message;}}
  return {engineVersion:CompactReplay.COMPACT_VERSION,ticks,winner:outcome,events:[],unavailable:'replay-byte-cap'};
 }};
}
function buildCanonicalReplay(){
 multiRecording=true;try{const job=createCanonicalRecording();let ticks=0,recordingError=null;while(state==='fight'&&ticks<3601){spriteStep(1/60);ticks++;if(!recordingError)try{job.capture(ticks);}catch(e){if(e.message!=='replay-byte-cap')throw e;recordingError=e.message;}}if(state==='fight')throw Error('replay-tick-limit');return job.finish({ticks,recordingError});}finally{multiRecording=false;}
}
async function buildCanonicalReplayAsync({shouldCancel=()=>false,yieldControl,now}={}){
 const token=replayJobToken;multiRecording=true;
 try{const job=createCanonicalRecording();return await FixedTickJob.runFixedTickJob({step:()=>spriteStep(1/60),done:()=>state!=='fight',onCapture:tick=>job.capture(tick),finish:meta=>job.finish(meta),shouldCancel:()=>token!==replayJobToken||shouldCancel(),...(yieldControl?{yieldControl}:{}),now:now||(()=>typeof performance!=='undefined'?performance.now():Date.now()),maxSliceMs:8,maxStepsPerSlice:16,maxTicks:3601});}finally{if(token===replayJobToken)multiRecording=false;}
}
function startAsyncHostReplay(){
 const owner=multiSession,token=++replayJobToken;multiBusy=true;
 document.querySelector('#battle').hidden=false;document.querySelector('#battleControls').hidden=true;document.querySelector('#comparison').hidden=true;document.querySelector('#roomStatus').textContent='対戦準備中…';draw();
 if(typeof battleAudio!=='undefined')audioCall(()=>battleAudio.setSuppressed(true));
 void buildCanonicalReplayAsync({shouldCancel:()=>multiSession!==owner||owner.getState().phase!=='locked'}).then(replay=>{if(token===replayJobToken&&multiSession===owner&&owner.getState().phase==='locked')owner.startBattle(replay);}).catch(e=>{if(e.name!=='AbortError'&&token===replayJobToken){multiError=String(e.message);owner.close();}}).finally(()=>{if(token===replayJobToken){multiBusy=false;multiRecording=false;if(typeof battleAudio!=='undefined')audioCall(()=>battleAudio.setSuppressed(false));displayMultiState();}});
}

function preparePlayback(replay,now){
 multiReplay=replay;multiPlayback=CompactReplay.createPlayback(replay);multiPlaybackStarted=now;applyReplayFrame(0);
}
function applyReplayFrame(tick){
 tick=Math.max(multiLastSceneTick,tick);multiLastSceneTick=tick;
 const frame=multiPlayback.at(tick);units=frame.units;shots=frame.shots;activeEffects=frame.effects||[];effectClockTick=tick;
 for(const u of units)visualFor(u).face=u.face;
 draw();
}
startPrediction=function(skip=false){
 if(!multiSession)return soloStart(skip);
 const s=multiSession.getState();if(s.phase!=='predict'||multiPredictionPending||s.readyIds.includes(multiUser)||(!skip&&selectedSide===null))return;
 multiPredictionPending=multiSession.predict(skip?null:selectedSide===0?'A':'B',skip?0:selectedStake);
 if(mockGuest)mockGuest.predict('A',0);
 multiSnapshot=multiSession.getState();displayMultiState();
};
nextPrediction=function(){if(!multiSession){if(round>=sessionRoundLimit())submitFinalScore('replay');return soloNext();}if(multiSnapshot?.phase==='result'&&round>=TOTAL_ROUNDS){submitFinalScore('finish');void leaveMulti();return;}openMultiRound();};
document.querySelector('#confirm').onclick=()=>startPrediction();document.querySelector('#next').onclick=()=>nextPrediction();
function drainMock(){let n=0;while(mockQueue.length&&n++<10000){const [to,from,wire]=mockQueue.shift();to()?.receive(from,wire);}}
function pumpMulti(now){
 if(!multiSession)return;
 if(now-multiLastPump>=100){multiLastPump=now;drainMock();if(mockGuest?.getState().phase==='predict'&&!mockGuest.getState().readyIds.includes('mock-guest'))mockGuest.predict('A',0);drainMock();multiSession.tick();mockGuest?.tick();drainMock();}
 if(multiHost&&now-multiHeartbeat>=5000){multiHeartbeat=now;multiSession.heartbeat();drainMock();}
 multiSnapshot=multiSession.getState();const s=multiSnapshot;
 if(s.roundId!==multiRoundSeen){multiRoundSeen=s.roundId;resetMultiRound();if(!multiHost&&s.matchup?.units){units=JSON.parse(JSON.stringify(s.matchup.units));initialUnits=JSON.parse(JSON.stringify(units));initialKinds=[0,1].map(side=>units.filter(u=>u.side===side).map(u=>u.k));configureFixedCamera();}}
 if(multiHost&&s.phase==='locked'&&!multiBusy){if(typeof setTimeout==='function'){startAsyncHostReplay();return;}multiBusy=true;try{multiSession.startBattle(buildCanonicalReplay());}catch(e){multiError=String(e.message);multiSession.close();}finally{multiBusy=false;}return;}
 if(s.phase==='battle'){
  const replay=multiSession.getReplay();
  const playbackClock=multiSession.getPlaybackClock();
  if(multiHost&&!replay&&s.replayError){multiError='戦闘結果は確定済み・観戦記録を再生できません';multiSession.settleRound();multiSession.showResult();return;}
  if(replay&&!multiPlayback&&playbackClock.ready)try{preparePlayback(replay,now);}catch(e){multiError='再生形式エラー';multiSession.close();}
  if(multiPlayback&&playbackClock.ready){
   const tick=Math.min(multiReplay.ticks,Math.max(multiLastSceneTick,playbackClock.sceneTick));
   applyReplayFrame(tick);
   if(multiHost&&tick>=multiReplay.ticks)try{multiSession.settleRound();multiSession.showResult();}catch(e){if(e.message!=='replay-delivery-pending'){multiError=e.message;multiSession.close();}}
  }
 }
 if(multiHost&&s.phase==='settle')multiSession.showResult();
 displayMultiState();
}
loop=function(t){if(!multiSession)return soloLoop(t);pumpMulti(Date.now());requestAnimationFrame(loop)};
function beginMock(){
 if(multiSession||multiBusy||state==='fight')return;
 multiUser='you';multiHost=true;multiError='';multiLastPump=0;multiHeartbeat=0;multiRoundSeen=null;
 multiSession=MultiBinding.createWalletSession({roomId:'local-mock',sessionId:'quick10-mock-'+Date.now(),userId:'you',hostId:'you',members:['you','mock-guest'],send:wire=>mockQueue.push([()=>mockGuest,'you',wire]),onChange:onMultiChange});
 const sid=multiSession.getState().sessionId;
 mockGuest=MultiProtocol.createSession({roomId:'local-mock',sessionId:sid,userId:'mock-guest',hostId:'you',members:['you','mock-guest'],send:wire=>mockQueue.push([()=>multiSession,'mock-guest',wire])});
 multiSnapshot=multiSession.getState();multiSession.hello();drainMock();displayMultiState();
}
async function loadNativeSDK(){
 if(globalThis.AgentSDK?.room&&globalThis.AgentSDK?.user)return globalThis.AgentSDK;
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.gravity.place/fe/sdk/index-1.0.2.min.js';const timer=setTimeout(()=>reject(Error('SDK読み込みがタイムアウトしました')),15000);script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=()=>{clearTimeout(timer);reject(Error('SDKを読み込めません。ひとり用は利用できます。'))};document.head.appendChild(script);});
 if(!globalThis.AgentSDK?.room||!globalThis.AgentSDK?.user)throw Error('SDK未接続。GRAVITY内の対応環境が必要です。');
 return globalThis.AgentSDK;
}
async function enterNative(kind){
 if(multiBusy||multiSession||state==='fight')return;const roomId=document.querySelector('#roomId').value?.trim();if(kind==='join'&&!roomId){document.querySelector('#roomStatus').textContent='部屋IDを入力してください';return;}
 multiBusy=true;document.querySelector('#roomStatus').textContent='部屋へ接続しています…';
 try{
  if(!multiAdapter){const sdk=await loadNativeSDK();multiAdapter=await SDKAdapter.install({sdk,nonce:()=>crypto.randomUUID(),sessionFactory:MultiBinding.createWalletSession,onReaction:(sender,wire)=>receiveReaction(sender,wire),sessionOptions:{onChange:onMultiChange}});}
  nativeProfileVerified=true;multiUser=multiAdapter.userId;multiHost=kind==='create';multiError='';multiRoundSeen=null;multiPlayback=null;mockGuest=null;
  multiSession=kind==='create'?await multiAdapter.create():await multiAdapter.join(roomId);multiSnapshot=multiSession.getState();document.querySelector('#roomId').value=multiAdapter.getRoomId();displayMultiState();
 }catch(e){document.querySelector('#roomStatus').textContent=String(e.message)+' / オフラインひとり用は継続できます。';if(multiAdapter)document.querySelector('#exitRoom').hidden=false;}
 finally{multiBusy=false;}
}
async function leaveMulti(){cancelReplayJob();
 if(multiBusy)return;multiBusy=true;submitFinalScore('lobby');
 try{if(multiAdapter&&!mockGuest)await multiAdapter.exit();multiSession?.close();multiSession=null;mockGuest=null;mockQueue=[];multiSnapshot=null;multiPlayback=null;multiReplay=null;round=1;mistakes=0;correct=0;freshWallet();openPrediction((Math.random()*4294967296)>>>0);
 for(const id of ['#red','#blue','#next']){document.querySelector(id).disabled=false;document.querySelector(id).hidden=false;}
 document.querySelector('#pause').hidden=false;document.querySelector('#speed').hidden=false;document.querySelector('#exitRoom').hidden=true;document.querySelector('#beginRound').hidden=true;document.querySelector('#roomStatus').textContent='オフライン・ひとり用';update();
 }catch(e){document.querySelector('#roomStatus').textContent='退出失敗：'+e.message+'。もう一度退出してください。';}finally{multiBusy=false;}
}
document.querySelector('#mockRoom').onclick=beginMock;document.querySelector('#createRoom').onclick=()=>enterNative('create');document.querySelector('#joinRoom').onclick=()=>enterNative('join');
document.querySelector('#exitRoom').onclick=leaveMulti;document.querySelector('#beginRound').onclick=openMultiRound;
