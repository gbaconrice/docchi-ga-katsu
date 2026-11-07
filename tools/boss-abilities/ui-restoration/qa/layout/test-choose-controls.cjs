'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {sourcePath,testRoot}=require('./resolve-inputs.cjs').resolveInputs(process.argv[2]);
const source=fs.readFileSync(sourcePath,'utf8');
const harness=fs.readFileSync(path.join(testRoot,'bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')",'htmlInput');
new Function('require','htmlInput','assert',harness+`
sandbox.TextEncoder=TextEncoder;
const run=s=>vm.runInContext(s,context,{timeout:30000}),n=id=>nodes.get('#'+id);
const click=id=>{assert(n(id)&&typeof n(id).onclick==='function',id+' actual handler');n(id).onclick({isTrusted:true,preventDefault(){},stopPropagation(){}});};
const visible=()=>{for(const id of ['soundToggle','pause','reactionToggle','unitsToggle'])assert.equal(n(id).hidden,false,id+' visible');};
assert.equal(run('state'),'choose');visible();
for(const id of ['pause','reactionToggle','unitsToggle'])assert.equal(n(id).disabled,false,id+' choose enabled');
const soloWallet=run('JSON.stringify(walletState)');
click('pause');assert.equal(run('pausePanelOpen'),true);assert.equal(n('pausePanel').hidden,false);assert.equal(n('pauseTitle').textContent,'メニュー');assert.equal(n('pauseResume').textContent,'閉じる');assert.equal(run('paused'),false);visible();assert.equal(n('reactionToggle').disabled,true);
click('pauseResume');run('syncReactions()');assert.equal(run('pausePanelOpen'),false);assert.equal(n('reactionToggle').disabled,false);
click('unitsToggle');assert.equal(run('unitsOpen'),true);assert.equal(n('unitsPanel').hidden,false);assert.equal(run('paused'),false);run('syncReactions()');visible();assert.equal(n('reactionToggle').disabled,true);
click('unitsClose');run('syncReactions()');assert.equal(run('unitsOpen'),false);
click('reactionToggle');assert.equal(n('reaction-bar').hidden,false);click('reactionCheer');assert.equal(n('reaction-feedback').hidden,false);assert.equal(n('reaction-feedback').textContent,'😄');assert.equal(run('reactionChannel.getFeed().length'),1);assert.equal(run('JSON.stringify(walletState)'),soloWallet);
click('pause');click('pauseExit');assert.equal(run('screenMode'),'home');assert.equal(run('soloRunEnded'),true);assert.equal(run('state'),'choose');
click('soloStart');assert.equal(run('screenMode'),'game');assert.equal(run('state'),'choose');

class RailNode{constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.hidden=false;this.textContent='';}setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]??null}appendChild(n){this.children.push(n)}getBoundingClientRect(){return{left:0,right:40,width:40}}}
doc.createElement=t=>new RailNode(t);const rail=n('participantRail');rail.children=[];rail.replaceChildren=function(...xs){this.children=xs};rail.getBoundingClientRect=()=>({left:0,right:120,width:120});
run("multiUser='you';multiSnapshot={sessionId:'layout-choose',roundId:2,phase:'predict',deadline:123456,participants:['you','peer','third','fourth','fifth'],spectators:['watcher'],departedIds:[],confirmedSides:[],roundResults:[]};multiSession={getState:()=>multiSnapshot};multiPlayback=null;multiRecording=false;multiBusy=false;round=2;state='choose';screenMode='game';paused=false;unitsOpen=false;pausePanelOpen=false;selectedSide=null;var qaSent=[];var qaContext=()=>({joined:true,roomId:'layout-room',sessionId:multiSnapshot.sessionId,userId:multiUser,protocol:ReactionLane.REACTION_PROTOCOL,mode:ReactionLane.REACTION_MODE,phase:multiSnapshot.phase,roundId:round,participants:multiSnapshot.participants,spectators:multiSnapshot.spectators});var qaBridge=ReactionSdkBridge.createReactionSdkBridge({getContext:qaContext,sendSdk:wire=>{qaSent.push(wire);return true},onReaction:(sender,wire)=>receiveReaction(sender,wire)});multiAdapter={getRoomId:()=> 'layout-room',getProfile:id=>({name:id}),sendReaction:wire=>qaBridge.send(wire)};syncFlowControls();syncReactions();syncOwnBattleChoice();");
const snapshot=run('JSON.stringify(multiSnapshot)');visible();for(const id of ['pause','reactionToggle','unitsToggle'])assert.equal(n(id).disabled,false,'multi choose '+id);
assert.equal(rail.children.length,6);assert.equal(n('participantRailWrap').hidden,false);
click('pause');assert.equal(run('pausePanelOpen'),true);assert.equal(run('paused'),false);visible();click('pauseResume');run('syncReactions()');
click('unitsToggle');assert.equal(run('unitsOpen'),true);assert.equal(run('paused'),false);visible();click('unitsClose');run('syncReactions()');
click('reactionToggle');click('reactionWow');assert.equal(run('qaSent.length'),1);assert.equal(rail.children[0].children[2].textContent,'😮');
const wire=JSON.parse(run('qaSent[0]'));assert.equal(wire.roundId,2);
function receive(sender,event=wire,room='layout-room'){const payload={type:'aitools_game_sendmsg',data:{room_id:room,user_id:sender,msg_data:JSON.stringify(event)}};return run('qaBridge.receive('+JSON.stringify(payload)+')');}
assert.equal(receive('peer').accepted,true);assert.equal(rail.children[1].children[2].textContent,'😮');
assert.equal(receive('peer').accepted,false,'duplicate sequence');
assert.equal(receive('outsider',{...wire,seq:2}).accepted,false,'unverified member');
assert.equal(receive('peer',{...wire,seq:2,roundId:3}).accepted,false,'wrong round');
assert.equal(receive('peer',{...wire,seq:2,sessionId:'wrong'}).accepted,false,'wrong session');
assert.equal(receive('peer',{...wire,seq:2,roomId:'wrong'}).accepted,false,'wrong wire room');
assert.equal(receive('peer',{...wire,seq:2},'wrong').accepted,false,'wrong SDK room');
assert.equal(receive('you',{...wire,seq:2}).accepted,false,'self SDK echo');
assert.equal(run('JSON.stringify(multiSnapshot)'),snapshot,'UI and reactions never change phase, deadline, round or participants');
run("multiSnapshot.phase='lobby'");assert.equal(receive('third',{...wire,seq:2}).accepted,false,'lobby rejected');
run("multiSnapshot.phase='closed'");assert.equal(receive('third',{...wire,seq:3}).accepted,false,'closed rejected');
run("multiSnapshot.phase='predict';syncFlowControls();syncReactions();");visible();
console.log('PASS actual solo choose menu/open/close/info/emote/render/exit/re-enter handlers; multiplayer predict menu/info/send/receive+portrait rendering; sender/room/session/round/duplicate/lobby/closed validation; authoritative phase/deadline unchanged; controls visible while temporarily disabled by panels. Real SDK transport/browser geometry remain separate.');
`)(require,source,assert);
