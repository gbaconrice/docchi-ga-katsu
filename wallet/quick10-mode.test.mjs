import test from 'node:test';import assert from 'node:assert/strict';
import * as wallet from './wallet.mjs';
import * as protocol from '../multiplayer/protocol.mjs';
import {createWalletSession} from '../multiplayer/wallet-binding.mjs';
import * as ranking from '../ranking/score-bridge.mjs';
const MODE='GRAVITY_QUICK10_V1';
test('all owned modules share explicit ten-round mode, C100/R10/cap50 unchanged',()=>{
 for(const m of [wallet,protocol,ranking]){assert.equal(m.GAME_MODE,MODE);assert.equal(m.TOTAL_ROUNDS,10)}
 assert.deepEqual(wallet.DEFAULT_CONFIG,{initialBalance:100,correctReward:10,stakeCap:50,winMultiplier:1,totalRounds:10,precision:0});
 assert.equal(wallet.createSession({sessionId:'s',playerIds:['p']}).mode,MODE);
});
test('wallet cannot restore old20 through config, mode, or old ledger state',()=>{
 for(const n of [0,1,9,11,20])assert.throws(()=>wallet.createSession({sessionId:'s',playerIds:['p'],config:{totalRounds:n}}));
 assert.throws(()=>wallet.createSession({sessionId:'s',playerIds:['p'],mode:'GRAVITY_CLASSIC20_V1'}),/INCOMPATIBLE_GAME_MODE/);
 const good=wallet.createSession({sessionId:'s',playerIds:['p']}),old={...good,schemaVersion:1,mode:'GRAVITY_CLASSIC20_V1',config:{...good.config,totalRounds:20}};
 assert.throws(()=>wallet.openRound(old,{sessionId:'s',roundId:1,deadline:1}),/INCOMPATIBLE_GAME_MODE/);assert.throws(()=>wallet.walletView(old,'p'),/INCOMPATIBLE_GAME_MODE/);assert.throws(()=>wallet.standings(old),/INCOMPATIBLE_GAME_MODE/);
});
test('ten settlements only; repeated final settlement is idempotent and round11 rejected',()=>{
 let s=wallet.createSession({sessionId:'s',playerIds:['p']});for(let roundId=1;roundId<=10;roundId++){s=wallet.openRound(s,{sessionId:'s',roundId,deadline:100});s=wallet.commitPrediction(s,{sessionId:'s',roundId,playerId:'p',side:'A',stake:0,now:0});s=wallet.settleRound(s,{sessionId:'s',roundId,outcome:'A',now:0});}
 assert.equal(s.completedRounds,10);assert.equal(s.players[0].score,100);assert.equal(wallet.settleRound(s,{sessionId:'s',roundId:10,outcome:'A',now:0}),s);assert.throws(()=>wallet.openRound(s,{sessionId:'s',roundId:11,deadline:100}),/ROUND_OUT_OF_ORDER/);
});
test('host/guest stop at round10, mode snapshots match, round11 and old20 wires rejected atomically',()=>{
 const wires=[];const h=createWalletSession({roomId:'r',sessionId:'s',userId:'h',hostId:'h',send:w=>wires.push(w),now:()=>1000});const g=protocol.createSession({roomId:'r',sessionId:'s',userId:'g',hostId:'h',send:()=>{},now:()=>1000});let latest;
 for(let roundId=1;roundId<=10;roundId++){h.openRound({roundId,durationMs:100,matchup:{}});h.predict('A',0);h.startBattle({engineVersion:'audit',ticks:1,winner:'A',events:[]});h.settleRound();h.showResult();while(wires.length){const w=wires.shift();if(JSON.parse(w).type==='snapshot')latest=JSON.parse(w);g.receive('h',w);}}
 assert.equal(h.getLedger().completedRounds,10);assert.equal(g.getState().roundId,10);assert.equal(g.getState().mode,MODE);assert.equal(g.getState().totalRounds,10);const before=JSON.stringify(h.getState()),ledger=h.getLedger();assert.throws(()=>h.openRound({roundId:11,durationMs:100,matchup:{}}),/invalid-round/);assert.equal(JSON.stringify(h.getState()),before);assert.equal(h.getLedger(),ledger);
 const guestBefore=JSON.stringify(g.getState());for(const patch of [{roundId:11},{mode:'GRAVITY_CLASSIC20_V1'},{totalRounds:20},{confirmedResult:{roundId:11,winner:'A'}}]){const m={...latest,state:{...latest.state,revision:100,...patch}};assert.equal(g.receive('h',protocol.encode(m)),false);assert.equal(JSON.stringify(g.getState()),guestBefore)}
 const old={...latest,protocol:'gravity-prediction-battle',state:{...latest.state,roundId:20,totalRounds:20,mode:'GRAVITY_CLASSIC20_V1'}};assert.equal(protocol.decode(JSON.stringify(old)),null);assert.equal(g.receive('h',JSON.stringify(old)),false);assert.equal(h.receive('g',JSON.stringify({...old,type:'hello'})),false);
 assert.throws(()=>protocol.createSession({roomId:'r',sessionId:'x',userId:'h',hostId:'h',send:()=>{},mode:'GRAVITY_CLASSIC20_V1'}),/incompatible-game-mode/);
});
test('quick10 signed-score eligibility rejects old20/missing mode and posts unchanged external payload once',()=>{
 const calls=[],bridge=ranking.createScoreBridge({isGravity:true,isEmbedded:true,postMessage:(...args)=>calls.push(args)}),input={sessionId:'s',playerId:'me',players:[{playerId:'me',score:-100},{playerId:'other',score:1000}],mode:MODE,completedRounds:10,totalRounds:10,action:'finish'};
 for(const patch of [{mode:undefined},{mode:'GRAVITY_CLASSIC20_V1'},{completedRounds:20,totalRounds:20},{completedRounds:9},{totalRounds:20},{spectator:true}])assert.equal(bridge.submit({...input,...patch}).status,'ineligible');assert.equal(calls.length,0);assert.equal(bridge.submit(input).status,'sent');assert.equal(bridge.submit({...input,action:'replay'}).status,'duplicate');assert.deepEqual(calls,[[{type:'gameOver',score:-100},'*']]);assert.deepEqual(Object.keys(calls[0][0]).sort(),['score','type']);
});
test('new protocol encode tags discovery mode but never upgrades old protocol',()=>{
 assert.equal(JSON.parse(protocol.encode({protocol:protocol.PROTOCOL,version:1,type:'discover'})).mode,MODE);assert.equal(protocol.decode(protocol.encode({protocol:'gravity-prediction-battle',version:1,type:'discover'})),null);assert.equal(protocol.decode(protocol.encode({protocol:protocol.PROTOCOL,version:1,mode:'GRAVITY_CLASSIC20_V1',type:'discover'})),null);assert.equal(protocol.decode(JSON.stringify({protocol:protocol.PROTOCOL,version:1,type:'discover'})),null);
});
