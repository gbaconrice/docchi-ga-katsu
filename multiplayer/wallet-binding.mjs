import * as wallet from '../wallet/wallet.mjs';
import {createSession} from './protocol.mjs';
/** Wallet roster is frozen at first prediction, not at initial room creation. */
export function createWalletSession(options){
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
