
'use strict';
const Wallet=(()=>{
/** Deterministic host-authoritative game-credit ledger. No money, SDK or networking. */
const DEFAULT_CONFIG = Object.freeze({initialBalance:100, correctReward:10, stakeCap:50, winMultiplier:1, totalRounds:20, precision:0});
const fail = code => { throw new Error(code); };
const int = (value, code='INVALID_INTEGER') => { if (!Number.isSafeInteger(value) || value < 0) fail(code); return value; };
const id = value => { if(typeof value !== 'string' || !value.trim()) fail('INVALID_ID'); return value; };
const freeze = value => { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);} return value; };
const clone = state => JSON.parse(JSON.stringify(state));
const session = (state, sessionId) => { if(state.sessionId !== sessionId) fail('SESSION_MISMATCH'); };
const player = (state, playerId) => { const p=state.players.find(p=>p.playerId===playerId); if(!p) fail('UNKNOWN_PLAYER'); return p; };
const active = (state, roundId) => { if(!state.currentRound || state.currentRound.roundId!==roundId) fail('ROUND_NOT_ACTIVE'); return state.currentRound; };
function createSession({sessionId,playerIds,config={}}){
  id(sessionId);
  if(!Array.isArray(playerIds)||!playerIds.length) fail('PLAYERS_REQUIRED');
  playerIds.forEach(id); if(new Set(playerIds).size!==playerIds.length) fail('DUPLICATE_PLAYER');
  if(Object.keys(config).some(k=>!Object.hasOwn(DEFAULT_CONFIG,k))) fail('UNKNOWN_CONFIG');
  const c={...DEFAULT_CONFIG,...config}; Object.values(c).forEach(v=>int(v,'INVALID_CONFIG'));
  if(c.precision!==0) fail('INTEGER_CREDITS_ONLY');
  if(!c.totalRounds) fail('INVALID_CONFIG');
  if(!Number.isSafeInteger(c.stakeCap*c.winMultiplier)||!Number.isSafeInteger(c.initialBalance+c.totalRounds*(c.correctReward+c.stakeCap*c.winMultiplier))) fail('CONFIG_OVERFLOW');
  return freeze({schemaVersion:1,sessionId,config:c,players:playerIds.map(playerId=>({playerId,balance:c.initialBalance,score:0,correctCount:0})),currentRound:null,completedRounds:0,ledger:[]});
}
function openRound(state,{sessionId,roundId,deadline}){
  session(state,sessionId);int(roundId);int(deadline);
  if(state.currentRound?.roundId===roundId){if(state.currentRound.deadline!==deadline) fail('ROUND_CONFLICT'); return state;}
  if(state.currentRound) fail('ROUND_STILL_OPEN');
  if(roundId!==state.completedRounds+1 || roundId>state.config.totalRounds) fail('ROUND_OUT_OF_ORDER');
  const next=clone(state); next.currentRound={roundId,deadline,commits:[]}; return freeze(next);
}
function commitPrediction(state,{sessionId,roundId,playerId,side,stake=0,now}){
  session(state,sessionId);int(roundId);int(now); int(stake,'INVALID_STAKE');
  const p=player(state,playerId), r=active(state,roundId);
  if(!['A','B',null].includes(side)) fail('INVALID_SIDE');
  if(side===null && stake!==0) fail('SKIP_CANNOT_STAKE');
  const old=r.commits.find(c=>c.playerId===playerId);
  if(old){if(old.side===side && old.stake===stake) return state; fail('COMMIT_LOCKED');}
  if(now>=r.deadline) fail('COMMIT_DEADLINE');
  if(stake>Math.min(p.balance,state.config.stakeCap)) fail('STAKE_EXCEEDS_LIMIT');
  const next=clone(state);next.currentRound.commits.push({playerId,side,stake});return freeze(next);
}
function settleRound(state,{sessionId,roundId,outcome,now}){
  session(state,sessionId);int(roundId);int(now);
  if(!['A','B','draw','invalid'].includes(outcome)) fail('INVALID_OUTCOME');
  const old=state.ledger.find(e=>e.roundId===roundId);
  if(old){if(old.outcome!==outcome) fail('SETTLEMENT_CONFLICT');return state;}
  const r=active(state,roundId); if(now<r.deadline && r.commits.length!==state.players.length) fail('ROUND_NOT_CLOSED');
  const next=clone(state), entries=[];
  for(const p of next.players){
    const c=r.commits.find(c=>c.playerId===p.playerId), predicted=!!c?.side;
    const valid=outcome==='A'||outcome==='B';
    const correct=predicted && valid ? c.side===outcome : null;
    const stake=c?.stake??0;
    const delta=correct===true ? state.config.correctReward+stake*state.config.winMultiplier : correct===false ? -stake : 0;
    const before=p.balance;p.balance+=delta;p.score=p.balance-state.config.initialBalance;
    if(correct===true)p.correctCount++;
    if(!Number.isSafeInteger(p.balance)||p.balance<0||!Number.isSafeInteger(p.score)) fail('BALANCE_INVARIANT');
    entries.push({playerId:p.playerId,side:c?.side??null,submitted:!!c,stake,correct,delta,balanceBefore:before,balanceAfter:p.balance,scoreAfter:p.score});
  }
  next.ledger.push({sessionId,roundId,outcome,entries});next.completedRounds=roundId;next.currentRound=null;return freeze(next);
}
/** Stable roster: known identity resumes; an unknown identity is spectator, never newly funded. */
function reconnectPlayer(state,{sessionId,playerId}){
  session(state,sessionId);id(playerId);const p=state.players.find(p=>p.playerId===playerId);
  return freeze(p?{role:'player',...p}:{role:'spectator',playerId});
}
function walletView(state,playerId){
  const p=player(state,playerId),reserved=state.currentRound?.commits.find(c=>c.playerId===playerId)?.stake??0;
  return freeze({...p,reserved,available:p.balance-reserved,maxStake:Math.min(p.balance,state.config.stakeCap)});
}
/** Competition rank depends solely on signed profit; equal profits share rank. No SDK submission. */
function standings(state){
  const rows=state.players.map(p=>({...p})).sort((a,b)=>b.score-a.score || (a.playerId<b.playerId?-1:a.playerId>b.playerId?1:0));
  let rank=0;return freeze(rows.map((p,i)=>{if(i===0||p.score!==rows[i-1].score)rank=i+1;return{rank,...p};}));
}

