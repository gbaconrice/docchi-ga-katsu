'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const runtime=process.env.GAME_JS||path.join(__dirname,'candidate-runtime.js');
const source=fs.readFileSync(runtime,'utf8');
const sandbox=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const LicensedAssets=(()=>{'),source.indexOf('const VariableClips=(()=>{')),sandbox);
const hash='a'.repeat(64),id='sha256:'+hash,url='https://gbaconrice.github.io/docchi-ga-katsu/releases/gravity-lazy-v3/images/'+hash+'.png';
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
async function testLoader(kind){
 const images=[],changes=[];
 class Image{constructor(){this.naturalWidth=2;this.naturalHeight=2;images.push(this)}set src(v){this.url=v}removeAttribute(name){this.removed=name}decode(){return new Promise(resolve=>{this.finishDecode=resolve})}}
 sandbox.ImageCtor=Image;sandbox.changes=changes;sandbox.url=url;sandbox.hash=hash;
 const loader=vm.runInContext(kind==='licensed'?`LicensedAssets.createLicensedLoader({entries:[{role:'x',source:url,atlasSize:[2,2]}],ImageCtor,onChange:e=>changes.push(e.status)})`:`MultiSourceAssets.createMultiSourceLoader({images:[{id:'sha256:'+hash,sha256:hash,source:url,dimensions:[2,2],license:'test'}],roleImages:{x:['sha256:'+hash]},ImageCtor,onChange:e=>changes.push(e.status)})`,sandbox);
 const state=()=>Object.values(loader.inspect().states)[0];
 const get=()=>kind==='licensed'?loader.get('epoch','x'):loader.get('epoch','x',id);
 loader.begin('epoch',['x']);assert.equal(state(),'loading');
 assert.equal(loader.retryFailed('old',{includePending:true}),false);assert.equal(images.length,1);
 loader.retryFailed('epoch');assert.equal(images.length,1,'ordinary retry must not restart a healthy pending load');
 const oldLoad=images[0].onload,oldError=images[0].onerror;
 loader.retryFailed('epoch',{includePending:true});assert.equal(images.length,2,'late Retry must replace hung loading image');assert.equal(images[0].onload,null);assert.equal(images[0].onerror,null);assert.equal(images[0].removed,'src');
 oldLoad();oldError();assert.equal(state(),'loading');assert.equal(get(),null);assert.equal(changes.length,0,'saved stale handlers must not mutate replacement');
 images[1].onload();assert.equal(state(),'decoding');const oldDecode=images[1].finishDecode;
 loader.retryFailed('epoch',{includePending:true});assert.equal(images.length,3,'late Retry must replace hung decode');oldDecode();await flush();assert.equal(state(),'loading');assert.equal(get(),null,'late decode must not install old image');
 images[2].onload();images[2].finishDecode();await flush();assert.equal(state(),'ready');assert.strictEqual(get(),images[2]);
 const readyCount=images.length;loader.retryFailed('epoch',{includePending:true});assert.equal(images.length,readyCount,'ready images must remain cached');assert.strictEqual(get(),images[2]);
 loader.close();console.log('PASS',kind,'loading/decode retries, stale callbacks, wrong epoch, ready cache preservation');
}
function testLiveRetry(){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:''});return nodes.get(id)};
 class LegacyImage{constructor(){this.complete=false;this.naturalWidth=2}set src(value){this.source=value}removeAttribute(name){this.removed=name}}
 const context=vm.createContext({Date,Image:LegacyImage,licensedAssetEpoch:'e',licensedAssetSerial:1,licensedAssetKeys:new Set(),SPRITE_ASSETS:{'review-legacy-pending':url},calls:[],units:[],multiSession:null,effectImages:{},spriteImages:{},failedLegacyImages:new Set(),fieldBorderImage:null,fieldBorderReady:false,arenaFloorImage:null,
  document:{getElementById:node},fieldFloorCache:{status:()=>({}),clear(){}},requiredLegacyKeys:()=>[],draw(){},drawArmyPreviews(){},syncArenaField(){},primeEffectImages(){}});
 const ev=s=>vm.runInContext(s,context);
 ev("licensedLoader={inspect:()=>({states:{test:'loading'}}),retryFailed:(epoch,options)=>calls.push({kind:'licensed',epoch,options})};multiSourceLoader={inspect:()=>({states:{test:'decoding'}}),retryFailed:(epoch,options)=>calls.push({kind:'multi',epoch,options})};");
 vm.runInContext(source.slice(source.indexOf('let assetWaitStarted=0,assetBypass=false;'),source.indexOf('function visualFor(u)')),context);
 const binding=source.split('\n').find(line=>line.startsWith("for(const id of ['Choose','Battle']){const retry="));assert(binding);vm.runInContext(binding,context);
 const result=ev(`(()=>{
  assetWaitStarted=Date.now()-9000;assetRefreshUI();
  if(document.getElementById('assetRetryChoose').hidden)throw Error('late retry hidden');
  const key='review-legacy-pending';requiredLegacyKeys=()=>[key];
  const old=legacyImage(key),oldLoad=old.onload,oldError=old.onerror;
  document.getElementById('assetRetryChoose').onclick();
  if(calls.length!==2||calls.some(c=>c.options?.includePending!==true))throw Error('UI did not request pending retries');
  if(Object.hasOwn(spriteImages,key)||old.onload!==null||old.onerror!==null||old.removed!=='src')throw Error('legacy pending image not released');
  const replacement=legacyImage(key);oldLoad();oldError();if(spriteImages[key]!==replacement||failedLegacyImages.has(key))throw Error('legacy stale callback adopted');
  if(assetProgress().late)throw Error('retry grace period not restarted');
  calls=[];assetWaitStarted=Date.now();retryImageAssets();if(calls.some(c=>c.options?.includePending!==false))throw Error('fresh loads unnecessarily retried');
  return {lateRetryRestartsPending:true,legacyPendingReleased:true,legacyStaleCallbackRejected:true,freshPendingPreserved:true};
 })()`);
 console.log('PASS real Retry button wiring',JSON.stringify(result));
}
(async()=>{await testLoader('licensed');await testLoader('multi-source');testLiveRetry();})().catch(error=>{console.error(error);process.exitCode=1});
