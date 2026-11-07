const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',h+`
context.TextEncoder=require('util').TextEncoder;
const run=s=>vm.runInContext(s,context,{timeout:60000});
for(const id of ['#red','#confirm'])nodes.get(id).onclick({isTrusted:true});
run("walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:1,outcome:'A',now:0});state='result';winner=0;update();");
assert.equal(nodes.get('#next').hidden,false);assert.equal(nodes.get('#next').textContent,'次の戦いへ');
const ledger=run('JSON.stringify(walletState)'),world=run('JSON.stringify(units)');
for(const open of [false,true,false]){run('battleLogOpen='+open);for(const t of [0,1000,3000,30000,600000])run('advanceResultRead('+t+');syncExtensionControls()');assert.equal(run('state'),'result');assert.equal(run('round'),1);assert.equal(nodes.get('#resultProgress').hidden,true);}
assert.equal(run('JSON.stringify(walletState)'),ledger);assert.equal(run('JSON.stringify(units)'),world);
run('battleLogOpen=false');nodes.get('#next').onclick({isTrusted:true});assert.equal(run('state'),'choose');assert.equal(run('round'),2);
nodes.get('#next').onclick({isTrusted:true});assert.equal(run('round'),2,'double click does not skip a round');
assert.equal(nodes.get('#next').hidden,true,'not shown in prediction');
console.log('PASS solo result/log stays for ten minutes, no countdown or mutation; one click advances once');
run("globalThis.originalDateNow=Date.now;globalThis.testHostNow=100000;Date.now=()=>testHostNow;state='choose';screenMode='game';beginMock();openMultiRound();drainMock();multiSession.predict('A',25);drainMock();mockGuest.predict('B',25);drainMock();multiSession.startBattle({engineVersion:'test',ticks:1,winner:'A',events:[],environment:multiSession.getState().environment,unavailable:'replay-byte-cap'});multiSession.settleRound();multiSession.showResult();drainMock();displayMultiState();");
assert.equal(run('multiSession.getState().phase'),'result');assert.equal(run('multiSession.getState().nextRoundAt'),130000);assert.equal(nodes.get('#next').hidden,false);assert.equal(nodes.get('#next').disabled,true);assert.equal(nodes.get('#next').textContent,'次の戦いまで 30秒');
for(const t of [1000,10000,600000])run('advanceResultRead('+t+');syncExtensionControls()');assert.equal(run('multiSession.getState().roundId'),1,'presentation timestamps cannot advance the host clock');
nodes.get('#next').onclick({isTrusted:true});assert.equal(run('multiSession.getState().roundId'),1,'host cannot skip countdown');
run('multiHost=false;displayMultiState()');assert.equal(nodes.get('#next').hidden,false);assert.equal(nodes.get('#next').disabled,true);assert.equal(nodes.get('#multiSummary').textContent,'次の戦いまで 30秒');
nodes.get('#next').onclick({isTrusted:true});assert.equal(run('multiSession.getState().roundId'),1,'guest cannot advance');
run('multiHost=true;testHostNow=129999;pumpMulti(testHostNow);drainMock()');assert.equal(run('multiSession.getState().roundId'),1);assert.equal(nodes.get('#next').textContent,'次の戦いまで 1秒');
run('testHostNow=130000;pumpMulti(testHostNow);drainMock()');assert.equal(run('multiSession.getState().roundId'),2);assert.equal(run('mockGuest.getState().roundId'),2);assert.equal(run('mockGuest.getState().phase'),'predict');
nodes.get('#next').onclick({isTrusted:true});run('pumpMulti(testHostNow);Date.now=originalDateNow');assert.equal(run('multiSession.getState().roundId'),2);
console.log('PASS shared 30-second normal multiplayer countdown, host-only timed start and duplicate protection');
`)(require,assert);
const html=fs.readFileSync('index.html','utf8');assert(!html.includes('RESULT_READ_SECONDS'));
const css=html.slice(html.indexOf('/* Settlement remains fully above'),html.indexOf('</style></head><body><div id="bootStatus"'));
for(const rule of ['z-index:10','bottom:8px','min-height:0','max-height:min(68%,calc(100% - 20px))','overflow-y:auto','overflow-wrap:anywhere','display:block','width:100%'])assert(css.includes(rule),rule);
console.log('PASS lowered bounded card, independent amount row and hidden battle-only history entry CSS contract (not a browser geometry test)');

assert(html.includes('visible=reserved&&state!==\'result\''));assert(html.includes('node.disabled=!visible;node.inert=!visible'));
