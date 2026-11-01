const fs=require('fs'),vm=require('vm'),assert=require('assert');const script=fs.readFileSync('index.html','utf8').match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1];
let real=1000,dropped=false;const queue=[];
function app(user,offset){const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),nodes={},q=s=>nodes[s]??=((s==='canvas'||s==='#field')?{getContext:()=>ctx}:{setAttribute(){},value:''}),Clock=class extends Date{static now(){return real+offset}},math=Object.create(Math);math.random=()=>.12345;
 const c={TextEncoder,TextDecoder,btoa,atob,Date:Clock,Math:math,document:{querySelector:q},requestAnimationFrame:()=>{},sendWire:wire=>{const m=JSON.parse(wire);if(m.type==='replay-chunk'&&m.index===1&&!dropped){dropped=true;return;}queue.push({at:real+(m.type==='replay-chunk'?3200:40),from:user,to:user==='h'?'g':'h',wire})}};
 vm.createContext(c);vm.runInContext(script,c);vm.runInContext("openSoloScreen()",c);return {c,run:s=>vm.runInContext(s,c)};
}
const h=app('h',500000),g=app('g',507000),apps={h,g};
h.run("multiUser='h';multiHost=true;multiSession=MultiBinding.createWalletSession({roomId:'clock-ui',sessionId:'clock-ui-session',userId:'h',hostId:'h',members:['g'],send:sendWire,onChange:onMultiChange});multiSnapshot=multiSession.getState()");
g.run("multiUser='g';multiHost=false;multiSession=MultiProtocol.createSession({roomId:'clock-ui',sessionId:'clock-ui-session',userId:'g',hostId:'h',members:['g'],send:sendWire,onChange:onMultiChange});multiSnapshot=multiSession.getState();multiSession.hello()");
let comparisons=0,firstGuestTick=null;
function advance(end){while(real<end){real+=10;for(let i=0;i<queue.length;){if(queue[i].at<=real){const e=queue.splice(i,1)[0];apps[e.to].c.sender=e.from;apps[e.to].c.wire=e.wire;apps[e.to].run('multiSession.receive(sender,wire)');}else i++}
 for(const a of [h,g])a.run('pumpMulti(Date.now())');
 if(g.run("!!multiPlayback&&multiSnapshot.phase==='battle'")&&h.run("multiSnapshot.phase==='battle'")){const gt=g.run('multiLastSceneTick'),ht=h.run('multiLastSceneTick');if(firstGuestTick===null)firstGuestTick=gt;assert.equal(gt,ht);comparisons++;}
}}
advance(1200);g.run('formationVisible=true;var draws=0;const originalDraw=draw;draw=function(){draws++;originalDraw()};');h.run('openMultiRound()');advance(1400);assert.equal(g.run('multiSnapshot.phase'),'predict');assert(g.run('draws')>0,'guest formation must draw incoming matchup');console.log('PASS: visible guest formation refreshes canonical incoming matchup');
