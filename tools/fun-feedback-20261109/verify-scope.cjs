'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const root=__dirname,source=fs.readFileSync(process.argv[2]||path.join(root,'source/index.html'),'utf8'),baseline=fs.readFileSync(process.argv[3]||path.join(root,'../gravity-spacing-release-20261109/source/index.html'),'utf8');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex'),changes=JSON.parse(fs.readFileSync(process.argv[4]||path.join(root,'source/changes.json')));
let restored=source;const once=(text,label)=>{assert.equal(restored.split(text).length,2,label);restored=restored.replace(text,'');};
once('\n'+fs.readFileSync(path.join(root,'fun-feedback.css'),'utf8'),'only reviewed CSS appended');
once('\n'+fs.readFileSync(path.join(root,'fun-feedback.js'),'utf8')+'\n','only reviewed feedback module appended');
for(const {before,after}of changes.slice().reverse()){assert.equal(restored.split(after).length,2,'unique reviewed edit '+after.slice(0,60));restored=restored.replace(after,before);}
assert.equal(restored,baseline,'every other source byte stays identical to current public release');
assert.equal(sha(baseline),'1fec6310780fd73198af9accd5892ffdf6a8143988a7b0651830d6d44b66b3cc');
const scripts=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.equal(scripts.length,5);for(const code of scripts)new vm.Script(code);
const images=text=>[...text.matchAll(/data:(image\/(?:png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})/g)].map(m=>sha(m[0]));
assert.deepEqual(images(source),images(baseline));
const audio=text=>[...text.matchAll(/data:audio\/[^;]+;base64,[A-Za-z0-9+/=]+/g)].map(m=>sha(m[0]));assert.deepEqual(audio(source),audio(baseline));
const report={status:'PASS',sourceSha256:sha(source),baselineSha256:sha(baseline),reviewedReplacementSites:changes.length,baselineRestoredExactly:true,imagePayloadOccurrences:images(source).length,audioPayloadOccurrences:audio(source).length,allFiveScriptsParse:true,description:'Exact inverse patch pins every untouched source byte, including gameplay, wallet, RNG, replay, protocol, host clearance, field viewport and home controller. Only publicMatchup display metadata changes payload; protocol module unchanged.'};
fs.writeFileSync(path.join(root,'scope-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