return {DEFAULT_CONFIG,createSession,openRound,commitPrediction,settleRound,reconnectPlayer,walletView,standings};})();

const ReplayTransfer=(()=>{
/** Bounded, paced replay broadcast. FNV checksum is corruption detection, NOT authentication. */
const RAW_CHUNK_BYTES=6000, MAX_REPLAY_BYTES=2*1024*1024, TRANSFER_TIMEOUT_MS=120000;
const utf8=new TextEncoder();
function digest(bytes){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return `fnv1a32-${(h>>>0).toString(16).padStart(8,'0')}`;}
function base64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
function unbase64(s){if(typeof s!=='string'||s.length>8000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw new Error('invalid-chunk');return Uint8Array.from(atob(s),x=>x.charCodeAt(0));}
function packReplay(replay,battleId){const bytes=utf8.encode(JSON.stringify(replay));if(bytes.length>MAX_REPLAY_BYTES)throw new RangeError('replay-buffer-cap');const chunks=[];for(let i=0;i<bytes.length;i+=RAW_CHUNK_BYTES)chunks.push(base64(bytes.slice(i,i+RAW_CHUNK_BYTES)));return{meta:{battleId,digest:digest(bytes),totalBytes:bytes.length,totalChunks:chunks.length},chunks};}
function validMeta(m){return m&&typeof m.battleId==='string'&&m.battleId.length<=128&&/^fnv1a32-[0-9a-f]{8}$/.test(m.digest)&&Number.isSafeInteger(m.totalBytes)&&m.totalBytes>0&&m.totalBytes<=MAX_REPLAY_BYTES&&m.totalChunks===Math.ceil(m.totalBytes/RAW_CHUNK_BYTES);}
function createReceiver({meta,sendAck,onComplete}){
 if(!validMeta(meta))throw new Error('invalid-replay-meta');const chunks=new Map();let complete=null;
 return{receive(m){if(m.battleId!==meta.battleId||m.digest!==meta.digest||!Number.isSafeInteger(m.index)||m.index<0||m.index>=meta.totalChunks)return false;
 let data;try{data=unbase64(m.data);}catch{return false;}const size=m.index===meta.totalChunks-1?meta.totalBytes-m.index*RAW_CHUNK_BYTES:RAW_CHUNK_BYTES;if(data.length!==size||digest(data)!==m.chunkDigest)return false;
 const old=chunks.get(m.index);if(old&&base64(old)!==m.data)return false;chunks.set(m.index,data);
 if(chunks.size===meta.totalChunks&&!complete){const all=new Uint8Array(meta.totalBytes);for(let i=0;i<meta.totalChunks;i++)all.set(chunks.get(i),i*RAW_CHUNK_BYTES);if(digest(all)!==meta.digest)return false;
 try{complete=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{return false;}onComplete(complete);}
 sendAck({battleId:meta.battleId,digest:meta.digest,index:m.index});return true;},getReplay:()=>complete};
}
function createSender({packed,recipients,send,now=Date.now,intervalMs=100,retryMs=1000}){
 const ack=new Map(recipients.map(id=>[id,new Set()])),lastSent=new Map();const start=now();let lastPump=-Infinity,cursor=0;
 return{ack(sender,m){if(m.battleId!==packed.meta.battleId||m.digest!==packed.meta.digest||!ack.has(sender)||!Number.isSafeInteger(m.index)||m.index<0||m.index>=packed.chunks.length)return false;ack.get(sender).add(m.index);return true;},
 addRecipient(id){ack.set(id,new Set());},
 ready(ids=[...ack.keys()]){return ids.every(id=>ack.get(id)?.size===packed.chunks.length);},
 expired(){return now()-start>=TRANSFER_TIMEOUT_MS;},
 pump(){if(now()-lastPump<intervalMs)return false;for(let k=0;k<packed.chunks.length;k++){const index=(cursor+k)%packed.chunks.length;if([...ack.values()].every(s=>s.has(index)))continue;if(now()-(lastSent.get(index)??-Infinity)<retryMs)continue;cursor=(index+1)%packed.chunks.length;lastSent.set(index,now());lastPump=now();send({type:'replay-chunk',...packed.meta,index,chunkDigest:digest(unbase64(packed.chunks[index])),data:packed.chunks[index]});return true;}return false;}
 };
}

return {RAW_CHUNK_BYTES,MAX_REPLAY_BYTES,TRANSFER_TIMEOUT_MS,digest,packReplay,validMeta,createReceiver,createSender};})();
const MultiProtocol=(()=>{const {packReplay,validMeta,createSender,createReceiver}=ReplayTransfer;
/** Client-host coordination, NOT a trusted server or private transport. */
const PROTOCOL = 'gravity-prediction-battle';
const MAX_WIRE_BYTES = 48000; // conservative application cap, not verified SDK quota
const PHASES = ['lobby','predict','locked','battle','settle','result','stopped'];
const sid = x => typeof x === 'string' && x.length > 0 && x.length <= 128;
const integer = x => Number.isSafeInteger(x) && x >= 0;
const clone = x => JSON.parse(JSON.stringify(x));
const bytes = s => new TextEncoder().encode(s).length;
function encode(message) {
  const wire = JSON.stringify(message);
  if (bytes(wire) > MAX_WIRE_BYTES) throw new RangeError('wire-cap-exceeded');
  return wire;
}
function decode(wire) {
  if (typeof wire !== 'string' || bytes(wire) > MAX_WIRE_BYTES) return null;
  try { const m=JSON.parse(wire); return m && m.protocol===PROTOCOL && m.version===1 ? m : null; } catch { return null; }
}
function createSession({roomId, sessionId, userId, hostId, members=[], send,
  now=Date.now, validateBet=()=>true, settle=()=>null, onOpenRound=()=>{}, onAcceptBet=()=>{}, onChange=()=>{}, hostTimeoutMs=30000}) {
  if (![roomId,sessionId,userId,hostId].every(sid) || typeof send!=='function') throw new TypeError('identity/send required');
  const host=userId===hostId;
  const seats=[...new Set([hostId,...members])];
  if (seats.length>8 || !seats.every(sid)) throw new RangeError('maximum eight application seats');
  let state={sessionId,revision:host?0:-1,phase:'lobby',roundId:null,deadline:null,participants:seats,
    spectators:[],readyIds:[],bets:[],winner:null,replay:null,wallets:null,stoppedReason:null};
  let localSeq=0,lastHostSeen=now(),outgoing=null,incoming=null,canonicalReplay=null;
  const sequences=new Map(), privateBets=new Map(), settled=new Set();
  const envelope = body => ({protocol:PROTOCOL,version:1,roomId,sessionId,...body});
  const emit = body => {
    const wire=encode(envelope(body));
    try {const result=send(wire);if(result?.then)result.catch(()=>stop('transport-error'));return result;}
    catch {stop('transport-error');return null;}
  };
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
  }
  function receive(sender,wire){
    if(!sid(sender)||state.phase==='stopped')return false;
    const m=decode(wire);
    if(!m||m.roomId!==roomId||m.sessionId!==sessionId)return false;
    if(!host){
      if(sender!==hostId)return false;
      if(m.type==='replay-chunk')return incoming?.receive(m)??false;
      if(m.type!=='snapshot')return false;
      const s=m.state;
      if(!s||s.sessionId!==sessionId||!integer(s.revision)||!PHASES.includes(s.phase)||
        !Array.isArray(s.participants)||s.participants.length>8||!s.participants.every(sid)||
        new Set(s.participants).size!==s.participants.length||!s.participants.includes(hostId)||
        !Array.isArray(s.spectators)||!s.spectators.every(sid)||!Array.isArray(s.bets)||
        (s.phase==='predict'&&(!integer(s.deadline)||!integer(s.roundId))))return false;
      lastHostSeen=now(); // duplicate heartbeat is live, but never rewinds state
      if(s.revision<=state.revision)return true;
      if(s.replay&&!validMeta(s.replay))return false;
      if(s.replay&&s.replay.battleId!==state.replay?.battleId){canonicalReplay=null;incoming=createReceiver({meta:s.replay,sendAck:ack=>emit({type:'replay-ack',...ack}),onComplete:replay=>{canonicalReplay=replay;notify();}});}
      state=clone(s);notify();return true;
    }
    tick();
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
  return Object.freeze({
    receive,tick,getState:()=>clone(state),getReplay:()=>canonicalReplay?clone(canonicalReplay):null,
    isReplayDelivered:()=>host?!!outgoing?.ready(state.participants.filter(id=>id!==hostId)):!!canonicalReplay,
    getTransferStatus:()=>({ready:host?!!outgoing?.ready(state.participants.filter(id=>id!==hostId)):!!canonicalReplay,error:state.replayError||null,resultConfirmed:!!state.confirmedResult}),
    hello(){if(!host)emit({type:'hello'});else broadcast();},
    heartbeat(){if(host&&state.phase!=='stopped'){tick();broadcast();}},
    openRound({roundId,durationMs,matchup}){
      requireHost();if(!['lobby','result'].includes(state.phase)||!integer(roundId)||roundId<1||settled.has(roundId)||!integer(durationMs)||durationMs<1)throw new Error('invalid-round');
      const deadline=now()+durationMs;if(!integer(deadline))throw new Error('invalid-clock');
      // Matchup must contain public army configuration only; do not send future seed.
      encode(envelope({type:'snapshot',state:{...state,matchup}}));
      const prepared=onOpenRound({sessionId,roundId,deadline});
      commit({phase:'predict',roundId,deadline,matchup:clone(matchup),readyIds:[],bets:[],winner:null,replay:null,replayError:null,confirmedResult:null,...(prepared?.wallets?{wallets:clone(prepared.wallets)}:{})},()=>{prepared?.commit?.();privateBets.clear();sequences.clear();outgoing=null;incoming=null;canonicalReplay=null;});
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
      const prepared=settle({sessionId,roundId:state.roundId,winner:replay.winner,bets:clone(state.bets),now:now()});
      if(prepared?.then)throw new Error('synchronous-settlement-required');
      const transfer=packed?createSender({packed,recipients:[...state.participants,...state.spectators].filter(id=>id!==hostId),send:emit,now}):null;
      commit({phase:'battle',replay:packed?{...packed.meta,engineVersion:replay.engineVersion,ticks:replay.ticks}:null,
        replayError,confirmedResult:{roundId:state.roundId,winner:replay.winner},wallets:clone(prepared?.wallets??null)},()=>{
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

return {PROTOCOL,MAX_WIRE_BYTES,encode,decode,createSession};})();
const MultiBinding=(()=>{const wallet=Wallet;const {createSession}=MultiProtocol;
/** Wallet roster is frozen at first prediction, not at initial room creation. */
function createWalletSession(options){
  let ledger=null,session;
  session=createSession({...options,
    onOpenRound(input){
      const base=ledger||wallet.createSession({sessionId:options.sessionId,playerIds:session.getState().participants,config:options.walletConfig});
      const next=wallet.openRound(base,input);return {wallets:next.players,commit:()=>{ledger=next;}};
    },
    validateBet(playerId,stake,side,roundId){
      if(!ledger)return false;
      try{wallet.commitPrediction(ledger,{sessionId:options.sessionId,roundId,playerId,stake,side,now:(options.now||Date.now)()});return true;}catch{return false;}
    },
    onAcceptBet(input){const next=wallet.commitPrediction(ledger,{...input,sessionId:options.sessionId});return {commit:()=>{ledger=next;}};},
    settle(input){const next=wallet.settleRound(ledger,{sessionId:input.sessionId,roundId:input.roundId,outcome:input.winner,now:input.now});return {wallets:next.players,commit:()=>{ledger=next;}};}
  });
  return Object.freeze({...session,getLedger:()=>ledger});
}

return {createWalletSession};})();
const SDKAdapter=(()=>{const {PROTOCOL,encode,decode,createSession}=MultiProtocol;
/** No native call happens until install / create / join is explicitly called. */
const installedRooms=new WeakSet();
async function install({sdk,nonce,sessionFactory=createSession,wait=ms=>new Promise(r=>setTimeout(r,ms)),discoveryMs=800,sessionOptions={}}) {
  if(typeof nonce!=='function')throw new TypeError('unique nonce factory required');
  if(installedRooms.has(sdk.room))throw new Error('adapter-already-installed');
  const profile=await sdk.user.getMyUserInfo();
  if(profile?.errno!==0||!profile.data?.user_id)throw new Error('profile-unavailable');
  const userId=String(profile.data.user_id);
  let session=null,roomId=null,hostId=null,sessionId=null,discovery=null,pending=false,nativeJoined=false;
  const send=async message=>{try{const r=await sdk.room.sendMessage({message});if(r?.errno!==undefined&&r.errno!==0)throw new Error('send-failed');return r;}catch(error){session?.close();return {errno:-1,error:String(error)};}};
  const control=body=>send(encode({protocol:PROTOCOL,version:1,roomId,...body}));
  const tickets=new Map();
  // Install once per adapter. SDK unsubscribe availability is not established.
  installedRooms.add(sdk.room);
  sdk.room.receiveMessage(payload=>{
    const d=payload?.data;if(!d||!roomId)return;
    if(d.room_id!==undefined&&String(d.room_id)!==roomId)return;
    const sender=String(d.user_id||'');
    if(payload.type==='aitools_game_exitroom'){
      // Never apply unscoped departure: it can be a delayed previous-room event.
      if(d.room_id!==undefined)session?.memberLeft(sender);return;
    }
    if(payload.type!=='aitools_game_sendmsg')return;
    const m=decode(d.msg_data);if(!m||m.roomId!==roomId||!sender)return;
    if(m.type==='discover'&&hostId===userId&&typeof m.nonce==='string'){
      if(tickets.size>=16&&!tickets.has(sender))return;
      const ticket=nonce();tickets.set(sender,{nonce:m.nonce,ticket});
      void control({type:'claim',nonce:m.nonce,ticket,sessionId});return;
    }
    if(m.type==='claim'&&discovery&&m.nonce===discovery.nonce&&discovery.roster.has(sender)){
      discovery.claims.set(sender,m);
      if(hostId&&sender!==hostId)session?.close();return;
    }
    if(m.type==='confirm'&&hostId===userId){
      const t=tickets.get(sender);
      if(t&&m.ticket===t.ticket&&m.nonce===t.nonce&&m.sessionId===sessionId){
        tickets.delete(sender);session.receive(sender,encode({...m,type:'hello'}));
      }return;
    }
    // Unknown senders cannot use hello to bypass admission confirmation.
    if(m.type==='hello'&&hostId===userId&&!session?.getState().participants.includes(sender)&&!session?.getState().spectators.includes(sender))return;
    session?.receive(sender,d.msg_data);
  });
  async function enter(kind,id,permission=0){
    if(pending||nativeJoined)throw new Error('already-entered-or-pending');
    pending=true;
    try{
      const r=await (kind==='create'?sdk.room.create({max_players:8,room_permission:permission}):sdk.room.join({room_id:id}));
      if(r?.errno!==0)throw new Error('entry-failed');nativeJoined=true;
      roomId=String(r.data?.room_id||id||'');if(!roomId)throw new Error('room-id-missing');
      const roster=(r.data?.user_list||[]).map(x=>String(x.user_id));
      if(kind==='create'){hostId=userId;sessionId=nonce();}
      else{
        discovery={nonce:nonce(),roster:new Set(roster.filter(x=>x!==userId)),claims:new Map()};
        await control({type:'discover',nonce:discovery.nonce});await wait(discoveryMs);
        if(discovery.claims.size!==1)throw new Error('host-discovery-ambiguous-or-unavailable');
        [hostId]=discovery.claims.keys();sessionId=discovery.claims.get(hostId).sessionId;
      }
      session=sessionFactory({...sessionOptions,roomId,sessionId,userId,hostId,members:roster,send});
      if(kind==='join')await control({type:'confirm',sessionId,nonce:discovery.nonce,ticket:discovery.claims.get(hostId).ticket});
      session.hello();return session;
    }catch(error){
      // Preserve nativeJoined on failed cleanup: a later exit retry is required.
      if(nativeJoined){try{const r=await sdk.room.exit();if(r?.errno===0)nativeJoined=false;}catch{}}
      session?.close();session=null;throw error;
    }finally{pending=false;}
  }
  return Object.freeze({userId,
    create(permission=0){if(![0,1].includes(permission))throw new Error('invalid-permission');return enter('create',null,permission);},
    join(id){if(typeof id!=='string'||!id)throw new Error('invalid-room-id');return enter('join',id);},
    async exit(){if(pending)throw new Error('entry-pending');const r=await sdk.room.exit();if(r?.errno!==0)throw new Error('exit-failed');nativeJoined=false;session?.close();session=null;roomId=null;tickets.clear();discovery=null;},
    async list(){return sdk.room.getPublicRoomList();},
    getRoomId:()=>roomId,getSession:()=>session
  });
}

return {install};})();
const CompactReplay=(()=>{
/** Host-only sampling. Integer display coordinates; no quantization of simulation. */
const COMPACT_VERSION='v5-collision-sparse10fps-tick-events-v1';
const ROLES=['sword','shield','spear','archer','cannon','rider','healer'];
function createCompactRecorder({positionEvery=6,maxUnits=16}={}){
 let initial=null,previous=new Map(),lastShots='',lastTick=-1;const events=[];
 return {capture(tick,{units,shots,poseFor=()=>0,facingFor=u=>u.side?-1:1,movingFor=()=>false},force=false){
  if(!Number.isInteger(tick)||tick<0||tick>3601||tick<lastTick||units.length>maxUnits)throw Error('invalid-capture');
  const rows=units.slice().sort((a,b)=>a.id-b.id).map(u=>[u.id,u.side,ROLES.indexOf(u.k),Math.round(u.x),Math.round(u.y),Math.round(u.hp*100)/100,u.dead?1:0,movingFor(u)&&poseFor(u)<3?-1:poseFor(u),facingFor(u)]);
  if(!initial){initial=rows;for(const row of rows)previous.set(row[0],row.slice());lastTick=tick;events.push([tick,[],[]]);return}
  const updates=[];
  for(const row of rows){const prior=previous.get(row[0]);if(!prior)throw Error('roster-change');let mask=0,values=[];
   for(let col=3;col<9;col++){if(col<5&&!force&&tick%positionEvery!==0)continue;if(row[col]!==prior[col]){mask|=1<<(col-3);values.push(row[col]);prior[col]=row[col]}}
   if(mask)updates.push([row[0],mask,...values]);
  }
  let sample=null;
  if(force||tick%positionEvery===0||shots.length!==JSON.parse(lastShots||'[]').length){
   const current=shots.map(s=>[s.side,Math.round(s.x),Math.round(s.y)]),encoded=JSON.stringify(current);
   if(encoded!==lastShots){sample=current;lastShots=encoded}
  }
  if(updates.length||sample!==null||force)events.push([tick,updates,sample]);lastTick=tick;
 },finish({ticks,winner}){
  if(!initial||lastTick!==ticks||!['A','B','draw'].includes(winner))throw Error('invalid-finish');
  if(events.at(-1)[0]!==ticks)events.push([ticks,[],null]);
  return {engineVersion:COMPACT_VERSION,ticks,winner,initial,events,positionEvery};
 }};
}
function createPlayback(replay){
 if(!replay||replay.engineVersion!==COMPACT_VERSION||!Number.isInteger(replay.ticks)||replay.ticks<0||replay.ticks>3601||!Array.isArray(replay.initial)||replay.initial.length>16||!Array.isArray(replay.events)||replay.events.length>3602)throw Error('invalid-replay');
 const rows=new Map();
 const validRow=u=>u.length===9&&u.every(Number.isFinite)&&Number.isInteger(u[0])&&u[0]>=0&&[0,1].includes(u[1])&&Number.isInteger(u[2])&&u[2]>=0&&u[2]<ROLES.length&&Math.abs(u[3])<=10000&&Math.abs(u[4])<=10000&&Math.abs(u[5])<=100000&&[0,1].includes(u[6])&&Number.isInteger(u[7])&&u[7]>=-1&&u[7]<=8&&[-1,1].includes(u[8]);
 for(const row of replay.initial){
  if(!Array.isArray(row)||!validRow(row)||row.length!==9||!row.every(Number.isFinite)||rows.has(row[0])||![0,1].includes(row[1])||!Number.isInteger(row[2])||row[2]<0||row[2]>=ROLES.length)throw Error('invalid-unit');
  rows.set(row[0],row.slice());
 }
 const checkRows=new Map([...rows].map(([id,row])=>[id,row.slice()]));
 let last=-1;
 for(const e of replay.events){
  if(!Array.isArray(e)||e.length!==3||!Number.isInteger(e[0])||e[0]<=last||e[0]>replay.ticks||!Array.isArray(e[1])||e[1].length>16)throw Error('invalid-event');
  for(const d of e[1])if(!Array.isArray(d)||!rows.has(d[0])||!Number.isInteger(d[1])||d[1]<1||d[1]>63||d.length!==2+d[1].toString(2).replace(/0/g,'').length||!d.every(Number.isFinite))throw Error('invalid-delta');
  for(const d of e[1]){const row=checkRows.get(d[0]);let j=2;for(let bit=0;bit<6;bit++)if(d[1]&(1<<bit))row[bit+3]=d[j++];if(!validRow(row))throw Error('invalid-delta-value');}
  if(e[2]!==null&&(!Array.isArray(e[2])||e[2].length>1024||e[2].some(s=>!Array.isArray(s)||s.length!==3||!s.every(Number.isFinite)||![0,1].includes(s[0]))))throw Error('invalid-shots');
  last=e[0];
 }
 if(replay.events[0]?.[0]!==0||last!==replay.ticks)throw Error('invalid-boundaries');
 let cursor=0,shots=[],lastTick=-1;
 return {at(tick){
  if(!Number.isFinite(tick)||tick<lastTick)throw Error('playback-cannot-rewind');lastTick=tick;
  while(cursor<replay.events.length&&replay.events[cursor][0]<=tick){
   const e=replay.events[cursor++];for(const d of e[1]){const row=rows.get(d[0]);let j=2;for(let bit=0;bit<6;bit++)if(d[1]&(1<<bit))row[bit+3]=d[j++];}
   if(e[2]!==null)shots=e[2];
  }
  return {units:[...rows.values()].map(u=>({id:u[0],side:u[1],k:ROLES[u[2]],x:u[3],y:u[4],hp:u[5],dead:!!u[6],pose:u[7]<0?([1,0,2,0][Math.floor((tick*1000/60)%350/87.5)]):u[7],face:u[8]})),shots:shots.map(s=>({side:s[0],x:s[1],y:s[2]}))};
 }};
}

return {COMPACT_VERSION,ROLES,createCompactRecorder,createPlayback};})();

const TYPES={sword:{name:'剣士',hp:100,dmg:17,range:25,rate:1.0,speed:32},shield:{name:'盾兵',hp:170,dmg:10,range:23,rate:1.2,speed:23,armor:.55},spear:{name:'槍兵',hp:85,dmg:18,range:44,rate:1.25,speed:27},archer:{name:'弓兵',hp:60,dmg:14,range:150,rate:1.25,speed:24,projectile:true},cannon:{name:'砲兵',hp:72,dmg:23,range:125,rate:2.2,speed:19,projectile:true,splash:38},rider:{name:'騎兵',hp:230,dmg:38,range:27,rate:1.15,speed:45},healer:{name:'治療兵',hp:65,dmg:7,range:90,rate:1.35,speed:24,heal:13}};
const keys=Object.keys(TYPES), canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');let speed=1,paused=false;let round=1,mistakes=0,correct=0,state='choose',choice=null,seed=123,units=[],shots=[],elapsed=0,last=0,acc=0,frame=0, winner=null;
function rng(s){return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
let budgets=[];const COST={sword:3,shield:4,spear:3,archer:3,cannon:6,rider:8,healer:4};
// Optional opening generator: not installed in index.html by this candidate.
// Uses existing combat stats/costs. No simulation, player choice or winner input.
function generateEarlyArmies(seed){
 const costs={sword:3,shield:4,spear:3,archer:3,rider:8};
 const pool=Object.keys(costs);let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const a=pool[Math.floor(random()*pool.length)],others=pool.filter(k=>k!==a),b=others[Math.floor(random()*others.length)],options=[];
 for(let na=2;na<=8;na++)for(let nb=2;nb<=8;nb++)if(na*costs[a]===nb*costs[b]&&na*costs[a]>=12&&na*costs[a]<=24)options.push([na,nb]);
 const [na,nb]=options[Math.floor(random()*options.length)];
 return {armies:[Array(na).fill(a),Array(nb).fill(b)],spent:[na*costs[a],nb*costs[b]],battleSeed:seed>>>0,costs};
}

let previousArmyKinds=[];
function makeArmy(r,side){
 const place=(k,i)=>({id:side*100+i,side,k,x:90+(i%4)*90,y:(side===0?120:418)+(side===0?1:-1)*Math.floor(i/4)*36,hp:TYPES[k].hp,cd:r()*.5,priority:r(),dead:false});
 if(round<=5){const plan=generateEarlyArmies(seed);budgets[side]={planned:plan.spent[side],spent:plan.spent[side]};return plan.armies[side].map(place)}
 let budget=12+Math.min(12,Math.floor((round-1)/2))+Math.floor(r()*5)-2,planned=budget,a=[];
 const pool=[...keys],maxKinds=round<=11?2:3,kindCount=1+Math.floor(r()*maxKinds),available=[];
 if(side===1&&previousArmyKinds.length===1)pool.splice(pool.indexOf(previousArmyKinds[0]),1);
 for(let i=0;i<kindCount&&pool.length;i++)available.push(pool.splice(Math.floor(r()*pool.length),1)[0]);
 while(budget>=3&&a.length<8){const options=available.filter(k=>COST[k]<=budget);if(!options.length)break;const k=options[Math.floor(r()*options.length)];budget-=COST[k];a.push(place(k,a.length))}
 budgets[side]={planned,spent:planned-budget};if(side===0)previousArmyKinds=[...new Set(a.map(u=>u.k))];return a;
}
function setup(s){seed=s>>>0;let r=rng(seed);units=[...makeArmy(r,0),...makeArmy(r,1)];shots=[];elapsed=0;choice=null;winner=null;state='choose';update();draw()}
function update(){document.querySelector('#status').textContent=`第 ${round} / 20 戦　残機 ${3-mistakes}`;for(let side=0;side<2;side++){let counts={};units.filter(u=>u.side===side).forEach(u=>counts[u.k]=(counts[u.k]||0)+1);document.querySelector(side?'#blueList':'#redList').textContent=Object.entries(counts).map(([k,n])=>`${TYPES[k].name} ×${n}`).join('　')}document.querySelector('#red').hidden=state!=='choose';document.querySelector('#blue').hidden=state!=='choose';document.querySelector('#next').hidden=state!=='result';document.querySelector('#next').textContent=mistakes>=3||round>=20?'もう一度':'次の戦いへ';document.querySelector('#pause').hidden=state!=='fight';document.querySelector('#speed').hidden=state!=='fight';document.querySelector('#pause').textContent=paused?'再開':'一時停止';document.querySelector('#speed').textContent='速度 '+speed+'×';document.querySelector('#message').textContent=state==='choose'?'勝つ側を選ぶと戦闘が始まります':state==='fight'?'戦闘中…':mistakes>=3?'終了：3回外れました。':round>=20?'全20戦終了！ 正解 '+correct+' 回':winner===null?'引き分け。失敗には数えません。':`${winner===0?'朱軍':'蒼軍'}の勝利！　${winner===choice?'予想的中':'予想は外れ'}`}

// Independent collision candidate. Circle footprints are gameplay geometry.
const RADII={sword:9,shield:12,spear:9,archer:8,cannon:14,rider:15,healer:8};
// Preserve roughly the old center-to-center engagement distances, but measure
// reach from body surfaces. Large bodies now occupy actual battlefield space.
const REACH={sword:6,shield:3,spear:25,archer:132,cannon:102,rider:4,healer:72};
for(const k of keys){TYPES[k].radius=RADII[k];TYPES[k].reach=REACH[k]}
function stableOrder(a,b){return (a.priority??0)-(b.priority??0)||a.k.localeCompare(b.k)||(a.id??0)-(b.id??0)}
function nearbyGrid(list,positions=null){
 const cells=new Map(),size=48;
 for(const u of list){const p=positions?positions.get(u):u,key=Math.floor(p.x/size)+','+Math.floor(p.y/size);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(u)}
 return (x,y)=>{const found=[],cx=Math.floor(x/size),cy=Math.floor(y/size);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const u of cells.get((cx+dx)+','+(cy+dy))||[])found.push(u);return found.sort(stableOrder)};
}
function snapPosition(v){return Math.round(v*4096)/4096}
function resolveBodies(alive,positions){
 // Jacobi: each pass reads one shared position state, sums both sides of every
 // unordered pair, then writes all bodies together. No sequential push bias.
 for(let pass=0;pass<8;pass++){
  const near=nearbyGrid(alive,positions),index=new Map(alive.map((u,i)=>[u,i])),delta=new Map(alive.map(u=>[u,{x:0,y:0}]));let maximum=0;
  for(const u of alive){const p=positions.get(u),ru=RADII[u.k];for(const v of near(p.x,p.y)){if(index.get(v)<=index.get(u))continue;const q=positions.get(v),rv=RADII[v.k],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),penetration=ru+rv-d;if(penetration<=.01)continue;maximum=Math.max(maximum,penetration);const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,iu=1/(ru*ru),iv=1/(rv*rv),a=delta.get(u),b=delta.get(v),correction=penetration+.005;a.x-=nx*correction*iu/(iu+iv);a.y-=ny*correction*iu/(iu+iv);b.x+=nx*correction*iv/(iu+iv);b.y+=ny*correction*iv/(iu+iv)}}
  for(const u of alive){const p=positions.get(u),d=delta.get(u),r=RADII[u.k],length=Math.hypot(d.x,d.y),scale=length>r*.5?r*.5/length:1;p.x=Math.max(r,Math.min(480-r,p.x+d.x*scale));p.y=Math.max(r,Math.min(538-r,p.y+d.y*scale));p.x=snapPosition(p.x);p.y=snapPosition(p.y)}
  if(maximum<.04)break;
 }
}
function step(dt){
 elapsed+=dt;const alive=units.filter(u=>!u.dead).sort(stableOrder),pending=new Map(),moves=new Map(),attacks=[],near=nearbyGrid(alive);
 function hit(u,n,ranged){pending.set(u,(pending.get(u)||0)-n*(ranged?(TYPES[u.k].armor||1):1))}
 for(const u of alive){
  if(u.originForward===undefined)u.originForward=u.y<=269?1:-1;
  const t=TYPES[u.k],enemies=alive.filter(v=>v.side!==u.side);moves.set(u,{x:u.x,y:u.y});if(!enemies.length)continue;
  const gap=v=>Math.hypot(v.x-u.x,v.y-u.y)-t.radius-RADII[v.k];let dist=Math.min(...enemies.map(gap));const target=enemies.filter(v=>Math.abs(gap(v)-dist)<1e-7).sort(stableOrder)[0];u.cd-=dt;
  if(t.heal){const hurt=alive.filter(v=>v.side===u.side&&v.hp<TYPES[v.k].hp&&Math.hypot(v.x-u.x,v.y-u.y)<90+1e-7);if(hurt.length&&u.cd<=0){hurt.sort((a,b)=>a.hp/TYPES[a.k].hp-b.hp/TYPES[b.k].hp||stableOrder(a,b));const v=hurt[0];pending.set(v,(pending.get(v)||0)+t.heal);u.cd=t.rate;continue}}
  if(dist>t.reach+1/2048){
   let dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d;
   // Local avoidance is a movement intention, evaluated from the same snapshot.
   // originForward transforms with a reflected battlefield, not iteration order.
   const blocked=near(u.x,u.y).some(v=>v!==u&&v!==target&&((v.x-u.x)*nx+(v.y-u.y)*ny)>0&&Math.hypot(v.x-u.x,v.y-u.y)<t.radius+RADII[v.k]+5);
   if(blocked){const turn=(u.priority??.25)<.5?-1:1,tx=ny*u.originForward*turn,ty=-nx*u.originForward*turn;nx+=tx*1.35;ny+=ty*1.35;const length=Math.hypot(nx,ny);nx/=length;ny/=length}
   const travel=Math.min(t.speed*dt,Math.max(0,dist-t.reach));moves.set(u,{x:u.x+nx*travel,y:u.y+ny*travel});
  }else if(u.cd<=0){u.cd=t.rate;attacks.push([u,target,t])}
 }
 for(const [u,target,t]of attacks){if(t.projectile)shots.push({side:u.side,x:u.x,y:u.y,target,damage:t.dmg,splash:t.splash||0});else hit(target,t.dmg,false)}
 resolveBodies(alive,moves);for(const u of alive){const p=moves.get(u);u.x=p.x;u.y=p.y}
 for(const s of shots){const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy);if(d<=210*dt+1e-7){if(s.splash){alive.filter(v=>v.side!==s.side&&Math.hypot(v.x-s.target.x,v.y-s.target.y)<=s.splash+1e-7).forEach(v=>hit(v,s.damage,true))}else if(!s.target.dead)hit(s.target,s.damage,true);s.done=true}else{s.x=snapPosition(s.x+dx/d*210*dt);s.y=snapPosition(s.y+dy/d*210*dt)}}
 shots=shots.filter(s=>!s.done);for(const [u,delta]of pending){u.hp=Math.min(TYPES[u.k].hp,u.hp+delta);if(u.hp<=0)u.dead=true}
 const a=units.some(u=>!u.dead&&u.side===0),b=units.some(u=>!u.dead&&u.side===1);if(!a||!b||elapsed>=60){winner=a&&!b?0:b&&!a?1:null;if(winner!==null){if(winner!==choice)mistakes++;else correct++}state='result';update()}
}

