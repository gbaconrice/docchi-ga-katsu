/* Development-only checks. Load as a script in the QA entry after
   qa-stable-header.js. No injected CSS, SDK, transport or score calls. */
(() => {
  'use strict';
  const q=id=>document.getElementById(id);
  const box=id=>{const n=q(id),r=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,centerY:r.y+r.height/2,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,whiteSpace:s.whiteSpace,overflowX:s.overflowX,text:n.textContent,visible:!n.hidden&&s.display!=='none'&&r.width>0&&r.height>0};};
  const keys=['fieldStage','gameTopline','fieldStatus','status','balance','soundToggle','gameToolbar','battleChoice','battleClock','unitsToggle','reactionToggle','pause','participantRailWrap','breakdown'];
  function measure(){
    const nodes=Object.fromEntries(keys.map(id=>[id,box(id)])),h=nodes.gameTopline,t=nodes.gameToolbar;
    const wallet=q('balance').parentElement.getBoundingClientRect();
    const headerInOrder=nodes.status.right<=wallet.x+.5&&wallet.right<=nodes.soundToggle.x+.5&&nodes.fieldStatus.right<=wallet.right+.5;
    const referenceStack=Math.abs(nodes.fieldStatus.x-nodes.status.x)<.6&&Math.abs(nodes.status.y-nodes.soundToggle.y)<.6&&Math.abs(wallet.y+wallet.height/2-nodes.soundToggle.y-20)<.6&&Math.abs(nodes.fieldStatus.y-nodes.soundToggle.y-40)<.6&&wallet.bottom<=nodes.fieldStatus.y+.5;
    const range=document.createRange();range.selectNodeContents(q('fieldStatus'));const label=range.getBoundingClientRect();
    const terrainFullyVisible=label.x>=nodes.fieldStatus.x-.5&&label.right<=nodes.fieldStatus.right+.5&&label.height<=20.5&&nodes.fieldStatus.scrollWidth<=nodes.fieldStatus.clientWidth+1&&parseFloat(nodes.fieldStatus.fontSize)>=13&&nodes.balance.bottom<=label.y+.5;
    const inToolbar=['battleChoice','battleClock','unitsToggle','reactionToggle','pause'].every(id=>nodes[id].x>=t.x-.5&&nodes[id].right<=t.right+.5);
    const buttonSizes=['soundToggle','unitsToggle','reactionToggle','pause'].every(id=>nodes[id].width>=44&&nodes[id].height>=44);
    const compactPrediction=nodes.battleChoice.width<=80.5&&Math.abs(nodes.battleChoice.right+4-nodes.battleClock.x)<.6;
    const noPageOverflow=document.documentElement.scrollWidth<=innerWidth+1;
    const walletStyle=getComputedStyle(q('balance').parentElement),walletFont=getComputedStyle(q('balance')),resultFont=getComputedStyle(q('breakdown'));
    const earned=q('resultPanel').getAttribute('data-earned')==='true';
    const goldLeftAligned=walletStyle.justifyContent==='flex-start'&&walletStyle.textAlign==='left'&&walletFont.textAlign==='left';
    const walletFontMatchesReference=walletFont.fontFamily==='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'&&walletFont.fontWeight==='600'&&walletFont.fontVariantNumeric.trim().split(/\s+/).sort().join(' ')==='lining-nums tabular-nums'&&['normal','0px'].includes(walletFont.letterSpacing);
    const resultFontMatchesReference=resultFont.fontFamily==='"Yu Mincho", "Hiragino Mincho ProN", Georgia, serif'&&resultFont.fontWeight===(earned?'900':'400')&&resultFont.fontVariantNumeric===(earned?'tabular-nums':'normal')&&(earned?Math.abs(parseFloat(resultFont.letterSpacing)-parseFloat(resultFont.fontSize)*.015)<.002:resultFont.letterSpacing==='normal');
    const toolbarInnerPadding=['unitsToggle','reactionToggle','pause'].every(id=>nodes[id].y>=t.y+3.5&&nodes[id].bottom<=t.bottom-3.5&&nodes[id].right<=t.right-7.5);
    const moneyStyle=(e,pseudo=null)=>{const s=getComputedStyle(e,pseudo);return {tag:e.tagName,text:pseudo?null:e.textContent,content:pseudo?s.content:null,fontFamily:s.fontFamily,fontWeight:s.fontWeight,fontSize:s.fontSize,fontVariantNumeric:s.fontVariantNumeric,letterSpacing:s.letterSpacing,textShadow:s.textShadow,textStroke:s.webkitTextStroke};};
    const moneyDetails=Object.fromEntries(['balance','breakdown'].map(id=>{const e=q(id);return [id,{actual:moneyStyle(e),children:[...e.querySelectorAll('*')].map(x=>moneyStyle(x)),before:moneyStyle(e,'::before'),after:moneyStyle(e,'::after')}]}));
    const moneyWeight=walletFontMatchesReference&&resultFontMatchesReference&&['balance','breakdown'].every(id=>{const s=moneyDetails[id].actual;return s.textShadow==='none'&&parseFloat(s.textStroke)===0;});
    const stable=window.StableHeaderQA?.measure();
    const checks={headerInOrder,referenceStack,terrainFullyVisible,inToolbar,toolbarInnerPadding,moneyWeight,buttonSizes,compactPrediction,noPageOverflow,goldLeftAligned,walletFontMatchesReference,resultFontMatchesReference,resultClearOfHeader:stable?.checks.resultClearOfHeader??null};
    return {viewport:[innerWidth,innerHeight],inset:getComputedStyle(document.documentElement).getPropertyValue('--gravity-top-inset'),nodes,moneyDetails,wallet:{x:wallet.x,y:wallet.y,width:wallet.width,height:wallet.height,right:wallet.right},checks,passed:Object.values(checks).every(x=>x===true),realIOS:false,realSDK:false};
  }
  function stress(){
    const balance=q('balance'),old=[balance.textContent,balance.scrollLeft];
    balance.textContent='99,999,999,999,999,999,999';balance.scrollLeft=1e6;
    const result=measure();
    result.checks.balanceScrollable=balance.scrollWidth>balance.clientWidth&&balance.scrollLeft>0;
    result.passed=Object.values(result.checks).every(x=>x===true);
    balance.textContent=old[0];balance.scrollLeft=old[1];return result;
  }
  function goldAmountCases(){
    const amount=q('balance'),status=q('status'),old=[amount.textContent,amount.scrollLeft,status.textContent];
    const baseline=box('fieldStage'),out=[];
    status.textContent='第10／10戦';
    const cases=[['photo','12,800',true],['six-digits','123,456',true],['eight-digits','12,345,678',innerWidth>=375],['nine-digits','123,456,789',innerWidth>=375],['twenty-digits','99,999,999,999,999,999,999',false],['six-hundred-digits',Array(200).fill('999').join(','),false]];
    try{
      for(const [name,value,requiredAtOnce] of cases){
        amount.textContent=value;amount.scrollLeft=0;
        const initial=measure(),rect=amount.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(amount);
        const textRect=range.getBoundingClientRect(),maxScroll=amount.scrollWidth-amount.clientWidth;
        const fullyVisible=maxScroll<=1&&textRect.left>=rect.left-.6&&textRect.right<=rect.right+.6;
        const startsAtFirstDigit=amount.scrollLeft===0&&textRect.left>=rect.left-.6;
        amount.scrollLeft=1e9;
        const endRect=range.getBoundingClientRect(),reachesLastDigit=amount.scrollLeft>=Math.max(0,maxScroll)-1&&endRect.right<=rect.right+1;
        const currentField=box('fieldStage'),stableField=['x','y','width','height'].every(k=>Math.abs(currentField[k]-baseline[k])<.6);
        const checks={layout:initial.passed,requiredAmountAtOnce:!requiredAtOnce||fullyVisible,exactText:amount.textContent===value,startsAtFirstDigit,reachesLastDigit,stableField,readableSize:getComputedStyle(amount).fontSize==='26px',nativeScrollNotHidden:getComputedStyle(amount).scrollbarWidth!=='none'};
        out.push({name,value,digits:value.replace(/,/g,'').length,requiredAtOnce,fullyVisible,clientWidth:amount.clientWidth,scrollWidth:amount.scrollWidth,maxScroll,endScroll:amount.scrollLeft,checks,passed:Object.values(checks).every(Boolean)});
      }
    }finally{amount.textContent=old[0];amount.scrollLeft=old[1];status.textContent=old[2];}
    return {cases:out,passed:out.every(x=>x.passed)};
  }
  window.HorizontalHeaderQA={measure,stress,goldAmountCases,cycle(mode='solo'){
    StableHeaderQA.choose(mode);const choose=measure();StableHeaderQA.fight();const fight=measure();StableHeaderQA.result();const result=measure();const longText=stress(),goldAmounts=goldAmountCases();
    return {mode,choose,fight,result,longText,goldAmounts,passed:[choose,fight,result,longText,goldAmounts].every(x=>x.passed)};
  }};
})();

