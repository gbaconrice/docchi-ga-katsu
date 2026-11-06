'use strict';
// Presentation text only. This optional patch is separate from the browser-verified CSS.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: node apply-copy-polish.cjs VERIFIED_SOURCE_INDEX NEW_OUTPUT_INDEX');
assert(!fs.existsSync(output),'Refusing to overwrite an existing output');
const source=fs.readFileSync(input,'utf8'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
assert.equal(sha(source),'cf52cf8e8bcefeedc24b44c604e264fb56cc014cab88aca2a3f5fd53ec5055e3','Input is not the verified 28a4eb20 source');
const edits=[
  ["'はずれ'","'外れ'",3],
  ["count+'種（条件あり） · 数値は基礎値'","count+'種'",1]
];
let candidate=source;
for(const [before,after,n]of edits){assert.equal(candidate.split(before).length,n+1,before);candidate=candidate.split(before).join(after);}
assert(candidate.includes("description:'この地形の影響を受ける可能性があるキャラが'+count+'種類います。能力の発動は状況によります。表示されるキャラの数値は基礎値です。'"));
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,candidate);
console.log(JSON.stringify({sourceSha256:sha(source),candidateSha256:sha(candidate),changes:4,meaning:'3 outcome labels use 外れ; terrain note removes repeated qualification but retains its accessible description',browserVerified:false},null,2));
