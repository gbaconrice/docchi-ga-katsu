'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const crypto=require('crypto'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const after=fs.readFileSync('index.html','utf8');
const before=after.replace(section(after,'// Loss only: keep the wallet origin,','function scatterResultCoins('),'').replace(' if(entry?.correct===false)return scatterLostResultCoins(scene,node,entry);\n','');
function section(s,a,b){const x=s.indexOf(a),y=s.indexOf(b,x);assert(x>=0&&y>x);return s.slice(x,y)}
const gainBefore=section(before,'function scatterResultCoins(','const EARNED_COUNT_MS='),gainAfter=section(after,'function scatterResultCoins(','const EARNED_COUNT_MS=');
assert.equal(gainAfter.replace(' if(entry?.correct===false)return scatterLostResultCoins(scene,node,entry);\n',''),gainBefore,'original gain/scatter function is byte-for-byte unchanged apart from loss dispatch');
assert.equal(section(after,'const EARNED_COUNT_MS=','if(typeof consumeCombatEvents'),section(before,'const EARNED_COUNT_MS=','if(typeof consumeCombatEvents'),'all count, ledger display, balance hold, stages and sound code unchanged');
function harness(s,geometry){
 const toolbar={attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]}};
 const nodes={'#gameToolbar':toolbar,'#earnedFlightLayer':{hidden:true},'.wallet-coin':{getBoundingClientRect:()=>geometry.icon},'#balance':{getBoundingClientRect:()=>geometry.wallet},'#resultPanel':{getBoundingClientRect:()=>geometry.panel}};
 for(let i=0;i<32;i++)nodes['#resultScatter'+i]={style:{},animate:(frames,options)=>({frames,options,cancel(){}})};
 const ctx={document:{querySelector:id=>nodes[id],createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>geometry.rect,detach(){}})},Money:{signedBig:BigInt,amountBig:BigInt},validOwnSettlement:e=>!!e,credits:v=>v+' G',innerWidth:geometry.width,innerHeight:geometry.height};vm.createContext(ctx);
 vm.runInContext(section(s,'function resultCoinCount(','function heldBalanceValue('),ctx);
 return {ctx,nodes,run(correct,delta=correct?25:-25,reducedMotion=false){const scene={animations:[],reducedMotion},node={textContent:'original'};const ok=ctx.scatterResultCoins(scene,node,{correct,delta,stake:25,balanceBefore:100});assert.equal(node.textContent,'original');return {ok,scene,nodes};}};
}
const box=(left,top,right,bottom)=>({left,top,right,bottom});
const geometry=[];
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]]){
 geometry.push({width,height,icon:box(width-123.75,30,width-111.75,50),wallet:box(width-99.75,24,width-70,56),panel:box(24,height-266,width-24,height-18),rect:box(width/2-51,height-196,width/2+51,height-156)});
 // Wide amount at small stake: safe omission is preferable to digit overlap.
}
geometry.push({width:390,height:844,icon:box(266.25,30,278.25,50),wallet:box(290.25,24,320,56),panel:box(24,577.65625,366,826),rect:box(144,647.25,246,687.609375)});
let losses=0,hits=0;
for(const g of geometry){
 const old=harness(before,g).run(true),next=harness(after,g).run(true);
 assert.deepEqual(JSON.parse(JSON.stringify(next)),JSON.parse(JSON.stringify(old)),'hit output preserved at '+g.width);hits++;
 const {ok,scene,nodes}=harness(after,g).run(false);assert(ok,'loss starts at '+g.width);assert.equal(scene.coinsFlying,false);assert.equal(scene.animations.length,12);
 const delays=[];
 for(let i=0;i<12;i++){
  const {frames,options}=scene.animations[i];delays.push(options.delay);assert.equal(options.duration+options.delay,1400);
  const base={x:parseFloat(nodes['#resultScatter'+i].style.left),y:parseFloat(nodes['#resultScatter'+i].style.top)};
  const points=frames.map(f=>{const m=f.transform.match(/translate3d\((-?\d+)px,(-?\d+)px/);return {x:base.x+ +m[1],y:base.y+ +m[2]}});
  assert.equal(points[0].x,(g.icon.left+g.icon.right-12)/2);assert.equal(points[0].y,(g.icon.top+g.icon.bottom-12)/2);
  assert.equal(frames[0].opacity,0);assert.equal(frames.at(-1).opacity,0);assert(points.at(-1).x>g.width&&points.at(-1).y>g.height,'continues outside screen, not clamped inside');
  for(let j=1;j<points.length;j++){
   assert(points[j].x>=points[j-1].x&&points[j].y>=points[j-1].y,'no reversal');
   for(let k=0;k<=100;k++){
    const t=k/100,p={x:points[j-1].x+(points[j].x-points[j-1].x)*t,y:points[j-1].y+(points[j].y-points[j-1].y)*t};
    for(const r of [g.rect,g.wallet])assert(!(p.x+12>r.left&&p.x<r.right&&p.y+12>r.top&&p.y<r.bottom),'no amount or wallet overlap at '+g.width);
   }
  }
 }
 assert.equal(new Set(delays).size,12,'no repeated launch times');losses++;
}
for(const [correct,delta,reduced] of [[false,0,false],[false,-25,true],[null,0,false]])assert.equal(harness(after,geometry[0]).run(correct,delta,reduced).ok,false);
const long={...geometry[0],rect:box(2,geometry[0].height-196,geometry[0].width-2,geometry[0].height-156)};assert.equal(harness(after,long).run(false).ok,false,'long amount safely omits loss coins');
const cleanup=harness(after,geometry[0]);cleanup.run(false);assert.equal(cleanup.nodes['#gameToolbar'].attrs['data-loss-flight'],'true');
vm.runInContext(section(after,'function hideEarnedFlight(){','function finishEarnedDisplay('),cleanup.ctx);cleanup.ctx.hideEarnedFlight();
assert.equal(cleanup.nodes['#gameToolbar'].attrs['data-loss-flight'],undefined);assert.equal(cleanup.nodes['#earnedFlightLayer'].hidden,true);
for(const marker of ["if(battleLogOpen&&state==='result')cancelPersonalResult();",'finishEarnedDisplay(scene);','hideEarnedFlight();','if(!visible){cancelPersonalResult();'])assert(after.includes(marker),'log/cancel/complete/exit cleanup remains connected');
assert(after.includes('#app #gameScreen > #gameToolbar[data-loss-flight="true"] { z-index:33; }'));
assert(after.includes("document.querySelector('#gameToolbar')?.removeAttribute('data-loss-flight');"),'shared hide path removes loss-only stacking state');
assert(after.includes('#app #gameScreen[data-personal-result="true"] #battle[data-battle-log-slot="true"] > #battleLog[hidden] { display:grid!important; visibility:hidden; pointer-events:none; }'),'stronger result selector preserves hidden log space');
assert(after.includes('node.disabled=!visible;node.inert=!visible;'),'hidden legacy control remains disabled/inert');
console.log(`PASS ${hits} hit cases exact-equivalent, ${losses} loss paths, 320/375/390/430px, twelve distinct delays, numeric collision checks, zero/draw/reduced/long guards, original hit and sequence code byte preservation`);

assert.equal(sha(section(before,'function scatterResultCoins(','const EARNED_COUNT_MS=')),'c39b2076c83dba8f7531fe58036ac3c086f2f495fd56bcf21ae8097ff28a8e0c','frozen scatter source hash');

assert.equal(sha(section(before,'const EARNED_COUNT_MS=','if(typeof consumeCombatEvents').replace("syncStableBattleClock();syncOwnBattleChoice();for(const id of ['#unitsToggle','#reactionToggle','#pause'])if(q(id)){q(id).hidden=false;q(id).disabled=id==='#pause'?!pauseControlAvailable():id==='#reactionToggle'?!reactionLive():!flowControlsAvailable();}","syncStableBattleClock();syncOwnBattleChoice();for(const id of ['#unitsToggle','#reactionToggle','#pause'])if(q(id)){q(id).hidden=false;q(id).disabled=true;}")),'f73a14da842c169c442e26e5524451f10b617eabbc9c74645124d2669e241d05','frozen sequence source hash');
