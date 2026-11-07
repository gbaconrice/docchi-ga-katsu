'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const {reassemble}=require('./reassemble-demand-source.cjs');
const {makeEntry}=require('./entry-loader.cjs');
const root=path.resolve(process.argv[2]),tests=path.resolve(process.argv[3]||path.join(__dirname,'../../tests'));
const dir=path.join(root,'releases/review-fixes-20261107'),{source,manifest:m}=reassemble(dir);
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const checks=[];function check(name,fn){fn();checks.push({name,status:'PASS'});}
check('All immutable files, 572 preserved originals and one approved marker reconstruct the exact source',()=>{assert.equal(m.imageAssets.length,573);assert(m.imageAssets.some(a=>a.sha256==='15d85091dddbb24783cb5d8fd8cfb46558cbe1f28835aa5db4c7ea14ce5a100e'));});
check('All scripts parse',()=>m.loadOrder.forEach(f=>new vm.Script(read(f),{filename:f})));
check('Root, immutable and GRAVITY bootstrap configurations contain exactly six ordered anonymous scripts',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'entry-loader.cjs'))).digest('hex'),m.entryLoaderSHA256);
 const ids={0:'host-layout-config',3:'game-runtime',4:'home-ambience-controller'};
 const scripts=m.loadOrder.map(file=>{const r=m.scripts.find(s=>s.file===file);return {file,...(r&&ids[r.index]?{id:ids[r.index]}:{})};});assert.equal(scripts.length,6);
 for(const [file,base,host] of [['index.html','./'+m.releasePath+'/','standalone'],['GRAVITY_EXTERNAL_ENTRY.html',m.releaseBase,'gravity'],[m.releasePath+'/index.html','./','standalone'],[m.releasePath+'/gravity-entry.html',m.releaseBase,'gravity']]){
 const html=fs.readFileSync(path.join(root,file),'utf8');assert(html.includes('data-host-shell="'+host+'"'));assert(!/<iframe\b|document\.write|\beval\s*\(/i.test(html));
 assert.equal(html,makeEntry({base,cssFile:m.css.file,scripts,gravity:host==='gravity'}));
 const tags=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];assert.equal(tags.length,1);new vm.Script(tags[0][1]);assert(!html.includes('"qaFaultStep":'));
 assert(Buffer.byteLength(html)<12000);assert(html.includes('id="entryRetry"'));
 }
});
check('Known-image whitelist rejects arbitrary URLs and MIME confusion',()=>{
 const c=vm.createContext({});vm.runInContext(m.runtimeHelper,c);c.png=m.imageAssets.find(x=>x.mime==='image/png').url;c.webp=m.imageAssets.find(x=>x.mime==='image/webp').url;
 assert(vm.runInContext("isGameImageSource(png,'image/png') && isGameImageSource(webp,'image/webp')",c));
 for(const url of ['https://evil.invalid/a.png','//evil.invalid/a.png','file:///a.png','javascript:alert(1)','data:image/svg+xml;base64,AAAA',c.png+'?changed',c.png+'#changed']){c.input=url;assert(!vm.runInContext("isGameImageSource(input,'image/png')",c));}
 assert(!vm.runInContext("isGameImageSource(webp,'image/png') || isGameImageSource(png,'image/webp')",c));
 vm.runInContext('Object.hasOwn=undefined',c);assert(vm.runInContext("isGameImageSource(png,'image/png')",c));
 c.image={};vm.runInContext('setGameImageSource(image,png)',c);assert.equal(c.image.crossOrigin,'anonymous');assert.equal(c.image.src,c.png);
 c.image={};vm.runInContext("setGameImageSource(image,'data:image/png;base64,AAAA')",c);assert.equal(c.image.crossOrigin,undefined);
});
check('No bulk image-data scripts or embedded PNG/WebP images remain in the executable release',()=>{
 for(const f of [...m.loadOrder,m.css.file,m.shell.bodyFile])assert(!/data:image\/(?:png|webp);base64,[A-Za-z0-9+/]{200}/.test(read(f)),f);
 assert(m.initialScriptBytes<6500000);
});
const boots=[];
for(const missing of ['none','hasOwn','at','both'])check('Optimized external boot, solo, battle and delayed image callbacks: '+missing,()=>{
 const external=m.loadOrder.filter(f=>f!==m.shell.file).map(f=>'<script>\n'+read(f)+'\n</script>').join('\n');
 const fakeFs=Object.create(fs);fakeFs.readFileSync=(file,...args)=>file==='index.html'?external:fs.readFileSync(file,...args);
 let harness=fs.readFileSync(path.join(tests,'boot-smoke.cjs'),'utf8');
 const setup=(missing==='hasOwn'||missing==='both'?'Object.hasOwn=undefined;':'')+(missing==='at'||missing==='both'?'Array.prototype.at=undefined;':'');
 harness=harness.replace('let context=vm.createContext(sandbox);','let context=vm.createContext(sandbox);vm.runInContext('+JSON.stringify(setup)+',context);');
 harness=harness.replace("console.log('PASS boot',scripts.length,'scripts');","console.log('PASS boot',scripts.length,'scripts');console.log('IMAGE_REQUESTS_HOME',JSON.stringify(pendingImages.map(im=>im.src))); ");
 const logs=[],context=vm.createContext({require:n=>n==='fs'?fakeFs:require(n),console:{log:(...args)=>logs.push(args.map(String).join(' '))},process:{exit:c=>{throw Error('boot exit '+c)}},URLSearchParams,Uint8ClampedArray});
 vm.runInContext(harness,context,{filename:'external-boot-'+missing,timeout:60000});
 assert(logs.some(s=>s.startsWith('PASS reached battle')));assert(logs.includes('PASS deferred image callbacks'));assert(!logs.some(s=>s.startsWith('FAIL')));
 const requested=vm.runInContext('pendingImages.map(im=>im.src)',context),known=requested.filter(u=>m.imageAssets.some(a=>a.url===u));
 assert(known.length>0);assert(known.length<80,'A match must not eager load the entire roster');
 const urls=[...new Set(known)],imageBytes=urls.reduce((n,u)=>n+m.imageAssets.find(a=>a.url===u).bytes,0);
 const home=JSON.parse(logs.find(s=>s.startsWith('IMAGE_REQUESTS_HOME ')).slice(20));
 boots.push({missing,logs,requestedImages:urls.length,requestedImageBytes:imageBytes,homeImageRequests:home.length});
});
console.log(JSON.stringify({result:'PASS',sourceSha256:m.sourceSha256,initialScriptBytes:m.initialScriptBytes,checks,boots,browserVerified:false,limitations:'Node/VM checks, not network or rendering timing. Audio bytes remain unchanged; device and GRAVITY SDK behavior require real-device checks.'},null,2));
