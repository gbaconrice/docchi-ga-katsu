const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const marker = html.indexOf('original, synthesized battle audio');
const start = html.indexOf('(function (root, factory)', marker);
const end = html.indexOf('\nconst ReactionLane=', start);
const sandbox = {module:{exports:{}}, console};
vm.runInNewContext(html.slice(start, end), sandbox);
let context;
class Param { constructor(){this.value=0;} setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} cancelScheduledValues(){} setTargetAtTime(){} }
class Node { constructor(){this.gain=new Param();this.frequency=new Param();this.Q=new Param();} connect(){} disconnect(){} start(){} stop(){} }
class AudioContext { constructor(){context=this;this.currentTime=1;this.sampleRate=44100;this.state='running';this.destination=new Node();} createGain(){return new Node();} createOscillator(){return new Node();} createBiquadFilter(){return new Node();} createBufferSource(){return new Node();} createBuffer(){return {getChannelData:()=>new Float32Array(4096)};} }
const a = sandbox.module.exports.createBattleAudio({AudioContext});
assert(a.unlockFromGesture({isTrusted:true}));
assert(a.beginBattle('a', {isTrusted:true}));
context.currentTime += 1;
const meta={battleId:'a',tick:1};
assert.equal(a.ingestCombatEvents([{type:'summon_spawn',childToken:'c'},{type:'projectile_release',sourceKind:'archer'}],meta),2);
assert.equal(a.ingestCombatEvents([{type:'summon_spawn',childToken:'c'}],meta),0);
assert.equal(a.ingestCombatEvents([{type:'summon_spawn'}],{battleId:'old',tick:2}),0);
assert(a.activeVoiceCount<=6); assert(a.activeNodeCount<=48);
context.currentTime += 1;
assert.equal(a.ingestCombatEvents([{type:'summon_spawn',childToken:'z'},{type:'split_spawn',childToken:'z'}],{battleId:'a',tick:3}),1);
a.setMuted(true);
assert.equal(a.ingestCombatEvents([{type:'aegis_block'}],{battleId:'a',tick:4}),0);
a.setMuted(false); a.setPaused(true);
assert.equal(a.ingestCombatEvents([{type:'aegis_block'}],{battleId:'a',tick:5}),0);
console.log('audio event batching, split dedupe, stale battle/tick, caps and mute/pause: OK');
