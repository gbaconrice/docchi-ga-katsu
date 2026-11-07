'use strict';
// Node/Skia Canvas2D review only. No browser, DOM layout, mobile, SDK or network proof.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const {createCanvas,Image}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/canvas-final');fs.mkdirSync(out,{recursive:true});
const expectedSha='649a36f59f73219e0755d48a30735b60a8cc7d589ffa6442be0f5f0bc45a5ac7';
function ensureFrozenSource(root){
 const frozen=path.join(root,'reports/canvas/frozen-source.html');
 if(!fs.existsSync(frozen)){
  const current=fs.readFileSync(path.join(root,'source/index.html'));
  const currentSha=crypto.createHash('sha256').update(current).digest('hex');
  if(currentSha!==expectedSha)throw Error('Cannot initialize frozen source: '+currentSha);
  fs.mkdirSync(path.dirname(frozen),{recursive:true});
  fs.writeFileSync(frozen,current,{flag:'wx'}); // Never replace an existing snapshot, including concurrent creation.
 }
 const html=fs.readFileSync(frozen,'utf8'),sha=crypto.createHash('sha256').update(html).digest('hex');
 if(sha!==expectedSha)throw Error('Frozen source mismatch: '+sha);
 return {html,sha};
}
const {html,sha}=ensureFrozenSource(root);
const rendererVersion=require('@napi-rs/canvas/package.json').version;
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]),noop=()=>{},nodes=new Map(),images=[],errors=[];let next=0;
function elem(id){if(!nodes.has(id)){const n=createCanvas(480,538);Object.assign(n,{id,hidden:false,disabled:false,style:{setProperty:noop,removeProperty:noop},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},setAttribute:noop,removeAttribute:noop,getAttribute:()=>null,addEventListener:noop,removeEventListener:noop,appendChild:noop,remove:noop,focus:noop,getBoundingClientRect:()=>({width:480,height:538,left:0,top:0,right:480,bottom:538}),querySelector:()=>null,querySelectorAll:()=>[],getClientRects:()=>[],textContent:'',value:''});nodes.set(id,n)}return nodes.get(id);}
class DecodedImage extends Image{constructor(){super();images.push(this);}set src(v){if(v===''||v==null)return;if(typeof v==='string'&&!v.startsWith('data:')){errors.push('Blocked non-embedded image: '+v.slice(0,150));return;}super.src=v;}get src(){return super.src;}removeAttribute(k){if(k==='src')this.src='';}}
const document={hidden:false,documentElement:elem('html'),body:elem('body'),querySelector:s=>elem(s),querySelectorAll:()=>[],getElementById:id=>elem('#'+id),createElement:t=>elem('new-'+t+'-'+next++),addEventListener:noop,removeEventListener:noop};
const sandbox={TextEncoder,TextDecoder,document,Image:DecodedImage,console,URLSearchParams,location:{search:'',href:'https://canvas-review.invalid/'},navigator:{userAgent:'node-skia-review'},performance:{now:()=>1000},requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,setInterval:()=>1,clearInterval:noop,localStorage:{getItem:()=>null,setItem:noop},addEventListener:noop,removeEventListener:noop,innerWidth:480,innerHeight:538,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener:noop}),ResizeObserver:class{observe(){}disconnect(){}}};sandbox.window=sandbox;sandbox.globalThis=sandbox;const context=vm.createContext(sandbox),ev=s=>vm.runInContext(s,context,{timeout:120000});
for(let i=0;i<scripts.length;i++)vm.runInContext(scripts[i],context,{filename:'production-'+i+'.js',timeout:20000});
const setup=fs.readFileSync(path.join(__dirname,'integrated-bosses.cjs'),'utf8').match(/ev\(`(globalThis.__setup=.*?)`\);/s)[1];ev(setup);
async function ready(){for(let n=0;n<6;n++){await Promise.all(images.filter(i=>i.src&&String(i.src).length).map(i=>i.decode().catch(e=>errors.push('decode: '+e.message))));await new Promise(r=>setImmediate(r));}}
const report={sha,rendererVersion,renderer:'@napi-rs/canvas / Skia Canvas2D',limits:['Real production draw() and embedded decoded pixels; synthetic matchup setup.','Not browser/DOM/CSS/mobile, interaction, SDK or network verification.','No manually fabricated FX; frames selected from production step() events.'],errors,frames:[]};
async function capture(k,label,tick){await ready();ev('draw()');const canvas=ev('ctx.canvas'),filename=k+'--'+label+'--t'+tick+'.png';fs.writeFileSync(path.join(out,filename),canvas.toBuffer('image/png'));const info=JSON.parse(ev(`JSON.stringify({tick:Math.round(elapsed*60),effects:activeEffects.filter(f=>effectClockTick-f.tick<effectLifetime(f)).map(f=>({kind:f.kind,tick:f.tick,x:f.x,y:f.y,targetX:f.targetX,targetY:f.targetY})),units:units.map(u=>({k:u.k,token:u.token,hp:u.hp,dead:u.dead,flags:u.presentationFlags,scale:bossRenderScale(u),imageReady:!!licensedImageForFrame(u.k,LICENSED_CLIP_REGISTRIES[u.k]?.frames[spriteFrame(u)])})),assets:assetProgress()})`));report.frames.push({kind:k,label,filename,...info});}
async function prepare(k,mode='normal'){ev(`__setup(${JSON.stringify(k)});`);if(mode==='death')ev('units[0].hp=1;');if(mode==='low')ev('units[0].hp=TYPES[units[0].k].hp*.4;');if(mode==='corpses')ev('units.filter(u=>u.side===1).forEach(u=>u.hp=1);');ev('beginLicensedOpening(units);primeEffectImages();');await ready();}
async function scenario(k,label,predicate,delays=[10],mode='normal',limit=420){await prepare(k,mode);let birth=null,n=0;for(let t=1;t<=limit;t++){ev('step(1/60)');if(birth===null&&ev(predicate))birth=t;if(birth!==null&&delays.includes(t-birth)){await capture(k,label,t);n++;if(n===delays.length)break;}}if(!n)await capture(k,label+'-NOT-TRIGGERED',limit);}
(async()=>{const ids=ev('[...BossAbilities.specs.keys()].filter(k=>k!=="resilience_split_eye")');for(const k of ids){const mode=['slime','fiery_coil_inceptor','golem','basalt_titan'].includes(k)?'death':k==='moonclaw_werewolf'?'low':'normal';await scenario(k,'ability',"combatEvents.some(e=>e.type==='boss_effect'&&e.kind!=='boss_warning')",[8],mode);console.log('RENDER',k,report.frames.at(-1).tick);}
const scenarios=[
 ['emberwing_drake','orbit-rain',"activeEffects.some(f=>f.kind==='boss_rain')",[8,38,68]],
 ['veteran_flamewing','crossing-birds',"combatEvents.some(e=>e.kind==='boss_firebird')",[3,15,27]],
 ['pillar_hammerer','light-columns',"combatEvents.some(e=>e.kind==='boss_column_light')",[4,16,28]],
 ['emberfist_pillarer','fire-columns',"combatEvents.some(e=>e.kind==='boss_column_fire')",[5,33,61]],
 ['bluehorn_invoker','falling-meteor',"combatEvents.some(e=>e.kind==='boss_meteor')",[5,25,45,51]],
 ['stonepulse_kolossus','ground-fissure',"combatEvents.some(e=>e.kind==='boss_fissure')",[3,12,22]],
 ['frostbreath_lizard','frozen-enemies',"units.some(u=>u.bossStatuses?.freeze)",[8,40]],
 ['accretion_burstcore','grown-body',"units[0].bossRadiusScale>1",[8,28]],
 ['willyee_stone_golem','reflection-shards',"combatEvents.some(e=>e.type==='boss_effect')",[4,14]],
 ['slime','split-children',"units.some(u=>u.ownerToken)",[4,30,90],'death'],
 ['golem','wall-rock-children',"units.some(u=>u.ownerToken)",[4,24],'death'],
 ['bone_crown_lich','raised-skeletons',"units.some(u=>u.ownerToken)",[5,35],'corpses'],
 ['cleaver_brute','army-red-aura',"units.some(u=>u.bossStatuses?.fury)",[8,30]],
 ['gauntlet_combo_guard','enemy-throw',"combatEvents.some(e=>e.kind==='boss_throw')",[4,16]],
 ['colossal_hornfist','airborne-lift',"units.some(u=>u.bossStatuses?.airborne)",[4,16]],
 ['spectral_scale_dragon','phase-opacity',"units[0].bossPhaseUntil>0",[4,30]]
];for(const [k,label,predicate,delays,mode]of scenarios)await scenario(k,label,predicate,delays,mode);
await ready();
for(const [label,list]of [['all49',report.frames.slice(0,49)],['detail',report.frames.slice(49)]]){const cols=label==='all49'?7:6,w=240,h=290,rows=Math.ceil(list.length/cols),sheet=createCanvas(cols*w,rows*h),g=sheet.getContext('2d');g.fillStyle='#162124';g.fillRect(0,0,sheet.width,sheet.height);g.font='11px sans-serif';g.fillStyle='#ffffff';for(let i=0;i<list.length;i++){const f=list[i],im=new Image();im.src=fs.readFileSync(path.join(out,f.filename));await im.decode();const x=(i%cols)*w,y=Math.floor(i/cols)*h;g.drawImage(im,x,y+20,240,269);g.fillText(f.kind+' t'+f.tick,x+3,y+13,234);}fs.writeFileSync(path.join(out,'contact-'+label+'.png'),sheet.toBuffer('image/png'));}
report.decodedImages=images.filter(i=>i.complete&&i.naturalWidth>0).length;report.imageFailures=report.frames.filter(f=>f.assets.failed||f.assets.pending||f.units.some(u=>!u.imageReady)).map(f=>f.filename);report.untriggered=report.frames.filter(f=>f.label.includes('NOT-TRIGGERED')).map(f=>f.filename);fs.writeFileSync(path.join(out,'canvas-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({sha,count:report.frames.length,images:images.length,errors,untriggered:report.untriggered,imageFailures:report.imageFailures},null,2));})().catch(e=>{fs.writeFileSync(path.join(out,'canvas-error.txt'),e.stack);console.error(e);process.exitCode=1;});
