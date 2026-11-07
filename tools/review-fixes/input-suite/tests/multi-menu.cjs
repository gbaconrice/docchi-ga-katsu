const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
vm.runInContext(\`{
 state='fight'; multiSession=null; paused=false; pausePanelOpen=false;
 openPausePanel();
 if(!paused || document.querySelector('#pauseTitle').textContent!=='一時停止' || !document.querySelector('#multiPauseNotice').hidden)throw Error('solo pause');
 closePausePanel();if(paused)throw Error('solo resume');
 // Unready battle fixtures must not bypass the disabled control's guard.
 multiSession={getState:()=>({})};multiSnapshot=null;multiPlayback=null;state='fight';paused=false;
 openPausePanel();if(pausePanelOpen || paused)throw Error('unready battle opened menu');
 // Use the actual battle snapshot/playback contract for a multiplayer menu.
 multiUser='menu-test';multiSnapshot={phase:'battle',sessionId:'menu-test-session',roundId:1,participants:['menu-test'],spectators:[],departedIds:[]};
 multiSession={getState:()=>multiSnapshot};multiPlayback={};multiAdapter={getRoomId:()=> 'menu-test-room',sendReaction:()=>true,getProfile:()=>null};
 openPausePanel();
 if(!pausePanelOpen || paused || document.querySelector('#pauseTitle').textContent!=='メニュー' || document.querySelector('#multiPauseNotice').hidden)throw Error('multi menu');
 closePausePanel();if(paused || pausePanelOpen)throw Error('multi close');
 // Result utilities remain available, even when no replay was received.
 state='result';multiSnapshot.phase='result';multiPlayback=null;syncFlowControls();syncReactions();
 for(const id of ['#pause','#unitsToggle','#reactionToggle'])if(document.querySelector(id).hidden || document.querySelector(id).disabled)throw Error('result utility unavailable: '+id);
 const unchanged=JSON.stringify(multiSnapshot);
 toggleUnits(true);syncFlowControls();
 if(!unitsOpen || document.querySelector('#unitsPanel').hidden || paused)throw Error('result unit panel did not remain open');
 openPausePanel();syncFlowControls();
 if(!pausePanelOpen || unitsOpen || document.querySelector('#pauseTitle').textContent!=='メニュー' || document.querySelector('#pauseResume').textContent!=='閉じる' || paused)throw Error('result menu');
 closePausePanel();if(paused)throw Error('result menu paused multiplayer');
 // Each local overlay closes at prediction; none pauses or changes shared state.
 for(const control of ['#unitsToggle','#pause','#reactionToggle']){
  state='result';multiSnapshot.phase='result';syncFlowControls();syncReactions();
  document.querySelector(control).onclick({isTrusted:true,preventDefault(){},stopPropagation(){}});
  if(!(control==='#unitsToggle'?unitsOpen:control==='#pause'?pausePanelOpen:reactionOpen))throw Error('result overlay did not open: '+control);
  if(JSON.stringify(multiSnapshot)!==unchanged || paused)throw Error('utility changed shared result');
  state='choose';multiSnapshot.phase='predict';syncFlowControls();syncReactions();
  if(unitsOpen || pausePanelOpen || reactionOpen)throw Error('overlay survived prediction');
  for(const id of ['#unitsPanel','#pausePanel','#reaction-bar'])if(!document.querySelector(id).hidden)throw Error('prediction retained overlay: '+id);
  for(const id of ['#pause','#unitsToggle','#reactionToggle'])if(document.querySelector(id).hidden || !document.querySelector(id).disabled)throw Error('prediction utility gate: '+id);
 }
 console.log('PASS solo pause/resume, unready battle guard, live multiplayer menu, result utilities without replay, unchanged shared state, prediction closes all overlays');
}\`,context);
`)(require,assert);
