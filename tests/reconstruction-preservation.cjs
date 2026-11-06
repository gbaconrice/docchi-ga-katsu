// Fresh provenance checks against recovered 119-test baseline. No browser claim.
const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'), fixture=JSON.parse(fs.readFileSync('tests/fixtures/reconstruction-preservation.json','utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
for(const [name,b]of Object.entries(fixture.blocks)){
 const start=html.indexOf(b.start),end=html.indexOf(b.end,start);assert(start>=0&&end>start,name+' boundaries');
 assert.equal(sha(html.slice(start,end)),b.sha256,name+' must remain byte-identical');
}
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);assert.equal(scripts.length,5);
for(const [i,h]of Object.entries(fixture.unchangedScripts))assert.equal(sha(scripts[+i]),h,'unrelated script '+i+' unchanged');
const assets=(html.match(/data:(?:image|audio)\/[^\s"'<>]+/g)||[]).sort();
assert.equal(assets.length,fixture.inlineAssetCount);assert.equal(sha(assets.join('\n')),fixture.inlineAssetsSHA256,'all inline images/audio remain byte-identical');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'DOM IDs stay unique');
console.log('PASS wallet/score modules, four unrelated scripts, '+assets.length+' inline assets and unique DOM IDs preserved');
