#!/usr/bin/env node
// Seeded headless solo sessions through the production code (index.html scripts in a vm with a mock DOM).
// Usage: node tools/measure/sessions.cjs --fights 150 --seed 1 --out out.json [--html index.html] [--timeline]
// Every Math.random() inside the game is replaced by a seeded PRNG, so the same seed + same HTML gives the same fights.
// The bet (always LEFT, 25% or 0G) does not influence the battle.
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>{if(v.startsWith('--'))a.push([v.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:true]);return a},[]));
const FIGHTS=+(args.fights||150),SEED=+(args.seed||1),OUT=args.out,HTML_PATH=args.html||'index.html',TIMELINE=!!args.timeline;
if(!OUT){console.error('--out required');process.exit(2)}
process.env.GAME_HTML=HTML_PATH;
const fs=require('fs'),vm=require('vm');const html=fs.readFileSync(process.env.GAME_HTML||'index.html','utf8');const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);const errors=[],events={};const noop=()=>{};const ctx=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),getImageData:()=>({data:new Uint8ClampedArray(16)})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});const nodes=new Map();function elem(id){if(!nodes.has(id)){let n={id,hidden:false,disabled:false,style:{setProperty:noop,removeProperty:noop},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},setAttribute:noop,removeAttribute:noop,getAttribute:()=>null,addEventListener:noop,removeEventListener:noop,appendChild:noop,remove:noop,focus:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:480,height:538,left:0,top:0,right:480,bottom:538}),querySelector:()=>null,querySelectorAll:()=>[],getClientRects:()=>[],textContent:'',value:'',width:480,height:538};nodes.set(id,n)}return nodes.get(id)}
const doc={hidden:false,documentElement:elem('html'),body:elem('body'),querySelector:s=>elem(s),querySelectorAll:()=>[],getElementById:id=>elem('#'+id),createElement:t=>elem('new-'+t),addEventListener:(n,f)=>{(events[n]??=[]).push(f)},removeEventListener:noop};const pendingImages=[];class Img{constructor(){pendingImages.push(this);this.complete=false;this.naturalWidth=0;this.naturalHeight=0}set src(v){this._src=v}get src(){return this._src}}const sandbox={document:doc,Image:Img,console,URLSearchParams,location:{search:'',href:'http://localhost/'},navigator:{userAgent:'test'},performance:{now:()=>1000},requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,setInterval:()=>1,clearInterval:noop,localStorage:{getItem:()=>null,setItem:noop},addEventListener:(n,f)=>{(events['window:'+n]??=[]).push(f)},removeEventListener:noop,innerWidth:400,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener:noop}),ResizeObserver:class{observe(){}disconnect(){}}};sandbox.window=sandbox;sandbox.globalThis=sandbox;let context=vm.createContext(sandbox);vm.runInContext("(()=>{let a="+(SEED>>>0)+";Math.random=function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}})()",context);for(let i=0;i<scripts.length;i++){try{vm.runInContext(scripts[i],context,{filename:'script-'+i+'.js',timeout:15000})}catch(e){console.log('FAIL script',i,e.stack.split('\n').slice(0,5).join('\n'));process.exit(1)}}console.error('PASS boot',scripts.length,'scripts');for(const [id,n] of nodes){if(id==='#soloStart'&&typeof n.onclick==='function'){try{n.onclick({isTrusted:true});console.error('PASS solo start')}catch(e){console.log('FAIL solo start',e.stack.split('\n').slice(0,5).join('\n'));process.exit(1)}}}


