const fs=require('fs'),assert=require('assert/strict'),{ev,ready}=require('./canvas-harness.cjs');
const file=process.argv[2]||require('path').join(__dirname,'../../qa-assets/qa-bosses.js');
(async()=>{
ev('globalThis.__qaRAF=[];requestAnimationFrame=fn=>{__qaRAF.push(fn);return 1};document.head=document.body;window.parent=window;');
ev(fs.readFileSync(file,'utf8'));ev('__qaRAF.shift()(0);BossPreviewQA.command({action:"select",id:"gauntlet_combo_guard"});');await ready();
ev('BossPreviewQA.command({action:"advance",count:60});for(let i=0;i<7;i++)BossPreviewQA.command({action:"advance",count:1});');
const read='({tick:Math.round(elapsed*60),frame:LICENSED_CLIP_REGISTRIES[units[0].k].frames[spriteFrame(units[0])].local,clip:LICENSED_CLIP_REGISTRIES[units[0].k].frames[spriteFrame(units[0])].clip,pose:units[0].pose,multi:!!multiPlayback,fx:activeEffects.filter(f=>effectClockTick-f.tick<effectLifetime(f)).map(f=>f.kind),error:BossPreviewQA.snapshot().error})';
const live=ev(read);ev('BossPreviewQA.command({action:"replay"});BossPreviewQA.command({action:"advance",count:60});for(let i=0;i<7;i++)BossPreviewQA.command({action:"advance",count:1});');const replay=ev(read);
console.log(JSON.stringify({file,live,replay},null,2));{assert.equal(live.frame,26);assert.equal(replay.frame,26);assert.equal(replay.clip,'attack');assert.deepEqual(replay.fx,live.fx);assert.equal(replay.error,'');}
})().catch(e=>{console.error(e);process.exitCode=1});
