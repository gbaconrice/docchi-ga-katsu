const assert=require('assert');
const {vm,context}=require('./cashout-harness.js');context.assert=assert;
const result=vm.runInContext(`(async()=>{
 const results=[];
 async function check(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS',name)}catch(e){results.push({name,passed:false,error:e.message});console.error('FAIL',name,e.message)}}
 function reset(){multiBusy=false;multiRecording=false;mockGuest=null;multiSnapshot=null;multiPlayback=null;multiReplay=null;multiUser='host';multiHost=true;multiAdapter=null;multiSession=null;}
 function fakeSession(close=()=>{}){return {getState:()=>({phase:'lobby',wallets:null}),close}}
 await check('double tap makes one native exit and one reset',async()=>{
  reset();let calls=0,closeCalls=0;const resolvers=[];
  multiSession=fakeSession(()=>closeCalls++);multiAdapter={exit:()=>{calls++;return new Promise(r=>resolvers.push(r))}};
  const beforeCounter=walletSessionCounter,first=leaveMulti(),second=leaveMulti(),startedCalls=calls;
  resolvers.forEach(r=>r());await Promise.all([first,second]);
  assert.equal(startedCalls,1);assert.equal(closeCalls,1);assert.equal(walletSessionCounter-beforeCounter,1);assert.equal(multiBusy,false);assert.equal(multiSession,null);
 });
 await check('pending room entry remains serialized',async()=>{
  reset();let calls=0;multiBusy=true;multiSession=fakeSession();multiAdapter={exit:async()=>{calls++}};
  const token=replayJobToken,owner=multiSession;await leaveMulti();
  const facts={calls,busy:multiBusy,token:replayJobToken,owner:multiSession};reset();
  assert.equal(facts.calls,0);assert.equal(facts.busy,true);assert.equal(facts.token,token);assert.equal(facts.owner,owner);
 });
 await check('exit still cancels active replay preparation',async()=>{
  reset();let calls=0,resolve;multiBusy=true;multiRecording=true;multiSession=fakeSession();multiAdapter={exit:()=>{calls++;return new Promise(r=>resolve=r)}};
  const token=replayJobToken,leaving=leaveMulti();
  assert.equal(calls,1);assert.equal(replayJobToken,token+1);assert.equal(multiRecording,false);assert.equal(multiBusy,true);
  resolve();await leaving;assert.equal(multiSession,null);assert.equal(multiBusy,false);
 });
 await check('failed exit retains session and permits explicit retry',async()=>{
  reset();let calls=0;const owner=fakeSession();multiSession=owner;multiAdapter={exit:async()=>{calls++;if(calls===1)throw Error('test-network-failure')}};
  const counter=walletSessionCounter;await leaveMulti();assert.equal(multiSession,owner);assert.equal(multiBusy,false);assert.equal(walletSessionCounter,counter);assert(document.querySelector('#roomStatus').textContent.includes('退出失敗'));
  await leaveMulti();assert.equal(calls,2);assert.equal(multiSession,null);assert.equal(multiBusy,false);assert.equal(walletSessionCounter-counter,1);
 });
 await check('late duplicate cannot close a later room',async()=>{
  reset();let calls=0,newCloses=0;const resolvers=[];multiSession=fakeSession();multiAdapter={exit:()=>{calls++;return new Promise(r=>resolvers.push(r))}};
  const first=leaveMulti(),second=leaveMulti();resolvers[0]();await first;
  const newRoom=fakeSession(()=>newCloses++);multiSession=newRoom;
  if(resolvers[1])resolvers[1]();await second;
  const facts={calls,newCloses,session:multiSession};reset();
  assert.equal(facts.calls,1);assert.equal(facts.newCloses,0);assert.equal(facts.session,newRoom);
 });
 await check('mock room exit remains immediate',async()=>{
  reset();let closes=0;multiSession=fakeSession(()=>closes++);mockGuest={};await leaveMulti();assert.equal(closes,1);assert.equal(multiSession,null);assert.equal(mockGuest,null);assert.equal(multiBusy,false);
 });
 return results;
})()`,context);
const watchdog=setTimeout(()=>{console.error('FAIL async regression watchdog');process.exit(2)},10000);
result.then(results=>{clearTimeout(watchdog);console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.passed).length,results},null,2));process.exitCode=results.some(x=>!x.passed)?1:0},e=>{clearTimeout(watchdog);console.error(e);process.exitCode=1});
