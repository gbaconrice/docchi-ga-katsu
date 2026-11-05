'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const runtime=process.env.GAME_JS||'corner-reservation-v7-runtime.js';process.env.GAME_JS=path.resolve(__dirname,runtime);
const {vm,context}=require('./harness.cjs');context.assert=assert;
const result=vm.runInContext(`(()=>{const records=[];for(const k of ['pillar_hammerer','spectralhand_wizard','colossal_hornfist']){
 elapsed=3;state='fight';winner=null;pendingSummons=[];shots=[];combatEvents=[];battleEnvironment=null;
 const t=TYPES[k],ax={pillar_hammerer:446,spectralhand_wizard:452,colossal_hornfist:440}[k],ay=538-t.radius,dx={pillar_hammerer:20,spectralhand_wizard:16,colossal_hornfist:24}[k],dy={pillar_hammerer:27,spectralhand_wizard:23,colossal_hornfist:30}[k];
 const body=(kind,token,side,x,y,id)=>({k:kind,token,id,side,x,y,hp:1e6,cd:1e9,priority:.1+id*.001,dead:false,originForward:1,slowFactor:0,slowUntil:1000});
 const a=body(k,'source',0,ax,ay,1),target=body('goblin','target',1,473,531,2);a.cd=0;a.guardReadyAt=6;a.cornerStudySince=0;a.cornerStudyTarget='target';
 units=[a,target,body('shield','f0',0,ax-t.radius-12,ay,3),body('shield','f1',0,ax-dx,ay-dy,4),body('shield','f2',0,ax-dx-24,ay-dy,5),body('shield','f3',0,ax-dx-48,ay-dy,6)];const events=[];const step=()=>{combatEvents=[];combatStep(1/60);events.push(...combatEvents);};
 step();const reserved=!!a.cornerStrikeToken;target.x=300;target.y=200;units=[a,target];step();const cdAtCancellation=a.cd;
 target.x=473;target.y=531;a.x=480-t.pillarRadius-t.pillarOffset;a.y=538-Math.max(t.radius,t.pillarRadius);if(k==='colossal_hornfist'){a.y=512;target.y=530;}
 for(let i=0;i<190&&!events.some(e=>e.type==='pillar_action_start');i++)step();
 const start=events.find(e=>e.type==='pillar_action_start');assert(start,'normal opportunity eventually starts');records.push({k,reserved,cdAtCancellation,cancelReason:events.find(e=>e.type==='corner_pillar_end')?.reason||null,normalOpportunityTick:183,normalStartTick:start.startTick,delay:start.startTick-183,spent:!!a.cornerStudySpent,cornerReleases:events.filter(e=>e.type==='corner_pillar_release').length,cornerStarts:events.filter(e=>e.type==='corner_pillar_start').length});
}return {records};})()`,context,{timeout:30000});result.runtime=runtime;
fs.writeFileSync(path.resolve(__dirname,process.env.OUT||'review-corner-cancel-cooldown-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