/* Isolated QA fixture. No native SDK, transport, score posting or user data. */
(()=>{
 'use strict';const q=id=>document.getElementById(id);let mode='solo',sent=[];
 function result(kind='solo',final=false){
  if(pausePanelOpen)closePausePanel();if(unitsOpen)toggleUnits(false);setBattleLogOpen(false);closeReactionMenu();cancelPersonalResult();
  multiSession=null;multiSnapshot=null;multiAdapter=null;mockGuest=null;multiPlayback=null;multiReplay=null;multiBusy=false;multiRecording=false;mode=kind;sent=[];
  showScreen('home');openSoloScreen();selectSide(0);startPrediction();
  const id='qa-result-controls-'+Date.now(),end=final?10:1;walletState=SoloWallet.createSession({sessionId:id,playerIds:[PLAYER]});
  for(let n=1;n<=end;n++){walletState=SoloWallet.openRound(walletState,{sessionId:id,roundId:n,deadline:100});walletState=SoloWallet.commitPrediction(walletState,{sessionId:id,roundId:n,playerId:PLAYER,side:'A',stake:25,now:0});walletState=SoloWallet.settleRound(walletState,{sessionId:id,roundId:n,outcome:n===end?'A':'draw',now:0});}
  round=end;winner=0;choice=0;state='result';elapsed=12.7;
  if(kind==='multi'){
   multiUser='qa-you';const participants=['qa-you','qa-other','qa-third'];multiSnapshot={sessionId:id,roundId:end,totalRounds:10,phase:'result',participants,spectators:[],departedIds:[],readyIds:[],continueIds:[],cashedOutIds:[],confirmedSides:[{userId:multiUser,side:'A'}],roundResults:[{playerId:multiUser,submitted:true,correct:true,side:'A',stake:25,delta:25,balanceBefore:100,balanceAfter:125}],wallets:participants.map(playerId=>({playerId,balance:125,correctCount:1,cashedOut:false,score:25})),winner:'A',nextRoundAt:final?null:Date.now()+30000,environment:battleEnvironment};
   multiShownWallets=multiSnapshot.wallets;multiSession={getState:()=>multiSnapshot,getPlaybackClock:()=>({known:true,ready:true,estimatedHostNow:Date.now(),status:'playing'}),getReplay:()=>null,close(){}};
   multiAdapter={getRoomId:()=> 'qa-result-controls',getProfile:id=>({name:id==='qa-you'?'あなた':'参加者'}),sendReaction:wire=>{sent.push(wire);return true},exit:async()=>{}};
  }
  update();syncPersonalResult(performance.now());syncReactions();syncBattleLog(performance.now(),true);draw();return measure();
 }
 function measure(){const ids=['gameTopline','gameToolbar','soundToggle','unitsToggle','reactionToggle','pause','resultPanel','pausePanel','unitsPanel','reaction-bar','battleLogHistory','battleLogResult','reaction-feedback'];return {fixture:true,realSDK:false,realIOS:false,mode,state,screenMode,paused,pausePanelOpen,unitsOpen,reactionOpen,battleLogOpen,sent:sent.length,ledger:JSON.stringify(multiSession?multiSnapshot.wallets:walletState),nodes:Object.fromEntries(ids.map(id=>{const n=q(id),r=n.getBoundingClientRect(),c=getComputedStyle(n),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return [id,{hidden:n.hidden,disabled:n.disabled,text:n.textContent.slice(0,100),box:[r.x,r.y,r.width,r.height],display:c.display,zIndex:c.zIndex,hit:hit?.id||hit?.className,clickable:!n.hidden&&!n.disabled&&!!hit&&(n===hit||n.contains(hit))}]}))};}
 window.ResultControlsQA={result,measure,next(){if(mode==='solo')nextPrediction();else{multiSnapshot={...multiSnapshot,roundId:round+1,phase:'predict',roundResults:[],readyIds:[],confirmedSides:[],winner:null,deadline:Date.now()+60000};state='choose';update();}syncReactions();return measure();}};
})();

