import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {createCompactRecorder,createPlayback} from './compact-replay.mjs';
import {packReplay,createSender,createReceiver} from '../multiplayer/replay-transfer.mjs';
const script=fs.readFileSync('index.html','utf8').match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1],ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),d={getContext:()=>ctx,setAttribute(){}};
const c={TextEncoder,TextDecoder,btoa,atob,Math,document:{querySelector:()=>d},requestAnimationFrame:()=>{},makeRecorder:createCompactRecorder};
vm.createContext(c);vm.runInContext(script,c);const run=s=>vm.runInContext(s,c);
const output=[];
for(const initialPerSide of [8,32]){
 c.initialPerSide=initialPerSide;
 const record=run(`(()=>{setup(1);units=[];for(let side=0;side<2;side++)for(let i=0;i<initialPerSide;i++){const k=initialPerSide===8?'wraith':i<8?'wraith':'goblin';units.push({id:side*1000+i,token:String(side*1000+i),k,side,x:30+(i%8)*55,y:(side?420:118)+(side?-1:1)*Math.floor(i/8)*20,hp:TYPES[k].hp,cd:0,priority:(side*32+i+.5)/65,dead:false})}state='fight';const recorder=makeRecorder();const read=()=>({units,shots,poseFor:spriteFrame,facingFor:u=>visualFor(u).face,movingFor:u=>visualFor(u).moving,effects:newEffects});let ticks=0,maxAlive=0,maxRecords=units.length,spawn=0;recorder.capture(0,read());while(state==='fight'&&ticks<3601){spriteStep(1/60);ticks++;for(let side=0;side<2;side++)maxAlive=Math.max(maxAlive,units.filter(u=>u.side===side&&!u.dead).length);maxRecords=Math.max(maxRecords,units.length);spawn+=combatEvents.filter(e=>e.type==='summon_spawn').length;recorder.capture(ticks,read(),state==='result')}return {trace:recorder.finish({ticks,winner:winner===null?'draw':winner===0?'A':'B'}),maxAlive,maxRecords,spawn}})()`);
 assert(record.maxAlive<=64);assert(record.maxRecords<=512);
 const player=createPlayback(record.trace);player.at(record.trace.ticks);
 let now=0,complete;const packed=packReplay(record.trace,'large-'+initialPerSide);
 const queue=[],receiver=createReceiver({meta:packed.meta,sendAck:a=>sender.ack('guest',a),onComplete:r=>complete=r}),sender=createSender({packed,recipients:['guest'],send:m=>queue.push(m),now:()=>now});
 for(let i=0;i<20000&&!sender.ready();i++){sender.pump();while(queue.length)receiver.receive(queue.shift());now+=100;}
 assert.equal(JSON.stringify(complete),JSON.stringify(record.trace));
 output.push({initialPerSide,seconds:record.trace.ticks/60,maxAlivePerSide:record.maxAlive,maxRecords:record.maxRecords,spawnEvents:record.spawn,jsonBytes:packed.meta.totalBytes,chunks:packed.meta.totalChunks,mockPacedMs:now});
}
console.log(JSON.stringify({pass:true,scope:'real core headless stress, not normal generation or SDK throughput',results:output}));
