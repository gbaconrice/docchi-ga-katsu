'use strict';
// Parser-based preservation checks. No game execution or external communication.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const acorn=require('./vendor/acorn-8.15.0/acorn.js');
const [baseFile,candidateFile,contractFile,reportFile]=process.argv.slice(2);assert(baseFile&&candidateFile&&contractFile&&reportFile,'Usage: BASE CANDIDATE CONTRACT REPORT');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),base=fs.readFileSync(baseFile,'utf8'),candidate=fs.readFileSync(candidateFile,'utf8'),contract=JSON.parse(fs.readFileSync(contractFile,'utf8'));
assert.equal(sha(base),'6283b7ec63b7e8c876ce6bff3377fbacfa9248df7c17ac8d08c861e9331ed3a4');
const allow=new Set(contract.changedFunctionNames||[]),protectedNames=['drawSprite','spriteFrame','combatStep','spriteStep','hit','setup','prepareOpening','automaticCameraBounds','createScoreBridge','attemptFinalScore','submitFinalScore'];
for(const n of protectedNames)assert(!allow.has(n),'Protected function may not be allowed: '+n);
const scripts=s=>[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]),bs=scripts(base),cs=scripts(candidate);assert.equal(bs.length,5);assert.equal(cs.length,5);
for(const i of [0,1,2,4])assert.equal(cs[i],bs[i],'Unrelated script '+i);
const shell=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'<script>CONTENT</script>');assert.equal(shell(candidate),shell(base),'HTML, CSS and non-script content changed');
const payloads=s=>[...s.matchAll(/data:([^;\s"'<>]+);base64,([A-Za-z0-9+/=]+)/g)].map(m=>({uri:sha(m[0]),mime:m[1],sha256:sha(Buffer.from(m[2],'base64')),bytes:Buffer.from(m[2],'base64').length}));
const originals=payloads(base),current=payloads(candidate);assert.equal(originals.length,588);const remaining=current.slice();
for(const p of originals){const i=remaining.findIndex(q=>q.uri===p.uri);assert(i>=0,'Original payload missing/modified '+p.sha256);remaining.splice(i,1);}
function encodedMedia(code){const found=[];const ast=acorn.parse(code,{ecmaVersion:'latest'});function walk(n){if(!n||typeof n!=='object')return;if(n.type==='Literal'&&typeof n.value==='string'&&n.value.length>100&&/^[A-Za-z0-9+/]+={0,2}$/.test(n.value)){const b=Buffer.from(n.value,'base64');let mime=null;if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WAVE')mime='audio/wav';else if(b.toString('ascii',0,4)==='OggS')mime='audio/ogg';else if(b.toString('ascii',0,3)==='ID3')mime='audio/mpeg';else if(b.toString('ascii',4,8)==='ftyp')mime='audio/mp4';if(mime)found.push({mime,sha256:sha(b),bytes:b.length,uri:sha(n.value)});}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}walk(ast);return found;}
const originalEncoded=encodedMedia(bs[3]),remainingEncoded=encodedMedia(cs[3]);for(const p of originalEncoded){const i=remainingEncoded.findIndex(q=>q.uri===p.uri);assert(i>=0,'Original encoded audio missing/modified '+p.sha256);remainingEncoded.splice(i,1);}const added=remaining.concat(remainingEncoded);
const expected=(contract.addedPayloads||[]).map(p=>[p.mime,p.sha256,p.bytes].join('|')).sort();assert.deepEqual(added.map(p=>[p.mime,p.sha256,p.bytes].join('|')).sort(),expected,'Added payload manifest mismatch');
const isFn=n=>n&&['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(n.type);
function inspect(code){
 const ast=acorn.parse(code,{ecmaVersion:'latest'}),records=[],parents=new WeakMap(),functions=[];
 function visit(node,parent,ancestors){if(!node||typeof node!=='object'||!node.type)return;parents.set(node,parent);if(isFn(node))functions.push({node,ancestors});const next=isFn(node)?ancestors.concat(node):ancestors;for(const [key,value]of Object.entries(node)){if(['start','end','type'].includes(key))continue;if(Array.isArray(value))for(const child of value)visit(child,node,next);else if(value&&typeof value==='object')visit(value,node,next);}}
 visit(ast,null,[]);
 function name(n){if(n.id?.name)return n.id.name;const p=parents.get(n);if(p?.type==='VariableDeclarator'&&p.id.type==='Identifier')return p.id.name;if(p?.type==='Property'||p?.type==='MethodDefinition')return p.key.name??String(p.key.value);return '(anonymous)';}
 function normalized(n){const inner=functions.filter(f=>f.node.start>n.start&&f.node.end<n.end&&(!f.ancestors.length||f.ancestors.at(-1)===n)).map(f=>f.node);let text=code.slice(n.start,n.end);for(const f of inner.sort((a,b)=>b.start-a.start))text=text.slice(0,f.start-n.start)+'__NESTED_FUNCTION__'+text.slice(f.end-n.start);return text;}
 for(const f of functions){const names=f.ancestors.concat(f.node).map(name);if(names.some(n=>allow.has(n)))continue;records.push({name:name(f.node),sha256:sha(normalized(f.node)),path:names.join('/')});}
 return {records,count:functions.length};
}
const before=inspect(bs[3]),after=inspect(cs[3]),counts=new Map();for(const f of after.records)counts.set(f.sha256,(counts.get(f.sha256)||0)+1);
const missing=[];for(const f of before.records){const n=counts.get(f.sha256)||0;if(!n)missing.push(f);else counts.set(f.sha256,n-1);}assert.deepEqual(missing,[],'Protected/non-render function bodies changed');
assert(!candidate.includes('crystal-hit-art-v1'),'Withdrawn original-character change is present');
const report={result:'PASS',baseSourceSHA256:sha(base),sourceSHA256:sha(candidate),originalPayloads:originals.length,originalEncodedAudioPayloads:originalEncoded.length,addedPayloads:added.map(({uri,...p})=>p),unrelatedScriptsExact:[0,1,2,4],htmlAndCssExact:true,baselineFunctions:before.count,candidateFunctions:after.count,protectedFunctionBodiesCompared:before.records.length,allowedRenderAudioFunctionNames:[...allow].sort(),limits:['Allowed renderer/audio function bodies and new helper declarations require separate focused tests and code review.','No live browser or GRAVITY verification is claimed by this static parser check.']};
fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
