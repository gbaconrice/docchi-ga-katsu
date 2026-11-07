const fs=require('fs'),vm=require('vm');const html=fs.readFileSync('index.html','utf8');const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);const errors=[],events={};const noop=()=>{};const ctx=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),getImageData:()=>({data:new Uint8ClampedArray(16)})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});const nodes=new Map();function elem(id){if(!nodes.has(id)){let n={id,hidden:false,disabled:false,style:{setProperty:noop,removeProperty:noop},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},setAttribute:noop,removeAttribute:noop,getAttribute:()=>null,addEventListener:noop,removeEventListener:noop,appendChild:noop,remove:noop,focus:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:480,height:538,left:0,top:0,right:480,bottom:538}),querySelector:()=>null,querySelectorAll:()=>[],getClientRects:()=>[],textContent:'',value:'',width:480,height:538};nodes.set(id,n)}return nodes.get(id)}
const doc={hidden:false,documentElement:elem('html'),body:elem('body'),querySelector:s=>elem(s),querySelectorAll:()=>[],getElementById:id=>elem('#'+id),createElement:t=>elem('new-'+t),addEventListener:(n,f)=>{(events[n]??=[]).push(f)},removeEventListener:noop};const pendingImages=[];class Img{constructor(){pendingImages.push(this);this.complete=false;this.naturalWidth=0;this.naturalHeight=0}set src(v){this._src=v}get src(){return this._src}}const sandbox={document:doc,Image:Img,console,URLSearchParams,location:{search:'',href:'http://localhost/'},navigator:{userAgent:'test'},performance:{now:()=>1000},requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,setInterval:()=>1,clearInterval:noop,localStorage:{getItem:()=>null,setItem:noop},addEventListener:(n,f)=>{(events['window:'+n]??=[]).push(f)},removeEventListener:noop,innerWidth:400,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener:noop}),ResizeObserver:class{observe(){}disconnect(){}}};sandbox.window=sandbox;sandbox.globalThis=sandbox;let context=vm.createContext(sandbox);for(let i=0;i<scripts.length;i++){try{vm.runInContext(scripts[i],context,{filename:'script-'+i+'.js',timeout:15000})}catch(e){console.log('FAIL script',i,e.stack.split('\n').slice(0,5).join('\n'));process.exit(1)}}console.log('PASS boot',scripts.length,'scripts');for(const [id,n] of nodes){if(id==='#soloStart'&&typeof n.onclick==='function'){try{n.onclick({isTrusted:true});console.log('PASS solo start')}catch(e){console.log('FAIL solo start',e.stack.split('\n').slice(0,5).join('\n'));process.exit(1)}}}
for(const id of ['#red','#confirm']){const n=nodes.get(id);if(!n||typeof n.onclick!=='function')throw Error('missing handler '+id);try{n.onclick({isTrusted:true});console.log('PASS click',id)}catch(e){console.log('FAIL click',id,e.stack.split('\n').slice(0,6).join('\n'));process.exit(1)}}
const actual=vm.runInContext('({screenMode,state,choice,round,battleEnvironment})',context);if(actual.screenMode!=='game'||actual.state!=='fight'||actual.choice!==0)throw Error('unexpected gameplay state '+JSON.stringify(actual));console.log('PASS reached battle with environment',actual.battleEnvironment?.fieldId);

for(const im of [...pendingImages]){if(typeof im.onload==='function'){im.complete=true;im.naturalWidth=480;im.naturalHeight=538;try{im.onload()}catch(e){console.log('FAIL deferred image callback',e.stack.split('\n').slice(0,6).join('\n'));process.exit(1)}}}console.log('PASS deferred image callbacks');

