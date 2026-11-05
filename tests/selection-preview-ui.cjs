const fs=require('fs'),vm=require('vm'),assert=require('assert'),html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('let selectionPreviewTimer=null;'),b=html.indexOf('function selectStake(',a);
const timers=new Map(),sent=[];let timerId=0,updates=0,renders=0;
const snapshot={phase:'predict',roundId:1,participants:['me','other'],readyIds:[],departedIds:[],cashedOutIds:[]};
const session={previewSelection:s=>sent.push(s)};
const sandbox={setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),state:'choose',selectedSide:null,multiSession:session,multiSnapshot:snapshot,multiPredictionPending:false,multiUser:'me',update:()=>updates++,syncPredictionPicks:()=>renders++};
vm.createContext(sandbox);vm.runInContext(html.slice(a,b),sandbox);
const flush=()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn()}};
sandbox.selectSide(0);sandbox.selectSide(1);assert.equal(sandbox.selectedSide,1);assert.equal(renders,2);assert.equal(timers.size,1);assert.deepEqual(sent,[]);flush();assert.deepEqual(sent,['B']);
sandbox.selectSide(null);flush();assert.deepEqual(sent,['B',null]);
sandbox.selectSide(0);sandbox.multiPredictionPending=true;flush();assert.equal(sent.length,2);sandbox.multiPredictionPending=false;
sandbox.selectSide(0);snapshot.readyIds=['me'];flush();assert.equal(sent.length,2);snapshot.readyIds=[];
sandbox.selectSide(1);snapshot.roundId=2;flush();assert.equal(sent.length,2);
sandbox.selectSide(0);sandbox.multiSession={};flush();assert.equal(sent.length,2);
console.log('PASS local preview is immediate; rapid changes coalesce; clear, confirmation, round and session guards');
const c=html.indexOf('function predictionPickEntries('),d=html.indexOf('function displayMultiState()',c);
class E{constructor(){this.children=[];this.hidden=false;this.attrs={};this.textContent=''}setAttribute(k,v){this.attrs[k]=v}appendChild(x){this.children.push(x)}replaceChildren(...xs){this.children=xs}}
const nodes={'#redPicks':new E(),'#bluePicks':new E()},ui={URL,document:{querySelector:id=>nodes[id],createElement:()=>new E()},multiUser:'me',selectedSide:0,multiAdapter:{getProfile:id=>({name:id,avatarUrl:id==='me'?'https://example.test/me.png':null})}};
vm.createContext(ui);vm.runInContext(html.slice(c,d),ui);
const snap={phase:'predict',participants:['me','other','third'],readyIds:['other'],confirmedSides:[{userId:'other',side:'B'}],selectedSides:[{userId:'me',side:'B'},{userId:'other',side:'A'},{userId:'third',side:'A'}],departedIds:[],cashedOutIds:[]};
ui.syncPredictionPicks(snap);assert.equal(nodes['#redPicks'].children.length,2);assert.equal(nodes['#bluePicks'].children.length,1);const self=nodes['#redPicks'].children[1];assert.equal(self.attrs['aria-label'],'me（選択中）');assert.equal(nodes['#bluePicks'].children[0].attrs['aria-label'],'other（確定）');
ui.syncPredictionPicks(snap);assert.strictEqual(nodes['#redPicks'].children[1],self);self.children[1].onerror();assert.equal(self.children[0].hidden,false);
ui.selectedSide=null;ui.syncPredictionPicks(snap);assert.equal(nodes['#redPicks'].children.length,1);assert.equal(nodes['#bluePicks'].children.length,1);
ui.syncPredictionPicks({...snap,phase:'battle'});assert(nodes['#redPicks'].hidden&&nodes['#bluePicks'].hidden);
console.log('PASS local latest side overrides delayed preview; confirmed side wins; labels/fallback, stable image DOM and phase cleanup');
// Static layout contract. Real browser/GRAVITY verification is reported separately.
const railStart=html.indexOf('<div id="participantRailWrap"'),toolbarEnd=html.indexOf('      </div>\n        <div id="participantRailWrap"'),stage=html.indexOf('<div id="fieldStage"');
assert(toolbarEnd>=0&&railStart>toolbarEnd&&railStart<stage);assert(html.includes('flex:0 0 40px;'));assert(html.includes('width:calc((100% - 21px) / 8);'));
for(const width of [280,320,375,393,430]){const inner=width-(width<=350?16:24),chip=Math.max(29,Math.min(43,(inner-21)/8)),occupied=chip*8+21;assert(occupied<=inner+.001,`${width}: ${occupied}>${inner}`)}
console.log('PASS independent 40px row and eight-seat width arithmetic for 280–430px (not browser rendering)');
