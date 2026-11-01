import {createClockEstimator,sceneTickFromWallMs} from './clock-sync.mjs';
import {packReplay,validMeta,createSender,createReceiver} from './replay-transfer.mjs';
/** Client-host coordination, NOT a trusted server or private transport. */
export const GAME_MODE = 'GRAVITY_QUICK10_V1';
export const TOTAL_ROUNDS = 10;
export const PROTOCOL = 'gravity-prediction-battle-quick10-v1';
export const MAX_WIRE_BYTES = 48000; // conservative application cap, not verified SDK quota
const PHASES = ['lobby','predict','locked','battle','settle','result','stopped'];
const sid = x => typeof x === 'string' && x.length > 0 && x.length <= 128;
const integer = x => Number.isSafeInteger(x) && x >= 0;
const clone = x => JSON.parse(JSON.stringify(x));
const bytes = s => new TextEncoder().encode(s).length;
export function encode(message) {
  // New-protocol control messages (SDK discovery/confirmation) inherit this package's mode.
  // Old protocol names are never upgraded, and explicit incompatible modes stay incompatible.
  const tagged=message?.protocol===PROTOCOL&&message.mode===undefined?{...message,mode:GAME_MODE}:message;
  const wire = JSON.stringify(tagged);
  if (bytes(wire) > MAX_WIRE_BYTES) throw new RangeError('wire-cap-exceeded');
  return wire;
}
export function decode(wire) {
  if (typeof wire !== 'string' || bytes(wire) > MAX_WIRE_BYTES) return null;
  try { const m=JSON.parse(wire); return m && m.protocol===PROTOCOL && m.version===1 && m.mode===GAME_MODE ? m : null; } catch { return null; }
}
function validRoundResults(s){
 if(s.roundResults==null)return true;
 if(!s.confirmedResult||!Array.isArray(s.roundResults)||s.roundResults.length>8||!Array.isArray(s.wallets))return false;
 const seen=new Set(),winner=s.confirmedResult.winner;
 for(const e of s.roundResults){if(!e||!sid(e.playerId)||seen.has(e.playerId)||!['A','B',null].includes(e.side)||typeof e.submitted!=='boolean'||![true,false,null].includes(e.correct)||!Number.isSafeInteger(e.stake)||e.stake<0||!Number.isSafeInteger(e.delta)||!Number.isSafeInteger(e.balanceBefore)||e.balanceBefore<0||!Number.isSafeInteger(e.balanceAfter)||e.balanceAfter<0||!Number.isSafeInteger(e.scoreAfter)||e.balanceAfter-e.balanceBefore!==e.delta)return false;
  const p=s.wallets.find(p=>p.playerId===e.playerId);if(!p||p.balance!==e.balanceAfter||p.score!==e.scoreAfter)return false;
  const expected=(winner==='A'||winner==='B')&&e.side!==null?winner===e.side:null;if(e.correct!==expected||(e.correct===null&&e.delta!==0)||(e.correct===false&&e.delta>0)||(e.correct===true&&e.delta<0))return false;seen.add(e.playerId);
 }return true;
}
export function createSession({roomId, sessionId, userId, hostId, members=[], send, mode=GAME_MODE,
  now=Date.now, validateBet=()=>true, settle=()=>null, onOpenRound=()=>{}, onAcceptBet=()=>{}, onChange=()=>{}, hostTimeoutMs=30000}) {
  if(mode!==GAME_MODE)throw new Error('incompatible-game-mode');
  if (![roomId,sessionId,userId,hostId].every(sid) || typeof send!=='function') throw new TypeError('identity/send required');
  const host=userId===hostId;
  const seats=[...new Set([hostId,...members])];
  if (seats.length>8 || !seats.every(sid)) throw new RangeError('maximum eight application seats');
  let state={sessionId,mode:GAME_MODE,totalRounds:TOTAL_ROUNDS,revision:host?0:-1,phase:'lobby',roundId:null,deadline:null,participants:seats,
    spectators:[],readyIds:[],bets:[],winner:null,replay:null,wallets:null,roundResults:null,stoppedReason:null};
  let localSeq=0,lastHostSeen=now(),outgoing=null,incoming=null,canonicalReplay=null;
  const sequences=new Map(), privateBets=new Map(), settled=new Set();
  const envelope = body => ({protocol:PROTOCOL,version:1,mode:GAME_MODE,roomId,sessionId,...body});
  const emit = body => {
    const wire=encode(envelope(body));
    try {const result=send(wire);if(result?.then)result.catch(()=>stop('transport-error'));return result;}
    catch {stop('transport-error');return null;}
  };
  const clockEstimator=host?null:createClockEstimator({now,send:emit});
  function notify(){onChange(clone(state));}
  function requireHost(){if(!host||state.phase==='stopped')throw new Error('host-only-or-stopped');}
  function broadcast(){emit({type:'snapshot',state});}
  function commit(patch,apply=()=>{}){
    const next={...state,...patch,revision:state.revision+1};
    // Validate size before state mutation, including replay/wallet hooks.
    encode(envelope({type:'snapshot',state:next}));
    apply();state=next;notify();broadcast();
  }
  function stop(reason){if(state.phase==='stopped')return;state={...state,phase:'stopped',stoppedReason:reason};notify();}
  function closePrediction(){if(state.phase!=='predict')return;commit({phase:'locked',bets:[...privateBets.values()]});}
  function tick(){
    if(state.phase==='stopped')return;
    if(host){if(state.phase==='predict'&&now()>=state.deadline)closePrediction();if(['battle','settle','result'].includes(state.phase)&&outgoing){if(outgoing.expired()&&!outgoing.ready(state.participants.filter(id=>id!==hostId))){if(state.replayError!=='delivery-timeout')commit({replayError:'delivery-timeout'});}else outgoing.pump();}}
    else if(now()-lastHostSeen>=hostTimeoutMs)stop('host-timeout');
    else clockEstimator.probe();
  }
  function receive(sender,wire){
    if(!sid(sender)||state.phase==='stopped')return false;
    const m=decode(wire);
    if(!m||m.mode!==GAME_MODE||m.roomId!==roomId||m.sessionId!==sessionId)return false;
    if(!host){
      if(sender!==hostId)return false;
      if(m.type==='clock-reply'){if(m.targetId!==userId||!clockEstimator.accept(m))return false;lastHostSeen=now();notify();return true;}
      if(m.type==='replay-chunk')return incoming?.receive(m)??false;
      if(m.type!=='snapshot')return false;
      const s=m.state;
      if(!s||s.mode!==GAME_MODE||s.totalRounds!==TOTAL_ROUNDS||s.sessionId!==sessionId||!(s.roundId===null?['lobby','stopped'].includes(s.phase):(integer(s.roundId)&&s.roundId>=1&&s.roundId<=TOTAL_ROUNDS))||!integer(s.revision)||!PHASES.includes(s.phase)||(s.confirmedResult!=null&&(!integer(s.confirmedResult.roundId)||s.confirmedResult.roundId<1||s.confirmedResult.roundId>TOTAL_ROUNDS||s.confirmedResult.roundId!==s.roundId))||
        !Array.isArray(s.participants)||s.participants.length>8||!s.participants.every(sid)||
        new Set(s.participants).size!==s.participants.length||!s.participants.includes(hostId)||
        !Array.isArray(s.spectators)||!s.spectators.every(sid)||!Array.isArray(s.bets)||
        (s.phase==='predict'&&(!integer(s.deadline)||!integer(s.roundId))))return false;
      lastHostSeen=now(); // duplicate heartbeat is live, but never rewinds state
      if(!validRoundResults(s))return false;
      if(s.revision<=state.revision)return true;
      if(s.replay&&(!validMeta(s.replay)||!integer(s.replayStartAt)))return false;
      if(s.roundId!==state.roundId){canonicalReplay=null;incoming=null;}
      if(s.replay&&s.replay.battleId!==state.replay?.battleId){canonicalReplay=null;incoming=createReceiver({meta:s.replay,sendAck:ack=>emit({type:'replay-ack',...ack}),onComplete:replay=>{canonicalReplay=replay;notify();}});}
      state=clone(s);notify();return true;
    }
    tick();
    if(m.type==='clock-probe'){
      if(!state.participants.includes(sender)&&!state.spectators.includes(sender))return false;
      if(!sid(m.token)||!integer(m.clientTime))return false;
      emit({type:'clock-reply',targetId:sender,token:m.token,clientTime:m.clientTime,hostTime:now()});return true;
    }
    if(m.type==='replay-ack')return outgoing?.ack(sender,m)??false;
    if(m.type==='hello'){
      if(!state.participants.includes(sender)&&!state.spectators.includes(sender)){
        if(state.phase==='lobby'&&state.roundId===null&&state.participants.length<8){commit({participants:[...state.participants,sender]});return true;}
        // A new identity is never given a ranked seat after the first round.
        if(state.spectators.length>=8)return false;
        commit({spectators:[...state.spectators,sender]});
      } else broadcast();
      outgoing?.addRecipient(sender);
      return true;
    }
    if(m.type!=='bet'||state.phase!=='predict'||m.roundId!==state.roundId||
      !state.participants.includes(sender)||!integer(m.seq)||m.seq<1||
      m.seq<=(sequences.get(sender)||0)||privateBets.has(sender)||
      !['A','B',null].includes(m.side)||!integer(m.stake)||(m.side===null&&m.stake!==0))return false;
    // Never trust a userId inside payload. Only transport envelope identifies actor.
    if(m.userId!==undefined&&m.userId!==sender)return false;
    try {
      if(validateBet(sender,m.stake,m.side,state.roundId)!==true)return false;
      const prepared=onAcceptBet({playerId:sender,side:m.side,stake:m.stake,roundId:state.roundId,now:now()});
      commit({readyIds:[...privateBets.keys(),sender]},()=>{
        prepared?.commit?.();sequences.set(sender,m.seq);
        privateBets.set(sender,{userId:sender,side:m.side,stake:m.stake});
      });
    } catch { return false; }
    if(privateBets.size===state.participants.length)closePrediction();
    return true;
  }
  function getPlaybackClock(){
    const estimate=host?{known:true,estimatedHostNow:now(),uncertaintyMs:0,sampleAgeMs:0,status:'host-clock'}:clockEstimator.estimate();
    const startAt=integer(state.replayStartAt)?state.replayStartAt:null;
    const ready=estimate.known&&startAt!==null&&!!canonicalReplay&&state.phase!=='stopped';
    const sceneTick=ready?Math.min(canonicalReplay.ticks,Math.max(0,sceneTickFromWallMs(estimate.estimatedHostNow-startAt))):null;
    const status=state.phase==='stopped'?'stopped':!estimate.known?estimate.status:!canonicalReplay||startAt===null?'waiting-replay':estimate.estimatedHostNow<startAt?'waiting-start':sceneTick>=canonicalReplay.ticks?'finished':'playing';
    return {...estimate,startAt,ready,sceneTick,status};
  }
  return Object.freeze({
    getPlaybackClock,requestClockSync(){return host?false:clockEstimator.probe(true);},
    receive,tick,getState:()=>clone(state),getReplay:()=>canonicalReplay?clone(canonicalReplay):null,
    isReplayDelivered:()=>host?!!outgoing?.ready(state.participants.filter(id=>id!==hostId)):!!canonicalReplay,
    getTransferStatus:()=>({ready:host?!!outgoing?.ready(state.participants.filter(id=>id!==hostId)):!!canonicalReplay,error:state.replayError||null,resultConfirmed:!!state.confirmedResult}),
    hello(){if(!host){emit({type:'hello'});clockEstimator.probe(true);}else broadcast();},
    heartbeat(){if(host&&state.phase!=='stopped'){tick();broadcast();}},
    openRound({roundId,durationMs,matchup}){
      requireHost();if(!['lobby','result'].includes(state.phase)||!integer(roundId)||roundId<1||roundId>TOTAL_ROUNDS||roundId!==(state.roundId??0)+1||settled.has(roundId)||!integer(durationMs)||durationMs<1)throw new Error('invalid-round');
      const deadline=now()+durationMs;if(!integer(deadline))throw new Error('invalid-clock');
      // Matchup must contain public army configuration only; do not send future seed.
      encode(envelope({type:'snapshot',state:{...state,matchup}}));
      const prepared=onOpenRound({sessionId,roundId,deadline});
      commit({phase:'predict',roundId,deadline,matchup:clone(matchup),readyIds:[],bets:[],winner:null,replay:null,replayStartAt:null,replayError:null,confirmedResult:null,roundResults:null,...(prepared?.wallets?{wallets:clone(prepared.wallets)}:{})},()=>{prepared?.commit?.();privateBets.clear();sequences.clear();outgoing=null;incoming=null;canonicalReplay=null;});
    },
    predict(side,stake){
      tick();if(state.phase!=='predict')return false;
      const message=envelope({type:'bet',roundId:state.roundId,seq:++localSeq,side,stake});
      if(host)return receive(userId,encode(message));emit(message);return true;
    },
    startBattle(replay){
      requireHost();if(state.phase!=='locked')throw new Error('not-locked');
      // Canonical fixed-tick events/outcome, produced by a separate deterministic core.
      if(!replay||!sid(replay.engineVersion)||!integer(replay.ticks)||!['A','B','draw'].includes(replay.winner)||!Array.isArray(replay.events))throw new Error('invalid-replay');
      let packed=null,replayError=null;
      try{packed=packReplay(replay,`${sessionId}:${state.roundId}`);}catch(error){if(error.message!=='replay-buffer-cap')throw error;replayError='replay-buffer-cap';}
      const replayStartAt=now()+2000;if(!integer(replayStartAt))throw new Error('invalid-clock');
      const prepared=settle({sessionId,roundId:state.roundId,winner:replay.winner,bets:clone(state.bets),now:now()});
      if(prepared?.then)throw new Error('synchronous-settlement-required');
      const transfer=packed?createSender({packed,recipients:[...state.participants,...state.spectators].filter(id=>id!==hostId),send:emit,now}):null;
      commit({phase:'battle',replay:packed?{...packed.meta,engineVersion:replay.engineVersion,ticks:replay.ticks}:null,
        replayStartAt,replayError,confirmedResult:{roundId:state.roundId,winner:replay.winner},wallets:clone(prepared?.wallets??null),roundResults:clone(prepared?.roundResults??null)},()=>{
          prepared?.commit?.();settled.add(state.roundId);canonicalReplay=packed?clone(replay):null;outgoing=transfer;
        });
      outgoing?.pump();
    },
    settleRound(){
      requireHost();if(['settle','result'].includes(state.phase))return false;
      if(state.phase!=='battle'||!state.confirmedResult)throw new Error('not-battle');
      commit({phase:'settle',winner:state.confirmedResult.winner});return true;
    },
    showResult(){requireHost();if(state.phase!=='settle')throw new Error('not-settled');commit({phase:'result'});},
    memberLeft(id){if(id===hostId)stop('host-lost'); /* Other seats remain; no free reset. */},
    close(){stop('closed');}
  });
}