vm.runInContext(`
const testedUnit=units[0];
for(const id of Object.keys(LICENSED_CLIP_REGISTRIES)){
 const u={...testedUnit,k:id,id:'test-'+id,token:'test-'+id,dead:false,cd:0};
 try{let frame=licensedShieldFrame(u);if(!Number.isInteger(frame)||!LICENSED_CLIP_REGISTRIES[id].frames[frame])throw Error('invalid frame '+frame)}catch(e){throw Error(id+': '+e.message)}
}
console.log('PASS idle frames for all licensed roles',Object.keys(LICENSED_CLIP_REGISTRIES).length);
`,context);
vm.runInContext(`
units=['puffcap_mender','inkorb_caster','willyee_char_43_redgauntlet_brawler'].map((k,i)=>({...testedUnit,k,id:'image-'+i,token:'image-'+i,side:1}));beginLicensedOpening(units);
`,context);
for(const im of [...pendingImages]){if(typeof im.onload==='function'&&typeof im.src==='string'&&im.src.startsWith('data:image/png;base64,')){const b=Buffer.from(im.src.split(',')[1],'base64');im.complete=true;im.naturalWidth=b.readUInt32BE(16);im.naturalHeight=b.readUInt32BE(20);im.onload()}}
vm.runInContext(`
for(const u of units){const r=LICENSED_CLIP_REGISTRIES[u.k],f=r.clips.idle.frames[0];if(!licensedImageForFrame(u.k,f))throw Error('image not ready: '+u.k)}
console.log('PASS affected images loaded and resolved from correct clip');
`,context);
vm.runInContext(`
units=Object.keys(MULTISOURCE_ROLE_IMAGES).map((k,i)=>({...testedUnit,k,id:'all-'+i,token:'all-'+i,side:i%2}));beginLicensedOpening(units);
`,context);
for(const im of [...pendingImages]){if(typeof im.onload==='function'&&typeof im.src==='string'&&im.src.startsWith('data:image/png;base64,')){const b=Buffer.from(im.src.split(',')[1],'base64');im.complete=true;im.naturalWidth=b.readUInt32BE(16);im.naturalHeight=b.readUInt32BE(20);im.onload()}}
vm.runInContext(`
for(const u of units){const r=LICENSED_CLIP_REGISTRIES[u.k];for(const clip of Object.values(r.clips)){for(const f of clip.frames){if(!licensedImageForFrame(u.k,f))throw Error('missing image: '+u.k+'/'+f.clip)}}}
console.log('PASS every multisource role and clip resolves loaded image:',units.length);
`,context);

vm.runInContext(`units=['puffcap_mender','inkorb_caster','willyee_char_43_redgauntlet_brawler'].map((k,i)=>({...testedUnit,k,id:'visible-'+i,token:'visible-'+i,side:1}));beginLicensedOpening(units)`,context);
for(const im of [...pendingImages]){if(typeof im.onload==='function'&&typeof im.src==='string'&&im.src.startsWith('data:image/png;base64,')){const b=Buffer.from(im.src.split(',')[1],'base64');im.complete=true;im.naturalWidth=b.readUInt32BE(16);im.naturalHeight=b.readUInt32BE(20);im.onload()}}
let drawn=0;ctx.drawImage=()=>{drawn++};vm.runInContext('drawArmyPreviews()',context);if(drawn<3)throw Error('character preview image draws missing: '+drawn);console.log('PASS three reported character previews draw loaded images');
vm.runInContext(`
state='fight';visualTime=1;for(const id of Object.keys(LICENSED_CLIP_REGISTRIES)){const u={...testedUnit,k:id,id:'active-'+id,token:'active-'+id,side:0,dead:false,cd:0.05};const v=visualFor(u);v.contact=1;v.attack=1;v.hit=0.9;try{const frame=licensedShieldFrame(u);if(!Number.isInteger(frame)||!LICENSED_CLIP_REGISTRIES[id].frames[frame])throw Error('invalid attack frame '+frame)}catch(e){throw Error(id+': '+e.message)}}console.log('PASS contact and hit frame sampling for all licensed roles');
`,context);
