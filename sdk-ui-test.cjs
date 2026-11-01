const fs=require('fs'),vm=require('vm'),assert=require('assert');
const script=fs.readFileSync('index.html','utf8').match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1],nodes={},calls=[];
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const q=s=>nodes[s]??=((s==='canvas'||s==='#field')?{getContext:()=>ctx}:{value:'',setAttribute(){}});
const sdk={user:{async getMyUserInfo(){calls.push('profile');return {errno:0,data:{user_id:'native-mock'}}}},room:{
receiveMessage(){calls.push('receive')},async create(){calls.push('create');return {errno:0,data:{room_id:'mock-room',user_list:[{user_id:'native-mock'}]}}},
async sendMessage(){calls.push('send');return {errno:0}},async exit(){calls.push('exit');return {errno:0}}
}};
const c={TextEncoder,TextDecoder,btoa,atob,AgentSDK:sdk,crypto:{randomUUID:()=>String(Math.random())},document:{querySelector:q},Math,requestAnimationFrame:()=>{}};
vm.createContext(c);vm.runInContext(script,c);vm.runInContext("openSoloScreen()",c);const run=s=>vm.runInContext(s,c);
(async()=>{
 assert.equal(calls.length,0);
 await run("enterNative('join')");assert.equal(calls.length,0);assert(q('#roomStatus').textContent.includes('部屋ID'));
 await run("enterNative('create')");assert(calls.includes('create'));assert.equal(run('multiSnapshot.phase'),'lobby');
 await run('leaveMulti()');assert(calls.includes('exit'));assert.equal(run('multiSession'),null);assert.equal(run('currentWallet().balance'),100);
 console.log('PASS: no implicit SDK calls; explicit create installs SDK mock; missing room ID blocked; explicit exit returns solo');
})().catch(e=>{console.error(e);process.exit(1)});
