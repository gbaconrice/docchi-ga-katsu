'use strict';
// Rebuild the preceding verified release, then apply only the declared display correction.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const here=__dirname,repo=path.resolve(process.argv[3]||path.join(here,'../..')),out=path.resolve(process.argv[2]||'');
assert(process.argv[2],'Usage: node reproduce.cjs NEW_OUTPUT_DIRECTORY [REPOSITORY_ROOT]');assert(!fs.existsSync(out),'Output must not exist');fs.mkdirSync(out,{recursive:true});
const release='releases/terrain-emote-fix-20261108',hash='9b412ae06ac9c37ba58a6ef7e104b705a277eaf2ed6c5f396930ba44ee2372a5',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const run=(bin,args,env={})=>{const r=spawnSync(bin,args,{cwd:repo,env:{...process.env,...env},encoding:'utf8',maxBuffer:40*1024*1024});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');assert.equal(r.status,0,bin+' '+args.join(' '));return(r.stdout||'')+(r.stderr||'');};
run(process.execPath,[path.join(repo,'tools/gravity-room-feedback-20261108/reproduce.cjs'),path.join(out,'previous'),repo]);
const base=path.join(out,'previous/source/index.html'),source=path.join(out,'source/index.html');
run('python3',[path.join(here,'build-source.py'),base,source]);assert.equal(sha(fs.readFileSync(source)),hash);
for(const name of ['ARTWORK.md','GRAVITY_INTEGRATION.md','licenses'])fs.cpSync(path.join(repo,release,name),path.join(out,'source',name),{recursive:true});
run(process.execPath,[path.join(here,'build-tools/build-demand-release.cjs'),source,path.join(out,'build')]);
const dir=path.join(out,'build',release),prior=path.join(repo,'releases/gravity-room-feedback-20261108'),m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
for(const a of m.imageAssets.filter(a=>a.reused)){assert(/^\.\.\/(gravity-lazy-v3\/images|reconstructed-20261106\/assets|review-fixes-20261107\/images)\/[a-f0-9]{64}\.(png|webp)$/.test(a.file));const target=path.resolve(dir,a.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.resolve(prior,a.file),target);}
assert.equal(sha(require(path.join(here,'build-tools/reassemble-demand-source.cjs')).reassemble(dir).source),hash);assert.equal(m.imageAssets.length,574);assert.equal(m.generatedAnimation.sha256,'c97c1221053bc61e654bf76408ac0ada9560a3c5dafffd520cd2f648477b1eae');
const verification=path.join(out,'verification');fs.mkdirSync(verification,{recursive:true});const harness=path.join(repo,'tools/boss-abilities/tests/harness.cjs');
fs.writeFileSync(path.join(verification,'css-scope.log'),run('python3',[path.join(here,'test-terrain-emote.py'),source,base,'--sealed']));
fs.writeFileSync(path.join(verification,'terrain-emotes.log'),run(process.execPath,[path.join(here,'test-terrain-emote.cjs'),source],{ENGINE_HARNESS:harness}));
fs.writeFileSync(path.join(verification,'result-clearance.log'),run(process.execPath,[path.join(here,'test-result-clearance.cjs'),source]));
fs.writeFileSync(path.join(verification,'entry-loader.log'),run(process.execPath,[path.join(repo,'tools/review-fixes/test-entry-loader-release.cjs'),dir]));
run('python3',[path.join(repo,'tools/gravity-room-feedback-20261108/run-regressions.py'),source,path.join(out,'previous/published-base.html'),path.join(out,'previous/baselines'),harness,path.join(verification,'retained-ui')]);
const result={result:'PASS',sourceSHA256:hash,changes:'Exact CSS insertion and isolated result-clearance helper plus exact content seal only',imageFiles:574,imageBytesUnchanged:true,terrainKinds:8,retainedUISuites:7,entryLoaderCases:7,realGravityAndPhysicalDeviceVerified:false};fs.writeFileSync(path.join(out,'reproduction.json'),JSON.stringify(result,null,2)+'\n');console.log('REPRODUCTION PASS '+hash);
