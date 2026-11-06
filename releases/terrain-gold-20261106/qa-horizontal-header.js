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
    const headerInOrder=Math.max(nodes.fieldStatus.right,nodes.status.right)<=wallet.x+.5&&wallet.right<=nodes.soundToggle.x+.5;
    const referenceStack=Math.abs(nodes.fieldStatus.x-nodes.status.x)<.6&&nodes.status.bottom<=nodes.fieldStatus.y+.5&&Math.abs(nodes.soundToggle.centerY-h.centerY)<.6&&Math.abs(wallet.y+wallet.height/2-h.centerY)<.6;
    const label=q('fieldStatusText').getBoundingClientRect(),icon=q('fieldStatus').querySelector('.field-detail-icon').getBoundingClientRect();
    const terrainFullyVisible=label.right<=icon.x+.5&&icon.right<=nodes.fieldStatus.right+.5&&nodes.fieldStatus.scrollWidth<=nodes.fieldStatus.clientWidth+1&&parseFloat(nodes.fieldStatus.fontSize)>=13;
    const inToolbar=['battleChoice','battleClock','unitsToggle','reactionToggle','pause'].every(id=>nodes[id].x>=t.x-.5&&nodes[id].right<=t.right+.5);
    const buttonSizes=['soundToggle','unitsToggle','reactionToggle','pause'].every(id=>nodes[id].width>=44&&nodes[id].height>=44);
    const compactPrediction=nodes.battleChoice.width<=80.5&&Math.abs(nodes.battleChoice.right+4-nodes.battleClock.x)<.6;
    const noPageOverflow=document.documentElement.scrollWidth<=innerWidth+1;
    const walletStyle=getComputedStyle(q('balance').parentElement),walletFont=getComputedStyle(q('balance')),resultFont=getComputedStyle(q('breakdown'));
    const earned=q('resultPanel').getAttribute('data-earned')==='true';
    const goldLeftAligned=walletStyle.justifyContent==='flex-start'&&walletStyle.textAlign==='left'&&walletFont.textAlign==='left';
    const walletFontMatchesReference=walletFont.fontFamily==='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'&&walletFont.fontWeight==='600'&&walletFont.fontVariantNumeric==='tabular-nums lining-nums'&&walletFont.letterSpacing==='0px';
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
    TerrainHeader.fit();const result=measure();
    result.checks.balanceScrollable=balance.scrollWidth>balance.clientWidth&&balance.scrollLeft>0;
    result.passed=Object.values(result.checks).every(x=>x===true);
    balance.textContent=old[0];balance.scrollLeft=old[1];return result;
  }
  window.HorizontalHeaderQA={measure,stress,cycle(mode='solo'){
    StableHeaderQA.choose(mode);const choose=measure();StableHeaderQA.fight();const fight=measure();StableHeaderQA.result();const result=measure();const longText=stress();
    return {mode,choose,fight,result,longText,passed:[choose,fight,result,longText].every(x=>x.passed)};
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
   multiUser='qa-you';const participants=['qa-you','qa-other','qa-third'];multiSnapshot={sessionId:id,roundId:end,totalRounds:10,phase:'result',participants,spectators:[],departedIds:[],readyIds:[],continueIds:[],cashedOutIds:[],confirmedSides:[{userId:multiUser,side:'A'}],roundResults:[{playerId:multiUser,submitted:true,correct:true,side:'A',stake:25,delta:25,balanceBefore:100,balanceAfter:125}],wallets:participants.map(playerId=>({playerId,balance:125,correctCount:1,cashedOut:false})),winner:'A',nextRoundAt:final?null:Date.now()+30000,environment:battleEnvironment};
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

/* terrain-visible-qa-20261106: isolated, synthetic QA only.
   No SDK, transport, score, storage, persistence, or production-source writes. */
(()=>{
 'use strict';
 const q=id=>document.getElementById(id),seeds=new Map();
 let saved=null,nativeDescriptor=null,nativeCaptured=false,forcedFallback=false,lastLedgerUnchanged=null;
 function ready(){if(!window.StableHeaderQA?.ready||typeof TerrainHeader==='undefined')throw Error('「結果・比較fixture」または「GRAVITY fixture」を選び、読込後に操作してください。');}
 function ensureGame(){ready();if(screenMode!=='game'||!walletState)StableHeaderQA.choose('solo');}
 function environment(id,percent){
  if(!BattleFields.FIELD_IDS.includes(id)||!BattleFields.STRENGTHS.includes(percent))throw Error('地形または強度が無効です。');
  const key=id+':'+percent;
  if(!seeds.has(key)){for(let seed=0;seed<10000;seed++){const e=BattleFields.selectRunEnvironment(seed,percent);if(e.fieldId===id){seeds.set(key,e);break;}}}
  const e=seeds.get(key);if(!e)throw Error('検証用の地形seedが見つかりません。');BattleFields.validateEnvironment(e);return e;
 }
 const ledger=()=>JSON.stringify(multiSession?multiSnapshot?.wallets:walletState);
 function refresh(e){
  const before=ledger();battleEnvironment=e;
  if(multiSnapshot)multiSnapshot={...multiSnapshot,environment:e};
  update();TerrainHeader.fit();if(typeof draw==='function')draw();
  lastLedgerUnchanged=ledger()===before;
  if(!lastLedgerUnchanged)throw Error('地形fixtureが財布を変更しました。検証を中断してください。');
 }
 function apply(id,percent){ensureGame();if(!saved)saved={environment:battleEnvironment};refresh(environment(id,Number(percent)));return measure();}
 function close(){ready();TerrainHeader.close();return measure();}
 function open(){ensureGame();q('fieldStatus').click();return measure();}
 function fallback(){ensureGame();TerrainHeader.close();const d=q('fieldDetailsDialog');if(!nativeCaptured){nativeDescriptor=Object.getOwnPropertyDescriptor(d,'showModal');nativeCaptured=true;}Object.defineProperty(d,'showModal',{configurable:true,writable:true,value:undefined});forcedFallback=true;return open();}
 function native(){ready();TerrainHeader.close();if(nativeCaptured){const d=q('fieldDetailsDialog');if(nativeDescriptor)Object.defineProperty(d,'showModal',nativeDescriptor);else delete d.showModal;nativeCaptured=false;nativeDescriptor=null;}forcedFallback=false;return measure();}
 function restore(){ready();native();if(saved){const e=saved.environment;saved=null;refresh(e);}return measure();}
 function info(n){if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {box:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},display:s.display,hidden:!!n.hidden,visible:!n.hidden&&s.display!=='none'&&r.width>0&&r.height>0,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,whiteSpace:s.whiteSpace,overflowX:s.overflowX,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,clientHeight:n.clientHeight,scrollHeight:n.scrollHeight};}
 function measure(){
  ready();const b=q('fieldStatus'),l=q('fieldStatusText'),d=q('fieldDetailsDialog'),t=q('fieldDetailsText');
  const button=info(b),label=info(l),icon=info(b.querySelector('.field-detail-icon')),dialog=info(d),text=info(t),full=battleEnvironment?BattleFields.fieldLabel(battleEnvironment):'地図未定';
  const textClipped=label.visible&&(label.box.x<button.box.x-.5||label.box.right>(icon?.box.x??button.box.right)+.5||button.scrollWidth>button.clientWidth+1);
  const dialogOpen=d.hasAttribute('open'),top=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gravity-top-inset'))||0;
  return {fixture:'terrain-visible-qa-20261106',readOnlyMeasurement:true,realIOS:false,realSDK:false,persistence:false,viewport:[innerWidth,innerHeight],hostShell:document.documentElement.dataset.hostShell||'standalone',topInset:top,screenMode,state,round,fieldId:battleEnvironment?.fieldId||null,percent:battleEnvironment?.percent||null,fullText:full,displayedText:l.textContent,shortened:l.textContent!==full,textClipped,clippedText:textClipped?l.textContent:null,button,label,icon,detailText:t.textContent,dialog:{...dialog,open:dialogOpen,forcedFallback,nativeAvailable:typeof d.showModal==='function',insideViewport:dialogOpen?dialog.box.x>=0&&dialog.box.right<=innerWidth+.5&&dialog.box.y>=0&&dialog.box.bottom<=innerHeight+.5:null,insideTopInset:dialogOpen?dialog.box.y>=top-.5:null},detailTypography:text,focus:document.activeElement?.id||null,walletUnchangedByApply:lastLedgerUnchanged,checks:{labelAtLeast13px:parseFloat(button.fontSize)>=13,textNotClipped:!textClipped,singleLine:button.whiteSpace==='nowrap',exactDetail:t.textContent===full,dialogInViewport:dialogOpen?dialog.box.x>=0&&dialog.box.right<=innerWidth+.5&&dialog.box.y>=0&&dialog.box.bottom<=innerHeight+.5:null,noPageOverflow:document.documentElement.scrollWidth<=innerWidth+1}};
 }
 window.TerrainQA={apply,open,close,fallback,native,restore,measure};
})();
