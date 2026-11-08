'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):fs.readFileSync(path.join(__dirname,'candidate.html'),'utf8');
const code=html.match(/<script id="home-ambience-controller">([\s\S]*?)<\/script>/)[1];
function events(obj={}){const handlers=new Map();return Object.assign(obj,{addEventListener(k,fn){const set=handlers.get(k)||new Set();set.add(fn);handlers.set(k,set);},removeEventListener(k,fn){handlers.get(k)?.delete(fn);},fire(k){for(const fn of [...handlers.get(k)||[]])fn();},count(){return [...handlers.values()].reduce((s,x)=>s+x.size,0);}});}
function fixture(opts={}){
 const vars={},home={hidden:!!opts.hidden},backdrop={dataset:{},style:{setProperty(k,v){vars[k]=v;},removeProperty(k){delete vars[k];}}};
 const doc=events({hidden:false,getElementById:id=>id==='homeScreen'?home:id==='app'?backdrop:null});
 const reduced=events({matches:!!opts.reduced}),slow=events({matches:!!opts.slow}),connection=events({saveData:!!opts.saveData}),battery=events({charging:!!opts.charging,level:opts.level??.8});
 const images=[],observers=[];
 class Image{constructor(){images.push(this);this.naturalWidth=640;this.naturalHeight=960;}set src(value){this.source=value;}removeAttribute(name){if(name==='src')this.source=null;}load(){this.onload?.();}fail(){this.onerror?.();}}
 const win=events({document:doc,navigator:{connection},Image,matchMedia:q=>q.includes('reduced-motion')?reduced:slow,MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}});
 if(opts.getBattery)win.navigator.getBattery=()=>opts.rejectBattery?Promise.reject(Error('not supported')):Promise.resolve(battery);
 if(opts.noImage)delete win.Image;
 win.window=win;vm.runInNewContext(code,win);
 return {win,doc,home,backdrop,reduced,slow,connection,battery,images,observers,vars};
}
(async()=>{
 const f=fixture();assert.equal(f.backdrop.dataset.homeGif,'loading');assert.equal(f.images.length,1);assert(!f.vars['--home-gif-image']);assert.match(f.images[0].source,/^data:image\/gif;base64,/);
 f.images[0].load();assert.equal(f.backdrop.dataset.homeGif,'running');assert.match(f.vars['--home-gif-image'],/^url\("data:image\/gif;base64,/);assert.equal(f.images[0].source,null);
 f.home.hidden=true;f.observers[0].fn();assert.equal(f.backdrop.dataset.homeGif,'hidden');assert(!f.vars['--home-gif-image']);
 f.home.hidden=false;f.observers[0].fn();assert.equal(f.images.length,2);f.images.at(-1).load();assert.equal(f.backdrop.dataset.homeGif,'running');
 for(let i=0;i<3;i++){f.doc.hidden=true;f.doc.fire('visibilitychange');assert.equal(f.backdrop.dataset.homeGif,'hidden');f.doc.hidden=false;f.doc.fire('visibilitychange');f.images.at(-1).load();assert.equal(f.backdrop.dataset.homeGif,'running');}
 f.win.fire('pagehide');assert.equal(f.backdrop.dataset.homeGif,'hidden');f.win.fire('pageshow');f.images.at(-1).load();assert.equal(f.backdrop.dataset.homeGif,'running');
 f.reduced.matches=true;f.reduced.fire('change');assert.equal(f.backdrop.dataset.homeGif,'reduced-motion');assert(!f.vars['--home-gif-image']);f.reduced.matches=false;f.reduced.fire('change');f.images.at(-1).load();
 f.connection.saveData=true;f.connection.fire('change');assert.equal(f.backdrop.dataset.homeGif,'power-saving');f.connection.saveData=false;f.connection.fire('change');f.images.at(-1).load();
 f.win.DOCCHI_HOME_MOTION={lowPower:true};f.win.fire('home-motion-change');assert.equal(f.backdrop.dataset.homeGif,'power-saving');
 f.win.DOCCHI_HOME_MOTION={enabled:false};f.win.fire('home-motion-change');assert.equal(f.backdrop.dataset.homeGif,'disabled');
 f.win.DOCCHI_HOME_MOTION={};f.win.fire('home-motion-change');f.images.at(-1).load();
 f.slow.matches=true;f.slow.fire('change');assert.equal(f.backdrop.dataset.homeGif,'power-saving');f.slow.matches=false;f.slow.fire('change');f.images.at(-1).load();
 const e=fixture(),staleLoad=e.images[0].onload;e.images[0].fail();assert.equal(e.backdrop.dataset.homeGif,'load-failed');assert(!e.vars['--home-gif-image']);e.win.DocchiHomeAmbience.sync();assert.equal(e.images.length,1);e.win.DocchiHomeAmbience.retry();assert.equal(e.images.length,2);staleLoad();assert.equal(e.backdrop.dataset.homeGif,'loading');e.images[1].load();assert.equal(e.backdrop.dataset.homeGif,'running');
 const pending=fixture(),oldLoad=pending.images[0].onload;pending.home.hidden=true;pending.observers[0].fn();oldLoad();assert.equal(pending.backdrop.dataset.homeGif,'hidden');assert(!pending.vars['--home-gif-image']);assert.equal(pending.images[0].source,null);
 const empty=fixture();empty.images[0].naturalWidth=0;empty.images[0].load();assert.equal(empty.backdrop.dataset.homeGif,'load-failed');
 for(const opts of [{reduced:true},{saveData:true},{slow:true},{hidden:true}])assert.equal(fixture(opts).images.length,0);
 assert.equal(fixture({noImage:true}).backdrop.dataset.homeGif,'unsupported');
 const low=fixture({getBattery:true,level:.2});await new Promise(setImmediate);assert.equal(low.backdrop.dataset.homeGif,'power-saving');assert.equal(low.images[0].source,null);low.battery.charging=true;low.battery.fire('chargingchange');low.images.at(-1).load();assert.equal(low.backdrop.dataset.homeGif,'running');
 const reject=fixture({getBattery:true,rejectBattery:true});await new Promise(setImmediate);reject.images[0].load();assert.equal(reject.backdrop.dataset.homeGif,'running');
 f.win.DocchiHomeAmbience.destroy();assert.equal(f.backdrop.dataset.homeGif,'disposed');assert(!f.vars['--home-gif-image']);assert.equal(f.win.count()+f.doc.count()+f.connection.count()+f.reduced.count()+f.slow.count(),0);assert(f.observers.every(o=>o.disconnected));
 assert(!/requestAnimationFrame|setInterval|setTimeout/.test(code),'No JS animation loop/timers');
 assert(!html.includes('id="homeAmbience"'),'No old CSS-light overlay');
 assert(html.includes('--home-still-image:url(data:image/png;base64,'),'Original PNG fallback');
 assert.equal([...html.matchAll(/<script\b/g)].length,5,'Release builder script-count contract');
 console.log('PASS home GIF: real GIF source, first-frame load, navigation, visibility, page lifecycle, reduced motion, low power, Data Saver, failed load, zero-sized image, stale callbacks, retry, repeated resume and cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
