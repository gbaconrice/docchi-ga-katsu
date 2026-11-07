'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const crypto=require('crypto'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
assert(process.env.BASELINE_HTML&&process.env.GAME_HTML,'BASELINE_HTML and GAME_HTML required');
const beforePath=path.resolve(process.env.BASELINE_HTML),afterPath=path.resolve(process.env.GAME_HTML),before=fs.readFileSync(beforePath,'utf8'),after=fs.readFileSync(afterPath,'utf8'),beforeHash=hash(before),afterHash=hash(after);
const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const start='function scatterLostResultCoins(',end='\nfunction scatterResultCoins(';
// Integrated source also contains the separately verified UI/copy/VFX changes.
// This test retains exact old-vs-new trajectory assertions, not a false whole-file equality claim.
const b=(left,top,right,bottom)=>({left,top,right,bottom});
// Measured by real Chromium against the deployed 8baa496 QA page on 2026-11-07.
const measured=[
 {width:320,height:568,icon:b(80.5,25,106.5,51),wallet:b(111.5,22,141.25,54),rect:b(119.59375,372.109375,200.390625,416.109375)},
 {width:375,height:667,icon:b(84.5,25,110.5,51),wallet:b(115.5,22,145.25,54),rect:b(142.046875,465.796875,232.9375,514.796875)},
 {width:390,height:844,icon:b(84.5,25,110.5,51),wallet:b(115.5,22,145.25,54),rect:b(147.765625,642.25,242.234375,692.25)},
 {width:430,height:932,icon:b(84.5,25,110.5,51),wallet:b(115.5,22,145.25,54),rect:b(162.90625,725.109375,267.09375,781.109375)}
];
function run(source,g,entry={correct:false,delta:-25},reducedMotion=false){
 const nodes={'#earnedFlightLayer':{hidden:true},'.wallet-coin':{getBoundingClientRect:()=>g.icon},'#balance':{getBoundingClientRect:()=>g.wallet},'#gameToolbar':{attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]}}};
 for(let i=0;i<12;i++)nodes['#resultScatter'+i]={style:{},animate:(frames,options)=>({frames,options,cancel(){}})};
 const ctx={document:{querySelector:id=>nodes[id],createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>g.rect,detach(){}})},innerWidth:g.width,innerHeight:g.height,Money:{signedBig:BigInt},credits:x=>x+' G',validOwnSettlement:x=>!!x,EARNED_COUNT_MS:1400};vm.createContext(ctx);vm.runInContext(section(source,start,end),ctx);const scene={animations:[],reducedMotion},node={textContent:'−25 G'},serialized=JSON.stringify(entry),ok=ctx.scatterLostResultCoins(scene,node,entry);assert.equal(JSON.stringify(entry),serialized);assert.equal(node.textContent,'−25 G');return {ok,scene,nodes,ctx};
}
function verify(g,r){assert(r.ok);assert.equal(r.scene.animations.length,12);assert.equal(r.nodes['#earnedFlightLayer'].hidden,false);assert.equal(r.scene.coinsFlying,false);const delays=new Set();
 for(let i=0;i<12;i++){const {frames,options}=r.scene.animations[i],node=r.nodes['#resultScatter'+i],origin={x:+node.style.left.replace('px',''),y:+node.style.top.replace('px','')};assert.equal(options.duration+options.delay,1400);delays.add(options.delay);assert.equal(frames[0].opacity,0);assert.equal(frames.at(-1).opacity,0);const points=frames.map(f=>{const m=f.transform.match(/translate3d\((-?\d+)px,(-?\d+)px/);return{x:origin.x+ +m[1],y:origin.y+ +m[2]}});assert.equal(points[0].x,(g.icon.left+g.icon.right-12)/2);assert.equal(points[0].y,(g.icon.top+g.icon.bottom-12)/2);assert(points.at(-1).x>g.width&&points.at(-1).y>g.height);
  for(let j=1;j<points.length;j++){assert(points[j].x>=points[j-1].x&&points[j].y>=points[j-1].y);for(let k=0;k<=100;k++){const t=k/100,p={x:points[j-1].x+(points[j].x-points[j-1].x)*t,y:points[j-1].y+(points[j].y-points[j-1].y)*t};for(const rect of [g.wallet,g.rect])assert(!(p.x+12>rect.left&&p.x<rect.right&&p.y+12>rect.top&&p.y<rect.bottom),`coin overlaps digits at ${g.width}`);}}
 }assert.equal(delays.size,12);
}
for(const g of measured){assert.equal(run(before,g).ok,false,`original must reproduce ${g.width}px defect`);verify(g,run(after,g));}
// Previous right-aligned wallet geometry must not be changed by the fallback.
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]]){const g={width,height,icon:b(width-123.75,30,width-111.75,50),wallet:b(width-99.75,24,width-70,56),rect:b(width/2-51,height-196,width/2+51,height-156)};const a=run(before,g),c=run(after,g);assert(a.ok&&c.ok);assert.equal(JSON.stringify(c.scene.animations),JSON.stringify(a.scene.animations));verify(g,c);}
for(const [entry,reduced] of [[{correct:false,delta:0},false],[{correct:false,delta:-25},true],[{correct:null,delta:0},false]])assert.equal(run(after,measured[0],entry,reduced).ok,false);
const constrained={...measured[0],rect:b(2,100,318,550)};assert.equal(run(after,constrained).ok,false);
const r=run(after,measured[0]);vm.runInContext(section(after,'function hideEarnedFlight(){','function finishEarnedDisplay('),r.ctx);r.ctx.hideEarnedFlight();assert.equal(r.nodes['#earnedFlightLayer'].hidden,true);assert.equal(r.nodes['#gameToolbar'].attrs['data-loss-flight'],undefined);
const scripts=Array.from(after.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi),m=>m[1]);scripts.forEach(s=>new vm.Script(s));
const report={baselineSourceSHA256:beforeHash,sourceSHA256:afterHash,scope:"Loss geometry, guards, cleanup and parse. Other authorized changes are verified separately.",sourceScriptsParsed:scripts.length,realBrowserFailureReproductions:4,measuredGeometryRestorations:4,legacyPathsExact:4,coinsPerLoss:12,durationMs:1400,monotonicDownRight:true,digitCollisionChecks:true,guardsAndCleanupPassed:true,postPatchBrowserVerified:false};assert.equal(hash(fs.readFileSync(beforePath)),beforeHash);assert.equal(hash(fs.readFileSync(afterPath)),afterHash);if(process.env.REPORT_PATH)fs.writeFileSync(process.env.REPORT_PATH,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
