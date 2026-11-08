'use strict';
// Lossless, deterministic demand-loaded image packaging. Original releases stay immutable.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const {makeEntry}=require('./entry-loader.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const RELEASE='releases/gravity-room-feedback-20261108';
const BASE='https://gbaconrice.github.io/docchi-ga-katsu/'+RELEASE+'/';
const SOURCE=path.resolve(process.argv[2]||'');
const OUT=path.resolve(process.argv[3]||'');
if(!process.argv[2]||!process.argv[3])throw Error('Usage: build-demand-release.cjs SOURCE_INDEX NEW_OUTPUT_DIRECTORY');
assert(!fs.existsSync(OUT),'Output must not exist');
const source=fs.readFileSync(SOURCE,'utf8'),dir=path.join(OUT,RELEASE);
const reuse=JSON.parse(fs.readFileSync(path.join(__dirname,'demand-image-reuse.json'),'utf8'));
const assets=new Map();
const write=(name,bytes)=>{const dest=path.join(dir,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);};
const hashed=(name,ext,bytes)=>{const file=name+'.'+sha(bytes).slice(0,20)+ext;write(file,bytes);return file;};
function images(text){return text.replace(/data:(image\/(?:png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})/g,(value,mime,b64)=>{
 const bytes=Buffer.from(b64,'base64');assert.equal(bytes.toString('base64'),b64);
 const digest=sha(bytes),prior=reuse[digest],file=prior?prior.file:'images/'+digest+'.'+mime.split('/')[1],url=prior?prior.url:BASE+file;
 if(prior){assert.equal(prior.bytes,bytes.length);assert.equal(prior.sha256,digest);assert(prior.file.startsWith('../gravity-lazy-v3/images/')||prior.file.startsWith('../reconstructed-20261106/assets/')||prior.file.startsWith('../review-fixes-20261107/images/'));}
 if(!assets.has(file)){if(!prior)write(file,bytes);assets.set(file,{file,url,mime,sha256:digest,bytes:bytes.length,stringSha256:sha(value),reused:!!prior});}
 return url;
});}
const matches=[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const styles=[...source.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)];
assert.equal(matches.length,5);assert.equal(styles.length,1);
const names=['host-layout','boot-errors','viewport','game-runtime','home-ambience'];
let scripts=matches.map((m,i)=>({index:i,name:names[i],attributes:m[1],source:images(m[2]),originalSha256:sha(m[2])}));
const css=images(styles[0][2]);
const body=images(source.match(/<body>([\s\S]*)<\/body>/i)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
// Only the pinned image URLs in this manifest can bypass legacy embedded-data validation.
// Arbitrary https:, data SVG, file:, javascript: and protocol-relative values stay rejected.
const allow=Object.fromEntries([...assets.values()].map(a=>[a.url,a.mime]));
const helper='\n/* demand-image-source-v1 */\nconst DOCCHI_IMAGE_URLS=Object.freeze('+JSON.stringify(allow)+');\nfunction isGameImageSource(value,mime){return typeof value===\'string\'&&(Object.prototype.hasOwnProperty.call(DOCCHI_IMAGE_URLS,value)?DOCCHI_IMAGE_URLS[value]===mime:(mime===\'image/png\'?/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(value):mime===\'image/webp\'&&/^data:image\\/webp;base64,[A-Za-z0-9+/=]+$/.test(value)));}\nfunction setGameImageSource(image,src){if(Object.prototype.hasOwnProperty.call(DOCCHI_IMAGE_URLS,src))image.crossOrigin=\'anonymous\';image.src=src;}\n/* end-demand-image-source-v1 */\n';
const edits=[
 ['!/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(e.source)',"!isGameImageSource(e.source,'image/png')"],
 ["typeof x==='string'&&/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(x)","isGameImageSource(x,'image/png')"],
 ["typeof src!=='string'||!src.startsWith('data:image/webp;base64,')","!isGameImageSource(src,'image/webp')"],
 ['image.src=meta.source','setGameImageSource(image,meta.source)',2],
 ['next.src=src','setGameImageSource(next,src)'],
 ['arenaFloorImage.src=ARENA_FLOOR_ONLY_ASSET','setGameImageSource(arenaFloorImage,ARENA_FLOOR_ONLY_ASSET)',2],
 ['im.src=FIELD_BORDER','setGameImageSource(im,FIELD_BORDER)'],
 ['image.src=SPRITE_ASSETS[key]','setGameImageSource(image,SPRITE_ASSETS[key])'],
 ['img.src=EFFECT_ASSETS[k]','setGameImageSource(img,EFFECT_ASSETS[k])']
];
for(const [before,after,count=1] of edits){assert.equal(scripts[3].source.split(before).length,count+1,'Expected reviewed loader sites: '+before);scripts[3].source=scripts[3].source.split(before).join(after);}
scripts[3].source=scripts[3].source.replace("'use strict';","'use strict';"+helper);
const records=scripts.map(s=>({index:s.index,attributes:s.attributes,file:hashed(s.name,'.js',s.source),originalSha256:s.originalSha256,transformedSha256:sha(s.source)}));
const cssFile=hashed('game','.css',css);
const shell='(function(){const t=document.createElement("template");t.innerHTML='+JSON.stringify(body)+';document.body.appendChild(t.content.cloneNode(true));})();\n';
const shellFile=hashed('game-shell','.js',shell);write('body-fragment.html',body);
const loadOrder=[records[0].file,shellFile,records[1].file,records[2].file,records[3].file,records[4].file];
function entry(base,gravity,extras=[],qaFaultStep){
 const ids={0:'host-layout-config',3:'game-runtime',4:'home-ambience-controller'};
 const scripts=loadOrder.map(file=>{const record=records.find(r=>r.file===file);return {file,...(record&&ids[record.index]?{id:ids[record.index]}:{})};}).concat(extras.map(file=>({file})));
 return makeEntry({base,cssFile,scripts,gravity,...(qaFaultStep===undefined?{}:{qaFaultStep})});
}
write('index.html',entry('./',false));write('gravity-entry.html',entry(BASE,true));
fs.writeFileSync(path.join(OUT,'index.html'),entry('./'+RELEASE+'/',false));
fs.writeFileSync(path.join(OUT,'GRAVITY_EXTERNAL_ENTRY.html'),entry(BASE,true));
let n=0;const template=images(source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(whole,attrs)=>'<script'+attrs+'>@@DEMAND_SCRIPT_'+(n++)+'@@</script>').replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi,(whole,attrs)=>'<style'+attrs+'>@@DEMAND_STYLE_0@@</style>'));
write('source-template.html',template);
for(const name of ['ARTWORK.md','GRAVITY_INTEGRATION.md'])if(fs.existsSync(path.join(path.dirname(SOURCE),name)))write(name,fs.readFileSync(path.join(path.dirname(SOURCE),name)));
const licenseDir=path.join(path.dirname(SOURCE),'licenses');assert(fs.existsSync(licenseDir),'Licensing input required');
for(const name of fs.readdirSync(licenseDir).sort())write('licenses/'+name,fs.readFileSync(path.join(licenseDir,name)));
// QA is isolated from the production entry and visibly labeled. It never contacts the SDK.
const qaDir=path.join(path.dirname(SOURCE),'qa-assets');
if(fs.existsSync(qaDir)){
 for(const name of fs.readdirSync(qaDir).sort())write(name,fs.readFileSync(path.join(qaDir,name)));
 const extras=['qa-fixtures.js','qa-comparison.js','qa-a1-fixtures.js','qa-result-feedback.js','qa-boss-marker.js','qa-stable-header.js','qa-horizontal-header.js'];if(fs.existsSync(path.join(qaDir,'qa-large.js')))extras.push('qa-large.js');
 write('qa-entry.html',entry('./',false,extras));
 if(fs.existsSync(path.join(qaDir,'qa-bosses.js')))write('qa-boss-entry.html',entry('./',false,['qa-bosses.js']));
 write('qa-motion-entry.html',entry('./',false,['qa-loss-motion.js']));
 write('qa-gravity-entry.html',entry('./',true,extras));
 write('qa-failure-entry.html',entry('./',false,[],4));
}
const walk=(d,p='')=>fs.readdirSync(d).sort().flatMap(n=>fs.statSync(path.join(d,n)).isDirectory()?walk(path.join(d,n),p+n+'/'):[p+n]);
const manifest={format:'docchi-demand-images-v1',releasePath:RELEASE,releaseBase:BASE,sourceSha256:sha(source),sourceBytes:Buffer.byteLength(source),scripts:records,css:{file:cssFile,originalSha256:sha(styles[0][2])},shell:{file:shellFile,bodyFile:'body-fragment.html'},loadOrder,imageAssets:[...assets.values()],runtimeEdits:edits,runtimeHelper:helper,reconstructionTemplate:'source-template.html',bytePreservation:'All existing PNG/WebP files are byte-identical decoded originals. One new GIF animates the existing home artwork. No resize, re-encode, atlas changes, gameplay/model edits, or audio changes. Network Image loading uses existing per-match loaders and retry UI.',limitations:['Browser/network/device verification must be reported separately. Images are fetched when their existing loaders assign Image.src. All metadata stays synchronous. Audio remains its original inline base64.']};
manifest.entryLoaderSHA256=sha(fs.readFileSync(path.join(__dirname,'entry-loader.cjs')));
manifest.reusedImages=[...assets.values()].filter(a=>a.reused).length;
manifest.newImages=[...assets.values()].filter(a=>!a.reused).length;
assert.equal(manifest.reusedImages,573);assert.equal(manifest.newImages,1);assert.equal(manifest.imageAssets.filter(a=>!a.reused&&a.mime==='image/gif').length,1);
manifest.generatedAnimation=manifest.imageAssets.find(a=>!a.reused&&a.mime==='image/gif');
manifest.files=walk(dir).map(file=>{const b=fs.readFileSync(path.join(dir,file));return {file,bytes:b.length,sha256:sha(b)};});
manifest.initialScriptBytes=loadOrder.reduce((n,f)=>n+fs.statSync(path.join(dir,f)).size,0);
manifest.initialEntryAndCssBytes=Buffer.byteLength(entry('./'+RELEASE+'/',false))+Buffer.byteLength(css);
write('manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output:OUT,sourceSha256:manifest.sourceSha256,imageAssets:assets.size,imageBytes:[...assets.values()].reduce((n,a)=>n+a.bytes,0),initialScriptBytes:manifest.initialScriptBytes,files:manifest.files.length,gravityBytes:Buffer.byteLength(entry(BASE,true))},null,2));
