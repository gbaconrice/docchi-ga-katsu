import assert from 'node:assert/strict';
import {createCompactRecorder,createPlayback,COMPACT_VERSION} from './compact-replay.mjs';
import {packReplay,createReceiver,createSender} from '../multiplayer/replay-transfer.mjs';
const unit=(id,side,k='wraith')=>({id,token:String(id),side,k,x:100+side*200,y:100,hp:90,dead:false});
const r=createCompactRecorder(),parent=unit(0,0),enemy=unit(100,1,'sword');
r.capture(0,{units:[parent,enemy],shots:[]});
const child={...unit('0/summon:0',0,'goblin'),ownerToken:'0'};
parent.dead=true;parent.hp=0;
r.capture(1,{units:[parent,enemy,child],shots:[],effects:[{kind:'magic_sparkle',x:100,y:90,face:1,tick:1}]});
r.capture(37,{units:[parent,enemy,child],shots:[]},true);
const replay=r.finish({ticks:37,winner:'A'}),p=createPlayback(replay);
assert.equal(p.at(0).units.length,2);const spawned=p.at(1);assert.equal(spawned.units.find(u=>u.id===child.id).ownerToken,'0');assert.equal(spawned.effects.length,1);
assert.equal(p.at(37).units.length,2);assert(!p.at(38).units.some(u=>u.id===0));
assert.throws(()=>createPlayback({...replay,events:[replay.events[0],[1,[],null,[replay.initial[0]],[],[]]]}));
// Synthetic record ceiling: 64 initial, then three replacement generations of 64.
const big=createCompactRecorder();let all=Array.from({length:64},(_,i)=>unit(i,i<32?0:1));big.capture(0,{units:all,shots:[]});
for(let gen=1;gen<=3;gen++){all.forEach(u=>{u.dead=true;u.hp=0});all.push(...Array.from({length:64},(_,i)=>({...unit('p'+i+'/summon:'+gen,i<32?0:1,'goblin'),ownerToken:String(i)})));big.capture(gen,{units:all,shots:[]});}
big.capture(60,{units:all,shots:[]},true);const trace=big.finish({ticks:60,winner:'draw'});createPlayback(trace);assert.equal(all.length,256);
assert.throws(()=>big.capture(61,{units:[...all,unit('extra',0)],shots:[]}));
const packed=packReplay(trace,'stress'),received=[];let now=0,complete;
const receiver=createReceiver({meta:packed.meta,sendAck:a=>sender.ack('g',a),onComplete:r=>complete=r});
const sender=createSender({packed,recipients:['g'],send:m=>received.push(m),now:()=>now});
for(let n=0;n<10000&&!sender.ready();n++){sender.pump();while(received.length)receiver.receive(received.shift());now+=100;}
assert.deepEqual(complete,trace);
console.log(JSON.stringify({pass:true,createdEntityStress:256,activeCapPerTeam:32,jsonBytes:packed.meta.totalBytes,chunks:packed.meta.totalChunks,mockPacedMs:now,checks:'dynamic spawn/despawn,parent token,effects,bounds,chunk exact restoration; synthetic not balance claim'}));
