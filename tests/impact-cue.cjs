const fs=require('fs'),assert=require('assert');const h=fs.readFileSync('tests/zero-result-ui.cjs','utf8').split("for(const id of ['#red'")[0];new Function('require','assert',h+`
const run=s=>vm.runInContext(s,context),node=elem('#openingCue');let plays=0,cancels=0;node.animate=()=>{plays++;return {cancel(){cancels++}}};
run("screenMode='game';state='fight';multiSession=null;predictionPreview=false;paused=false;elapsed=0;openingCueSeen.clear();syncOpeningCue();syncOpeningCue()");assert.equal(plays,1);assert.equal(node.hidden,false);run("state='result';syncOpeningCue()");assert.equal(node.hidden,true);assert.equal(cancels,1);
run("state='fight';round=2;elapsed=2;openingCueSeen.clear();syncOpeningCue()");assert.equal(plays,1);
run("round=3;elapsed=0;openingCueSeen.clear();resultReducedMotion=()=>true;syncOpeningCue()");assert.equal(plays,1);
run("resultReducedMotion=()=>false;round=4;multiSession={getPlaybackClock:()=>({status:'waiting-start',sceneTick:0})};multiPlayback={};multiSnapshot={sessionId:'multis',roundId:4};openingCueSeen.clear();syncOpeningCue()");assert.equal(plays,1);
run("multiSession.getPlaybackClock=()=>({status:'waiting-start',sceneTick:0,startAt:1000,estimatedHostNow:500});syncOpeningCue()");assert.equal(plays,1);run("multiSession.getPlaybackClock=()=>({status:'waiting-start',sceneTick:0,startAt:1000,estimatedHostNow:750});syncOpeningCue()");assert.equal(plays,2);run("multiSession.getPlaybackClock=()=>({status:'playing',sceneTick:0});syncOpeningCue()");assert.equal(plays,2);
run("round=5;openingCueSeen.clear();multiSession.getPlaybackClock=()=>({status:'playing',sceneTick:100});syncOpeningCue()");assert.equal(plays,2);
let arcs=0;ctx.arc=()=>arcs++;run("multiSession=null;state='fight';effectClockTick=10;activeEffects=[{kind:'hit_spark',tick:10,x:20,y:30},{kind:'hit_spark',tick:10,x:30,y:30}];drawEffect=()=>{};drawCombatEffects('above')");assert.equal(arcs,1);run("resultReducedMotion=()=>true;drawCombatEffects('above')");assert.equal(arcs,1);
console.log('PASS opening once, cancel, delayed/reconnect suppression, reduced motion, synced multi clock, capped contact accent');
`)(require,assert);
