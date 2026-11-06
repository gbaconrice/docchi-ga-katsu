/* Development-only checks. Load as a script in the QA entry after
   qa-stable-header.js. No injected CSS, SDK, transport or score calls. */
(() => {
  'use strict';
  const q=id=>document.getElementById(id);
  const box=id=>{const n=q(id),r=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,centerY:r.y+r.height/2,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,whiteSpace:s.whiteSpace,overflowX:s.overflowX,text:n.textContent,visible:!n.hidden&&s.display!=='none'&&r.width>0&&r.height>0};};
  const keys=['gameTopline','fieldStatus','status','balance','soundToggle','gameToolbar','battleChoice','battleClock','unitsToggle','reactionToggle','pause','participantRailWrap','breakdown'];
  function measure(){
    const nodes=Object.fromEntries(keys.map(id=>[id,box(id)])),h=nodes.gameTopline,t=nodes.gameToolbar;
    const wallet=q('balance').parentElement.getBoundingClientRect();
    const headerInOrder=nodes.fieldStatus.right<=nodes.status.x+.5&&nodes.status.right<=wallet.x+.5&&wallet.right<=nodes.soundToggle.x+.5;
    const singleRow=['fieldStatus','status','soundToggle'].every(id=>Math.abs(nodes[id].centerY-h.centerY)<.6)&&Math.abs(wallet.y+wallet.height/2-h.centerY)<.6;
    const inToolbar=['battleChoice','battleClock','unitsToggle','reactionToggle','pause'].every(id=>nodes[id].x>=t.x-.5&&nodes[id].right<=t.right+.5);
    const buttonSizes=['soundToggle','unitsToggle','reactionToggle','pause'].every(id=>nodes[id].width>=44&&nodes[id].height>=44);
    const compactPrediction=nodes.battleChoice.width<=80.5&&Math.abs(nodes.battleChoice.right+4-nodes.battleClock.x)<.6;
    const noPageOverflow=document.documentElement.scrollWidth<=innerWidth+1;
    const fontShared=nodes.balance.fontFamily===nodes.breakdown.fontFamily;
    const stable=window.StableHeaderQA?.measure();
    const checks={headerInOrder,singleRow,inToolbar,buttonSizes,compactPrediction,noPageOverflow,fontShared,resultClearOfHeader:stable?.checks.resultClearOfHeader??null};
    return {viewport:[innerWidth,innerHeight],inset:getComputedStyle(document.documentElement).getPropertyValue('--gravity-top-inset'),nodes,wallet:{x:wallet.x,y:wallet.y,width:wallet.width,height:wallet.height,right:wallet.right},checks,passed:Object.values(checks).every(x=>x===true),realIOS:false,realSDK:false};
  }
  function stress(){
    const terrain=q('fieldStatus'),balance=q('balance'),old=[terrain.textContent,balance.textContent,terrain.scrollLeft,balance.scrollLeft];
    terrain.textContent='岩場・突撃追加ダメージ −8%／長い地形名と追加効果の全文スクロール確認';
    balance.textContent='99,999,999,999,999,999,999';
    terrain.scrollLeft=1e6;balance.scrollLeft=1e6;
    const result=measure();
    result.checks.terrainScrollable=terrain.scrollWidth>terrain.clientWidth&&terrain.scrollLeft>0;
    result.checks.balanceScrollable=balance.scrollWidth>balance.clientWidth&&balance.scrollLeft>0;
    result.passed=Object.values(result.checks).every(x=>x===true);
    terrain.textContent=old[0];balance.textContent=old[1];terrain.scrollLeft=old[2];balance.scrollLeft=old[3];
    return result;
  }
  window.HorizontalHeaderQA={measure,stress,cycle(mode='solo'){
    StableHeaderQA.choose(mode);const choose=measure();StableHeaderQA.fight();const fight=measure();StableHeaderQA.result();const result=measure();const longText=stress();
    return {mode,choose,fight,result,longText,passed:[choose,fight,result,longText].every(x=>x.passed)};
  }};
})();
