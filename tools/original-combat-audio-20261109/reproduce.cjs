'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const here=__dirname,repo=path.resolve(process.argv[3]||path.join(here,'../..')),out=path.resolve(process.argv[2]||'');assert(process.argv[2],'Usage: node reproduce.cjs NEW_OUTPUT_DIRECTORY [REPOSITORY_ROOT]');assert(!fs.existsSync(out),'Output must not exist');
const cfg=JSON.parse(fs.readFileSync(path.join(here,'release-config.json'),'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const f of cfg.inputs){const file=path.resolve(here,f.file);assert(file.startsWith(here+path.sep));assert.equal(sha(fs.readFileSync(file)),f.sha256,f.file);}
const prior=path.join(repo,cfg.baselineRelease),priorManifest=fs.readFileSync(path.join(prior,'manifest.json'));assert.equal(sha(priorManifest),cfg.baselineManifestSHA256);
const reassemble=require(path.join(here,'build-tools/reassemble-demand-source.cjs')).reassemble;
const original=reassemble(prior).source;assert.equal(sha(original),cfg.baselineSourceSHA256);fs.mkdirSync(path.join(out,'baseline'),{recursive:true});const base=path.join(out,'baseline/index.html');fs.writeFileSync(base,original);
const run=(bin,args)=>{const r=spawnSync(bin,args,{cwd:repo,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},encoding:'utf8',maxBuffer:64*1024*1024});assert.equal(r.status,0,(r.stdout||'')+(r.stderr||''));return(r.stdout||'')+(r.stderr||'');};
const source=path.join(out,'source/index.html');run('python3',[path.join(here,'build-source.py'),base,source]);assert.equal(sha(fs.readFileSync(source)),cfg.sourceSHA256);
for(const n of fs.readdirSync(path.join(here,'source-support')))fs.cpSync(path.join(here,'source-support',n),path.join(out,'source',n),{recursive:true});
run(process.execPath,[path.join(here,'build-tools/build-demand-release.cjs'),source,path.join(out,'build')]);
const dir=path.join(out,'build',cfg.release),m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));assert.equal(sha(fs.readFileSync(path.join(dir,'manifest.json'))),cfg.releaseManifestSHA256);assert.equal(m.sourceSha256,cfg.sourceSHA256);assert.equal(m.reusedImages,574);assert.equal(m.newImages,123);
for(const a of m.imageAssets){if(a.reused){const input=path.resolve(repo,cfg.release,a.file),b=fs.readFileSync(input);assert.equal(sha(b),a.sha256);const target=path.resolve(dir,a.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b);}}
assert.equal(sha(reassemble(dir).source),cfg.sourceSHA256);
for(const n of ['index.html','GRAVITY_EXTERNAL_ENTRY.html'])assert.equal(sha(fs.readFileSync(path.join(out,'build',n))),cfg.rootEntrySHA256[n]);
const result={result:'PASS',baselineSourceSHA256:cfg.baselineSourceSHA256,sourceSHA256:cfg.sourceSHA256,contentRevision:cfg.contentRevision,fullInverseExact:true,originalImagesReused:574,newUniqueEffectImages:123,formalManifestAndRootEntriesExact:true,physicalGravityVerified:false};fs.writeFileSync(path.join(out,'reproduction.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
