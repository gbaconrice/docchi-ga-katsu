'use strict';
// Portable: GAME_HTML selects the candidate; GAME_HARNESS selects the existing engine fixture.
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const html=path.resolve(process.argv[2]||process.env.GAME_HTML||path.join(__dirname,'../isolated/index.html'));
const source=fs.readFileSync(html,'utf8');process.env.GAME_HTML=html;
for(const [i,m]of [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())new vm.Script(m[1],{filename:'script-'+i});
const harness=process.env.ENGINE_HARNESS||process.env.HARNESS_PATH||process.env.GAME_HARNESS||path.resolve(__dirname,'../../tools/boss-abilities/tests/harness.cjs');
const {ev,context}=require(harness);context.URL=URL;
const baseCreate=context.document.createElement;
context.document.createElement=tag=>({...baseCreate(tag),style:{},children:[],attributes:{},appendChild(n){this.children.push(n);n.parentNode=this;return n},replaceChildren(...n){this.children=n;for(const v of n)v.parentNode=this},setAttribute(k,v){this.attributes[k]=String(v)},getAttribute(k){return this.attributes[k]??null}});
let now=10000;context.Date=class extends Date{static now(){return now}};
const fields=ev('BattleFields.FIELD_IDS');
for(const fieldId of fields){
 context.testFieldId=fieldId;
 const label=ev('(()=>{for(let seed=0;seed<10000;seed++){const e=BattleFields.selectRunEnvironment(seed,Math.max(...BattleFields.STRENGTHS));if(e.fieldId===testFieldId)return inlineFieldLabel(e)}throw Error("no seed")})()');
 assert(label&&!label.includes('…')&&!label.includes('...'),fieldId+' exact full label');
 console.log('PASS full terrain label '+fieldId+': '+label);
}
ev('openSoloScreen();');
for(const state of ['choose','fight','result']){
 context.testState=state;now+=2000;
 ev('state=testState;paused=false;syncReactions();reactionToggle.onclick({});document.querySelector("#reactionWow").onclick({});');
 assert.equal(ev('participantNodes.size'),1);
 assert.equal(ev('participantNodes.get("local").badge.hidden'),false);
 assert.equal(ev('participantNodes.get("local").badge.textContent'),'😮');
 assert.equal(ev('document.querySelector("#reaction-feedback").hidden'),true);
 console.log('PASS actual solo sender badge and no obsolete feedback in '+state);
}
ev('reactionChannel?.close();reactionChannel=null;reactionSessionKey=null;multiUser="p0";multiSession={};multiAdapter={getRoomId:()=>"fixture-room",getProfile:id=>({name:"参加者 "+id,avatarUrl:null}),sendReaction:()=>true};multiSnapshot={sessionId:"fixture-session",roundId:round,phase:"predict",participants:Array.from({length:8},(_,i)=>"p"+i),spectators:[],departedIds:[],cashedOutIds:[]};multiBusy=false;multiRecording=false;multiPlayback={};predictionPreview=false;paused=false;pausePanelOpen=false;unitsOpen=false;');
for(const [state,phase]of [['choose','predict'],['fight','battle'],['result','result']]){
 context.testState=state;context.testPhase=phase;now+=2000;
 ev('state=testState;multiSnapshot.phase=testPhase;syncReactions();reactionToggle.onclick({});document.querySelector("#reactionCheer").onclick({});');
 assert.equal(ev('participantNodes.size'),8);
 assert.equal(ev('participantNodes.get("p0").badge.hidden'),false);
 for(let i=1;i<8;i++){
  context.testPeer='p'+i;context.testSequence=state==='choose'?1:state==='fight'?2:3;
  assert.equal(ev('receiveReaction(testPeer,JSON.stringify({protocol:ReactionLane.REACTION_PROTOCOL,mode:ReactionLane.REACTION_MODE,version:1,type:"reaction",roomId:"fixture-room",sessionId:"fixture-session",roundId:round,emoji:"wow",seq:testSequence}))'),true);
  assert.equal(ev('participantNodes.get(testPeer).badge.textContent'),'😮');
  assert.equal(ev('participantNodes.get(testPeer).badge.hidden'),false);
 }
 assert.equal(ev('document.querySelector("#reaction-feedback").hidden'),true);
 assert.equal(ev('document.querySelector("#reactionOutside").hidden'),true);
 console.log('PASS eight actual participant badges and no obsolete surfaces in '+state);
}
now+=4000;ev('syncReactions()');assert.equal(ev('[...participantNodes.values()].every(p=>p.badge.hidden)'),true);
console.log('PASS badge expiry; all embedded scripts compile; existing protocol retained');