const crypto=require('crypto'),cp=require('child_process'),path=require('path');
const ev=s=>vm.runInContext(s,context);
let commit=null;try{commit=cp.execFileSync('git',['-C',path.dirname(path.resolve(HTML_PATH)),'log','-1','--format=%H','--',path.basename(HTML_PATH)],{encoding:'utf8'}).trim()||null;const dirty=cp.execFileSync('git',['-C',path.dirname(path.resolve(HTML_PATH)),'status','--porcelain','--',path.basename(HTML_PATH)],{encoding:'utf8'}).trim();if(dirty)commit+=' (modified)'}catch(e){}
const types=ev(`(()=>{const c=growthGenerator.catalog,out={};for(const k of CONTENT_ROSTER.selectable){const t=TYPES[k];if(!t)continue;const area=['burstDamage','coneRadius','highRadius','pillarRadius','splash','chainCount','explosionRadius'].some(f=>t[f]!==undefined);out[k]={name:t.name,hp:t.hp,dmg:t.dmg,rate:t.rate,reach:t.reach,speed:t.speed,radius:t.radius,flying:!!t.flying||t.collisionLayer==='air',antiAir:(t.attackTargetMask||[]).includes('air'),support:!!t.supportOnly,area,summon:!!t.summonCharges,heal:!!(t.heal||t.groupHealAmount||t.selfRepairAmount),cost:c[k]?.cost??null}}return out})()`);
// Restart into a seeded session now (the boot used the seeded RNG too, but this makes session 0 explicit).
ev("round=1;mistakes=0;correct=0;speed=1;soloRunEnded=false;freshWallet();openPrediction((Math.random()*4294967296)>>>0)");
const fights=[];let session=0,lastRound=0;const T0=Date.now();
for(let k=0;k<FIGHTS;k++){
 const r=ev("round");if(r<=lastRound)session++;lastRound=r;
 const info=ev(`({round,streak:carryStreak,incumbentSide:round>1?(openingPlan?.incumbentSide??0):null,env:battleEnvironment?.fieldId??null,costs:openingPlan?.actualCosts??null,left:initialKinds[0].slice(),right:initialKinds[1].slice()})`);
 const count=a=>a.reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{});
 const bal=ev("walletState.players[0].balance");
 for(const id of ['#red',BigInt(bal)>0n?'#stake25':'#stake0','#confirm']){const n=nodes.get(id);n&&n.onclick&&n.onclick({isTrusted:true})}
 let g=0;const tl=[];
 const take=()=>{const s=ev("(()=>{const o=[[0,0,0],[0,0,0]];let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,n=0;for(const u of units){if(u.summoned||u.temporary)continue;const t=TYPES[u.k];const alive=!u.dead&&u.hp>0;o[u.side][1]+=t.hp;if(alive){o[u.side][0]+=Math.max(0,u.hp);o[u.side][2]++;x0=Math.min(x0,u.x);x1=Math.max(x1,u.x);y0=Math.min(y0,u.y);y1=Math.max(y1,u.y);n++}}return [o[0][0],o[0][1],o[0][2],o[1][0],o[1][1],o[1][2],n?Math.round(x0):0,n?Math.round(x1):0,n?Math.round(y0):0,n?Math.round(y1):0]})()");tl.push([g,...s])};
 if(TIMELINE)take();
 while(ev("state")==='fight'&&g<6000){ev("step(1/60)");g++;if(TIMELINE&&g%15===0)take()}
 if(TIMELINE)take();
 const winner=ev("winner");
 fights.push({session,round:info.round,streak:info.streak,incumbentSide:info.incumbentSide,env:info.env,costs:info.costs,left:count(info.left),right:count(info.right),winner,ticks:g,timeout:g>=6000,...(TIMELINE?{tl}:{})});
 if(k%25===0)console.error(`seed ${SEED}: ${k}/${FIGHTS} ${((Date.now()-T0)/1000).toFixed(0)}s`);
 ev("nextPrediction()");
}
const htmlBytes=fs.readFileSync(HTML_PATH);
const manifest={tool:'tools/measure/sessions.cjs',html:HTML_PATH,htmlSHA256:crypto.createHash('sha256').update(htmlBytes).digest('hex'),commit,seed:SEED,fights:fights.length,sessions:session+1,timeline:TIMELINE?'every 15 ticks (0.25 s): [tick,hpL,maxHpL,aliveL,hpR,maxHpR,aliveR,minX,maxX,minY,maxY] (summons excluded)':null,node:process.version,bet:'always LEFT, 25% (0G when broke); does not affect battles',seconds:Math.round((Date.now()-T0)/1000),createdAt:new Date().toISOString()};
fs.writeFileSync(OUT,JSON.stringify({manifest,types,fights}));
console.error('done',JSON.stringify(manifest));
