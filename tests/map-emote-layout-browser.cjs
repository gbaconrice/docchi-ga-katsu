const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const htmlPath=path.resolve(process.argv[2]||'index.html'),out=path.resolve(process.argv[3]||'../artifacts');
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(htmlPath,'utf8');
const viewports=[[320,568],[375,667],[390,664],[430,740],[844,390],[768,1024],[1280,720]];
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],env:{...process.env,XDG_CONFIG_HOME:out+'/browser-config'}});const results=[];try{
 for(const [width,height] of viewports){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<900,hasTouch:width<900}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.setContent(html.replace('<head>','<head><script>window.__raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=()=>1;</script>'));
  await page.waitForFunction(()=>typeof openSoloScreen==='function');
  await page.click('#soloStart');await page.click('#red');await page.click('#confirm');
  await page.evaluate(()=>{for(let i=0;i<90&&state==='fight';i++)step(1/60);draw();update();});
  await page.click('#reactionToggle');await page.click('#reactionCheer');
  const rects=await page.evaluate(()=>{
   const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   const f=rect('#field'),stage=rect('#fieldStage'),reaction=rect('#reaction-feedback'),s=getComputedStyle(document.querySelector('#field'));
   const bw=parseFloat(s.borderLeftWidth)+parseFloat(s.borderRightWidth),bh=parseFloat(s.borderTopWidth)+parseFloat(s.borderBottomWidth),cw=f.width-bw,ch=f.height-bh,scale=Math.min(cw/480,ch/538);
   const content={left:f.left+bw/2+(cw-480*scale)/2,top:f.top+bh/2+(ch-538*scale)/2,width:480*scale,height:538*scale};content.right=content.left+content.width;content.bottom=content.top+content.height;
   return {f,stage,reaction,content,letterboxX:(cw-content.width)/2,letterboxY:(ch-content.height)/2,objectFit:s.objectFit,canvasSize:[document.querySelector('#field').width,document.querySelector('#field').height],reactionParent:document.querySelector('#reaction-feedback').parentElement.id,reactionVisible:!document.querySelector('#reaction-feedback').hidden,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,phase:state,stagePoint:stagePosition(240,269,0),cssContainerSupport:CSS.supports('width','1cqw')};
  });
  assert.equal(rects.phase,'fight');assert.deepEqual(rects.canvasSize,[480,538]);assert.equal(rects.objectFit,'contain');assert.equal(rects.reactionVisible,true);assert.equal(rects.reactionParent,'fieldMap');
  assert(rects.letterboxX<.05&&rects.letterboxY<.05,`frame has excess internal space ${width}x${height}: ${JSON.stringify(rects)}`);
  assert(rects.reaction.left>=rects.content.left&&rects.reaction.top>=rects.content.top&&rects.reaction.right<=rects.content.right&&rects.reaction.bottom<=rects.content.bottom,`reaction outside bitmap ${width}x${height}`);
  assert(rects.f.left>=rects.stage.left-.1&&rects.f.right<=rects.stage.right+.1&&rects.f.top>=rects.stage.top-.1&&rects.f.bottom<=rects.stage.bottom+.1,'field outside stage');assert(rects.scrollWidth<=width,'horizontal viewport overflow');
  await page.screenshot({path:out+`/battle-${width}x${height}.png`});
  await page.click('#reactionToggle');assert.equal(await page.locator('#reaction-bar').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#reaction-bar').isVisible(),false);
  await page.setViewportSize({width:height,height:width});await page.waitForTimeout(40);await page.setViewportSize({width,height});await page.waitForTimeout(40);
  const postResize=await page.locator('#field').boundingBox();assert(Math.abs(postResize.width-rects.f.width)<.1&&Math.abs(postResize.height-rects.f.height)<.1,'resize recovery');
  assert.deepEqual(errors,[]);results.push({width,height,...rects,errors});await context.close();
 }
 fs.writeFileSync(out+'/map-emote-layout-results.json',JSON.stringify(results,null,2));console.log('PASS',results.map(r=>`${r.width}x${r.height}: map ${r.content.width.toFixed(1)}x${r.content.height.toFixed(1)}, letterbox ${r.letterboxX.toFixed(3)}/${r.letterboxY.toFixed(3)}`).join('\n'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
