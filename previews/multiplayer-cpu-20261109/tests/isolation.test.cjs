'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),release=path.resolve(process.argv[2]||'multiplayer-release-20261109/publish/releases/multiplayer-controls-results-20261109');
const read=p=>fs.readFileSync(p,'utf8'),manifest=JSON.parse(read(path.join(root,'baseline/manifest.json'))),checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const baselineFiles=[...manifest.loadOrder,manifest.css.file,'manifest.json'];
check('test baseline matches integrated production release byte-for-byte',()=>{
 for(const f of baselineFiles)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'baseline',f))).digest('hex'),crypto.createHash('sha256').update(fs.readFileSync(path.join(release,f))).digest('hex'),f);
});
const page=read(path.join(root,'game.html')),wrapper=read(path.join(root,'index.html'));
const hash20=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,20);
check('test entry loads production baseline first and test hooks last',()=>{
 const scripts=[...page.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(scripts,[...manifest.loadOrder.map(x=>'baseline/'+x),...['cpu-room.js','test-harness.js'].map(x=>x+'?v='+hash20(x))]);
 assert.match(page,/data-host-shell="standalone"/);
 assert.doesNotMatch(page,/isGravity[=:\s]+(?:1|true)|hostShell=gravity/);
 assert.match(wrapper,new RegExp('<iframe[^>]*src="game\\.html\\?rev='+hash20('game.html')+'"'));
 assert.doesNotMatch(wrapper,/parent\.postMessage|scoreBridge|AgentSDK|submitScore|createWalletSession/);
});
checks.push('CPU scripts and game iframe use matching content-hash revisions');
check('production entry and referenced runtime contain no test CPU code',()=>{
 const prodManifest=JSON.parse(read(path.join(release,'manifest.json')));
 const files=['index.html',...prodManifest.loadOrder,prodManifest.css.file];
 for(const f of files)assert.doesNotMatch(read(path.join(release,f)),/DocchiCpuTest|createDocchiCpuRoom|cpu-room\.js|test-harness\.js|cpu-test-only/,f);
 const source=path.resolve(release,'../../../source/index.html');
 if(fs.existsSync(source))assert.doesNotMatch(read(source),/DocchiCpuTest|createDocchiCpuRoom|cpu-room\.js|test-harness\.js|cpu-test-only/);
});
const harness=read(path.join(root,'test-harness.js')),nodes=new Map(),posts=[],calls={sdk:0,score:0,retry:0};
const fakeWindow={top:{},parent:{postMessage:(message,origin)=>posts.push({message,origin})}};
const sandbox={window:fakeWindow,location:{origin:'https://test.example'},document:{querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector);}},pumpMulti:()=>{},ContentProfile:{CONTENT_REVISION:'fixture'},loadNativeSDK:async()=>{calls.sdk++},submitFinalScore:async()=>{calls.score++},attemptFinalScore:()=>{calls.retry++}};
vm.createContext(sandbox);vm.runInContext(harness,sandbox);
(async()=>{
 await assert.rejects(()=>sandbox.loadNativeSDK(),/GRAVITY/);
 assert.equal((await sandbox.submitFinalScore('cashout',true)).status,'test-only-not-submitted');
 assert.equal((await sandbox.submitFinalScore('bankrupt',false,true)).status,'test-only-not-submitted');
 assert.equal(sandbox.attemptFinalScore({score:999,automaticTimeout:true}).status,'test-only-not-submitted');
 assert.deepEqual(calls,{sdk:0,score:0,retry:0});
 checks.push('native SDK connection, cashout, bankruptcy, timeout and score retry are blocked');
 assert.equal(posts.length,1);assert.equal(posts[0].message.type,'docchi-cpu-test-ready');assert.equal(posts[0].origin,'https://test.example');
 assert.equal(nodes.get('#joinRoom').disabled,true);assert.equal(nodes.get('#roomId').disabled,true);assert.equal(nodes.get('#publicRooms').hidden,true);
 checks.push('only same-origin ready message posted; native join inputs disabled');
 const direct={...sandbox,window:{}};direct.window.top=direct.window;vm.createContext(direct);assert.throws(()=>vm.runInContext(harness,direct),/Open index.html/);
 checks.push('direct game entry rejected; test wrapper required');
 const out={status:'PASS',release:path.basename(release),checks,limits:['Score isolation verified by executed test hooks and static production separation. Real GRAVITY server calls are deliberately not exercised.']};
 fs.writeFileSync(path.join(root,'evidence/isolation-results.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
