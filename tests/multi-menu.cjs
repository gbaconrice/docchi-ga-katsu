const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
vm.runInContext(\`{
 state='fight'; multiSession=null; paused=false; pausePanelOpen=false;
 openPausePanel();
 if(!paused || document.querySelector('#pauseTitle').textContent!=='一時停止' || !document.querySelector('#multiPauseNotice').hidden)throw Error('solo pause');
 closePausePanel();if(paused)throw Error('solo resume');
 multiSession={getState:()=>({})}; state='fight';paused=false;
 openPausePanel();
 if(paused || document.querySelector('#pauseTitle').textContent!=='メニュー' || document.querySelector('#multiPauseNotice').hidden)throw Error('multi menu');
 closePausePanel();if(paused)throw Error('multi close');
 unitsOpen=true; document.querySelector('#unitsPanel').hidden=false; state='result';syncFlowControls();
 if(unitsOpen || !document.querySelector('#unitsPanel').hidden)throw Error('unit panel remains open');
 console.log('PASS solo pause, multiplayer menu, phase change closes units');
}\`,context);
`)(require,assert);
