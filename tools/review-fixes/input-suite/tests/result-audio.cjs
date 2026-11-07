const fs=require('fs'),vm=require('vm'),assert=require('assert');
const h=fs.readFileSync('index.html','utf8'),m=h.indexOf('original, synthesized battle audio'),a=h.indexOf('(function (root, factory)',m),b=h.indexOf('\nconst ReactionLane=',a);
let frequencies=[];class Param{constructor(){this.value=0}setValueAtTime(v){this.value=v}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}cancelScheduledValues(){}setTargetAtTime(){}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.frequency.setValueAtTime=v=>frequencies.push(v);this.Q=new Param()}connect(){}disconnect(){}start(){}stop(){}}
class Context{constructor(){this.state='running';this.currentTime=1;this.sampleRate=8000;this.destination=new Node();this.gains=[];Context.last=this}createGain(){const n=new Node();this.gains.push(n);return n}createOscillator(){return new Node()}createBiquadFilter(){return new Node()}createBufferSource(){return new Node()}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)}}}
const sandbox={module:{exports:{}}};vm.runInNewContext(h.slice(a,b),sandbox);
function stage(won,stake){const audio=sandbox.module.exports.createBattleAudio({AudioContext:Context});audio.unlockFromGesture({isTrusted:true});audio.beginBattle('b');audio.finishBattleForChoice('b',won,{stake,deferStages:true});frequencies=[];assert(audio.playResultStage('b','stamp'));const f=frequencies.slice();assert(!audio.playResultStage('b','stamp'));assert(Context.last.gains[0].gain.value<=0.42);assert(audio.activeVoiceCount<=6);return {audio,f}}
const win=stage(true,10),loss=stage(false,10),draw=stage(null,10),zero=stage(false,0);
assert.deepEqual(win.f.slice(0,3),[392,493.88,587.33]);assert.deepEqual(loss.f.slice(0,2),[329.63,246.94]);assert.deepEqual(draw.f.slice(0,2),[392,392]);assert.deepEqual(zero.f,[392]);
assert(win.audio.playResultStage('b','delta',{delta:15,stake:10}));assert(!win.audio.playResultStage('b','delta',{delta:15,stake:10}));
assert(loss.audio.playResultStage('b','delta',{delta:-10,stake:10}));assert(draw.audio.playResultStage('b','delta',{delta:0,stake:10}));assert(zero.audio.playResultStage('b','delta',{delta:0,stake:0}));
zero.audio.setMuted(true);assert(!zero.audio.playInterface('select'));zero.audio.setSuppressed(true);assert.equal(Context.last.gains[0].gain.value,0);
console.log('deferred result cues differ, delta/duplicate guards, voice cap, mute and master level: OK');