/* Isolated review fixture: no real SDK, room transport, users or ranking service. */
(()=>{
 const q=id=>document.getElementById(id);let calls=[];
 function reset(){multiSession=null;multiSnapshot=null;multiAdapter=null;mockGuest=null;multiPlayback=null;multiReplay=null;multiBusy=false;multiRecording=false;soloRunEnded=false;calls=[];}
 function result(mode='solo',balance=100){
  if(!window.DocchiQa?.ready)throw Error('fixture版を選び、読込後に操作してください。');reset();DocchiQa.finalRound(false);
  const sessionId='qa-overtime-'+Date.now(),engine=mode==='solo'?SoloWallet:Wallet,playerId=mode==='solo'?PLAYER:'qa-you';let ledger=engine.createSession({sessionId,playerIds:[playerId],config:{initialBalance:balance}});
  for(let r=1;r<=10;r++){ledger=engine.openRound(ledger,{sessionId,roundId:r,deadline:100});ledger=engine.commitPrediction(ledger,{sessionId,roundId:r,playerId,side:'A',stake:MoneyUI.defaultStake(ledger.players[0].balance,r),now:0});ledger=engine.settleRound(ledger,{sessionId,roundId:r,outcome:'draw',now:0});}
  if(mode==='solo')walletState=ledger;
  else {
   multiUser=playerId;multiSnapshot={sessionId,mode:ledger.mode,roundId:10,totalRounds:10,phase:'result',participants:[playerId],spectators:[],departedIds:[],readyIds:[],continueIds:[],cashedOutIds:[],confirmedSides:[{userId:playerId,side:'A'}],roundResults:ledger.ledger.at(-1).entries,wallets:ledger.players,winner:null,nextRoundAt:null,environment:battleEnvironment};multiShownWallets=multiSnapshot.wallets;
   multiSession={getState:()=>multiSnapshot,getPlaybackClock:()=>({known:true,ready:true,estimatedHostNow:Date.now(),status:'playing'}),getReplay:()=>null,close(){},requestContinue(){calls.push('continue');multiSnapshot={...multiSnapshot,continueIds:[playerId]};syncExtensionControls();return true;},cashOut(reason){calls.push('cashout');ledger=engine.cashOut(ledger,{sessionId,playerId,roundId:10,requestId:'cashout:10',reason});multiSnapshot={...multiSnapshot,wallets:ledger.players,cashedOutIds:[playerId]};return true;},predict(side,stake){calls.push({side,stake});return true;}};
   multiAdapter={getRoomId:()=>sessionId,getProfile:()=>({name:'あなた'}),sendReaction:()=>true,exit:async()=>{}};
  }
  round=10;choice=0;winner=null;state='result';update();syncExtensionControls();syncPersonalResult(performance.now());return measure();
 }
 function choose(mode='solo',balance=0,overtime=false){
  result(mode,balance);const sessionId=walletState.sessionId;
  if(mode==='solo'){
   if(overtime){walletState=SoloWallet.continueDoubleUp(walletState,{sessionId,roundId:10,requestId:'qa-continue'});walletState=SoloWallet.openRound(walletState,{sessionId,roundId:11,deadline:100});round=11;}
   else {walletState=SoloWallet.createSession({sessionId:'qa-zero-'+Date.now(),playerIds:[PLAYER],config:{initialBalance:balance}});walletState=SoloWallet.openRound(walletState,{sessionId:walletState.sessionId,roundId:1,deadline:100});round=1;}
  } else {round=overtime?11:1;multiSnapshot={...multiSnapshot,roundId:round,totalRounds:round>10?round:10,phase:'predict',roundResults:[],readyIds:[],confirmedSides:[],winner:null,deadline:Date.now()+60000};}
  state='choose';selectedSide=null;selectedStakeOption=balance===0?0:overtime?100:25;selectedStake=MoneyUI.defaultStake(balance,round);update();syncExtensionControls();return measure();
 }
 function measure(){const line=selector=>{const n=q('cashOut').querySelector(selector);if(!n)return null;const r=n.getBoundingClientRect(),c=getComputedStyle(n);return {text:n.textContent,fontSize:c.fontSize,lineHeight:c.lineHeight,whiteSpace:c.whiteSpace,box:[r.x,r.y,r.width,r.height],oneLine:r.height<=parseFloat(c.lineHeight)+.5,fits:n.scrollWidth<=n.clientWidth+1};};const cashLabel={main:line('.extension-choice-main'),note:line('.extension-choice-note')},cashVisible=!q('cashOut').hidden&&q('cashOut').getBoundingClientRect().height>0;const g=document.querySelector('.stake-options'),gr=g.getBoundingClientRect(),visible=[...g.querySelectorAll('button:not([hidden])')],stakeButtons=visible.map(n=>{const r=n.getBoundingClientRect();return {id:n.id,text:n.textContent,box:[r.x,r.y,r.width,r.height],centered:Math.abs(r.x+r.width/2-gr.x-gr.width/2)<1};});return {fixture:true,realIOS:false,realSDK:false,viewport:[innerWidth,innerHeight],cashLabel,choicesColumns:getComputedStyle(q('extensionChoices')).gridTemplateColumns,stakeButtons,checks:{twoLineCashout:cashVisible&&cashLabel.main&&cashLabel.note?cashLabel.main.fontSize==='16px'&&cashLabel.note.fontSize==='12px'&&cashLabel.main.whiteSpace==='nowrap'&&cashLabel.note.whiteSpace==='nowrap'&&cashLabel.main.oneLine&&cashLabel.note.oneLine&&cashLabel.main.fits&&cashLabel.note.fits:null,singletonCentered:visible.length===1?stakeButtons[0].centered:null,singletonState:g.dataset.single,overflow:document.documentElement.scrollWidth>innerWidth},round,state,soloRunEnded,calls:structuredClone(calls),wallet:structuredClone(multiSession?multiSnapshot.wallets:walletState.players),status:q('scoreStatus').textContent,buttons:Object.fromEntries(['cashOut','continueRun','stake0','stake100','confirm','next'].map(id=>{const n=q(id),r=n.getBoundingClientRect();return [id,{text:n.textContent,hidden:n.hidden,disabled:n.disabled,box:[r.x,r.y,r.width,r.height],scroll:[n.scrollWidth,n.scrollHeight],client:[n.clientWidth,n.clientHeight]}]}))};}
 window.OvertimeQA={result,choose,measure,review(kind,mode='solo'){if(kind==='result')result(mode);else if(kind==='zero')choose(mode,0,false);else if(kind==='all')choose(mode,10,true);else if(kind==='normal')choose(mode,100,false);else if(kind!=='measure')throw Error('Unknown overtime QA');return measure();}};
})();

