// Optional real-browser rendering QA on an authorized browser-capable executor.
// Never run against a live user session. This loads a disposable local source copy.
// Synthetic RAF/settlement fixtures test rendering, not actual device FPS or SDK transport.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
const source=fs.readFileSync(path.resolve(process.argv[2]||'index.html'),'utf8');
const out=path.resolve(process.argv[3]||'../evidence/browser');fs.mkdirSync(out,{recursive:true});
const viewports=[[320,568],[375,667],[390,844],[430,932],[844,390],[1180,760]];
const launch={headless:true};if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;
const tolerance=1;
function noOverlap(a,b,label){assert(a.right<=b.left+tolerance||b.right<=a.left+tolerance||a.bottom<=b.top+tolerance||b.bottom<=a.top+tolerance,label+': '+JSON.stringify({a,b}));}
(async()=>{
 const browser=await chromium.launch(launch);const results=[];
 try{for(const [width,height] of viewports){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>route.abort());
  await page.setContent(source.replace('<head>','<head><script>window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};<\/script>'),{waitUntil:'load'});
  await page.waitForFunction(()=>typeof openSoloScreen==='function');await page.click('#soloStart');
  for(const id of ['formationToggle','formationBack','previewClock','speedDown','speedUp','speed','battleControls'])assert.equal(await page.locator('#'+id).count(),0,id+' should be removed');
  await page.click('#red');await page.click('#confirm');
  await page.evaluate(()=>{syncCrowdInspector();syncBattleLog(1000);draw();});
  await page.click('#pause');assert(await page.locator('#pausePanel').isVisible());assert(await page.evaluate(()=>paused));
  await page.click('#pauseResume');assert(!(await page.evaluate(()=>paused)));
  await page.evaluate(()=>{syncCrowdInspector();syncBattleLog(1500);draw();});
  const geometry=()=>page.evaluate(()=>{
   const box=selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,hidden:n.hidden,visibility:getComputedStyle(n).visibility};};
   return {header:box('.game-topline'),wallet:box('.wallet-pill'),pause:box('#pause'),field:box('#field'),map:box('#fieldMap'),inspector:box('#crowdInspector'),log:box('#battleLog'),scrollWidth:document.documentElement.scrollWidth,phase:state};
  });
  const fight=await geometry();assert.equal(fight.phase,'fight');assert(fight.field.width>0&&fight.field.height>0);
  assert(fight.scrollWidth<=width,'horizontal overflow');noOverlap(fight.wallet,fight.pause,'wallet/pause overlap');noOverlap(fight.field,fight.inspector,'map/detail overlap');noOverlap(fight.inspector,fight.log,'detail/log overlap');
  assert(Math.abs(fight.pause.width-44)<tolerance&&Math.abs(fight.pause.height-44)<tolerance,'pause is not 44x44');
  assert(Math.abs((fight.field.width-2)/(fight.field.height-2)-480/538)<.01,'fitted map ratio');
  await page.screenshot({path:path.join(out,`fight-${width}x${height}.png`)});
  // A controlled, settled first-round result preserves the real result presentation path.
  await page.evaluate(()=>{walletState=SoloWallet.settleRound(walletState,{sessionId:walletState.sessionId,roundId:1,outcome:'A',now:0});state='result';winner=0;update();syncPersonalResult(2000);syncCrowdInspector();syncBattleLog(2000);draw();});
  const result=await geometry();assert.equal(result.phase,'result');assert(result.pause.hidden&&result.pause.visibility==='hidden');assert(result.log.hidden&&result.log.visibility==='hidden');
  for(const k of ['left','top','width','height'])assert(Math.abs(result.field[k]-fight.field[k])<=tolerance,`battle/result map changed ${k}: ${width}x${height}`);
  await page.screenshot({path:path.join(out,`result-${width}x${height}.png`)});
  assert.deepEqual(errors,[]);results.push({width,height,fight,result,errors,fixture:'synthetic rendering only'});await context.close();
 }
 fs.writeFileSync(path.join(out,'integrated-browser-results.json'),JSON.stringify(results,null,2));console.log('PASS actual browser rendering at '+results.map(x=>x.width+'x'+x.height).join(', '));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
