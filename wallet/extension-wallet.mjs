/** Deterministic host-authoritative game-credit ledger. No money, SDK or networking. */
export const GAME_MODE = 'GRAVITY_SOLO_EXTEND_V1';
export const TOTAL_ROUNDS = 10;
export const LEDGER_RETENTION = 20, EXTENSION_RETENTION = 16;
export const DEFAULT_CONFIG = Object.freeze({initialBalance:100, correctReward:10, stakeCap:50, winMultiplier:1, totalRounds:10, precision:0});
const fail = code => { throw new Error(code); };
const int = (value, code='INVALID_INTEGER') => { if (!Number.isSafeInteger(value) || value < 0) fail(code); return value; };
const id = value => { if(typeof value !== 'string' || !value.trim()) fail('INVALID_ID'); return value; };
const freeze = value => { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);} return value; };
const clone = state => JSON.parse(JSON.stringify(state));
const modeState = state => {if(state?.mode!==GAME_MODE||state?.schemaVersion!==3||state?.config?.totalRounds!==TOTAL_ROUNDS)fail('INCOMPATIBLE_GAME_MODE');if(!Number.isSafeInteger(state.maxRounds)||state.maxRounds<TOTAL_ROUNDS||!Array.isArray(state.extensions))fail('INVALID_EXTENSION_STATE');};
const session = (state, sessionId) => { modeState(state); if(state.sessionId !== sessionId) fail('SESSION_MISMATCH'); };
const player = (state, playerId) => { const p=state.players.find(p=>p.playerId===playerId); if(!p) fail('UNKNOWN_PLAYER'); return p; };
const active = (state, roundId) => { if(!state.currentRound || state.currentRound.roundId!==roundId) fail('ROUND_NOT_ACTIVE'); return state.currentRound; };
export function createSession({sessionId,playerIds,config={},mode=GAME_MODE}){
  if(mode!==GAME_MODE)fail('INCOMPATIBLE_GAME_MODE');
  id(sessionId);
  if(!Array.isArray(playerIds)||!playerIds.length) fail('PLAYERS_REQUIRED');
  playerIds.forEach(id); if(new Set(playerIds).size!==playerIds.length) fail('DUPLICATE_PLAYER');
  if(Object.keys(config).some(k=>!Object.hasOwn(DEFAULT_CONFIG,k))) fail('UNKNOWN_CONFIG');
  const c={...DEFAULT_CONFIG,...config}; Object.values(c).forEach(v=>int(v,'INVALID_CONFIG'));
  if(c.precision!==0) fail('INTEGER_CREDITS_ONLY');
  if(c.totalRounds!==TOTAL_ROUNDS) fail('INCOMPATIBLE_ROUND_COUNT');
  if(!Number.isSafeInteger(c.stakeCap*c.winMultiplier)||!Number.isSafeInteger(c.initialBalance+c.totalRounds*(c.correctReward+c.stakeCap*c.winMultiplier))) fail('CONFIG_OVERFLOW');
  return freeze({schemaVersion:3,mode:GAME_MODE,sessionId,config:c,players:playerIds.map(playerId=>({playerId,balance:c.initialBalance,score:0,correctCount:0})),currentRound:null,completedRounds:0,maxRounds:TOTAL_ROUNDS,extensions:[],ledger:[]});
}
export function openRound(state,{sessionId,roundId,deadline}){
  session(state,sessionId);int(roundId);int(deadline);
  if(state.currentRound?.roundId===roundId){if(state.currentRound.deadline!==deadline) fail('ROUND_CONFLICT'); return state;}
  if(state.currentRound) fail('ROUND_STILL_OPEN');
  if(roundId!==state.completedRounds+1 || roundId>state.maxRounds) fail('ROUND_OUT_OF_ORDER');
  const next=clone(state); next.currentRound={roundId,deadline,commits:[]}; return freeze(next);
}
export function commitPrediction(state,{sessionId,roundId,playerId,side,stake=0,now}){
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
export function settleRound(state,{sessionId,roundId,outcome,now}){
  session(state,sessionId);int(roundId);int(now);
  if(!['A','B','draw','invalid'].includes(outcome)) fail('INVALID_OUTCOME');
  const old=state.ledger.find(e=>e.roundId===roundId);
  if(old){if(old.outcome!==outcome) fail('SETTLEMENT_CONFLICT');return state;}
  if(roundId<=state.completedRounds)fail('SETTLEMENT_HISTORY_EXPIRED');
  const r=active(state,roundId); if(now<r.deadline && r.commits.length!==state.players.length) fail('ROUND_NOT_CLOSED');
  const next=clone(state), entries=[];
  for(const p of next.players){
    const c=r.commits.find(c=>c.playerId===p.playerId), predicted=!!c?.side;
    const valid=outcome==='A'||outcome==='B';
    const correct=predicted && valid ? c.side===outcome : null;
    const stake=c?.stake??0;
    const delta=roundId>TOTAL_ROUNDS&&stake===0?0:correct===true ? (roundId<=TOTAL_ROUNDS?state.config.correctReward:0)+stake*state.config.winMultiplier : correct===false ? -stake : 0;
    const before=p.balance;p.balance+=delta;p.score=p.balance-state.config.initialBalance;
    if(correct===true)p.correctCount++;
    if(!Number.isSafeInteger(p.balance)||p.balance<0||!Number.isSafeInteger(p.score)||!Number.isSafeInteger(p.correctCount)) fail('BALANCE_INVARIANT');
    entries.push({playerId:p.playerId,side:c?.side??null,submitted:!!c,stake,correct,delta,balanceBefore:before,balanceAfter:p.balance,scoreAfter:p.score});
  }
  next.ledger.push({sessionId,roundId,outcome,entries});if(next.ledger.length>LEDGER_RETENTION)next.ledger.splice(0,next.ledger.length-LEDGER_RETENTION);next.completedRounds=roundId;next.currentRound=null;return freeze(next);
}
/** Stable roster: known identity resumes; an unknown identity is spectator, never newly funded. */
export function reconnectPlayer(state,{sessionId,playerId}){
  session(state,sessionId);id(playerId);const p=state.players.find(p=>p.playerId===playerId);
  return freeze(p?{role:'player',...p}:{role:'spectator',playerId});
}
export function walletView(state,playerId){
  modeState(state);
  const p=player(state,playerId),reserved=state.currentRound?.commits.find(c=>c.playerId===playerId)?.stake??0;
  return freeze({...p,reserved,available:p.balance-reserved,maxStake:Math.min(p.balance,state.config.stakeCap)});
}
/** Competition rank depends solely on signed profit; equal profits share rank. No SDK submission. */
export function standings(state){
  modeState(state);
  const rows=state.players.map(p=>({...p})).sort((a,b)=>b.score-a.score || (a.playerId<b.playerId?-1:a.playerId>b.playerId?1:0));
  let rank=0;return freeze(rows.map((p,i)=>{if(i===0||p.score!==rows[i-1].score)rank=i+1;return{rank,...p};}));
}

/** Explicit solo continuation only at the closed current boundary. No money is granted. */
export function extendSession(state,{sessionId,requestId,roundId,additionalRounds}){
  session(state,sessionId);id(requestId);int(roundId);int(additionalRounds);
  if(![5,10].includes(additionalRounds))fail('INVALID_EXTENSION_SIZE');
  if(state.players.length!==1)fail('SOLO_EXTENSION_ONLY');
  const old=state.extensions.find(e=>e.requestId===requestId);
  if(old){if(old.fromRound!==roundId||old.additionalRounds!==additionalRounds)fail('EXTENSION_CONFLICT');return state;}
  if(state.currentRound)fail('ROUND_STILL_OPEN');
  if(roundId!==state.completedRounds||roundId!==state.maxRounds)fail('EXTENSION_NOT_AT_BOUNDARY');
  const target=state.maxRounds+additionalRounds;if(!Number.isSafeInteger(target))fail('ROUND_LIMIT_OVERFLOW');
  const next=clone(state);next.maxRounds=target;next.extensions.push({requestId,fromRound:roundId,toRound:target,additionalRounds});if(next.extensions.length>EXTENSION_RETENTION)next.extensions.splice(0,next.extensions.length-EXTENSION_RETENTION);return freeze(next);
}
