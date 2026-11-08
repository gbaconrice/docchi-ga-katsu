'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=process.argv[2]||process.env.GAME_HTML||path.resolve(__dirname,'../source/index.html'),source=fs.readFileSync(file,'utf8');
process.env.GAME_HTML=path.resolve(file);
const harness=process.env.ENGINE_HARNESS||process.env.HARNESS_PATH||path.resolve('tools/boss-abilities/tests/harness.cjs');
const {ev}=require(path.resolve(harness));
let count=0;const pass=s=>{count++;console.log('PASS '+s)};
const region=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const css=region('/* requested-pick-icon-overlay-20261108 */','</style>');
assert.match(css,/position:absolute; top:10px; left:10px; right:10px/);
assert.match(css,/grid-auto-flow:column; grid-auto-columns:minmax\(0,21px\)/);
assert.match(css,/overflow:hidden; contain:layout paint; pointer-events:none/);
assert.match(css,/height:21px/);assert.match(css,/aspect-ratio:1/);
for(const id of ['red','blue']){
 assert.equal((source.match(new RegExp('id="'+id+'Picks"','g'))||[]).length,1);
 assert.match(source,new RegExp('id="'+id+'"[^>]*>[\\s\\S]*?id="'+id+'Picks"[\\s\\S]*?id="'+id+'Stats"'));
}
pass('one absolute, pointer-transparent, single-row overlay per card; no flow height');
for(const block of [region('/* Participant names remain plain','/* Keep terrain/'),region('/* battle-ui-feedback: inspector team name */','/* requested-toolbar-participants-20261108 */')]){
 assert(!/background:#(?:3c291f|fff3d7)/.test(block));assert(block.includes('background:none'));
}
assert(source.includes('--team-blue:#176ab4; --team-red:#b93632;'));
assert(source.includes('top:-2px; right:-6px; width:18px; height:18px;'));
pass('participant/winner/log/inspector name fills removed; team hues and emote top-right unchanged');
const picksCode=region('function predictionPickEntries(', '\nfunction displayMultiState(');
function fixture(){
 const node=()=>({hidden:false,children:[],attributes:{},style:{},appendChild(c){this.children.push(c)},replaceChildren(...children){this.children=children},setAttribute(k,v){this.attributes[k]=String(v)},getAttribute(k){return this.attributes[k]??null}}),nodes=new Map([['#redPicks',node()],['#bluePicks',node()]]),profiles={};
 const context=vm.createContext({document:{querySelector:id=>nodes.get(id),createElement:node},URL,multiUser:'p0',selectedSide:null,multiAdapter:{getProfile:id=>profiles[id]},snapshot:null});
 vm.runInContext(picksCode,context);return {nodes,profiles,context,run:s=>vm.runInContext(s,context)};
}
const snapshot=n=>({phase:'predict',participants:Array.from({length:n},(_,i)=>'p'+i),spectators:['s0','s1'],selectedSides:[],confirmedSides:[],readyIds:[],departedIds:[],cashedOutIds:[]});
for(let n=1;n<=8;n++){
 const f=fixture(),s=snapshot(n);s.selectedSides=s.participants.map(userId=>({userId,side:'A'}));s.selectedSides.push({userId:'s0',side:'A'});f.context.snapshot=s;
 for(const id of [...s.participants,'s0'])f.profiles[id]={name:'非常に長い名前<&>👩🏽‍🚀'.repeat(12),avatarUrl:'https://example.org/'+id+'.png'};
 f.run('selectedSide=0;syncPredictionPicks(snapshot)');assert.equal(f.nodes.get('#redPicks').children.length,n);assert(f.nodes.get('#bluePicks').hidden);
 assert.deepEqual(f.nodes.get('#redPicks').children.map(c=>c.attributes['data-user-id']),s.participants);
 f.run('selectedSide=1;syncPredictionPicks(snapshot)');assert.equal(f.nodes.get('#redPicks').children.length,n-1);assert.equal(f.nodes.get('#bluePicks').children.length,1);
 const own=f.nodes.get('#bluePicks').children[0];assert(own.attributes['aria-label'].includes('非常に長い名前'));assert.equal(own.children[0].textContent,'非');
 const img=own.children[1];assert.equal(img.referrerPolicy,'no-referrer');img.onload();assert(!img.hidden&&own.children[0].hidden);img.onerror();assert(img.hidden&&!own.children[0].hidden);
 s.confirmedSides=[{userId:'p0',side:'B'}];s.readyIds=['p0'];f.run('selectedSide=0;syncPredictionPicks(snapshot)');assert(own!==f.nodes.get('#bluePicks').children[0]);assert(f.nodes.get('#bluePicks').children[0].className.includes('is-confirmed'));
 s.phase='battle';f.run('syncPredictionPicks(snapshot)');assert(f.nodes.get('#redPicks').hidden&&f.nodes.get('#bluePicks').hidden);assert.equal(f.nodes.get('#redPicks').children.length,0);
}
pass('1–8 players: long names, side switches, confirmed picks, failed images, spectators, phase cleanup');
{
 const f=fixture(),s=snapshot(8);s.selectedSides=s.participants.map(userId=>({userId,side:'B'}));s.selectedSides.push({userId:'p3',side:'A'});s.confirmedSides=[{userId:'p2',side:'A'},{userId:'s0',side:'A'},{userId:'p4',side:'invalid'}];s.departedIds=['p1'];s.cashedOutIds=['p7'];f.context.snapshot=s;
 f.run('selectedSide=0;syncPredictionPicks(snapshot)');assert.deepEqual(f.nodes.get('#redPicks').children.map(c=>c.attributes['data-user-id']),['p0','p2','p3']);assert.deepEqual(f.nodes.get('#bluePicks').children.map(c=>c.attributes['data-user-id']),['p4','p5','p6']);
 const old=f.nodes.get('#redPicks').children;f.run('syncPredictionPicks(snapshot)');assert.equal(f.nodes.get('#redPicks').children,old);
}
pass('stable seat ordering, deduplication, invalid/spectator/departed/cashed-out selection filtering');
// Runtime canvas planner assertions, not a browser layout substitute.
ev("screenMode='game';state='choose';multiSession={};multiSnapshot={phase:'predict'}");
assert.deepEqual(JSON.parse(ev('JSON.stringify(predictionPreviewLane())')),{top:24,bottom:8});
const bosses=JSON.parse(ev('JSON.stringify(Object.keys(TYPES).filter(k=>TYPES[k].boss))'));
const viewports=[320,390,430,1200],matrix=[];
for(const viewport of viewports){
 const appWidth=Math.min(viewport,viewport>=900?1180:520),appPadding=viewport<=355?8:12,comparisonWidth=Math.min(760,appWidth-appPadding*2),gridWidth=comparisonWidth-8,gap=viewport<=350?6:8,cardWidth=(gridWidth-gap)/2,canvasWidth=cardWidth-20,laneWidth=cardWidth-26;
 const avatar=Math.min(21,(laneWidth-7*2)/8);assert(avatar>=12&&avatar<=21);assert(avatar*8+14<=laneWidth+1e-9);
 const height=Math.max(112,Math.min(132,viewport*.29));
 let maxReduction=0;
 for(const kind of bosses){for(const total of [1,8,32]){
  const groups=[{k:kind,count:total}];ev('globalThis.qaGroups='+JSON.stringify(groups));
  const p=JSON.parse(ev(`JSON.stringify(predictionPreviewPlan(qaGroups,${canvasWidth},${height}))`));
  for(const g of p.entries){const y=height-p.lane.bottom-p.bottom*p.fit,marker=Math.min(22,Math.max(1,g.slotWidth-6));assert(y-g.insets[1]*p.fit-marker-4>=24-1e-6,kind+' avatar/marker collision');assert(y+g.insets[3]*p.fit<=height-8+1e-6);assert(g.x-g.insets[0]*p.fit>=-1e-6&&g.x+g.insets[2]*p.fit<=canvasWidth+1e-6);}
  ev('multiSession=null');const old=JSON.parse(ev(`JSON.stringify(predictionPreviewPlan(qaGroups,${canvasWidth},${height}))`));ev('multiSession={}');maxReduction=Math.max(maxReduction,(old.fit-p.fit)*(p.top+p.bottom));
 }}
 matrix.push({viewport,cardWidth,canvasWidth,bossCanvasHeight:height,eightAvatarWidth:+avatar.toFixed(2),maxBossDrawHeightReduction:+maxReduction.toFixed(3)});
}
for(const phase of ['predict','locked','battle','result']){ev('multiSnapshot.phase='+JSON.stringify(phase));assert.equal(ev('predictionPreviewLane().top'),phase==='predict'?24:4);}
ev("multiSession=null;multiSnapshot=null");assert.equal(ev('predictionPreviewLane().top'),4);
pass('all '+bosses.length+' registered bosses × 1/8/32 units × 320/390/430/1200: marker/body bounds clear avatar lane, canvas unchanged');
console.log(JSON.stringify({checks:count,layoutMethod:'structural CSS + canvas planner; actual DOM/pixel browser QA still required',matrix},null,2));
