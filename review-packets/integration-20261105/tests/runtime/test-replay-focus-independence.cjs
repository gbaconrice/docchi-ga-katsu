const fs=require('fs'),vm=require('vm'),Module=require('module'),assert=require('assert'),crypto=require('crypto');
process.env.GAME_JS=process.env.GAME_JS||__dirname+'/../dist/releases/canonical-b2305eb012904c31/game-runtime.js';
function client(){const m=new Module(__filename);m.filename=__filename;m.paths=module.paths;let h=fs.readFileSync(__dirname+'/vm-harness.cjs','utf8');m._compile(h,__filename);const c=m.exports.context;c.TextEncoder=TextEncoder;c.TextDecoder=TextDecoder;return {c,get:s=>vm.runInContext(s,c,{timeout:120000})};}
const a=client(),b=client();const replay=a.get("(()=>{freshWallet();setup(123);multiInitial=JSON.parse(JSON.stringify(units));return buildCanonicalReplay()})()");
for(const [i,q] of [a,b].entries()){q.c.testReplay=JSON.parse(JSON.stringify(replay));q.get(`openSoloScreen();multiPlayback=CompactReplay.createPlayback(testReplay);multiLastSceneTick=0;multiSession={predict(){throw Error('Focus sent a prediction')},send(){throw Error('Focus sent a network message')}};multiSnapshot={wallets:[{playerId:'viewer',balance:123,score:40}]};multiUser='viewer';multiShownWallets=JSON.parse(JSON.stringify(multiSnapshot.wallets));screenMode='game';state='fight';paused=true;cameraMode='${i?'manual':'overview'}';cameraZoom=${i?1.5:1};cameraFitScale=.75;cameraFitBounds={left:-100,top:-100,right:580,bottom:638};cameraX=240;cameraY=269;seed=123456789;resetCrowdPresentation()`);}
const digest=crypto.createHash('sha256');let focusedFrames=0;
for(let tick=0;tick<=replay.ticks;tick++){
 a.get(`applyReplayFrame(${tick})`);b.get(`applyReplayFrame(${tick})`);
 if(tick%20===0)b.get('crowdInspectorUI.next.onclick()');
 if(tick%73===0)b.get('crowdInspectorUI.previous.onclick()');
 const scene=s=>s.get('JSON.stringify({units,shots,activeEffects,seed,wallets:multiSnapshot.wallets,shown:multiShownWallets})');const left=scene(a),right=scene(b);assert.equal(right,left,`View interaction changed replay scene at tick ${tick}`);digest.update(left);
 assert.equal(a.get('crowdFocusKey'),null);if(b.get('crowdFocusKey')!==null)focusedFrames++;
}
assert(focusedFrames>0);assert.equal(a.get('cameraMode'),'overview');assert.equal(b.get('cameraMode'),'manual');assert.equal(a.get('seed'),123456789);assert.equal(b.get('seed'),123456789);
const summary={ticks:replay.ticks,focusedFrames,sceneSHA256:digest.digest('hex'),result:'Every decoded frame matched while one viewer cycled focus and the other did not; different camera modes retained; RNG, wallet snapshots and canonical replay unchanged; no live network transport was used.'};fs.writeFileSync(__dirname+'/replay-focus-independence.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
