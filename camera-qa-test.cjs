const fs=require('fs'),vm=require('vm'),assert=require('assert');const h=fs.readFileSync(process.argv[2]||'index.html','utf8');const nodes={};for(const m of h.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)){const id=m[2].match(/id="([^"]+)"/);if(id)nodes['#'+id[1]]={hidden:/\bhidden\b/.test(m[2]),disabled:/\bdisabled\b/.test(m[2]),setAttribute(){}}}let raf=[],images=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(const id of ['#field','#armyPreviewRed','#armyPreviewBlue'])nodes[id].getContext=()=>ctx;const c={console,TextEncoder,TextDecoder,btoa,atob,URLSearchParams,location:{search:''},document:{getElementById:id=>nodes['#'+id]||null,querySelector:s=>s==='canvas'?nodes['#field']:nodes[s]||null},requestAnimationFrame:f=>raf.push(f),Image:class{constructor(){this.complete=true;this.naturalWidth=1000;images.push(this)}}};c.window=c;const listeners={};c.addEventListener=(type,fn)=>{listeners[type]=fn};if(process.env.NO_ENCODER)c.TextEncoder=undefined;vm.createContext(c);for(const [i,m] of [...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){new vm.Script(m[1],{filename:'inline-'+i}).runInContext(c)};if(nodes['#bootStatus']&&!nodes['#bootStatus'].hidden)throw Error('boot monitor not cleared');
const run=s=>vm.runInContext(s,c);let now=0;
function frame(n=1){for(let i=0;i<n;i++){now+=100;const q=raf;raf=[];for(const f of q)f(now)}}
function click(id){assert(nodes[id],id);assert(!nodes[id].disabled,id+' disabled');assert.equal(typeof nodes[id].onclick,'function',id+' missing handler');nodes[id].onclick()}


assert(h.includes('<title>どっちが勝つ？</title>'));
assert(!/aria-label="[^"]*(v7|朱軍|蒼軍|赤軍|青軍)/.test(h));
click('#soloStart');const el=nodes['#field'];el.style={};el.getBoundingClientRect=()=>({width:240,height:269});el.setPointerCapture=()=>{};el.releasePointerCapture=()=>{};
const saved=run('JSON.stringify({units,seed,walletState})');
run('setCameraZoom(1);setCameraZoom(1);setCameraZoom(1)');assert.equal(run('cameraZoom'),2);
assert.equal(el.style.touchAction,'none');
const e=(x,y)=>({pointerId:1,clientX:x,clientY:y,button:0,preventDefault(){}});
el.onpointerdown(e(120,134));el.onpointermove(e(-10000,-10000));assert.equal(run('cameraX'),360);assert.equal(run('cameraY'),403.5);el.onpointerup(e(0,0));assert.equal(run('cameraDrag'),null);
el.onpointerdown(e(120,134));el.onpointermove(e(10000,10000));assert.equal(run('cameraX'),120);assert.equal(run('cameraY'),134.5);el.onpointercancel(e(0,0));assert.equal(run('cameraDrag'),null);
const center=run('JSON.stringify([cameraX,cameraY])');run('draw()');assert.equal(run('JSON.stringify([cameraX,cameraY])'),center);
if(listeners.resize)listeners.resize();assert.equal(run('JSON.stringify([cameraX,cameraY])'),center);
run('resetCamera()');assert.equal(run('cameraZoom'),1);assert.equal(run('cameraX'),240);assert.equal(run('cameraY'),269);assert.equal(el.style.touchAction,'auto');
el.onpointerdown(e(120,134));assert.equal(run('cameraDrag'),null);
assert.equal(run('JSON.stringify({units,seed,walletState})'),saved);
assert.equal(nodes['#battle'].hidden,true);nodes['#formationToggle'].onclick();assert.equal(nodes['#battle'].hidden,false);nodes['#formationBack'].onclick();assert.equal(nodes['#battle'].hidden,true);
console.log('PASS title/ARIA, fixed-camera no auto-follow, desktop/touch pointer drag clamp/cancel/reset/resize, camera noninterference, no inline formation');
