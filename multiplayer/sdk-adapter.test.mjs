import test from 'node:test';import assert from 'node:assert/strict';
import {install} from './sdk-adapter.mjs';import {encode,PROTOCOL} from './protocol.mjs';import {createWalletSession} from './wallet-binding.mjs';
function network(){const clients=new Map();const joined=new Set();let n=0;const calls=[];return{calls,clients,make(id){const room={
receiveMessage(cb){clients.set(id,cb);},async sendMessage({message}){for(const [other,cb]of clients)if(other!==id&&joined.has(other))cb({type:'aitools_game_sendmsg',data:{room_id:'r',user_id:id,msg_data:message}});return{errno:0};},
async create(opts){calls.push(['create',opts]);joined.add(id);return{errno:0,data:{room_id:'r',user_list:[{user_id:id}]}};},
async join(){calls.push(['join']);joined.add(id);return{errno:0,data:{room_id:'r',user_list:[...joined].map(user_id=>({user_id}))}};},
async exit(){calls.push(['exit']);joined.delete(id);return{errno:0};},async getPublicRoomList(){return{errno:0,data:[]};}};
return{sdk:{room,user:{async getMyUserInfo(){return{errno:0,data:{user_id:id}};}}},nonce:()=>`nonce-${++n}`,wait:async()=>{}};}};}
test('mock native create/discovery/confirm and two-client wallet battle',async()=>{const net=network();const host=await install({...net.make('h'),sessionFactory:createWalletSession,sessionOptions:{now:()=>1000}});const guest=await install({...net.make('g'),sessionOptions:{now:()=>1000}});const h=await host.create();const g=await guest.join('r');assert.deepEqual(h.getState().participants,['h','g']);h.openRound({roundId:1,durationMs:100,matchup:{}});g.predict('A',5);h.predict('B',0);h.startBattle({engineVersion:'v1',ticks:1,winner:'A',events:[]});h.settleRound();assert.equal(g.getState().wallets.find(p=>p.playerId==='g').balance,115);assert.equal(net.calls[0][1].max_players,8);await guest.exit();});
test('ambiguous discovery fails closed and exits native room',async()=>{const net=network();const host=await install(net.make('h'));await host.create();const bad=net.make('bad');await bad.sdk.room.join();bad.sdk.room.receiveMessage(p=>{const m=JSON.parse(p.data.msg_data);if(m.type==='discover')void bad.sdk.room.sendMessage({message:encode({protocol:PROTOCOL,version:1,roomId:'r',type:'claim',nonce:m.nonce,ticket:'fake',sessionId:'fake'})});});const guest=await install(net.make('g'));await assert.rejects(guest.join('r'),/ambiguous/);assert.equal(guest.getSession(),null);assert(net.calls.some(c=>c[0]==='exit'));});
test('unscoped delayed departure ignored, scoped host loss stops',async()=>{const net=network();const host=await install(net.make('h'));await host.create();const guest=await install(net.make('g'));const g=await guest.join('r');net.clients.get('g')({type:'aitools_game_exitroom',data:{user_id:'h'}});assert.notEqual(g.getState().phase,'stopped');net.clients.get('g')({type:'aitools_game_exitroom',data:{room_id:'r',user_id:'h'}});assert.equal(g.getState().phase,'stopped');});

test('installed SDK adapter routes reaction out of FSM, preserves wallets and survives transport error',async()=>{
 const net=network(),opts=net.make('h');let received=[];
 const host=await install({...opts,sessionFactory:createWalletSession,sessionOptions:{now:()=>1000}});
 const guest=await install({...net.make('g'),sessionOptions:{now:()=>1000},onReaction:(sender,wire)=>{received.push([sender,JSON.parse(wire)]);return true;}});
 const h=await host.create(),g=await guest.join('r');h.openRound({roundId:1,durationMs:100,matchup:{}});h.predict('A',0);g.predict('B',0);h.startBattle({engineVersion:'v1',ticks:600,winner:'A',events:[]});
 const state=h.getState(),wire=JSON.stringify({protocol:PROTOCOL,version:1,mode:state.mode,roomId:'r',sessionId:state.sessionId,type:'reaction',roundId:1,emoji:'wow',seq:1});
 const before=JSON.stringify([h.getState(),g.getState(),h.getLedger()]);await host.sendReaction(wire);assert.equal(received.length,1);assert.equal(received[0][0],'h');assert.equal(JSON.stringify([h.getState(),g.getState(),h.getLedger()]),before);
 net.clients.get('g')({type:'aitools_game_sendmsg',data:{room_id:'r',user_id:'attacker',msg_data:wire}});assert.equal(received.length,1);
 opts.sdk.room.sendMessage=async()=>{throw Error('mock transport failure')};assert.equal(await host.sendReaction(wire),false);assert.equal(JSON.stringify([h.getState(),g.getState(),h.getLedger()]),before);assert.notEqual(h.getState().phase,'stopped');
});
