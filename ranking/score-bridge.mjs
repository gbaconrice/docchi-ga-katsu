/** Explicit final-action bridge only. No startup send, storage, clamping or other-player reports. */
export const GAME_MODE = 'GRAVITY_QUICK10_V1';
export const TOTAL_ROUNDS = 10;
export function createScoreBridge({isGravity=false,isEmbedded=false,postMessage}={}){
 const attempted=new Set();
 return Object.freeze({submit({sessionId,playerId,players,completedRounds,totalRounds=TOTAL_ROUNDS,mode,action,spectator=false}){
  if(!(typeof isGravity==='function'?isGravity():isGravity)||!isEmbedded)return {status:'standalone'};
  if(!['finish','lobby','replay'].includes(action)||spectator||mode!==GAME_MODE||completedRounds!==TOTAL_ROUNDS||totalRounds!==TOTAL_ROUNDS)return {status:'ineligible'};
  if(typeof sessionId!=='string'||!sessionId||typeof playerId!=='string'||!Array.isArray(players))return {status:'invalid'};
  const own=players.find(p=>p.playerId===playerId);
  if(!own||!Number.isSafeInteger(own.score)||typeof postMessage!=='function')return {status:'invalid'};
  if(attempted.has(sessionId))return {status:'duplicate'};
  attempted.add(sessionId); // one attempt even if native delivery status is unknowable
  try{postMessage({type:'gameOver',score:own.score},'*');return {status:'sent',score:own.score};}
  catch{return {status:'failed'};}
 }});
}
