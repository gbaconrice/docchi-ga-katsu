const fs=require('fs'),path=require('path'),assert=require('assert/strict');process.env.GAME_JS=path.resolve(__dirname,process.env.GAME_JS||'corner-reservation-v7-runtime.js');const {vm,context}=require('./harness.cjs');context.assert=assert;
const out=vm.runInContext(`(()=>{
 for(const k of ['goblin','shield','pillar_hammerer','spectralhand_wizard','colossal_hornfist'])TYPES[k].hp=1e6;let checks=0;const roles=['pillar_hammerer','spectralhand_wizard','colossal_hornfist'];const records=[];
 const check=(v,msg)=>{assert(v,msg);checks++;};
 function setup(k,corner=0){elapsed=3;state='fight';winner=null;pendingSummons=[];shots=[];combatEvents=[];battleEnvironment=null;const t=TYPES[k],left=!!(corner&1),top=!!(corner&2),rx=x=>left?480-x:x,ry=y=>top?538-y:y,side=left?1:0,ax={pillar_hammerer:446,spectralhand_wizard:452,colossal_hornfist:440}[k],ay=538-t.radius,dx={pillar_hammerer:20,spectralhand_wizard:16,colossal_hornfist:24}[k],dy={pillar_hammerer:27,spectralhand_wizard:23,colossal_hornfist:30}[k];
 const body=(kind,token,s,x,y,id)=>({k:kind,token,id,side:s,x:rx(x),y:ry(y),hp:1e6,cd:1e9,priority:.1+id*.001,dead:false,originForward:left?-1:1,slowFactor:0,slowUntil:1000});
 const a=body(k,'source',side,ax,ay,1),target=body('goblin','target',1-side,473,531,2);a.cd=0;a.guardReadyAt=6;a.cornerStudySince=0;a.cornerStudyTarget='target';
 units=[a,target,body('shield','f0',side,ax-t.radius-12,ay,3),body('shield','f1',side,ax-dx,ay-dy,4),body('shield','f2',side,ax-dx-24,ay-dy,5),body('shield','f3',side,ax-dx-48,ay-dy,6)];return {a,target,t,corner,rx,ry,events:[]};}
 function step(c,n=1){for(let i=0;i<n;i++){combatEvents=[];combatStep(1/60);c.events.push(...combatEvents);}}
 function cornerEvents(c,type){return c.events.filter(e=>e.type===type);}
 for(const k of roles)for(let corner=0;corner<4;corner++){
  const c=setup(k,corner);step(c);const starts=cornerEvents(c,'corner_pillar_start');check(starts.length===1,k+' start '+corner);const start=starts[0],anchor={x:c.target.x,y:c.target.y};check(start.zoneX===anchor.x&&start.zoneY===anchor.y,'anchor is actual target');check(start.dueTick-start.startTick===c.t.pillarWindupTicks,'unchanged windup');
  const before=c.target.hp;step(c,c.t.pillarWindupTicks);const releases=cornerEvents(c,'corner_pillar_release');check(releases.length===1,'single release');const e=releases[0];check(e.zoneX===anchor.x&&e.zoneY===anchor.y,'fixed impact center');check(e.radius===c.t.pillarRadius&&e.count===1,'radius and target count');check(before-c.target.hp===c.t.dmg,'unchanged damage '+k+' '+corner+' got '+(before-c.target.hp)+' expected '+c.t.dmg+' events '+JSON.stringify(c.events.filter(x=>x.type==='resolved_hit')));check(c.a.cd===c.t.rate,'unchanged end cooldown');check(!c.a.cornerStrikeToken&&c.a.cornerStudySpent,'cleaned and spent');step(c,240);check(cornerEvents(c,'corner_pillar_start').length===1,'no repeated reservation');records.push({k,corner,start:start.startTick,contact:e.tick,center:anchor,damage:c.t.dmg,radius:e.radius});
 }
 for(const k of roles)for(const kind of ['move-target','move-source','source-dead','target-dead','target-layer','normal-priority','guard-priority','battle-ended']){
  const c=setup(k);step(c);const start=cornerEvents(c,'corner_pillar_start')[0];check(!!start,'lifecycle started '+kind);const anchor=cornerStrikeZone(c.a);
  if(kind==='move-target')c.target.x-=2*(c.t.pillarRadius+radiusOf(c.target)+1);
  if(kind==='move-source')c.a.x-=2;
  if(kind==='source-dead')c.a.dead=true;
  if(kind==='target-dead'){c.target.dead=true;units.push({k:'goblin',token:'other',id:99,side:1,x:100,y:100,hp:1e6,cd:1e9,priority:.9,slowFactor:0,slowUntil:1000});}
  if(kind==='target-layer')c.target.k=Object.keys(TYPES).find(x=>layerOf({k:x})!=='ground');
  if(kind==='normal-priority'){c.a.x=480-c.t.pillarRadius-c.t.pillarOffset;c.a.y=538-Math.max(c.t.radius,c.t.pillarRadius);if(k==='colossal_hornfist'){c.target.y=530;c.a.y=512;}}
  if(kind==='guard-priority'){c.a.guardReadyAt=0;if(k==='colossal_hornfist')c.a.x=444;}
  if(kind==='battle-ended'){elapsed=59.99;c.a.guardReadyAt=1000;c.a.cornerStrikeStart=3590;c.a.cornerStrikeDue=3590+c.t.pillarWindupTicks;}
  check(cornerStrikeZone(c.a).x===anchor.x&&cornerStrikeZone(c.a).y===anchor.y,'source/target motion cannot retarget');step(c,kind==='move-source'?c.t.pillarWindupTicks:1);
  if(kind==='move-source'){check(cornerEvents(c,'corner_pillar_release').length===1,'mobile reservation releases');continue;}
  const end=cornerEvents(c,'corner_pillar_end').at(-1),expected=({'move-target':'out-of-zone'})[kind]||kind;check(end&&end.reason===expected,k+' correct cancellation '+kind+' '+JSON.stringify(end));check(!c.a.cornerStrikeToken&&c.a.cornerStudySpent,'cancel cleans but spends');check(cornerEvents(c,'corner_pillar_release').length===0,'cancel never hits');
  if(kind==='guard-priority')check(!!c.a.guardAction&&c.a.cd<0,'guard survives cancellation without extra cooldown');
  if(kind==='normal-priority')check(!!c.a.pillarActionToken,'normal pillar takes priority');
 }
 const g=setup('pillar_hammerer');check(cornerStudyReady(g.a,g.target,g.t,units,181),'gate positive');g.a.cornerStudyNormalPillarUsed=true;check(!cornerStudyReady(g.a,g.target,g.t,units,181),'already functional source excluded');delete g.a.cornerStudyNormalPillarUsed;g.a.cornerStudySpent=true;check(!cornerStudyReady(g.a,g.target,g.t,units,181),'spent gate');delete g.a.cornerStudySpent;g.a.guardReadyAt=(181+g.t.pillarWindupTicks)/60;check(!cornerStudyReady(g.a,g.target,g.t,units,181),'known guard window not overlapped');g.a.guardReadyAt=0;check(!cornerStudyReady(g.a,g.target,g.t,units,181),'current guard not stolen');g.a.guardReadyAt=6;g.a.k=Object.keys(TYPES).find(x=>TYPES[x].pillarOffset&&!roles.includes(x));check(!cornerStudyReady(g.a,g.target,TYPES[g.a.k],units,181),'other pillar species excluded');
 return {passed:true,checks,records,scope:'Isolated mechanics fixtures; rooted setup and staged lifecycle changes, not balance or sprite rendering validation'};
})()`,context,{timeout:180000});fs.writeFileSync(path.join(__dirname,'mechanics-test-results.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
