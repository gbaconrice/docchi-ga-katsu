import assert from 'node:assert/strict';
import {createCompactRecorder,createPlayback} from './compact-replay.mjs';
import {packReplay,createReceiver,createSender} from '../multiplayer/replay-transfer.mjs';
const make=(id,side,k,ownerToken=null)=>({id,side,k,token:String(id),ownerToken,x:side?350:130,y:150,hp:100,dead:false,presentationFlags:0});
const r=createCompactRecorder();let all=Array.from({length:64},(_,i)=>make(i,i<32?0:1,['screech_cricket','reaper_mantis','spore_toad','rootwarden_treant'][i%4]));r.capture(0,{units:all,shots:[]});
for(let tick=1;tick<=3600;tick++){
 if([900,1800,2700].includes(tick)){all.forEach(u=>{u.dead=true;u.hp=0;u.presentationFlags=0});all.push(...Array.from({length:64},(_,i)=>make('child:'+tick+':'+i,i<32?0:1,'slimelet',String(i))));}
 for(const u of all.filter(u=>!u.dead)){u.x=(u.side?350:130)+Math.round(Math.sin((tick+String(u.id).length)/30)*40);u.y=150+Math.round(Math.cos((tick+String(u.id).length)/35)*40);u.presentationFlags=(Math.floor(tick/60)%8)|16|(tick%240<180?8:0)|(tick%210<180?32:0);if(tick%30===0&&tick%240<=180)u.hp=Math.max(1,u.hp-2);}
 const effects=tick%12===0?Array.from({length:4},(_,i)=>({kind:['cadence_delayed','parry_block','poison_cloud','ward_block'][i%4],x:100+i*20,y:150,targetX:320-i*20,targetY:220,face:1,tick})):[];
 r.capture(tick,{units:all,shots:[],effects},tick===3600);
}
const replay=r.finish({ticks:3600,winner:'draw'}),play=createPlayback(replay),last=play.at(3600);assert.equal(all.length,256);assert.equal(last.units.filter(u=>!u.dead).length,64);const packed=packReplay(replay,'v12-poison-stress');let now=0,complete;const wire=[];
const receiver=createReceiver({meta:packed.meta,sendAck:a=>sender.ack('g',a),onComplete:r=>complete=r}),sender=createSender({packed,recipients:['g'],send:m=>wire.push(m),now:()=>now});
for(let n=0;n<2000&&!sender.ready();n++){sender.pump();while(wire.length)receiver.receive(wire.shift());now+=100;}
assert(sender.ready());assert.deepEqual(complete,replay);console.log(JSON.stringify({pass:true,synthetic:true,ticks:3600,createdEntities:256,activePerTeam:32,bytes:packed.meta.totalBytes,chunks:packed.meta.totalChunks,mockPacedMs:now,note:'Stress only, not real SDK throughput or balance evidence'}));
