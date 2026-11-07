'use strict';
// Node/Skia Canvas2D review only. No browser, DOM layout, mobile, SDK or network proof.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const {createCanvas,Image}=require('@napi-rs/canvas');
const root=__dirname,out=path.resolve(process.env.RENDER_OUT||path.join(root,'renders'));fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(process.env.GAME_HTML||path.join(root,'candidate.html'),'utf8'),sha=crypto.createHash('sha256').update(html).digest('hex');
const rendererVersion=require('@napi-rs/canvas/package.json').version;
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]),noop=()=>{},nodes=new Map(),images=[],errors=[];let next=0;
function elem(id){if(!nodes.has(id)){const n=createCanvas(480,538);Object.assign(n,{id,hidden:false,disabled:false,style:{setProperty:noop,removeProperty:noop},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},setAttribute:noop,removeAttribute:noop,getAttribute:()=>null,addEventListener:noop,removeEventListener:noop,appendChild:noop,remove:noop,focus:noop,getBoundingClientRect:()=>({width:480,height:538,left:0,top:0,right:480,bottom:538}),querySelector:()=>null,querySelectorAll:()=>[],getClientRects:()=>[],textContent:'',value:''});nodes.set(id,n)}return nodes.get(id);}
class DecodedImage extends Image{constructor(){super();images.push(this);}set src(v){if(v===''||v==null)return;if(typeof v==='string'&&!v.startsWith('data:')){errors.push('Blocked non-embedded image: '+v.slice(0,150));return;}super.src=v;}get src(){return super.src;}removeAttribute(k){if(k==='src')this.src='';}}
const document={hidden:false,documentElement:elem('html'),body:elem('body'),querySelector:s=>elem(s),querySelectorAll:()=>[],getElementById:id=>elem('#'+id),createElement:t=>elem('new-'+t+'-'+next++),addEventListener:noop,removeEventListener:noop};
const sandbox={TextEncoder,TextDecoder,document,Image:DecodedImage,console,URLSearchParams,location:{search:'',href:'https://canvas-review.invalid/'},navigator:{userAgent:'node-skia-review'},performance:{now:()=>1000},requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,setInterval:()=>1,clearInterval:noop,localStorage:{getItem:()=>null,setItem:noop},addEventListener:noop,removeEventListener:noop,innerWidth:480,innerHeight:538,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener:noop}),ResizeObserver:class{observe(){}disconnect(){}}};sandbox.window=sandbox;sandbox.globalThis=sandbox;const context=vm.createContext(sandbox),ev=s=>vm.runInContext(s,context,{timeout:120000});
for(let i=0;i<scripts.length;i++)vm.runInContext(scripts[i],context,{filename:'production-'+i+'.js',timeout:20000});
const setup=fs.readFileSync(path.join(root,'../../tests/integrated-bosses.cjs'),'utf8').match(/ev\(`(globalThis.__setup=.*?)`\);/s)[1];ev(setup);
async function ready(){for(let n=0;n<6;n++){await Promise.all(images.filter(i=>i.src&&String(i.src).length).map(i=>i.decode().catch(e=>errors.push('decode: '+e.message))));await new Promise(r=>setImmediate(r));}}

module.exports={ev,ready,images,errors,sha,createCanvas,Image,out};
