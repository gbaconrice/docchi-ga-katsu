const fs = require('fs'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const code = html.match(/<script id="home-ambience-controller">([\s\S]*?)<\/script>/)[1];
const cssStart = html.indexOf('/* Existing 1024 x 1536 tavern art stays still.');
const cssEndMarker = '#homeScreen .home-light { animation:none !important; }\n}';
const cssEnd = html.indexOf(cssEndMarker, cssStart);
assert(cssStart >= 0 && cssEnd > cssStart, 'Home ambience has an explicit motion-preference block boundary.');
const css = html.slice(cssStart, cssEnd + cssEndMarker.length);
function eventTarget(value={}) {
 const events = new Map();
 return Object.assign(value, {addEventListener(type,fn) { const set=events.get(type)||new Set();set.add(fn);events.set(type,set); },removeEventListener(type,fn) { events.get(type)?.delete(fn); },fire(type) { for(const fn of [...(events.get(type)||[])]) fn(); },listeners() { return [...events.values()].reduce((sum,set)=>sum+set.size,0); }});
}
function fixture(options={}) {
 const styles = {}, home = {hidden:false,clientWidth:390,clientHeight:690};
 const layer = {hidden:true,dataset:{},style:{setProperty:(key,value)=>{styles[key]=value;}}};
 const reduced = eventTarget({matches:!!options.reduced}),slow = eventTarget({matches:!!options.slow});
 const connection = eventTarget({saveData:!!options.saveData});
 const battery = eventTarget({level:options.batteryLevel ?? .8,charging:options.charging ?? false});
 const doc = eventTarget({hidden:false,getElementById:id=>id==='homeScreen'?home:id==='homeAmbience'?layer:null});
 const observerInstances=[];
 class Observer { constructor(callback) { this.callback=callback;this.disconnected=false;observerInstances.push(this); } observe() {} disconnect() { this.disconnected=true; } }
 const win = eventTarget({navigator:{connection},matchMedia:q=>q.includes('reduced-motion')?reduced:slow,ResizeObserver:Observer,MutationObserver:Observer});
 if(options.getBattery) win.navigator.getBattery = ()=>options.rejectBattery?Promise.reject(new Error('unavailable')):Promise.resolve(battery);
 win.window=win;win.document=doc;
 vm.runInNewContext(code,win);
 return {win,doc,home,layer,reduced,slow,connection,battery,styles,observerInstances};
}
(async()=>{
 const f=fixture();
 assert.equal(f.layer.dataset.motion,'running');assert.equal(f.layer.hidden,false);
 assert.equal(parseFloat(f.styles['--home-art-width']),460);assert.equal(parseFloat(f.styles['--home-art-height']),690);
 for(const [width,height] of [[304,476],[359,575],[374,728],[414,816],[404,294],[420,742],[420,336]]) {
  f.home.clientWidth=width;f.home.clientHeight=height;f.win.fire('resize');
  const scale=Math.max(width/1024,height/1536);
  assert.equal(parseFloat(f.styles['--home-art-width']),1024*scale);
  assert.equal(parseFloat(f.styles['--home-art-height']),1536*scale);
 }
 f.home.hidden=true;f.observerInstances[1].callback();assert.equal(f.layer.dataset.motion,'hidden');assert(f.layer.hidden);
 f.home.hidden=false;f.observerInstances[1].callback();assert.equal(f.layer.dataset.motion,'running');
 f.doc.hidden=true;f.doc.fire('visibilitychange');assert.equal(f.layer.dataset.motion,'hidden');
 f.doc.hidden=false;f.doc.fire('visibilitychange');assert.equal(f.layer.dataset.motion,'running');
 f.win.fire('pagehide');assert.equal(f.layer.dataset.motion,'hidden');
 f.win.fire('pageshow');assert.equal(f.layer.dataset.motion,'running');
 f.reduced.matches=true;f.reduced.fire('change');assert.equal(f.layer.dataset.motion,'reduced-motion');assert(f.layer.hidden);
 f.reduced.matches=false;f.reduced.fire('change');assert.equal(f.layer.dataset.motion,'running');
 f.connection.saveData=true;f.connection.fire('change');assert.equal(f.layer.dataset.motion,'power-saving');
 f.connection.saveData=false;f.connection.fire('change');assert.equal(f.layer.dataset.motion,'running');
 f.slow.matches=true;f.slow.fire('change');assert.equal(f.layer.dataset.motion,'power-saving');
 f.slow.matches=false;f.slow.fire('change');
 f.win.DOCCHI_HOME_MOTION={lowPower:true};f.win.fire('home-motion-change');assert.equal(f.layer.dataset.motion,'power-saving');
 f.win.DOCCHI_HOME_MOTION={enabled:false};f.win.fire('home-motion-change');assert.equal(f.layer.dataset.motion,'disabled');
 f.win.DOCCHI_HOME_MOTION={enabled:true};f.win.fire('home-motion-change');assert.equal(f.layer.dataset.motion,'running');
 f.home.clientWidth=0;f.win.fire('resize');assert.equal(f.layer.dataset.motion,'not-laid-out');
 f.home.clientWidth=390;f.win.fire('resize');assert.equal(f.layer.dataset.motion,'running');
 f.win.DocchiHomeAmbience.destroy();assert.equal(f.layer.dataset.motion,'disposed');assert(f.layer.hidden);
 assert.equal(f.win.listeners()+f.doc.listeners()+f.connection.listeners()+f.reduced.listeners()+f.slow.listeners(),0);
 assert(f.observerInstances.every(o=>o.disconnected));
 f.win.fire('pageshow');assert.equal(f.layer.dataset.motion,'disposed');
 const b=fixture({getBattery:true,batteryLevel:.1});await new Promise(setImmediate);assert.equal(b.layer.dataset.motion,'power-saving');
 b.battery.charging=true;b.battery.fire('chargingchange');assert.equal(b.layer.dataset.motion,'running');
 b.battery.charging=false;b.battery.level=.21;b.battery.fire('levelchange');assert.equal(b.layer.dataset.motion,'running');
 b.battery.level=.2;b.battery.fire('levelchange');assert.equal(b.layer.dataset.motion,'power-saving');
 b.win.DocchiHomeAmbience.destroy();assert.equal(b.battery.listeners(),0);
 const rejected=fixture({getBattery:true,rejectBattery:true});await new Promise(setImmediate);assert.equal(rejected.layer.dataset.motion,'running');
 const late=fixture({getBattery:true});late.win.DocchiHomeAmbience.destroy();await new Promise(setImmediate);assert.equal(late.battery.listeners(),0);assert(late.layer.hidden);
 assert.equal(fixture({reduced:true}).layer.dataset.motion,'reduced-motion');assert.equal(fixture({saveData:true}).layer.dataset.motion,'power-saving');
 assert.equal((html.match(/class="home-light home-light--/g)||[]).length,8);
 assert.match(html, /id="homeAmbience" class="home-ambience" aria-hidden="true" hidden/);
 assert.match(css, /pointer-events:none/);assert.match(css, /#homeScreen\[hidden\] \.home-light/);assert.match(css, /prefers-reduced-motion:reduce/);
 assert(!/requestAnimationFrame|setInterval|setTimeout|canvas|fetch\(/.test(code),'No JS frame loop, timers, rendering, or network calls.');
 assert(!/box-shadow|filter:|backdrop-filter|url\(|mix-blend-mode|will-change/.test(css),'No image duplication, shadows, filters or full-layer blending.');
 console.log('PASS home ambience: cover alignment at 7 phone/landscape/desktop sizes; navigation, hidden, page lifecycle, motion preferences, power signals, battery failure, teardown and source guards');
})().catch(error=>{console.error(error);process.exitCode=1;});
