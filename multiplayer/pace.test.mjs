import test from 'node:test';import assert from 'node:assert/strict';
import {advanceSceneSeconds,effectiveSpeed,sceneTickFromWallMs} from './clock-sync.mjs';
test('20/40 simulation thresholds, not manual speed multiplication',()=>{
 assert.equal(effectiveSpeed(19,2),2);assert.equal(effectiveSpeed(20,2),2);assert.equal(effectiveSpeed(40,2),3);
 for(const [wall,scene] of [[10,10],[20,20],[25,30],[30,40],[35,55]])assert.equal(advanceSceneSeconds(0,wall),scene);
 assert.equal(advanceSceneSeconds(19,2),22);assert.equal(advanceSceneSeconds(39,1),41.5);
 assert.equal(advanceSceneSeconds(0,20,2),40);assert.equal(sceneTickFromWallMs(35000),3300);
});
test('partitioned visible time yields same scene, pause adds nothing',()=>{
 for(const dt of [.001,.016,.1,.5,1,5]){let t=0,s=0;while(t<36){const d=Math.min(dt,36-t);s=advanceSceneSeconds(s,d);t+=d;}assert(Math.abs(s-58)<1e-7);assert.equal(advanceSceneSeconds(s,0),s);}
});
