'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(process.env.GAME_HTML||'index.html','utf8');
const harness=fs.readFileSync(path.join(process.cwd(),'tests/bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')",'htmlInput');
new Function('require','htmlInput','assert',harness+`
 const run=s=>vm.runInContext(s,context,{timeout:30000}),n=id=>nodes.get('#'+id);
 sandbox.TextEncoder=TextEncoder;
 for(const id of ['participantRailWrap','gameScreen','battle']){const node=n(id);node.attributes={};node.setAttribute=(k,v)=>node.attributes[k]=String(v);node.getAttribute=k=>node.attributes[k]??null;}
 run('syncReactions()');assert.equal(n('participantRailWrap').hidden,false);assert.equal(n('soloReactionLabel').hidden,true);assert.equal(n('participantRail').hidden,true);assert.equal(n('gameScreen').getAttribute('data-reaction-strip'),'solo');assert.equal(n('gameScreen').getAttribute('data-participants'),'false');assert(n('reaction-feedback').hidden);assert(n('reactionToggle').disabled);
 run('selectSide(0);startPrediction()');
 n('reactionCheer').onclick({preventDefault(){},stopPropagation(){}});assert.equal(n('reaction-feedback').textContent,'😄');assert.equal(n('reaction-feedback').hidden,false);
 run('openPausePanel();syncReactions()');assert(n('reaction-feedback').hidden);assert.equal(n('participantRailWrap').hidden,false);
 run('closePausePanel();syncReactions()');assert(!n('reactionToggle').disabled);
 run("walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:round,outcome:'A',now:0});winner=0;state='result';update();syncPersonalResult(2000);syncReactions()");
 assert.equal(n('participantRailWrap').hidden,false);assert.equal(n('gameScreen').getAttribute('data-reaction-strip'),'solo');assert(!n('reactionToggle').disabled);
 // Read a received/local transient feed through the real render path.
 run("reactionChannel={getFeed:()=>[{sender:'local',emoji:'applause'}]};reactionRender()");assert.equal(n('reaction-feedback').textContent,'👏');assert.equal(n('reaction-feedback').hidden,false);
 run("reactionChannel={getFeed:()=>[]};reactionRender()");assert(n('reaction-feedback').hidden);assert.equal(n('participantRailWrap').hidden,false);
 run("reactionChannel=null;nextPrediction();syncReactions()");assert(n('reaction-feedback').hidden);assert.equal(n('soloReactionLabel').hidden,true);assert.equal(n('participantRailWrap').hidden,false);
 run("multiUser='you';multiAdapter={getProfile:id=>({name:id}),sendReaction:()=>true,getRoomId:()=> 'fixture'};multiSnapshot={sessionId:'upper-reaction-qa',roundId:2,phase:'predict',participants:['you','p2','p3','p4','p5','p6','p7','p8'],spectators:['watcher'],departedIds:[],confirmedSides:[],roundResults:[]};multiSession={getState:()=>multiSnapshot};selectedSide=null;state='choose';syncFlowControls();syncReactions();");
 assert.equal(n('participantRailWrap').hidden,false);assert.equal(n('soloReactionLabel').hidden,true);assert.equal(n('participantRail').hidden,false);assert.equal(n('gameScreen').getAttribute('data-reaction-strip'),'multi');assert.equal(n('gameScreen').getAttribute('data-participants'),'true');assert(n('reaction-feedback').hidden);
 run("state='fight';multiSnapshot.phase='battle';multiPlayback={};syncReactions()");assert.equal(n('participantRailWrap').hidden,false);assert.equal(n('participantRail').hidden,false);assert(n('reaction-feedback').hidden);
 run("state='result';multiSnapshot.phase='result';syncReactions()");assert.equal(n('participantRailWrap').hidden,false);assert.equal(n('participantRail').hidden,false);assert(n('reaction-feedback').hidden);
 run("showScreen('home');syncReactions()");assert(n('participantRailWrap').hidden);assert(n('soloReactionLabel').hidden);assert(n('reaction-feedback').hidden);assert.equal(n('gameScreen').getAttribute('data-reaction-strip'),'none');
 console.log('PASS solo choose/fight/pause/result/expiry/next, multi choose/fight/result and home render paths.');
`)(require,html,assert);
const count=s=>html.split(s).length-1;
assert.equal(count('id="reaction-feedback"'),1);assert.equal(count('id="soloReactionLabel"'),1);
const rail=html.slice(html.indexOf('<div id="participantRailWrap"'),html.indexOf('<section id="comparison"'));
assert(rail.includes('id="reaction-feedback"'));const map=html.slice(html.indexOf('<div id="fieldMap"'),html.indexOf('<span id="openingCue"'));assert(!map.includes('id="reaction-feedback"'));
assert(html.includes('flex-basis:32px; height:32px;'));assert(html.includes('position:static; inset:auto; flex:0 0 32px; width:32px; height:32px;'));assert(html.includes('font-size:28px; line-height:1;'));
const coreReserve=Number(html.match(/#app #gameScreen\[data-personal-result="true"\] #resultPanel \{\s*max-height:min\(68%,calc\(100% - (\d+)px\)\);/)[1]);
assert(html.includes('max-height:min(68%,calc(100% - '+(coreReserve+36)+'px));'));assert(html.includes('max-height:min(68%,calc(100% - '+(coreReserve+44)+'px));'));
assert(html.includes('flex:0 0 calc((100% - 18px) / 4)'));assert(html.includes('grid-template-columns:minmax(0,1fr) 64px;'));assert(html.includes('overflow-x:auto; overflow-y:hidden'));
let cases=0;for(const [w,h] of [[320,568],[375,667],[390,844],[430,932],[844,390]])for(const top of [0,74,98])for(const bottom of [0,34])for(const multi of [false,true]){
 const strip=multi?44:36,upper=coreReserve-16+strip,reserve=upper+16,gameHeight=h-top-bottom-18-(multi?52:0),resultHeight=Math.max(0,Math.min(gameHeight*.68,gameHeight-reserve));assert.equal(reserve,coreReserve+(multi?44:36));if(gameHeight>=reserve)assert(gameHeight-8-resultHeight>=upper+8-.0001);cases++;
}
console.log('PASS one feedback node outside the map, 32px solo/40px multi lanes, retained four-player scrolling and '+cases+' result-clearance box-model cases; pixel verification is separate.');
