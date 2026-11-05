'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
process.env.GAME_JS=path.resolve(__dirname,process.env.GAME_JS||'corner-reservation-v7-runtime.js');
const {vm,context}=require('./harness.cjs');context.assert=assert;
const result=vm.runInContext(`(()=>{
let checks=0;const records=[],issues=[];
const check=(ok,label)=>{assert(ok,label);checks++;};
const roles=['pillar_hammerer','spectralhand_wizard','colossal_hornfist'];
function setup(k='pillar_hammerer',mirror=false){
 elapsed=3;state='fight';winner=null;pendingSummons=[];shots=[];combatEvents=[];battleEnvironment=null;
 const t=TYPES[k],side=mirror?1:0,rx=x=>mirror?480-x:x,ax={pillar_hammerer:446,spectralhand_wizard:452,colossal_hornfist:440}[k],ay=538-t.radius,dx={pillar_hammerer:20,spectralhand_wizard:16,colossal_hornfist:24}[k],dy={pillar_hammerer:27,spectralhand_wizard:23,colossal_hornfist:30}[k];
 const body=(kind,token,s,x,y,id)=>({k:kind,token,id,side:s,x:rx(x),y,hp:1e6,cd:1e9,priority:.1+id*.001,dead:false,originForward:mirror?-1:1,slowFactor:0,slowUntil:1000});
 const a=body(k,'source',side,ax,ay,1),target=body('goblin','target',1-side,473,531,2);a.cd=0;a.guardReadyAt=6;a.cornerStudySince=0;a.cornerStudyTarget='target';
 units=[a,target,body('shield','f0',side,ax-t.radius-12,ay,3),body('shield','f1',side,ax-dx,ay-dy,4),body('shield','f2',side,ax-dx-24,ay-dy,5),body('shield','f3',side,ax-dx-48,ay-dy,6)];
 return {a,target,t,body,events:[]};
}
function step(c,n=1){for(let i=0;i<n;i++){combatEvents=[];combatStep(1/60);c.events.push(...combatEvents);}}
const es=(c,type)=>c.events.filter(e=>e.type===type);
function observe(c,ct=181){cornerStudyObserve(c.a,c.t,units.filter(u=>u!==c.a&&u.side!==c.a.side&&!u.dead),units.filter(u=>!u.dead),ct);}
// The readiness helper deliberately relies on Observe running immediately before it.
for(const k of roles){
 for(const mutation of ['target-leaves-x-edge','target-leaves-y-edge','target-air','target-missing','nearest-changed','too-far','crowd-too-small','no-touch']){
  const c=setup(k);
  if(mutation==='target-leaves-x-edge')c.target.x-=1;
  if(mutation==='target-leaves-y-edge')c.target.y-=1;
  if(mutation==='target-air')c.target.k=Object.keys(TYPES).find(k=>TYPES[k].collisionLayer==='air');
  if(mutation==='target-missing')c.target.dead=true;
  if(mutation==='nearest-changed')units.push(c.body('goblin','closer',1-c.a.side,c.a.x,c.a.y-1,20));
  if(mutation==='too-far')c.a.x-=c.t.pillarOffset;
  if(mutation==='crowd-too-small')units.pop();
  if(mutation==='no-touch')for(const w of units.filter(u=>u.side===c.a.side&&u!==c.a)){w.x-=100;w.y-=100;}
  observe(c);
  check(c.a.cornerStudySince===undefined&&c.a.cornerStudyTarget===undefined,k+' clears stale observation: '+mutation);
  check(!cornerStudyReady(c.a,c.target,c.t,units,181),k+' no stale start '+mutation);
 }
 {const c=setup(k);delete c.a.cornerStudySince;delete c.a.cornerStudyTarget;observe(c,1);check(c.a.cornerStudySince===1,'fresh clock');observe(c,180);check(!cornerStudyReady(c.a,c.target,c.t,units,180),'179 ticks rejected');observe(c,181);check(cornerStudyReady(c.a,c.target,c.t,units,181),'180 ticks accepted');}
 {const c=setup(k);c.target.token='replacement';observe(c,181);check(c.a.cornerStudySince===181,'new identity resets clock');check(!cornerStudyReady(c.a,c.target,c.t,units,181),'replacement cannot inherit wait');}
 {const c=setup(k);c.a.cd=.1;observe(c);check(!cornerStudyReady(c.a,c.target,c.t,units,181),'positive cooldown rejected');}
 {const c=setup(k);c.a.guardReadyAt=(181+c.t.pillarWindupTicks)/60;observe(c);check(!cornerStudyReady(c.a,c.target,c.t,units,181),'guard at contact tick rejected');c.a.guardReadyAt=(182+c.t.pillarWindupTicks)/60;check(cornerStudyReady(c.a,c.target,c.t,units,181),'guard after contact allowed');}
 {const c=setup(k);units[3].x-=50;observe(c);check(c.a.cornerStudySince===0,'one touching ally preserves observation');check(!cornerStudyReady(c.a,c.target,c.t,units,181),'but second touching ally required to start');}
 // Source death one tick before due must cancel; incoming projectile at due is simultaneous,
 // as for normal attacks. No added projectile immunity or cancellation policy.
 for(const victim of ['source','target'])for(const relative of [-1,0]){
  const c=setup(k);step(c);const due=c.a.cornerStrikeDue;step(c,c.t.pillarWindupTicks-1+relative);
  const v=victim==='source'?c.a:c.target;v.hp=1;
  shots.push({side:1-v.side,k:'goblin',sourceToken:'projectile-source',x:v.x,y:v.y,target:v,damage:2,speed:1e6,splash:0,mask:['ground']});
  step(c,3-relative);
  const contacts=es(c,'corner_pillar_release');
  if(relative===-1)check(contacts.length===0,k+' '+victim+' projectile death before due cancels');
  else check(contacts.length===1&&contacts[0].tick===due,k+' '+victim+' due-tick projectile permits simultaneous contact');
  check(!c.a.cornerStrikeToken,k+' death cleanup');
  records.push({case:'projectile',k,victim,relative,cornerContacts:contacts.length,ends:es(c,'corner_pillar_end').map(e=>e.reason)});
 }
}
// Reservation completion does not permit an early ordinary pillar follow-up.
for(const k of roles){
 const c=setup(k);step(c,c.t.pillarWindupTicks+1);check(es(c,'corner_pillar_release').length===1,'cooldown setup release');
 const contact=es(c,'corner_pillar_release')[0].tick;units=[c.a,c.target];c.a.x=480-c.t.pillarRadius-c.t.pillarOffset;c.a.y=538-Math.max(c.t.radius,c.t.pillarRadius);if(k==='colossal_hornfist'){c.a.y=512;c.target.y=530;}
 const cdAfter=c.a.cd;step(c,Math.ceil(c.t.rate*60)+1);const normal=es(c,'pillar_action_start')[0];check(!!normal,'ordinary follow-up still possible');check(normal.startTick-contact>=Math.ceil(c.t.rate*60),'ordinary follow-up respects whole cooldown');
 records.push({case:'normal-after-corner',k,rate:c.t.rate,cdAfter,gapTicks:normal.startTick-contact});
}
// Validate cap and friendly exclusion at release against staged target crowding.
for(const k of roles){const c=setup(k);step(c,c.t.pillarWindupTicks);for(let n=0;n<5;n++)units.push(c.body('goblin','extra-'+n,1-c.a.side,c.target.x-(n%2)*7,c.target.y-(Math.floor(n/2)+1)*7,30+n));const friend=c.body('goblin','friend-in-area',c.a.side,c.target.x,c.target.y,40);units.push(friend);const before=friend.hp;step(c);const release=es(c,'corner_pillar_release')[0];check(release&&release.count===c.t.pillarTargetCap,'rescue retains target cap '+k);check(friend.hp===before,'rescue excludes allies '+k);check(es(c,'resolved_hit').filter(e=>e.actionToken==='source/corner:1').length===c.t.pillarTargetCap,'cap limits resolved hits '+k);}
// Four independent corners, two sides, multiple sources, reversal/repeat parity.
function multiple(mirror=false,reverse=false){
 const c=setup('pillar_hammerer',mirror);const all=[...units],groups=[c];
 for(let n=1;n<4;n++){
  const q=setup('pillar_hammerer',mirror);const side=n&1;
  for(const u of units){u.token+='-'+n;u.id+=n*10;u.priority+=n*.01;if(side){u.x=480-u.x;u.side=1-u.side;u.originForward*=-1;}if(n&2)u.y=538-u.y;}
  q.a.cornerStudyTarget=q.target.token;all.push(...units);groups.push(q);
 }
 units=reverse?all.reverse():all;const group={events:[]};step(group,64);
 const canonX=x=>mirror?480-x:x;
 return {events:group.events.filter(e=>e.type.startsWith('corner_pillar_')).map(e=>({...e,x:canonX(e.x),...(e.zoneX!==undefined?{zoneX:canonX(e.zoneX)}:{}),...(e.face!==undefined?{face:mirror?-e.face:e.face}:{})})),units:units.slice().sort(stableOrder).map(u=>({token:u.token,x:canonX(u.x),y:u.y,hp:u.hp,cd:u.cd,spent:!!u.cornerStudySpent})),contacts:group.events.filter(e=>e.type==='corner_pillar_release').length};
}
const many=multiple(),repeat=multiple(),reverse=multiple(false,true),mirror=multiple(true);
check(many.contacts===4,'four independent sources release');check(JSON.stringify(many)===JSON.stringify(repeat),'concurrent exact repeat');check(JSON.stringify(many)===JSON.stringify(reverse),'concurrent input reversal');check(JSON.stringify(many)===JSON.stringify(mirror),'concurrent side-reflection');records.push({case:'four-corners',contacts:many.contacts,repeat:true,reversal:true,mirror:true});
// Dead-at-entry cleanup retains array order. This is not reachable from ordinary death
// resolution because end-of-tick cleanup already removes these tokens, but is a hardening gap.
function deadAtEntry(reverse){const c=setup();step(c);const d={...c.a,token:'dead-2',id:12,priority:.9,cornerStrikeToken:'dead-2/corner:1'};c.a.dead=d.dead=true;units.push(d);if(reverse)units.reverse();c.events=[];step(c);return es(c,'corner_pillar_end').map(e=>e.sourceToken);}
const deadNormal=deadAtEntry(false),deadReverse=deadAtEntry(true);if(JSON.stringify(deadNormal)!==JSON.stringify(deadReverse))issues.push({severity:'low',case:'dead-at-entry event order',normal:deadNormal,reversed:deadReverse,scope:'staged/rehydrated dead sources only; ordinary in-tick death cleanup is stable'});
if(!issues.length)check(JSON.stringify(deadNormal)===JSON.stringify(deadReverse),'dead-at-entry stable event cleanup');return {passed:true,checks,records,issues,scope:'Independent rooted synthetic safety checks. Not a broad balance or sprite validation.'};
})()`,context,{timeout:180000});
fs.writeFileSync(path.join(__dirname,process.env.OUT||'review-corner-combat-safety-v7-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
