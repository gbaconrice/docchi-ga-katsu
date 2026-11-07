'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const source=fs.readFileSync(process.env.GAME_HTML||'index.html','utf8');
const start=source.indexOf('/* terrain-inline-20261106:'),end=source.indexOf('</style>',start);
assert(start>0&&end>start,'Reference-image stacked header rule block exists');
const block=source.slice(start,end),rule=selector=>{
 const p=block.indexOf(selector+' {');assert(p>=0,selector);return block.slice(p).split('}')[0];
};
const grid=rule('#app #gameScreen > #gameTopline.game-topline');
const amountStart=source.indexOf('/* gold-full-amount-20261106:'),amountEnd=source.indexOf('/* Utility dialogs',amountStart);assert(amountStart>start&&amountEnd>amountStart);
const amountRules=source.slice(amountStart,amountEnd);assert(amountRules.includes('grid-template-columns:max-content minmax(0,1fr) 44px;'));assert(amountRules.includes('align-self:center;')&&amountRules.includes('margin-block-start:0;'));assert(amountRules.includes('max-height:40px;')&&amountRules.includes('scrollbar-width:thin;'));
assert(grid.includes('grid-template-rows:40px 20px;')&&grid.includes('row-gap:0;'));
for(const [selector,column,row] of [['#status',1,'1'],['#fieldStatus','1 / 3','2'],['.wallet-pill',2,'1'],['> #soundToggle',3,'1']]){
 const s=rule('#app #gameScreen > #gameTopline '+selector);
 assert(s.includes('grid-column:'+column+';')&&s.includes('grid-row:'+row+';'),selector+' follows reference stack');
}
const terrain=rule('#app #gameScreen > #gameTopline #fieldStatus');
assert(terrain.includes('font-size:13px;')&&terrain.includes('line-height:20px;'));
assert(terrain.includes('white-space:nowrap;')&&terrain.includes('overflow:visible;'));
assert(source.includes('function inlineFieldLabel(e){')&&source.includes('fieldStatus.textContent=inlineFieldLabel(battleEnvironment);'));
assert(/<p id="fieldStatus" class="field-status">/.test(source));assert(!source.includes('fieldDetails')&&!source.includes('field-detail-icon'));
assert(/id="balance"[^>]*tabindex="0"/.test(source),'Exact gold remains keyboard scrollable');
assert(source.includes('font-size:26px;\n  line-height:32px;'));
assert(source.includes('font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;\n  font-weight:600;'));
assert(source.includes('justify-content:flex-start;\n  text-align:left;'));
assert(/#app #gameScreen > \.game-topline > #soundToggle \{ width:44px; min-width:44px; height:44px; min-height:44px; \}/.test(source));
const header=source.slice(source.indexOf('<div id="gameTopline"'),source.indexOf('<div id="gameToolbar"'));
let offset=-1;for(const id of ['id="fieldStatus"','id="status"','class="wallet-pill"','id="soundToggle"']){const next=header.indexOf(id);assert(next>offset,'DOM identity/order remains '+id);offset=next;}
// Preserve upper control coordinates; reserve16px for a complete lower terrain line.
assert(source.includes('max-height:min(68%,calc(100% - 150px));'));
assert(source.includes('max-height:min(68%,calc(100% - 194px));'));
assert(source.includes('flex:0 0 40px; height:40px; margin:0 0 4px;'));
assert(source.includes('max(env(safe-area-inset-top, 0px), var(--gravity-top-inset, 0px))'));
for(const [w,h] of [[320,568],[375,667],[390,844],[430,932]])for(const top of [74,98])for(const bottom of [0,34])for(const multi of [false,true]){
 const stack=60+12+10+44+8+(multi?44:0),reserve=stack+16;
 assert.equal(reserve,multi?194:150);
 const gameHeight=h-top-bottom-18-(multi?52:0),cardHeight=Math.min(gameHeight*.68,gameHeight-reserve);
 assert(gameHeight-8-cardHeight>=stack+8-.001&&cardHeight>=44,'Static guard arithmetic '+[w,h,top,bottom,multi]);
}
const toolbar=source.slice(source.indexOf('#app #gameScreen > #gameToolbar {'),source.indexOf('#app #gameScreen > #participantRailWrap {'));
assert(toolbar.includes('grid-template-columns:minmax(0,1fr) max-content 44px 44px 44px;'));
assert(toolbar.includes('width:max-content; max-width:min(80px,100%); justify-self:end;'));
assert(toolbar.includes('flex:0 0 52px;')&&toolbar.includes('min-height:52px; height:52px;')&&toolbar.includes('margin:0; padding:4px 8px;'));
assert(toolbar.includes('max-width:44px;')&&toolbar.includes('margin:0; box-sizing:border-box;'));
const goldStart=source.indexOf("/* Restore the selected A1 screenshot's distinct"),goldEnd=source.indexOf('/* Center each visible symbol',goldStart);
assert(goldStart>0&&goldEnd>goldStart);
const goldBlock=source.slice(goldStart,goldEnd);
assert(goldBlock.includes(`#app #gameScreen > #gameTopline #balance {
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-weight:600;
  font-variant-numeric:tabular-nums lining-nums;
  letter-spacing:0;
}
#app #gameScreen #resultPanel #breakdown,
#app #gameScreen #resultPanel[data-double-up="true"] #breakdown {
  font-family:'Yu Mincho','Hiragino Mincho ProN',Georgia,serif;
  font-weight:400;
  font-variant-numeric:normal;
  letter-spacing:normal;
}
#app #gameScreen #resultPanel[data-earned="true"] #breakdown {
  font-family:'Yu Mincho','Hiragino Mincho ProN',Georgia,serif;
  font-weight:900;
  font-variant-numeric:tabular-nums;
  letter-spacing:.015em;
}`),'Exact wallet/result/earned/double-up reference typography');
const harness=fs.readFileSync('tests/bet-ui-smoke.cjs','utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')",'htmlInput');
new Function('require','htmlInput','assert',harness+`
 const run=s=>vm.runInContext(s,context,{timeout:30000}),n=id=>nodes.get('#'+id);
 const visible=label=>{for(const id of ['battleChoice','battleClock','unitsToggle','reactionToggle','pause','soundToggle'])assert.equal(n(id).hidden,false,label+' '+id);};
 visible('solo choose');run('selectSide(1);startPrediction()');visible('solo fight');
 run('elapsed=4.4;syncFormation();openPausePanel();syncReactions()');visible('solo pause');run('closePausePanel();syncReactions()');
 run("walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:round,outcome:'B',now:0});winner=1;state='result';update();syncPersonalResult(2000);syncReactions();");visible('solo result');
 for(const t of [10000,600000])run('loop('+t+')');visible('delayed result');assert.equal(run('state'),'result');
 run('nextPrediction()');visible('next choose');
 run("multiUser='you';multiAdapter={getProfile:id=>({name:id}),sendReaction:()=>true,getRoomId:()=> 'fixture'};multiSnapshot={sessionId:'horizontal-header-qa',roundId:2,phase:'predict',participants:['you','p2','p3','p4','p5'],spectators:['watcher'],departedIds:[],confirmedSides:[],roundResults:[]};multiSession={getState:()=>multiSnapshot};selectedSide=null;state='choose';syncFlowControls();syncReactions();syncOwnBattleChoice();");visible('multi choose');assert.equal(n('participantRailWrap').hidden,false);
 run("state='fight';multiSnapshot.phase='battle';multiPlayback={};multiLastSceneTick=264;syncFlowControls();syncReactions();syncOwnBattleChoice()");visible('multi fight');
 run("state='result';multiSnapshot.phase='result';syncFlowControls();syncReactions();syncOwnBattleChoice()");visible('multi result');assert.equal(n('participantRailWrap').hidden,false);
 for(const [input,want]of [[0,'0'],[100,'100'],['99999999999999999999','99,999,999,999,999,999,999']])assert.equal(run('walletBalanceText('+JSON.stringify(input)+')'),want);
`)(require,source,assert);
console.log('PASS reference stacked round/terrain and wallet/audio contract; 13px terrain, 26px reference gold and 44px audio; complete inline terrain without extra controls; 32 static guard cases; solo/multi phase/pause/result/next VM coverage. Browser and real SDK are separate checks.');