/* QA-only, synthetic log rows. No SDK, network, score submission or real match claims. */
(()=>{
 'use strict';const q=id=>document.getElementById(id),rgb={neutral:'rgb(242, 231, 210)',blue:'rgb(169, 211, 255)',red:'rgb(255, 185, 172)',recovery:'rgb(160, 237, 180)'};let current='none';
 function measure(){
  const inspect=selector=>[...document.querySelectorAll(selector)].map(n=>{const side=n.getAttribute('data-side'),recovery=n.getAttribute('data-log-emphasis'),winner=n.getAttribute('data-log-winner'),color=getComputedStyle(n).color,expected=side==='0'||winner==='0'?rgb.blue:side==='1'||winner==='1'?rgb.red:recovery==='recovery'?rgb.recovery:rgb.neutral;return {text:n.textContent,side,recovery,winner,color,expected,valid:color===expected&&!n.hasAttribute('data-tone')};});
  const summary=inspect('#battleLogSource > span'),history=inspect('#battleLogHistoryList > li > span > span'),panel=q('battleLogHistory'),rows=[...q('battleLogHistoryList').children];
  return {fixture:'synthetic-log-colors',case:current,realMatch:false,realSDK:false,realIOS:false,visible:!panel.hidden,viewport:[innerWidth,innerHeight],summary,history,checks:{oneMeaningPerColor:[...summary,...history].every(x=>x.valid),noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth&&rows.every(n=>n.scrollWidth<=n.clientWidth+1),text:rows.map(n=>n.textContent)}};
 }
 function run(kind='photo'){
  if(!window.DocchiQa?.ready)throw Error('結果・比較fixtureを選び、読込後に操作してください。');
  const outcome=kind==='right'?'B':kind==='draw'?'draw':'A';DocchiQa.solo(outcome);current=kind;
  const mk=(token,k,side,x)=>({id:token,token,k,side,x,y:270,hp:TYPES[k].hp,dead:false,originForward:side?-1:1,cd:999,priority:.1});
  units=[mk('a1','vortex_adept',0,180),mk('a2','vortex_adept',0,190),mk('a3','vortex_adept',0,200),mk('b1','groundprism_windmiller',1,270),mk('b2','dreamflash_oracle',1,300),mk('h1','healer',0,160)];initialUnits=units.map(u=>({...u}));resetBattleLog(initialUnits);
  const capture=(tick,events)=>soloBattleLog.capture(tick,events,units);
  if(kind==='photo'){
   capture(182,[{type:'pillar_action_start',sourceToken:'b1',targetToken:'a3'}]);
   capture(206,[{type:'pillar_release',sourceToken:'b1',targetToken:'a3',count:1},{type:'resolved_hit',sourceToken:'b1',targetToken:'a3',delivery:'area',amount:38,hpAfter:47,hpMax:85},{type:'pillar_action_end',sourceToken:'b1',reason:'complete'}]);
   capture(243,[{type:'ward_granted',sourceToken:'b2',targetToken:'b1',reduction:.5}]);
   capture(253,[{type:'ward_consumed',sourceToken:'b2',targetToken:'b1',attackerToken:'a3',blocked:12},{type:'resolved_hit',sourceToken:'a3',targetToken:'b1',delivery:'melee',amount:12,hpAfter:86,hpMax:110}]);
  }else if(kind==='recovery'){
   capture(240,[{type:'healing_pulse',sourceToken:'h1',count:1},{type:'heal',sourceToken:'h1',targetToken:'a3',actualAmount:13,hpAfter:60,hpMax:85},{type:'status_expired',targetToken:'a3',status:'ward'}]);
  }else if(['left','right','draw'].includes(kind)){
   capture(300,[{type:'battle_finished',kind,status:kind==='left'?'左の勝利':kind==='right'?'右の勝利':'引き分け',reason:kind==='draw'?'time-limit':'elimination',leftAlive:kind==='right'?0:3,rightAlive:kind==='left'?0:2}]);
  }else throw Error('Unknown log-color fixture: '+kind);
  syncBattleLog(performance.now(),true);setBattleLogOpen(true,q('battleLogResult'));draw();return measure();
 }
 window.LogColorsQA={run,measure};
})();

