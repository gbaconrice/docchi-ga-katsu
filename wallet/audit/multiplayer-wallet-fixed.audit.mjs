import test from 'node:test';import assert from 'node:assert/strict';
import {createWalletSession} from '../../multiplayer/wallet-binding.mjs';
import {encode,PROTOCOL} from '../../multiplayer/protocol.mjs';
const wire=body=>encode({protocol:PROTOCOL,version:1,mode:'GRAVITY_QUICK10_V1',roomId:'r',sessionId:'s',...body});
const replay={engineVersion:'v1',ticks:1,winner:'A',events:[]};
function setup(members=['g']){let time=0;const sent=[];const h=createWalletSession({roomId:'r',sessionId:'s',userId:'h',hostId:'h',members,now:()=>time,send:w=>sent.push(JSON.parse(w))});return {h,sent,time:x=>time=x};}
test('FIX VERIFIED: refusing all replay ACK cannot cancel confirmed loss or duplicate reward',()=>{
 const {h,time}=setup();h.openRound({roundId:1,durationMs:10,matchup:{}});h.predict('A',0);h.receive('g',wire({type:'bet',roundId:1,seq:1,side:'B',stake:50}));h.startBattle(replay);
 const ledger=h.getLedger();assert.deepEqual(ledger.players.map(p=>p.balance),[110,50]);assert.deepEqual(h.getState().wallets,ledger.players);assert.equal(h.getState().confirmedResult.winner,'A');
 time(120000);h.tick();assert.equal(h.getTransferStatus().error,'delivery-timeout');assert.equal(h.getLedger(),ledger);h.settleRound();h.settleRound();h.showResult();h.receive('g',wire({type:'hello'}));assert.equal(h.getLedger(),ledger);assert.deepEqual(h.getState().wallets,ledger.players);
});
test('FIX VERIFIED: rejected openRound leaves both protocol and ledger unchanged and retry works',()=>{
 let rejected=0;
 for(let size=47400;size<48000;size++){
  const {h}=setup();const before=h.getState();try{h.openRound({roundId:1,durationMs:10,matchup:{padding:'x'.repeat(size)}});}catch(e){assert.equal(e.message,'wire-cap-exceeded');assert.equal(h.getLedger(),null);assert.deepEqual(h.getState(),before);h.openRound({roundId:1,durationMs:20,matchup:{}});assert.equal(h.getLedger().currentRound.deadline,20);rejected++;}
 }
 assert.ok(rejected>0);
});
test('FIX VERIFIED: battle confirmation cap rejection cannot pay ledger; successful result remains consistent',()=>{
 let rejected=0,succeeded=0;
 const members=Array.from({length:7},(_,i)=>'g'+i);
 for(let size=45000;size<48000;size++){
  const {h}=setup(members);
  try{h.openRound({roundId:1,durationMs:10,matchup:{padding:'x'.repeat(size)}});h.predict('A',50);for(const p of members)h.receive(p,wire({type:'bet',roundId:1,seq:1,side:'A',stake:50}));}catch{continue;}
  if(h.getState().phase!=='locked')continue;
  const before=h.getState(),ledger=h.getLedger();
  try{h.startBattle(replay);}catch(e){assert.equal(e.message,'wire-cap-exceeded');assert.equal(h.getLedger(),ledger);assert.equal(ledger.completedRounds,0);assert.deepEqual(h.getState(),before);rejected++;continue;}
  assert.equal(h.getLedger().completedRounds,1);assert.ok(h.getLedger().players.every(p=>p.balance===160));assert.deepEqual(h.getState().wallets,h.getLedger().players);
  const confirmed=h.getLedger();try{h.settleRound();}catch(e){assert.equal(e.message,'wire-cap-exceeded');}assert.equal(h.getLedger(),confirmed);assert.deepEqual(h.getState().wallets,confirmed.players);succeeded++;
 }
 assert.ok(rejected>0);assert.ok(succeeded>0);
});
