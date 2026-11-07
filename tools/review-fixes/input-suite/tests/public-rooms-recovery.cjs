'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.env.GAME_HTML||process.argv[2]||'index.html','utf8');
function extract(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert(a>=0&&b>a,start);return html.slice(a,b);}
const code=extract('async function loadNativeSDKRaw(){','async function enterNative(kind){')+extract('let publicRoomRequest=0;','document.querySelector(\'#refreshPublicRooms\').onclick');
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function fixture(){
 let now=0,id=0;const timers=new Map(),scripts=[];
 function node(){return {children:[],disabled:false,textContent:'',replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}};}
 const nodes=new Map(['#publicRoomsList','#publicRoomsStatus','#refreshPublicRooms','#roomId','#publicRooms'].map(key=>[key,node()]));
 const context=vm.createContext({console,document:{head:{appendChild:s=>scripts.push(s)},createElement:node,querySelector:sel=>nodes.get(sel)},screenMode:'room',multiSession:null,multiBusy:false,enterNative:()=>Promise.resolve(),setTimeout:(fn,ms)=>{const key=++id;timers.set(key,{fn,at:now+ms});return key;},clearTimeout:key=>timers.delete(key)});
 vm.runInContext(code,context);
 const run=()=>vm.runInContext('refreshPublicRooms()',context),change=source=>vm.runInContext(source,context),status=()=>nodes.get('#publicRoomsStatus').textContent,disabled=()=>nodes.get('#refreshPublicRooms').disabled,items=()=>nodes.get('#publicRoomsList').children;
 async function advance(ms){const target=now+ms;await flush();while(true){const next=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();}now=target;await flush();}
 const install=(fn=()=>Promise.resolve(reply()))=>context.AgentSDK={user:{},room:{getPublicRoomList:fn}};
 return {context,nodes,scripts,timers,run,change,status,disabled,items,advance,install};
}
const reply=(id='open',count=2,max=8)=>({errno:0,data:{list:[{room_id:id,gamer_num:count,max_players:max}]}});
const tests=[];function test(name,fn){tests.push([name,fn]);}