/* terrain-inline-visible-qa-20261106: isolated synthetic fixture; no SDK/storage. */
(()=>{
 'use strict';const q=id=>document.getElementById(id),seeds=new Map();let saved=null,lastLedgerUnchanged=null;
 function ready(){if(!window.StableHeaderQA?.ready||typeof inlineFieldLabel!=='function')throw Error('「結果・比較fixture」または「GRAVITY fixture」を選び、読込後に操作してください。');}
 function env(id,percent){if(!BattleFields.FIELD_IDS.includes(id)||!BattleFields.STRENGTHS.includes(percent))throw Error('地形または強度が無効です。');const key=id+':'+percent;if(!seeds.has(key)){for(let seed=0;seed<10000;seed++){const e=BattleFields.selectRunEnvironment(seed,percent);if(e.fieldId===id){seeds.set(key,e);break;}}}const e=seeds.get(key);BattleFields.validateEnvironment(e);return e;}
 const ledger=()=>JSON.stringify(multiSession?multiSnapshot?.wallets:walletState);
 function refresh(e){const before=ledger();battleEnvironment=e;if(multiSnapshot)multiSnapshot={...multiSnapshot,environment:e};update();if(typeof draw==='function')draw();lastLedgerUnchanged=ledger()===before;if(!lastLedgerUnchanged)throw Error('財布の変更を検知しました。');}
 function apply(id,percent){ready();if(screenMode!=='game'||!walletState)StableHeaderQA.choose('solo');if(!saved)saved={environment:battleEnvironment};refresh(env(id,Number(percent)));return measure();}
 function restore(){ready();if(saved){const e=saved.environment;saved=null;refresh(e);}return measure();}
 function info(n){if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {box:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},display:s.display,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,whiteSpace:s.whiteSpace,overflowX:s.overflowX,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth};}
 function measure(){ready();const n=q('fieldStatus'),field=info(n),roundBox=info(q('status')),wallet=info(q('balance').parentElement),balance=info(q('balance')),sound=info(q('soundToggle')),range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect(),full=battleEnvironment?BattleFields.fieldLabel(battleEnvironment):'地図未定',expected=inlineFieldLabel(battleEnvironment);const textBounds={x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};const clipped=r.x<field.box.x-.5||r.right>field.box.right+.5||n.scrollWidth>n.clientWidth+1;return {fixture:'terrain-inline-visible-qa-20261106',readOnlyMeasurement:true,realIOS:false,realSDK:false,persistence:false,viewport:[innerWidth,innerHeight],hostShell:document.documentElement.dataset.hostShell||'standalone',screenMode,state,round,fieldId:battleEnvironment?.fieldId||null,percent:battleEnvironment?.percent||null,canonicalText:full,displayedText:n.textContent,expectedInlineText:expected,textBounds,field,roundBox,wallet,balance,sound,walletUnchangedByApply:lastLedgerUnchanged,checks:{exactInlineText:n.textContent===expected,fontAtLeast13px:parseFloat(field.fontSize)>=13,notClipped:!clipped,singleLine:field.whiteSpace==='nowrap'&&r.height<=20.5,noTerrainControl:n.tagName==='P'&&!n.hasAttribute('tabindex')&&!n.hasAttribute('aria-haspopup'),balanceClearOfTerrain:balance.box.bottom<=textBounds.y+.5,slotClearOfWallet:wallet.box.bottom<=field.box.y+.5,roundAndSoundTopUnchanged:Math.abs(roundBox.box.y-sound.box.y)<.6,walletTopUnchanged:Math.abs(wallet.box.y-sound.box.y-4)<.6,terrainAt40:Math.abs(field.box.y-sound.box.y-40)<.6,noPageOverflow:document.documentElement.scrollWidth<=innerWidth+1}};}
 window.TerrainQA={apply,restore,measure};
})();

