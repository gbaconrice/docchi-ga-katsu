'use strict';
const fs=require('fs'),assert=require('assert/strict');
const {vm,context}=require('./harness.cjs');context.assert=assert;
const result=vm.runInContext(`(()=>{
 const fields=['cameraZoom','cameraX','cameraY','cameraDrag','cameraFitScale','cameraFitBounds','cameraMode','cameraAutoLast','cameraAutoBounds','replayCornerCues','cornerResultOffset'];
 cameraZoom=1.5;cameraX=241;cameraY=272;cameraDrag={id:17,active:false};cameraFitScale=.75;cameraFitBounds={left:1,right:479,top:2,bottom:536};cameraMode='manual';cameraAutoLast=1234;cameraAutoBounds={minX:20,maxX:450,minY:30,maxY:500};replayCornerCues=[{sourceToken:'rollback-marker',phase:'warning'}];cornerResultOffset=7;
 const before=Object.fromEntries(fields.map(k=>[k,eval(k)]));
 const originalSetup=setup,originalReset=resetMultiRound,originalHost=multiHost,originalSession=multiSession;
 let reachedSetup=false,reachedOpen=false;
 multiHost=true;const lobby={phase:'lobby',roundId:null,environment:null};
 multiSession={getState:()=>lobby,openRound:()=>{reachedOpen=true;throw Error('injected-open-round-failure')}};
 // Use the actual setup path; suppress reset UI only, because the mock has no wallet API.
 resetMultiRound=()=>{replayCornerCues=[];cornerResultOffset=0;resetCameraForRound();};
 setup=(...args)=>{reachedSetup=true;return originalSetup(...args);};
 try{assert.throws(()=>openMultiRound(),/injected-open-round-failure/);assert(reachedSetup);assert(reachedOpen);for(const k of fields)assert.strictEqual(eval(k),before[k],k+' was not restored');}
 finally{setup=originalSetup;resetMultiRound=originalReset;multiHost=originalHost;multiSession=originalSession;}
 return {passed:true,fields,actualSetupExecuted:reachedSetup,injectedFailure:'multiSession.openRound',scope:'Rollback after real setup with UI reset adapter for minimal mock session'};
})()`,context,{timeout:180000});
fs.writeFileSync('combined-rollback-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
