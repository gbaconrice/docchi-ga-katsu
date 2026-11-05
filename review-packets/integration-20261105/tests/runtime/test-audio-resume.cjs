'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');
const runtime=process.env.GAME_JS||path.join(__dirname,'candidate-runtime.js');
class Param{constructor(){this.value=0}setValueAtTime(v){this.value=v}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}cancelScheduledValues(){}setTargetAtTime(){}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.Q=new Param()}connect(){}disconnect(){}start(){}stop(){}}
class Context{
 constructor(){this.state='running';this.currentTime=1;this.sampleRate=8000;this.destination=new Node();this.resumeCount=0;Context.last=this}
 createGain(){return new Node()}createOscillator(){return new Node()}createBiquadFilter(){return new Node()}createBufferSource(){return new Node()}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)}}
 suspend(){this.state='suspended';return Promise.resolve()}
 resume(){this.resumeCount++;return new Promise((resolve,reject)=>{this.resolveResume=()=>{this.state='running';resolve()};this.rejectResume=reject})}
 close(){this.state='closed';return Promise.resolve()}
}
process.env.GAME_JS=runtime;
let harness=fs.readFileSync(path.join(__dirname,'harness.cjs'),'utf8');
harness=harness.replace('let context=vm.createContext(sandbox);','sandbox.AudioContext=FakeContext;let context=vm.createContext(sandbox);').replace('module.exports={vm,context};','module.exports={vm,context,events,nodes,doc};');
const moduleCopy={exports:{}};new Function('require','module','FakeContext',harness)(require,moduleCopy,Context);
const {vm,context,events,nodes,doc}=moduleCopy.exports,ev=s=>vm.runInContext(s,context),flush=async()=>{await Promise.resolve();await Promise.resolve()};
const target=nodes.get('#zoomIn');doc.querySelector('#app').contains=el=>el===target;
function fire(type,extra={}){const e={isTrusted:true,target,key:'Enter',preventDefault(){},...extra};for(const fn of events[type]||[])fn(e)}
function background(){doc.hidden=true;fire('visibilitychange');doc.hidden=false;fire('visibilitychange')}
(async()=>{
 ev("openSoloScreen()");fire('pointerdown');fire('click');assert.equal(Context.last,undefined,'generic interaction must not create the first audio context');
 nodes.get('#soloStart').onclick({isTrusted:true});const audio=Context.last;assert(audio);assert.equal(audio.resumeCount,0);
 background();assert.equal(audio.state,'suspended');assert.equal(audio.resumeCount,0,'visibility return is not a trusted unlock gesture');
 fire('pointerdown',{isTrusted:false});fire('click',{target:{}});assert.equal(audio.resumeCount,0,'untrusted/outside input must not resume');
 fire('pointerdown');fire('click');fire('keydown');assert.equal(audio.resumeCount,1,'one pending resume across pointerdown, click and keyboard');
 nodes.get('#zoomIn').onclick({isTrusted:true,target});assert.equal(audio.resumeCount,1);audio.resolveResume();await flush();assert.equal(audio.state,'running');
 fire('pointerdown');fire('click');assert.equal(audio.resumeCount,1,'running context is not resumed again');
 background();ev('battleAudio.setMuted(true)');fire('pointerdown');fire('click');assert.equal(audio.resumeCount,1);assert.equal(ev('battleAudio.muted'),true,'generic input must preserve mute');
 ev('battleAudio.setMuted(false);battleAudio.setPaused(true)');fire('click');assert.equal(audio.resumeCount,1,'paused audio must not resume');ev('battleAudio.setPaused(false);battleAudio.setSuppressed(true)');fire('click');assert.equal(audio.resumeCount,1,'recording-suppressed audio must not resume');ev('battleAudio.setSuppressed(false)');
 ev("screenMode='home'");fire('click');assert.equal(audio.resumeCount,1);ev("screenMode='game'");doc.hidden=true;fire('click');assert.equal(audio.resumeCount,1);doc.hidden=false;
 fire('keydown');assert.equal(audio.resumeCount,2,'trusted keyboard activation resumes after return');audio.rejectResume(Error('controlled denial'));await flush();
 fire('click');assert.equal(audio.resumeCount,3,'failed resume can be retried by a later trusted input');audio.resolveResume();await flush();
 background();const before=audio.resumeCount;nodes.get('#pause').onclick({isTrusted:true,target});assert.equal(audio.resumeCount,before+1,'existing explicit pause resume still works');
 console.log('PASS real audio wiring: first opt-in, background return, scoped trusted input, one pending resume, mute/pause/hidden/recording guards, failure retry and existing explicit controls');
})().catch(error=>{console.error(error);process.exitCode=1});
