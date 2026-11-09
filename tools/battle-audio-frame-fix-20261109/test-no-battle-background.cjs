'use strict';
const fs=require('fs'),assert=require('assert');
const {load}=require('./test-integrated-audio.cjs');
const before=fs.readFileSync(process.argv[2],'utf8'),after=fs.readFileSync(process.argv[3],'utf8');
function battle(html){const f=load(html);f.api.unlockFromGesture({isTrusted:true});f.api.beginBattle('quiet');f.context.advance(2);return f;}
const old=battle(before),f=battle(after);
const oldContinuous=old.sources.filter(s=>!Number.isFinite(s.stoppedAt));
assert.deepEqual(oldContinuous.map(s=>s.frequency.value),[55,82.41,110]);
assert.equal(f.sources.filter(s=>!Number.isFinite(s.stoppedAt)).length,0);
assert.equal(f.api.activeVoiceCount,0);assert.equal(f.api.activeNodeCount,1);
let since=f.sources.length;
for(let i=0;i<30;i++){f.context.advance(3+i);f.api.setPhase('battle');}
assert.equal(f.sources.length,since,'no repeating melody between combat events');
assert.equal(f.api.ambientLevel,0);
for(const type of ['resolved_hit','heal','bomb_explode','chain_link']){
 f.context.advance(f.context.currentTime+2);
 const start=f.sources.length;
 f.api.ingestCombatEvents([{type,sourceKind:'sword',sourceToken:'x',amount:20,actualAmount:10,index:0,x:240}],{battleId:'quiet',tick:start+1});
 assert(f.sources.length>start,type+' still has a sound');
 assert(f.sources.slice(start).every(s=>Number.isFinite(s.stoppedAt)),'effects all have finite stopping time');
}
f.context.advance(50);f.api.setMuted(true);f.api.setMuted(false,{isTrusted:true});f.api.setPaused(true);f.api.setPaused(false,{isTrusted:true});f.api.setSuppressed(true);f.api.setSuppressed(false);
for(const phase of ['idle','battle','result','battle'])f.api.setPhase(phase);
assert.equal(f.sources.filter(s=>!Number.isFinite(s.stoppedAt)).length,0);
f.context.advance(60);assert.equal(f.api.activeVoiceCount,0);assert.equal(f.api.activeNodeCount,1);
f.api.destroy();assert.equal(f.api.activeNodeCount,0);
// Every function that emits or schedules SFX is text-identical. Only ambience
// and its ducking were removed. The combat bank and all encoded audio unchanged.
const names=['startVoice','endVoice','stopVoice','attachSource','addTone','addNoise','playCue','playSelection','playInterface','ingestCombatEvents','ingestReplayEffects'];
function body(html,name){const a=html.indexOf('    function '+name+'(');assert(a>=0,name);let b=html.indexOf('\n    function ',a+5);return html.slice(a,b<0?undefined:b);}
for(const name of names){let x=body(before,name),y=body(after,name);x=x.replace("      duckAmbient(kind === 'bomb' ? 0.72 : 0.77, kind === 'bomb' ? 0.34 : 0.25);\n",'');assert.equal(y,x,name+' unchanged');}
const encoded=html=>[...html.matchAll(/[A-Za-z0-9+/]{1000,}={0,2}/g)].map(m=>m[0]);
assert.deepEqual(encoded(before),encoded(after),'all embedded images, encoded baseline audio and backups unchanged');
console.log(JSON.stringify({result:'PASS',beforeContinuousHz:oldContinuous.map(s=>s.frequency.value),afterContinuousSources:0,afterIdleNodes:1,noNewSourcesDuring30Seconds:true,finiteEffectsPreserved:['attack','heal','explosion','chain'],lifecycleRestartsRemainQuiet:true,effectFunctionsUnchanged:names,embeddedAssetsUnchanged:true,scope:'audio-only comparison',limits:'Structural Web Audio doubles, not a subjective or physical-device hearing test.'},null,2));
