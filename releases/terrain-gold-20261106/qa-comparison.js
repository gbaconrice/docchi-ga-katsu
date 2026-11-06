/* Development-only visual QA fixture. Load after the game scripts in qa-entry
 * only. Never ship this file or reference it from the production entry.
 * Click the ordinary solo-start button before calling comparison(pair).
 * No eval, service/API communication, storage write or combat-type mutation.
 * The existing asset loader only loads the selected characters as usual.
 */
window.DocchiQa = Object.assign(window.DocchiQa || {}, {
  comparison(pair) {
    if (screenMode !== 'game' || multiSession) {
      throw new Error('QA fixture requires an open solo game. Click the solo-start button first.');
    }
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some(kind => typeof kind !== 'string' || !CONTENT_ROSTER.selectable.includes(kind))) {
      throw new Error('comparison(pair) requires exactly two selectable species IDs.');
    }
    units = pair.map((k, side) => ({
      k, side, id: side + 1, token: 'qa-display:' + side,
      x: side ? 360 : 120, y: 269, hp: TYPES[k].hp, cd: 0,
      priority: .1 + side * .1, dead: false, originForward: side ? -1 : 1
    }));
    initialUnits = units.map(unit => ({...unit}));
    initialKinds = pair.map(kind => [kind]);
    shots = [];
    pendingSummons = [];
    combatEvents = [];
    elapsed = 0;
    winner = null;
    state = 'choose';
    selectedSide = 1;
    beginLicensedOpening(units);
    update();
    fillUnitStats();
    drawArmyPreviews();
    return {
      pair: pair.slice(),
      facts: pair.map(kind => ({kind, ...buildUnitComparisonFacts(TYPES[kind])})),
      assets: assetProgress()
    };
  }
});

/* Development-only full-name fixture. Append to qa-comparison.js, never production. */
(()=>{
 function visibleNames(){return Array.from(document.querySelectorAll('.comparison-name')).filter(n=>n.getBoundingClientRect().width>0);}
 function measure(){
  const rows=visibleNames().map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n),q=n.parentElement.querySelector('.comparison-quantity'),qr=q.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const tr=range.getBoundingClientRect();return{name:n.textContent,title:n.title,whiteSpace:s.whiteSpace,fontSize:parseFloat(s.fontSize),lineHeight:parseFloat(s.lineHeight),box:[r.left,r.top,r.width,r.height],textHeight:tr.height,scrollLeft:n.scrollLeft,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,quantity:q.textContent,countBelowName:qr.top>=r.bottom-1,wholeName:n.title===n.textContent,atEnd:Math.abs(n.scrollWidth-n.clientWidth-n.scrollLeft)<=1,oneLine:s.whiteSpace==='nowrap'&&tr.height<=parseFloat(s.lineHeight)+1};});
  return{fixture:true,liveSDK:false,viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.scrollWidth,rows,checks:{noPageOverflow:document.documentElement.scrollWidth<=innerWidth,unbrokenNames:rows.every(r=>r.oneLine),readableSize:rows.every(r=>r.fontSize>=13),countsSeparate:rows.every(r=>r.countBelowName),fullNamesPreserved:rows.every(r=>r.wholeName)}};
 }
 function run(mode){
  if(!window.DocchiQa?.ready)throw Error('結果・比較fixture版を選択してください。');
  if(screenMode!=='game'||multiSession){showScreen('home');multiSession=null;openSoloScreen();}
  if(unitsOpen)toggleUnits(false);
  const byName=name=>CONTENT_ROSTER.selectable.find(k=>TYPES[k].name===name);
  const photo=['ブルースケイルファイター','ゴールドブレイドヘビー','グール','シェルウェーブファイター'].map(byName);
  if(photo.some(k=>!k))throw Error('Photo roster changed');
  const longest=CONTENT_ROSTER.selectable.slice().sort((a,b)=>TYPES[b].name.length-TYPES[a].name.length).slice(0,6);
  const kinds=mode==='longest'?longest:photo;
  DocchiQa.comparison(kinds.slice(0,2));
  units=kinds.map((k,i)=>({k,side:i%2,id:i+1,token:'qa-name:'+i,x:i%2?360:120,y:240+i*10,hp:TYPES[k].hp,cd:0,priority:.1+i*.01,dead:false,originForward:i%2?-1:1}));
  initialUnits=units.map(u=>({...u}));initialKinds=[kinds.filter((_,i)=>!(i%2)),kinds.filter((_,i)=>i%2)];shots=[];pendingSummons=[];combatEvents=[];elapsed=0;winner=null;state='choose';selectedSide=1;
  beginLicensedOpening(units);update();fillUnitStats();drawArmyPreviews();return measure();
 }
 window.NameLayoutQA={photo:()=>run('photo'),longest:()=>run('longest'),measure,details(){state='fight';predictionPreview=false;paused=true;syncFlowControls();toggleUnits(true);return measure()},comparison(){toggleUnits(false);state='choose';predictionPreview=true;update();fillUnitStats();drawArmyPreviews();return measure()},start(){visibleNames().forEach(n=>n.scrollLeft=0);return measure()},end(){visibleNames().forEach(n=>n.scrollLeft=n.scrollWidth);return measure()}};
})();
