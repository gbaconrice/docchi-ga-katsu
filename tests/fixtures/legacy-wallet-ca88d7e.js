// Wallet code extracted verbatim from index.html at commit ca88d7e1e13cc58920c99c0b89037ca94f3aa86e
// (BattleFields .. before GrowthGenerator). Used by tests/legacy-payout.cjs so the test needs no git history.
const BattleFields=(()=>{
/** Candidate sensitivity arms only. No combat RNG, choices, rosters or outcomes. */
const FIELD_VERSION='bounded-fields-v1';
const FIELD_IDS=Object.freeze(['grassland','shallow_ford','crosswind_ridge']);
const STRENGTHS=Object.freeze([4,8,12]);
const CANDIDATE_STRENGTH=4; // Lowest test arm, NOT a selected shipping value.
const uint=x=>Number.isInteger(x)&&x>=0&&x<=0xffffffff;
function mix32(x){x=x>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return x>>>0;}
function selectRunEnvironment(runRootSeed,percent=CANDIDATE_STRENGTH){if(!uint(runRootSeed)||!STRENGTHS.includes(percent))throw Error('invalid-environment-input');const fieldSeed=mix32((runRootSeed^0xf13d5eed)>>>0);return Object.freeze({version:FIELD_VERSION,runRootSeed,fieldSeed,fieldId:FIELD_IDS[Math.floor(fieldSeed*3/4294967296)],percent});}
function validateEnvironment(e){if(!e||e.version!==FIELD_VERSION||!uint(e.runRootSeed)||!uint(e.fieldSeed)||!STRENGTHS.includes(e.percent)||Object.keys(e).sort().join(',')!=='fieldId,fieldSeed,percent,runRootSeed,version')throw Error('invalid-environment');const expected=selectRunEnvironment(e.runRootSeed,e.percent);if(expected.fieldSeed!==e.fieldSeed||expected.fieldId!==e.fieldId)throw Error('environment-seed-mismatch');return expected;}
function sameEnvironment(a,b){if(a==null||b==null)return a==null&&b==null;try{const x=validateEnvironment(a),y=validateEnvironment(b);return Object.keys(x).every(k=>x[k]===y[k]);}catch{return false}}
function movementFactor(e,type){if(!e||e.fieldId!=='shallow_ford'||type.collisionLayer!=='ground'||Array.isArray(type.terrainAffinity)&&type.terrainAffinity.includes('shallow_ford'))return 1;return 1-e.percent/100;}
function firingReach(e,type,reach=type.reach){return e?.fieldId==='crosswind_ridge'&&type.projectile===true?reach*(1-e.percent/100):reach;}
function fieldLabel(e){if(!e)return '';validateEnvironment(e);return e.fieldId==='grassland'?'草原 · 補正なし':e.fieldId==='shallow_ford'?`浅瀬 · 地上移動 −${e.percent}%`:`横風 · 射撃間合い −${e.percent}%`;}

return {FIELD_VERSION,FIELD_IDS,STRENGTHS,CANDIDATE_STRENGTH,mix32,selectRunEnvironment,validateEnvironment,sameEnvironment,movementFactor,firingReach,fieldLabel};})();
const Money=(()=>{
/** Exact JSON-safe credit helpers. Values serialize as numbers until unsafe, then canonical decimal strings. */
const MAX_AMOUNT_DIGITS=600;
const fail=code=>{throw new Error(code)};
const digits=MAX_AMOUNT_DIGITS;
function amountBig(value,code='INVALID_AMOUNT'){
 if(typeof value==='bigint'&&value>=0n&&value.toString().length<=digits)return value;
 if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0)return BigInt(value);
 if(typeof value==='string'&&/^(?:0|[1-9][0-9]{0,599})$/.test(value)){try{return BigInt(value)}catch{}}
 return fail(code);
}
function signedBig(value,code='INVALID_SCORE'){
 if(typeof value==='bigint'&&value.toString().replace('-','').length<=digits)return value;
 if(typeof value==='number'&&Number.isSafeInteger(value))return BigInt(value);
 if(typeof value==='string'&&/^(?:0|-?[1-9][0-9]{0,599})$/.test(value)){try{return BigInt(value)}catch{}}
 return fail(code);
}
function amountValue(value){const n=amountBig(value);return n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):n.toString()}
function signedValue(value){const n=signedBig(value);return n>=BigInt(Number.MIN_SAFE_INTEGER)&&n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):n.toString()}
function compareSigned(a,b){const x=signedBig(a),y=signedBig(b);return x>y?1:x<y?-1:0}
function doubleAmountFits(value){return (amountBig(value)*2n).toString().length<=MAX_AMOUNT_DIGITS}
function isAmount(value){try{amountBig(value);return true}catch{return false}}
function isSigned(value){try{signedBig(value);return true}catch{return false}}
function amountText(value,{group=true,plus=false}={}){
 const n=amountBig(value);const raw=n.toString();return (plus&&n>0n?'+':'')+(group?raw.replace(/\B(?=(\d{3})+(?!\d))/g,','):raw)
}
function signedText(value,{group=true,plus=false}={}){
 const n=signedBig(value);const abs=(n<0n?-n:n).toString();return (n<0n?'-':plus&&n>0n?'+':'')+(group?abs.replace(/\B(?=(\d{3})+(?!\d))/g,','):abs)
}

