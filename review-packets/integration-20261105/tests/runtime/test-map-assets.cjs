'use strict';
// Packet-specific portability test. No browser/network calls or source changes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
assert(process.env.PACKET_ROOT && process.env.GAME_JS,'Explicit PACKET_ROOT and GAME_JS are required');
const root=process.env.PACKET_ROOT,source=JSON.parse(fs.readFileSync(path.join(root,'provenance/source.json'),'utf8'));
const runtime=fs.readFileSync(process.env.GAME_JS,'utf8');
const begin=runtime.indexOf("let fieldDrawPass='all';"),end=runtime.indexOf('function drawHealingBlockIndicator');
assert(begin>=0 && end>begin,'Map source boundary must exist');
const context=vm.createContext({Image:undefined,draw(){}});vm.runInContext(runtime.slice(begin,end),context);const run=s=>vm.runInContext(s,context);
const maps=run('({...FIELD_FLOORS})');assert.equal(Object.keys(maps).length,8);assert.equal(new Set(Object.values(maps)).size,8);
assert.equal(source.assets.length,5);let bytes=0;
for(const asset of source.assets){const b=fs.readFileSync(path.join(root,asset.packet_path));assert.equal(b.length,asset.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),asset.sha256);assert(maps[asset.field_id].endsWith('/'+path.basename(asset.packet_path)));bytes+=b.length;}
assert.equal(bytes,255510);context.images=[];context.ready=[];
run("globalThis.cache=createFieldFloorCache({sources:FIELD_FLOORS,createImage:()=>{let im={naturalWidth:480,naturalHeight:538,removeAttribute(k){this.removed=k}};images.push(im);return im},onReady:id=>ready.push(id)});");
run("cache.select('desert');globalThis.oldLoad=images[0].onload;cache.select('icefield');oldLoad();");assert.equal(run('cache.get()'),null);assert.equal(run('ready.length'),0);assert.equal(run('images[0].removed'),'src');
run('images[1].onload()');assert.equal(run('cache.status().ready'),true);assert.equal(run('cache.status().decodedEstimateBytes'),480*538*4);assert.equal(run('cache.status().retainedImages'),1);
run("cache.select('icefield')");assert.equal(run('images.length'),2);
run("cache.select('volcano');images[2].naturalWidth=479;images[2].onload()");assert.equal(run('cache.status().failed'),true);assert.equal(run('cache.get()'),null);
run("cache.clear();cache.select('volcano');images[3].onerror()");assert.equal(run('cache.status().failed'),true);
run("cache.clear();cache.select('volcano');images[4].onload()");assert.equal(run('cache.status().ready'),true);
run('cache.clear()');assert.equal(run('cache.status().retainedImages'),0);
assert.throws(()=>run("createFieldFloorCache({sources:{bad:'https://example.com/rogue.webp'},createImage:()=>({})}).select('bad')"));
console.log('PASS eight map mappings, five exact packet asset hashes, bounded cache, stale callback cancellation, dimension/error handling and retry; no real image/network load claimed');
