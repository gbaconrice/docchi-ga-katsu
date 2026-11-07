/* Development-only, disposable boss ability preview. Uses production step/draw,
 * registered art and metadata. Never included by the normal game entry. */
(() => {
  'use strict';
  const nativeRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  paused = true;
  // The isolated canvas has no normal game UI or result/wallet/SDK lifecycle.
  // step() may finish a battle; suppress only its UI update callback here.
  update = () => {};
  const roster = [...BossAbilities.specs.keys()].filter(id => Object.hasOwn(TYPES, id)).map(id => {
    const spec = BossAbilities.spec(id);
    return {id, name:TYPES[id].name, ability:spec.name, description:spec.description || '', tag:spec.tag || ''};
  });
  let selected = roster[0].id, mirrored = false, playing = false, ready = false;
  let abilities = 0, effects = 0, lastEvents = [], error = '';
  const style = document.createElement('style');
  style.textContent = 'html,body{margin:0!important;padding:0!important;min-width:0!important;background:#17231f!important;overflow-x:hidden}#app{display:none!important}#bossFixtureStage{width:100%;max-width:480px;margin:0 auto}#bossFixtureStage #field{display:block;width:100%!important;height:auto!important;max-width:100%;box-sizing:border-box;aspect-ratio:480/538}#bossFixtureCaption{color:#f5eacb;font:13px/1.5 system-ui;padding:10px;margin:0}';
  document.head.appendChild(style);
  const stage = document.createElement('section'); stage.id = 'bossFixtureStage';
  stage.appendChild(document.getElementById('field')); document.body.appendChild(stage);
  const caption = document.createElement('p'); caption.id = 'bossFixtureCaption';
  caption.textContent = '能力確認用の固定配置。敵3体はHP 3000、攻撃待機。味方の剣士1体を配置。';
  stage.appendChild(caption);
  function snapshot() {
    return {type:'boss-preview-state', ready, roster, selected, mirrored, playing,
      tick:Math.round(elapsed*60), abilities, effects, lastEvents, error,
      bossHp:units[0]?.hp, units:units.length, activeEffects:activeEffects.map(e=>e.kind)};
  }
  function report() { if (window.parent !== window) window.parent.postMessage(snapshot(), location.origin); }
  function reset() {
    playing = false; abilities = 0; effects = 0; lastEvents = []; error = '';
    BossAbilities.reset();
    for(const f of [resetCrowdPresentation,resetLionPresentation,resetShockPresentation,resetComboPresentation,resetCleavePresentation,resetWingPresentation,resetWave4Presentation,resetDefensePresentation,resetHighPresentation,resetStagedPresentation,resetBombPresentation]) f();
    elapsed=0; shots=[]; activeEffects=[]; newEffects=[]; visualTime=0; effectClockTick=0;
    visualUnits=new WeakMap(); state='fight'; winner=null; pendingSummons=[]; battleEnvironment=null; combatEvents=[];
    const make=(id,k,side,x,y)=>({id,token:'preview:'+id,k,side:mirrored?1-side:side,x:mirrored?480-x:x,y,
      hp:id===1?TYPES[k].hp:3000,maxHp:id===1?TYPES[k].hp:3000,bossMaxHp:id===1?TYPES[k].hp:3000,
      cd:id===1?0:999,priority:id/10,dead:false,originForward:(side===0?1:-1)*(mirrored?-1:1)});
    units=[make(1,selected,0,180,240),make(2,'sword',1,230,240),make(3,'shield',1,250,210),make(4,'archer',1,260,270),make(5,'sword',0,150,220)];
    initialUnits=units.map(u=>({...u})); initialKinds=[0,1].map(s=>units.filter(u=>u.side===s).map(u=>u.k));
    beginLicensedOpening(units); configureFixedCamera(); draw(); report();
  }
  function advance(count) {
    for(let i=0;i<count;i++) {
      if(state==='result'){playing=false;break;}
      combatEvents=[]; step(1/60);
      const events=combatEvents.filter(e=>e.type==='boss_ability'||e.type==='boss_effect');
      abilities+=events.filter(e=>e.type==='boss_ability').length;
      effects+=events.filter(e=>e.type==='boss_effect').length;
      if(events.length) lastEvents=events.slice(-4).map(e=>({type:e.type,name:e.name||e.kind,tick:e.tick}));
    }
    draw(); report();
  }
  function command(message) {
    if(!ready) return;
    try {
      switch(message.action) {
        case 'select': if(!roster.some(r=>r.id===message.id))return; selected=message.id; reset(); break;
        case 'reset': reset(); break;
        case 'advance': playing=false; advance([1,15,60].includes(message.count)?message.count:1); break;
        case 'play': playing=!playing; break;
        case 'mirror': mirrored=!mirrored; reset(); break;
        case 'killboss': if(!elapsed)advance(1);units[0].hp=0;units[0].dead=true;advance(1);break;
        case 'woundboss': if(!elapsed)advance(1);units[0].hp=Math.min(units[0].hp,units[0].bossMaxHp*.49);advance(1);break;
        case 'killenemy': if(!elapsed)advance(1);{const enemy=units.find(u=>u.side!==units[0].side&&!u.dead);if(enemy){enemy.hp=0;enemy.dead=true;advance(1);}}break;
        case 'status': break;
        default:return;
      }
      report();
    } catch(e) { playing=false; error=e.message; report(); }
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='boss-preview-command')return;
    command(event.data);
  });
  window.BossPreviewQA={snapshot,command};
  // Drain the game's previously queued frame before installing the fixed fixture.
  nativeRaf(()=>{
    ready=true; reset(); let previous=0, carry=0;
    function frame(now) {
      if(playing) {carry+=Math.min(100,now-previous||0);const ticks=Math.min(6,Math.floor(carry/(1000/60)));if(ticks){carry-=ticks*(1000/60);advance(ticks);}}
      else {carry=0;draw();}
      previous=now;nativeRaf(frame);
    }
    nativeRaf(frame);
  });
})();