return {MAX_AMOUNT_DIGITS,amountBig,signedBig,amountValue,signedValue,compareSigned,doubleAmountFits,isAmount,isSigned,amountText,signedText};})();
const MoneyUI=(()=>{const {amountBig,amountValue,amountText,signedBig,signedValue,signedText,compareSigned}=Money;

const MIN_STAKE=10;
const STAKE_CAP=50;
const asRound=(round)=>Number.isSafeInteger(round)&&round>=1?round:1;

/** Percent options round half up using integer arithmetic. */
function stakeOption(option,balance,round=1){
 const b=amountBig(balance),r=asRound(round);if(b===0n)return option===0&&r<=10?0:null;
 if(r>10)return option===100?amountValue(b):null;
 if(![25,50,100].includes(option))return null;
 const n=(b*BigInt(option)+50n)/100n;return amountValue(n<1n?1n:n>b?b:n);
}
function defaultStake(balance,round=1){const b=amountBig(balance);return b===0n?(asRound(round)<=10?0:null):stakeOption(asRound(round)>10?100:25,balance,round)}
function validStake(balance,stake,round=1){let b,s;try{b=amountBig(balance);s=amountBig(stake)}catch{return false}if(b===0n)return asRound(round)<=10&&s===0n;return (asRound(round)>10?[100]:[25,50,100]).some(n=>amountBig(stakeOption(n,b,round))===s)}
function sameAmount(a,b){try{return amountBig(a)===amountBig(b)}catch{return false}}
function sameSigned(a,b){try{return signedBig(a)===signedBig(b)}catch{return false}}
function amountAtMost(a,b){try{return amountBig(a)<=amountBig(b)}catch{return false}}
function maximumStake(balance){return amountValue(amountBig(balance))}
function stakeLabel(option,balance,round=1){const amount=stakeOption(option,balance,round);const name=option===100?'全額':option===0?'0 G':option+'%';return amount===null?name:option===0?name:name+' · '+amountText(amount)+' G'}
function credits(value){return `${signedText(value,{plus:true})} G`}
function balanceText(value){return `${amountText(value)} G`}
function rankedByScore(rows){
 return [...rows].sort((a,b)=>compareSigned(b.score,a.score)||(String(a.playerId)<String(b.playerId)?-1:String(a.playerId)>String(b.playerId)?1:0));
}
function rankedByBalance(rows){
 return [...rows].sort((a,b)=>{
  const x=amountBig(a.balance),y=amountBig(b.balance);return x>y?-1:x<y?1:(String(a.playerId)<String(b.playerId)?-1:String(a.playerId)>String(b.playerId)?1:0);
 });
}
function exactPositiveDelta(entry){
 try{
  if(!entry||entry.correct!==true||entry.submitted!==true)return null;
  const d=signedBig(entry.delta);if(d<=0n)return null;
  if(amountBig(entry.balanceAfter)-amountBig(entry.balanceBefore)!==d)return null;
  return d;
 }catch{return null}
}
function resultCountupText(delta,progress){
 const d=typeof delta==='bigint'?delta:amountBig(delta);
 if(d===0n)return credits(0);
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const basis=p>=1?1000n:BigInt(Math.floor(p*1000));
 const value=basis===1000n?d:(d*basis)/1000n;
 return credits(value>0n?value:1n);
}

return {MIN_STAKE,STAKE_CAP,defaultStake,stakeOption,validStake,sameAmount,sameSigned,amountAtMost,maximumStake,stakeLabel,credits,balanceText,rankedByScore,rankedByBalance,exactPositiveDelta,resultCountupText};})();
const DoubleUpLedger=(()=>{const {validateEnvironment,sameEnvironment}=BattleFields;const {amountBig,amountValue,signedBig,signedValue,compareSigned,doubleAmountFits,MAX_AMOUNT_DIGITS}=Money;

const TOTAL_ROUNDS=10;
const MIN_STAKE=10;
const LEDGER_RETENTION=20;
// Legacy fields remain readable for existing sessions; the fixed 3/2 profit rule is authoritative.
const DEFAULT_CONFIG=Object.freeze({initialBalance:100,correctReward:10,stakeCap:50,winMultiplier:1,profitNumerator:3,profitDenominator:2,zeroStakeRecovery:10,totalRounds:10,precision:0});
const fail=code=>{throw new Error(code)};
const int=(v,code='INVALID_INTEGER')=>{if(!Number.isSafeInteger(v)||v<0)fail(code);return v};
const id=v=>{if(typeof v!=='string'||!v.trim())fail('INVALID_ID');return v};
const clone=v=>JSON.parse(JSON.stringify(v));
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v};

function createDoubleUpLedger({gameMode,schemaVersion=4,solo=false}={}){
 if(typeof gameMode!=='string'||!gameMode)fail('INVALID_GAME_MODE');
 const modeState=s=>{if(s?.mode!==gameMode||s?.schemaVersion!==schemaVersion||s?.config?.totalRounds!==TOTAL_ROUNDS||!Number.isSafeInteger(s.maxRounds)||s.maxRounds<TOTAL_ROUNDS||!Array.isArray(s.continuations)||!Array.isArray(s.cashouts)||!Array.isArray(s.players))fail('INCOMPATIBLE_GAME_MODE')};
 const session=(s,sessionId)=>{modeState(s);if(s.sessionId!==sessionId)fail('SESSION_MISMATCH')};
 const player=(s,playerId)=>{const p=s.players.find(x=>x.playerId===playerId);if(!p)fail('UNKNOWN_PLAYER');return p};
 const active=(s,roundId)=>{if(!s.currentRound||s.currentRound.roundId!==roundId)fail('ROUND_NOT_ACTIVE');return s.currentRound};
 const inactive=p=>p.cashedOut===true||p.terminalReason==='bankrupt'||p.terminalReason==='cashed-out';
 const activePlayers=s=>s.players.filter(p=>!inactive(p));
 const availablePlayers=s=>s.players.filter(p=>!inactive(p)&&amountBig(p.balance)>0n);
 const createSession=({sessionId,playerIds,config={},mode=gameMode,environment=null}={})=>{
  if(mode!==gameMode)fail('INCOMPATIBLE_GAME_MODE');id(sessionId);
  if(!Array.isArray(playerIds)||!playerIds.length)fail('PLAYERS_REQUIRED');playerIds.forEach(id);if(new Set(playerIds).size!==playerIds.length)fail('DUPLICATE_PLAYER');
  if(solo&&playerIds.length!==1)fail('SOLO_ONLY');
  if(Object.keys(config).some(k=>!Object.hasOwn(DEFAULT_CONFIG,k)))fail('UNKNOWN_CONFIG');
  const c={...DEFAULT_CONFIG,...config};Object.values(c).forEach(v=>int(v,'INVALID_CONFIG'));
  if(c.precision!==0)fail('INTEGER_CREDITS_ONLY');if(c.totalRounds!==TOTAL_ROUNDS)fail('INCOMPATIBLE_ROUND_COUNT');
  if(c.profitNumerator!==3||c.profitDenominator!==2||c.zeroStakeRecovery!==10)fail('INCOMPATIBLE_PROFIT_RULE');
  // Amounts use BigInt-backed serialization; legacy stakeCap is retained only for snapshots.
  const initial=BigInt(c.initialBalance);
  return freeze({schemaVersion,mode:gameMode,sessionId,...(environment===null?{}:{environment:validateEnvironment(environment)}),config:c,
    players:playerIds.map(playerId=>({playerId,balance:amountValue(initial),score:0,correctCount:0,cashedOut:false,cashoutAmount:null,cashoutRound:null,cashoutRequestId:null,cashoutReason:null,terminalReason:null})),
    currentRound:null,completedRounds:0,maxRounds:TOTAL_ROUNDS,continuations:[],cashouts:[],ledger:[],terminalReason:null});
 };
 const isBankrupt=s=>{modeState(s);return solo&&s.players.length===1&&!s.currentRound&&s.completedRounds>=TOTAL_ROUNDS&&amountBig(s.players[0].balance)===0n};
 const canFinishRun=s=>{modeState(s);return solo&&!s.currentRound&&(s.completedRounds>=TOTAL_ROUNDS&&(s.terminalReason==='cashed-out'||isBankrupt(s)))};
 const openRound=(s,{sessionId,roundId,deadline}={})=>{
  session(s,sessionId);int(roundId);int(deadline);if(!activePlayers(s).length)fail('NO_ACTIVE_PLAYERS');
  if(s.currentRound?.roundId===roundId){if(s.currentRound.deadline!==deadline)fail('ROUND_CONFLICT');return s;}
  if(s.currentRound)fail('ROUND_STILL_OPEN');if(roundId!==s.completedRounds+1||roundId>s.maxRounds)fail('ROUND_OUT_OF_ORDER');
  const next=clone(s);next.currentRound={roundId,deadline,commits:[]};return freeze(next);
 };
 const commitPrediction=(s,{sessionId,roundId,playerId,side,stake=0,now}={})=>{
  session(s,sessionId);int(roundId);int(now);const stakeN=amountBig(stake,'INVALID_STAKE');const p=player(s,playerId),r=active(s,roundId);
  if(inactive(p))fail('PLAYER_INACTIVE');if(!['A','B',null].includes(side))fail('INVALID_SIDE');if(side===null&&stakeN!==0n)fail('SKIP_CANNOT_STAKE');
  const old=r.commits.find(c=>c.playerId===playerId),serializedStake=amountValue(stakeN);
  if(old){if(old.side===side&&amountBig(old.stake)===stakeN)return s;fail('COMMIT_LOCKED');}
  if(now>=r.deadline)fail('COMMIT_DEADLINE');const balance=amountBig(p.balance);
  if(stakeN>balance)fail('STAKE_EXCEEDS_LIMIT');
  if(side!==null&&roundId<=TOTAL_ROUNDS&&!MoneyUI.validStake(balance,stakeN,roundId))fail('INVALID_PERCENT_STAKE');
  if(side!==null&&roundId>TOTAL_ROUNDS&&(balance===0n||stakeN!==balance))fail('DOUBLEUP_ALL_IN_REQUIRED');
  const next=clone(s);next.currentRound.commits.push({playerId,side,stake:serializedStake});return freeze(next);
 };
 const settleRound=(s,{sessionId,roundId,outcome,now}={})=>{
  session(s,sessionId);int(roundId);int(now);if(!['A','B','draw','invalid'].includes(outcome))fail('INVALID_OUTCOME');
  const old=s.ledger.find(e=>e.roundId===roundId);if(old){if(old.outcome!==outcome)fail('SETTLEMENT_CONFLICT');return s;}if(roundId<=s.completedRounds)fail('SETTLEMENT_HISTORY_EXPIRED');
  const r=active(s,roundId),activeCount=s.players.filter(p=>!inactive(p)).length;if(now<r.deadline&&r.commits.length!==activeCount)fail('ROUND_NOT_CLOSED');
  const next=clone(s),entries=[];
  for(const p of next.players){
   const c=r.commits.find(x=>x.playerId===p.playerId),predicted=!!c?.side,valid=outcome==='A'||outcome==='B';
   const correct=predicted&&valid?c.side===outcome:null,stake=amountBig(c?.stake??0),before=amountBig(p.balance);
   // First ten rounds: 1.5× stake as net profit, half-up to whole G. Legacy config fields remain for saved-session compatibility.
   let delta=0n;if(correct===true)delta=roundId<=TOTAL_ROUNDS?(stake===0n?10n:(stake*3n+1n)/2n):stake;
   else if(correct===false)delta=-stake;
   const after=before+delta;if(after<0n)fail('BALANCE_INVARIANT');
   if(after.toString().replace('-','').length>MAX_AMOUNT_DIGITS)fail('AMOUNT_DIGIT_LIMIT');
   const score=after-BigInt(s.config.initialBalance),correctCount=p.correctCount+(correct===true?1:0);if(!Number.isSafeInteger(correctCount))fail('CORRECT_COUNT_OVERFLOW');p.balance=amountValue(after);p.score=signedValue(score);p.correctCount=correctCount;
   if(roundId>=TOTAL_ROUNDS&&after===0n&&!p.cashedOut)p.terminalReason='bankrupt';
   entries.push({playerId:p.playerId,side:c?.side??null,submitted:!!c,stake:amountValue(stake),correct,delta:signedValue(delta),balanceBefore:amountValue(before),balanceAfter:amountValue(after),scoreAfter:signedValue(score)});
  }
  next.ledger.push({sessionId,roundId,outcome,entries});if(next.ledger.length>LEDGER_RETENTION)next.ledger.splice(0,next.ledger.length-LEDGER_RETENTION);next.completedRounds=roundId;next.currentRound=null;
  if(solo&&roundId>=TOTAL_ROUNDS&&amountBig(next.players[0].balance)===0n)next.terminalReason='bankrupt';
  return freeze(next);
 };
 const continueDoubleUp=(s,{sessionId,roundId,requestId}={})=>{
  session(s,sessionId);id(requestId);int(roundId);if(s.currentRound)fail('ROUND_STILL_OPEN');
  const existing=s.continuations.find(x=>x.requestId===requestId);if(existing){if(existing.fromRound!==roundId)fail('CONTINUE_CONFLICT');return s;}
  if(roundId!==s.completedRounds||roundId!==s.maxRounds||roundId<TOTAL_ROUNDS)fail('CONTINUE_NOT_AT_BOUNDARY');
  const funded=availablePlayers(s);if(!funded.length)fail('NO_ACTIVE_PLAYERS');if(funded.some(p=>!doubleAmountFits(p.balance)))fail('AMOUNT_LIMIT_REACHED');
  const nextRound=roundId+1;if(!Number.isSafeInteger(nextRound))fail('ROUND_LIMIT_OVERFLOW');
  const next=clone(s);next.maxRounds=nextRound;next.continuations.push({requestId,fromRound:roundId,toRound:nextRound,mode:'double-up'});if(next.continuations.length>64)next.continuations.splice(0,next.continuations.length-64);return freeze(next);
 };
 const cashOut=(s,{sessionId,playerId,roundId,requestId,reason='player',allowDuringPrediction=false}={})=>{
  session(s,sessionId);id(playerId);id(requestId);int(roundId);
  const duringPrediction=!!s.currentRound&&allowDuringPrediction===true&&s.currentRound.roundId===s.completedRounds+1&&roundId===s.completedRounds&&s.currentRound.commits.every(c=>c.playerId!==playerId||c.side===null&&amountBig(c.stake)===0n);
  if((s.currentRound&&!duringPrediction)||roundId!==s.completedRounds||roundId<TOTAL_ROUNDS)fail(s.currentRound&&!duringPrediction?'ROUND_STILL_OPEN':'CASHOUT_NOT_AT_BOUNDARY');
  if(!['player','room-exit','no-prediction'].includes(reason))fail('INVALID_CASHOUT_REASON');
  const p=player(s,playerId);if(p.cashedOut){if(p.cashoutRequestId===requestId&&p.cashoutRound===roundId)return s;fail('ALREADY_CASHED_OUT');}
  if(p.terminalReason==='bankrupt'||amountBig(p.balance)===0n)fail('NO_CASHOUT_BALANCE');
  const next=clone(s),q=player(next,playerId);q.cashedOut=true;q.terminalReason='cashed-out';q.cashoutAmount=q.balance;q.cashoutRound=roundId;q.cashoutRequestId=requestId;q.cashoutReason=reason;if(duringPrediction)next.currentRound.commits=next.currentRound.commits.filter(c=>c.playerId!==playerId);
  next.cashouts.push({playerId,roundId,requestId,amount:q.balance,reason});if(solo)next.terminalReason='cashed-out';return freeze(next);
 };
 const reconnectPlayer=(s,{sessionId,playerId}={})=>{session(s,sessionId);id(playerId);const p=s.players.find(x=>x.playerId===playerId);return freeze(p?{role:p.cashedOut?'cashed-out':p.terminalReason==='bankrupt'?'inactive':'player',...p}:{role:'spectator',playerId})};
 const walletView=(s,playerId)=>{
  modeState(s);const p=player(s,playerId),reserved=s.currentRound?.commits.find(c=>c.playerId===playerId)?.stake??0;
  const balance=amountBig(p.balance),held=amountBig(reserved);return freeze({...p,reserved:amountValue(held),available:amountValue(balance-held),maxStake:amountValue(balance)});
 };
 const standings=s=>{
  modeState(s);const rows=s.players.map(p=>({...p})).sort((a,b)=>compareSigned(b.score,a.score)||(a.playerId<b.playerId?-1:a.playerId>b.playerId?1:0));let rank=0;return freeze(rows.map((p,i)=>{if(i===0||signedBig(p.score)!==signedBig(rows[i-1].score))rank=i+1;return{rank,...p}}));
 };
 const setRunEnvironment=(s,environment)=>{modeState(s);const checked=validateEnvironment(environment);if(s.environment){if(!sameEnvironment(s.environment,checked))fail('ENVIRONMENT_CONFLICT');return s;}if(s.currentRound||s.completedRounds!==0)fail('ENVIRONMENT_TOO_LATE');return freeze({...clone(s),environment:checked});};
 const canCashOut=(s,playerId)=>{modeState(s);const p=s.players.find(x=>x.playerId===playerId);return !!p&&!s.currentRound&&s.completedRounds>=TOTAL_ROUNDS&&!inactive(p)&&amountBig(p.balance)>0n};
 const canContinueDoubleUp=(s)=>{modeState(s);const funded=availablePlayers(s);return !s.currentRound&&s.completedRounds===s.maxRounds&&s.completedRounds>=TOTAL_ROUNDS&&funded.length>0&&funded.every(p=>doubleAmountFits(p.balance))};
 return Object.freeze({GAME_MODE:gameMode,TOTAL_ROUNDS,MIN_STAKE,DEFAULT_CONFIG,LEDGER_RETENTION,createSession,isBankrupt,canFinishRun,canCashOut,canContinueDoubleUp,openRound,commitPrediction,settleRound,continueDoubleUp,cashOut,reconnectPlayer,walletView,standings,setRunEnvironment});
}

return {TOTAL_ROUNDS,MIN_STAKE,LEDGER_RETENTION,DEFAULT_CONFIG,createDoubleUpLedger};})();
const Wallet=(()=>{const {createDoubleUpLedger}=DoubleUpLedger;
const wallet=createDoubleUpLedger({gameMode:'GRAVITY_DOUBLEUP_V1',schemaVersion:4,solo:false});
const GAME_MODE=wallet.GAME_MODE;
const TOTAL_ROUNDS=wallet.TOTAL_ROUNDS;
const MIN_STAKE=wallet.MIN_STAKE;
const DEFAULT_CONFIG=wallet.DEFAULT_CONFIG;
const LEDGER_RETENTION=wallet.LEDGER_RETENTION;
const createSession=wallet.createSession;
const isBankrupt=wallet.isBankrupt;
const canFinishRun=wallet.canFinishRun;
const canCashOut=wallet.canCashOut;
const canContinueDoubleUp=wallet.canContinueDoubleUp;
const openRound=wallet.openRound;
const commitPrediction=wallet.commitPrediction;
const settleRound=wallet.settleRound;
const continueDoubleUp=wallet.continueDoubleUp;
const cashOut=wallet.cashOut;
const reconnectPlayer=wallet.reconnectPlayer;
const walletView=wallet.walletView;
const standings=wallet.standings;
const setRunEnvironment=wallet.setRunEnvironment;

return {GAME_MODE,TOTAL_ROUNDS,MIN_STAKE,DEFAULT_CONFIG,LEDGER_RETENTION,createSession,isBankrupt,canFinishRun,canCashOut,canContinueDoubleUp,openRound,commitPrediction,settleRound,continueDoubleUp,cashOut,reconnectPlayer,walletView,standings,setRunEnvironment};})();
const SoloWallet=(()=>{const {createDoubleUpLedger}=DoubleUpLedger;
const wallet=createDoubleUpLedger({gameMode:'GRAVITY_SOLO_DOUBLEUP_V1',schemaVersion:4,solo:true});
const GAME_MODE=wallet.GAME_MODE;
const TOTAL_ROUNDS=wallet.TOTAL_ROUNDS;
const MIN_STAKE=wallet.MIN_STAKE;
const DEFAULT_CONFIG=wallet.DEFAULT_CONFIG;
const LEDGER_RETENTION=wallet.LEDGER_RETENTION;
const createSession=wallet.createSession;
const isBankrupt=wallet.isBankrupt;
const canFinishRun=wallet.canFinishRun;
const canCashOut=wallet.canCashOut;
const canContinueDoubleUp=wallet.canContinueDoubleUp;
const openRound=wallet.openRound;
const commitPrediction=wallet.commitPrediction;
const settleRound=wallet.settleRound;
const continueDoubleUp=wallet.continueDoubleUp;
const cashOut=wallet.cashOut;
const reconnectPlayer=wallet.reconnectPlayer;
const walletView=wallet.walletView;
const standings=wallet.standings;
const setRunEnvironment=wallet.setRunEnvironment;

return {GAME_MODE,TOTAL_ROUNDS,MIN_STAKE,DEFAULT_CONFIG,LEDGER_RETENTION,createSession,isBankrupt,canFinishRun,canCashOut,canContinueDoubleUp,openRound,commitPrediction,settleRound,continueDoubleUp,cashOut,reconnectPlayer,walletView,standings,setRunEnvironment};})();
