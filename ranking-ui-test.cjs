const fs=require('fs'),vm=require('vm'),assert=require('assert');const script=fs.readFileSync('index.html','utf8').match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1];
function app(embedded,success=true){const calls=[],profiles=[],ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),d={getContext:()=>ctx,setAttribute(){}};const c={TextEncoder,TextDecoder,btoa,atob,Math,setTimeout,clearTimeout,document:{querySelector:()=>d},requestAnimationFrame:()=>{},AgentSDK:{room:{},user:{async getMyUserInfo(){profiles.push(1);return {errno:success?0:1,data:{user_id:'native-user'}}}}}};if(embedded)c.parent={postMessage:(...args)=>calls.push(args)};vm.createContext(c);vm.runInContext(script,c);vm.runInContext("openSoloScreen()",c);return {c,calls,profiles,run:s=>vm.runInContext(s,c)}}
(async()=>{
 const a=app(true);assert.equal(a.profiles.length,0);assert.equal(a.calls.length,0);
 a.run(`walletState=Wallet.createSession({sessionId:'score-session',playerIds:[PLAYER]});for(let r=1;r<=20;r++){walletState=Wallet.openRound(walletState,{sessionId:'score-session',roundId:r,deadline:10});walletState=Wallet.commitPrediction(walletState,{sessionId:'score-session',roundId:r,playerId:PLAYER,side:r<=2?'A':null,stake:r<=2?50:0,now:0});walletState=Wallet.settleRound(walletState,{sessionId:'score-session',roundId:r,outcome:'B',now:0})}round=20;state='result';`);
 const request=a.run("submitFinalScore('replay')");a.run('freshWallet()');await request;
 assert.equal(a.profiles.length,1);assert.deepEqual(JSON.parse(JSON.stringify(a.calls)),[[{type:'gameOver',score:-100},'*']]);
 await a.run("submitFinalScore('replay')");assert.equal(a.calls.length,1);
 const b=app(false);await b.run("submitFinalScore('finish')");assert.equal(b.profiles.length,0);assert.equal(b.calls.length,0);
 console.log('PASS: official-style embedded runtime detected through successful SDK profile, no manual flag required; no startup calls; captured signed score survives replay reset; standalone never sends');
})().catch(e=>{console.error(e);process.exit(1)});
