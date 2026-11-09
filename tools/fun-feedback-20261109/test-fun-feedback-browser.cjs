// Browser check of fun-feedback. Usage: node test-fun-feedback-browser.cjs URL OUTDIR [width height rounds]
// Serve the repository root over HTTP first (python3 -m http.server) and pass releases/fun-feedback-20261109/index.html.
const {chromium}=require('playwright');const fs=require('fs');
const [url,out,W,H,R]=[process.argv[2],process.argv[3],+process.argv[4]||390,+process.argv[5]||844,+process.argv[6]||3];
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,200))});
 await p.goto(url,{waitUntil:'load',timeout:300000});await p.waitForSelector('#soloStart',{state:'visible',timeout:300000});
 await p.evaluate(()=>{window.__cues=[];const orig=audioCall;audioCall=function(fn){const s=String(fn);const m=s.match(/playUi\?\.\((\w+)/);if(m)window.__cues.push(performance.now()|0);return orig(fn);};
   // record UI cue names through the frozen API by wrapping the closure-level helper input
   const ui0=battleAudio.playUi;window.__uiNames=[];});
 await p.click('#soloStart');await p.waitForTimeout(1200);
 const rec={errors,rounds:[]};
 for(let r=1;r<=R;r++){
  await p.waitForSelector('#confirm',{state:'visible',timeout:120000});await p.waitForTimeout(800);
  const pre=await p.evaluate(()=>({round,carryStreak,incumbent:openingPlan?.incumbentSide,crown:document.querySelector('.fun-crown')?.textContent||null,
    fieldChunks:[...document.querySelectorAll('#fieldStatus .field-chunk')].map(x=>x.textContent),
    interval:/基本間隔/.test(document.querySelector('#comparison')?.innerText||''),
    placeholder:/読込中…|名前未取得/.test(document.body.innerText)}));
  await p.screenshot({path:`${out}/r${r}-1-choose.png`});
  const stake=await p.$('#stake50:not([hidden])')||await p.$('.stake-option:not([hidden])');if(stake)await stake.tap();
  await p.tap(r%2?'#red':'#blue');await p.waitForTimeout(250);
  // press feedback: hold a touch on the confirm button
  const cb=await p.$('#confirm');await cb.scrollIntoViewIfNeeded();const box=await cb.boundingBox();
  await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();
  pre.pressedClass=await p.evaluate(()=>document.querySelector('#confirm').classList.contains('fun-pressed'));
  await p.mouse.up();const t0=Date.now();
  await p.waitForTimeout(450);pre.seal=await p.evaluate(()=>!!document.querySelector('.fun-seal'));await p.screenshot({path:`${out}/r${r}-2-seal.png`});
  await p.waitForTimeout(500);pre.countdown=await p.evaluate(()=>{const e=document.querySelector('#funCountdown');return e&&!e.hidden?e.textContent:null});
  pre.stateDuringCountdown=await p.evaluate(()=>state);await p.screenshot({path:`${out}/r${r}-3-count.png`});
  await p.waitForFunction(()=>state==='fight',null,{timeout:10000});pre.delayToFightMs=Date.now()-t0;
  await p.waitForTimeout(3500);
  pre.tug=await p.evaluate(()=>{const g=document.querySelector('#funTug');return g&&!g.hidden?{pct:g.style.getPropertyValue('--tug'),mine:g.dataset.mine}:null});
  await p.screenshot({path:`${out}/r${r}-4-battle.png`});
  await p.waitForFunction(()=>state!=='fight',null,{timeout:300000,polling:300});
  pre.tugEnd=await p.evaluate(()=>{const g=document.querySelector('#funTug');return g&&!g.hidden?g.style.getPropertyValue('--tug'):null});
  pre.winner=await p.evaluate(()=>winner);pre.cues=await p.evaluate(()=>window.__cues.length);
  await p.waitForTimeout(1200);await p.screenshot({path:`${out}/r${r}-5-result.png`});
  rec.rounds.push(pre);
  const next=await p.$('#next:not([hidden])');if(!next)break;await next.tap();await p.waitForTimeout(800);
 }
 fs.writeFileSync(`${out}/record.json`,JSON.stringify(rec,null,1));console.log(JSON.stringify(rec,null,1));await b.close();
 const assert=require('assert');assert.deepEqual(errors,[]);assert(rec.rounds.length>=2);
 for(const r of rec.rounds){assert(r.pressedClass,'touch-down class');assert(r.seal,'予想 seal');assert.equal(r.stateDuringCountdown,'choose');assert(r.delayToFightMs>=1500&&r.delayToFightMs<4000,'solo countdown');assert(r.tug,'tug gauge');assert(!r.interval,'no attack interval');assert(!r.placeholder,'no name placeholder');assert(!r.fieldChunks.some(c=>c.length>14),'terrain chunks');}
 assert(rec.rounds.slice(1).some(r=>r.crown),'champion badge from round 2');console.log('PASS fun-feedback browser check');
})().catch(e=>{console.error('FATAL',e);process.exit(1)});