test('healthy SDK preserves open/full/empty room UI and clears deadline',async()=>{
 const f=fixture();f.install(()=>Promise.resolve({errno:0,data:{list:[...reply().data.list,...reply('full',8).data.list]}}));await f.run();assert.equal(f.items().length,2);assert.match(f.items()[0].textContent,/open.*2\/8.*空きあり/);assert.equal(f.items()[1].disabled,true);assert.match(f.status(),/進行状況は参加後/);assert.equal(f.disabled(),false);assert.equal(f.timers.size,0);
 f.install(()=>Promise.resolve({errno:0,data:{list:[]}}));await f.run();assert.match(f.status(),/ありません/);assert.equal(f.items().length,0);
});
test('SDK script no response recovers at 8 seconds, not infinite loading',async()=>{
 const f=fixture(),p=f.run();await f.advance(7999);assert.equal(f.disabled(),true);assert.equal(f.status(),'取得中…');await f.advance(1);await p;assert.equal(f.disabled(),false);assert.match(f.status(),/タイムアウト.*GRAVITY.*更新/);assert.equal(f.items().length,0);assert.equal(f.scripts.length,1);
});
test('SDK script error releases refresh; next click loads a new script and recovers',async()=>{
 const f=fixture(),p=f.run();f.scripts[0].onerror();await p;assert.equal(f.disabled(),false);assert.match(f.status(),/取得できません/);const p2=f.run();assert.equal(f.scripts.length,2);f.install();f.scripts[1].onload();await p2;assert.equal(f.items().length,1);assert.equal(f.disabled(),false);assert.equal(f.timers.size,0);
});
test('SDK missing expected globals rejects and enables retry',async()=>{
 const f=fixture(),p=f.run();f.scripts[0].onload();await p;assert.equal(f.disabled(),false);assert.match(f.status(),/取得できません/);
});
test('SDK late load after expired request must not send list call',async()=>{
 const f=fixture();let calls=0;const p=f.run();await f.advance(8000);await p;f.install(()=>{calls++;return Promise.resolve(reply());});f.scripts[0].onload();await flush();assert.equal(calls,0);assert.match(f.status(),/タイムアウト/);assert.equal(f.items().length,0);
});
test('retry reuses pending shared SDK load without duplicate script or stale list call',async()=>{
 const f=fixture();let calls=0;const p=f.run();await f.advance(8000);await p;const retry=f.run();f.install(()=>{calls++;return Promise.resolve(reply('retry'));});assert.equal(f.scripts.length,1);f.scripts[0].onload();await retry;assert.equal(calls,1);assert.match(f.items()[0].textContent,/retry/);assert.equal(f.disabled(),false);
});
test('native bridge no response gets deadline and late success cannot overwrite retry',async()=>{
 const f=fixture();let resolve;f.install(()=>new Promise(r=>resolve=r));const p=f.run();await f.advance(8000);await p;assert.match(f.status(),/タイムアウト/);assert.equal(f.disabled(),false);f.install(()=>Promise.resolve(reply('new')));await f.run();resolve(reply('old'));await flush();assert.match(f.items()[0].textContent,/new/);assert.equal(f.items().length,1);
});
test('late bridge rejection stays handled after timeout',async()=>{
 const f=fixture();let reject;f.install(()=>new Promise((_,r)=>reject=r));const p=f.run();await f.advance(8000);await p;reject(Error('late'));await flush();assert.match(f.status(),/タイムアウト/);assert.equal(f.disabled(),false);
});
test('slow SDK and native bridge share a single total 8 second budget',async()=>{
 const f=fixture(),p=f.run();await f.advance(7000);f.install(()=>new Promise(()=>{}));f.scripts[0].onload();await flush();await f.advance(999);assert.equal(f.disabled(),true);await f.advance(1);await p;assert.equal(f.disabled(),false);assert.match(f.status(),/タイムアウト/);
});
test('navigate away while SDK loads suppresses late native list request',async()=>{
 const f=fixture();let calls=0;const p=f.run();f.change("screenMode='home';publicRoomRequest++;document.querySelector('#refreshPublicRooms').disabled=false");f.install(()=>{calls++;return Promise.resolve(reply());});f.scripts[0].onload();await p;assert.equal(calls,0);assert.equal(f.items().length,0);assert.equal(f.timers.size,0);
});
test('older failure does not unlock or overwrite a newer active request',async()=>{
 const f=fixture();let rejectFirst,resolveSecond;f.install(()=>new Promise((_,reject)=>rejectFirst=reject));const first=f.run();await flush();f.install(()=>new Promise(resolve=>resolveSecond=resolve));const second=f.run();await flush();rejectFirst(Error('old'));await first;assert.equal(f.disabled(),true);assert.equal(f.status(),'取得中…');resolveSecond(reply('current'));await second;assert.equal(f.disabled(),false);assert.match(f.items()[0].textContent,/current/);
});
test('room joined or navigation back prevents stale result replacing UI',async()=>{
 for(const transition of ["multiSession={}","screenMode='home';publicRoomRequest++"]){const f=fixture();let resolve;f.install(()=>new Promise(r=>resolve=r));const p=f.run();await flush();f.change(transition);resolve(reply());await p;assert.equal(f.items().length,0);assert.equal(f.timers.size,0);}
});
test('invalid payload, absent list API, thrown API and rejected API recover normally',async()=>{
 for(const sdk of [{user:{},room:{}},{user:{},room:{getPublicRoomList:()=>{throw Error('boom');}}},{user:{},room:{getPublicRoomList:()=>Promise.reject(Error('no'))}},{user:{},room:{getPublicRoomList:()=>Promise.resolve({errno:1})}},{user:{},room:{getPublicRoomList:()=>Promise.resolve(reply('invalid',9,8))}}]){const f=fixture();f.context.AgentSDK=sdk;await f.run();assert.match(f.status(),/取得できません/);assert.equal(f.disabled(),false);assert.equal(f.timers.size,0);}
});
test('shared SDK remains available to room creation/join after public list timeout',async()=>{
 const f=fixture(),p=f.run(),sdkPromise=f.change('loadNativeSDK()');await f.advance(8000);await p;assert.equal(f.scripts.length,1);const sdk=f.install();f.scripts[0].onload();assert.strictEqual(await sdkPromise,sdk);await flush();assert.match(f.status(),/タイムアウト/);
});
module.exports={fixture,reply};
if(require.main===module)(async()=>{let passed=0;for(const [name,fn] of tests){let watchdog;try{await Promise.race([fn(),new Promise((_,reject)=>{watchdog=setTimeout(()=>reject(Error('Test did not settle: '+name)),5000);})]);}finally{clearTimeout(watchdog);}passed++;console.log('PASS '+name);}console.log(JSON.stringify({passed,total:tests.length,scope:'Focused VM timer/bridge faults; not a real GRAVITY host'}));})().catch(e=>{console.error(e);process.exitCode=1;});
