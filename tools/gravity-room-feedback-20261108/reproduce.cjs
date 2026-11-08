'use strict';
// Rebuild in an empty output directory without changing any existing release.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const here=__dirname,repo=path.resolve(process.argv[3]||path.join(here,'../..')),out=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw Error('Usage: node reproduce.cjs NEW_OUTPUT_DIRECTORY [REPOSITORY_ROOT]');assert(!fs.existsSync(out),'Output directory must be absent');
const finalHash='ef0724f9b482aa5d59c22afe2418e7f2d8e98d6bee85395a322ecdfa28263bfa',baseHash='b080617884c5f67d44431dd922b77c44736d8dbe227ef3c26fbf937645b52727',sha=b=>crypto.createHash('sha256').update(b).digest('hex'),release='releases/gravity-room-feedback-20261108',prior=path.join(repo,'releases/battle-ui-feedback-20261108');
const {reassemble}=require(path.join(here,'build-tools/reassemble-demand-source.cjs'));
const base=reassemble(prior).source;assert.equal(sha(base),baseHash);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'published-base.html'),base);
const run=(bin,args,env={})=>{const r=spawnSync(bin,args,{cwd:repo,env:{...process.env,...env},encoding:'utf8',maxBuffer:40*1024*1024});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');assert.equal(r.status,0,bin+' '+args.join(' '));return (r.stdout||'')+(r.stderr||'');};
run('python3',[path.join(here,'build-source.py'),path.join(out,'published-base.html'),path.join(out,'source/index.html')]);assert.equal(sha(fs.readFileSync(path.join(out,'source/index.html'))),finalHash);
for(const name of ['ARTWORK.md','GRAVITY_INTEGRATION.md','licenses'])fs.cpSync(path.join(repo,release,name),path.join(out,'source',name),{recursive:true});
run(process.execPath,[path.join(here,'build-tools/build-demand-release.cjs'),path.join(out,'source/index.html'),path.join(out,'build')]);
const dir=path.join(out,'build',release),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
for(const image of manifest.imageAssets.filter(a=>a.reused)){assert(/^\.\.\/(gravity-lazy-v3\/images|reconstructed-20261106\/assets|review-fixes-20261107\/images)\/[a-f0-9]{64}\.(png|webp)$/.test(image.file));const target=path.resolve(dir,image.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.resolve(prior,image.file),target);}
assert.equal(sha(reassemble(dir).source),finalHash);assert.equal(manifest.reusedImages,573);assert.equal(manifest.newImages,1);assert.equal(manifest.generatedAnimation.sha256,'c97c1221053bc61e654bf76408ac0ada9560a3c5dafffd520cd2f648477b1eae');
const harness=path.join(repo,'tools/boss-abilities/tests/harness.cjs'),verification=path.join(out,'verification');fs.mkdirSync(verification,{recursive:true});
run('python3',[path.join(here,'run-regressions.py'),path.join(out,'source/index.html'),path.join(out,'published-base.html'),path.join(out,'baselines'),harness,path.join(verification,'focused')]);
fs.writeFileSync(path.join(verification,'entry-loader.log'),run(process.execPath,[path.join(repo,'tools/review-fixes/test-entry-loader-release.cjs'),dir]));
const result={result:'PASS',sourceSHA256:finalHash,focusedSuites:7,entryLoaderCases:7,unchangedImageFiles:573,newHomeGifFiles:1,realGravitySDKAndPhysicalDevicesVerified:false};fs.writeFileSync(path.join(out,'reproduction.json'),JSON.stringify(result,null,2)+'\n');console.log('REPRODUCTION PASS '+finalHash);