/* QA-only upper-reaction rendering fixtures. Synthetic identities; no SDK,
   transport, score, persistence or production source mutations. */
(()=>{
 'use strict';const q=id=>document.getElementById(id);let kind='solo',variant='native';
 function rect(n){const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,visible:!n.hidden&&s.display!=='none'&&r.width>0&&r.height>0,fontSize:s.fontSize};}
 const ids=['gameTopline','gameToolbar','battleChoice','battleClock','unitsToggle','reactionToggle','pause','participantRailWrap','participantRail','reactionOutside','soloReactionLabel','reaction-feedback','fieldStage','fieldMap','field','resultPanel'];
 const overlap=(a,b)=>a.visible&&b.visible&&a.x<b.right-.5&&a.right>b.x+.5&&a.y<b.bottom-.5&&a.bottom>b.y+.5;
 function measure(){
  const nodes=Object.fromEntries(ids.map(id=>[id,rect(q(id))])),rail=nodes.participantRail,strip=nodes.participantRailWrap,fb=nodes['reaction-feedback'],map=nodes.fieldMap,t=nodes.gameToolbar;
  const chips=[...q('participantRail').children].map(n=>({name:n.getAttribute('aria-label'),box:rect(n),portrait:rect(n.querySelector('.participant-portrait')),emote:rect(n.querySelector('.participant-emote'))}));
  const fullSlots=chips.filter(x=>x.box.x>=rail.x-.6&&x.box.right<=rail.right+.6);
  const reservedHeight=strip.visible?strip.height+4:0,spare=nodes.battleChoice.x-t.x-8,minMultiWidth=4*25+18+68;
  const checks={noPageOverflow:document.documentElement.scrollWidth<=innerWidth+1,reactionOutsideMap:!overlap(fb,map),reactionBelowToolbar:!fb.visible||fb.y>=t.bottom-.5,reactionInsideStrip:!fb.visible||(fb.x>=strip.x-.5&&fb.right<=strip.right+.5&&fb.y>=strip.y-.5&&fb.bottom<=strip.bottom+.5),stripBelowToolbar:strip.y>=t.bottom-.5,soloLabelHidden:kind!=='solo'||!nodes.soloReactionLabel.visible,multiFourSlots:kind!=='multi'||fullSlots.length===4,multiNoSoloFeedback:kind!=='multi'||!fb.visible,resultClearOfStrip:!nodes.resultPanel.visible||nodes.resultPanel.y>=strip.bottom+4-.5,toolbarTargets:['unitsToggle','reactionToggle','pause'].every(id=>nodes[id].width>=44&&nodes[id].height>=44),mapRatio:!map.visible||Math.abs((map.width-2)/(map.height-2)-480/538)<.01};
  return {fixture:true,realIOS:false,realSDK:false,kind,phase:state,variant,viewport:[innerWidth,innerHeight],inset:getComputedStyle(document.documentElement).getPropertyValue('--gravity-top-inset'),feedback:q('reaction-feedback').textContent,feedbackParent:q('reaction-feedback').parentElement.id,reservedHeight,toolbarSpareWidth:spare,fourPlayersMinimumWidth:minMultiWidth,fourPlayersFitSpare:spare>=minMultiWidth,nodes,chips,fullSlots:fullSlots.length,checks,passed:Object.values(checks).every(Boolean)};
 }
 function setVariant(next='native'){
  variant=next;const strip=q('participantRailWrap'),feedback=q('reaction-feedback'),panel=q('resultPanel');
  for(const k of ['display','height','flex-basis'])strip.style.removeProperty(k);
  for(const k of ['width','height','flex-basis','font-size'])feedback.style.removeProperty(k);panel.style.removeProperty('max-height');
  const baseReserve=rect(q('gameToolbar')).bottom-rect(q('gameScreen')).y+16;
  if(kind==='solo'&&next==='baseline'){strip.style.display='none';panel.style.maxHeight='min(68%,calc(100% - '+baseReserve+'px))';}
  if(kind==='solo'&&next==='40'){strip.style.height='40px';strip.style.flexBasis='40px';feedback.style.width='40px';feedback.style.height='40px';feedback.style.flexBasis='40px';feedback.style.fontSize='40px';panel.style.maxHeight='min(68%,calc(100% - '+(baseReserve+44)+'px))';}
  return measure();
 }
 function compare(){const original=variant,measurements={};for(const v of ['baseline','native','40'])measurements[v]=setVariant(v);setVariant(original);const base=measurements.baseline.nodes.field,n=measurements.native.nodes.field,big=measurements['40'].nodes.field;return {kind,phase:state,viewport:[innerWidth,innerHeight],measurements,deltaNative:{width:n.width-base.width,height:n.height-base.height,areaPercent:base.width&&base.height?100*(n.width*n.height/(base.width*base.height)-1):null},delta40:{width:big.width-base.width,height:big.height-base.height,areaPercent:base.width&&base.height?100*(big.width*big.height/(base.width*base.height)-1):null},restoredVariant:variant};}
 function scenario(mode='solo',phase='fight'){
  if(!window.StableHeaderQA?.ready)throw Error('結果・比較fixtureを選び、読み込み後に操作してください。');
  kind=mode;setVariant('native');StableHeaderQA.choose(mode);
  if(mode==='multi'){
   multiAdapter.getProfile=id=>({name:id==='qa-you'?'確認ユーザー':id==='qa-hana'?'とても長い参加者の名前を確認ABC':id});
   multiSnapshot.confirmedSides=[{userId:'qa-hana',side:'A'},{userId:'qa-taro',side:'B'}];multiSnapshot.selectedSides=[{userId:'qa-you',side:'A'},{userId:'qa-four',side:'B'}];multiSnapshot.selectionEpochs=[];
   syncPredictionPicks(multiSnapshot);syncReactions();
  }
  if(phase!=='choose')StableHeaderQA.fight();
  if(phase==='result')StableHeaderQA.result();
  if(phase!=='choose'){
   if(mode==='solo')q('reactionCheer').click();
   else syncParticipantRail(true,[{sender:'qa-you',emoji:'cheer'},{sender:'qa-four',emoji:'wow'},{sender:'qa-eight',emoji:'applause'}]);
  }
  return measure();
 }
 function scroll(){if(kind!=='multi')throw Error('マルチを選んでください。');q('participantRail').scrollLeft=q('participantRail').scrollWidth;syncParticipantRail(true,[{sender:'qa-you',emoji:'cheer'},{sender:'qa-eight',emoji:'applause'}]);return measure();}
 window.UpperReactionQA={scenario,measure,compare,setVariant,scroll,run(action){const [mode,phase]=action.split(':');if(['solo','multi'].includes(mode))return scenario(mode,phase||'fight');if(action==='compare')return compare();if(action==='scroll')return scroll();if(action==='native'||action==='40'||action==='baseline')return setVariant(action);return measure();}};
})();
