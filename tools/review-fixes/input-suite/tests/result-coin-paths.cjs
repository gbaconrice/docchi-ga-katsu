'use strict';const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync('index.html','utf8'),a=s.indexOf('function resultCoinCount('),b=s.indexOf('function heldBalanceValue(',a);let rect,icon,wallet,panel;
const nodes={'#earnedFlightLayer':{hidden:true},'.wallet-coin':{getBoundingClientRect:()=>icon},'#balance':{getBoundingClientRect:()=>wallet},'#resultPanel':{getBoundingClientRect:()=>panel}};
for(let i=0;i<32;i++)nodes['#resultScatter'+i]={style:{},animate:(frames,options)=>({frames,options,cancel(){}})};
const sandbox={document:{querySelector:id=>nodes[id],createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>rect,detach(){}})},Money:{signedBig:BigInt,amountBig:BigInt},validOwnSettlement:e=>!!e,credits:v=>v+' G',innerWidth:390,innerHeight:652};vm.createContext(sandbox);vm.runInContext(s.slice(a,b),sandbox);
const overlap=(p,r)=>p.x+12>r.left&&p.x<r.right&&p.y+12>r.top&&p.y<r.bottom;
for(const width of [320,375,390,430]){
 sandbox.innerWidth=width;rect={left:width/2-65,right:width/2+65,top:390,bottom:435};icon={left:width-130,right:width-104,top:44,bottom:70};wallet={left:width-96,right:width-48,top:40,bottom:74};panel={left:15,right:width-15,top:310,bottom:590};
 for(const correct of [true,false]){
  const entry={correct,delta:correct?25:-25,stake:25,balanceBefore:100},scene={animations:[],reducedMotion:false},n={textContent:'original'};
  assert(sandbox.scatterResultCoins(scene,n,entry));assert.equal(n.textContent,'original');assert(scene.animations.length>=12&&scene.animations.length<=20);
  for(let i=0;i<scene.animations.length;i++){
   const {frames,options}=scene.animations[i],coin=nodes['#resultScatter'+i],base={x:parseFloat(coin.style.left),y:parseFloat(coin.style.top)};assert.equal(options.duration+options.delay,1400);
   const points=frames.map(f=>{const m=f.transform.match(/translate3d\((-?\d+)px,(-?\d+)px/);return {x:base.x+ +m[1],y:base.y+ +m[2]}});
   if(!correct){assert(points.at(-1).x>width&&points.at(-1).y>652,'loss exits viewport');assert.equal(options.delay,i*15,'distinct loss launch delay');for(let j=1;j<points.length;j++)assert(points[j].x>=points[j-1].x&&points[j].y>=points[j-1].y,'loss never reverses direction');}
   for(let j=1;j<points.length;j++)for(let k=0;k<=100;k++){const t=k/100,p={x:points[j-1].x+(points[j].x-points[j-1].x)*t,y:points[j-1].y+(points[j].y-points[j-1].y)*t};assert(!overlap(p,rect),correct+' amount overlap @'+width);assert(!overlap(p,wallet),correct+' wallet overlap @'+width);if(correct)assert(p.x>=0&&p.x+12<=width&&p.y>=0&&p.y+12<=652);else assert(p.x>=base.x&&p.y>=base.y,'loss travels down/right');}
  }
 }
}
const test=e=>sandbox.scatterResultCoins({animations:[],reducedMotion:false},{textContent:'x'},e);
assert.equal(sandbox.scatterResultCoins({reducedMotion:true},{textContent:'x'},{correct:true,delta:25}),false);assert.equal(test({correct:false,delta:0}),false);assert.equal(test({correct:null,delta:0}),false);
rect={left:4,right:426,top:390,bottom:440};assert.equal(test({correct:true,delta:25}),false,'long amount safely omits coins');
console.log('PASS 320/375/390/430px gain/loss paths never overlap amount or wallet, 1.4s durations, gold coin budget, loss exits down/right with distinct launch delays, zero/draw/reduced/narrow guards');
