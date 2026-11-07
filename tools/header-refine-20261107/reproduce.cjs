'use strict';
// Usage: node tools/header-refine-20261107/reproduce.cjs NEW_OUTPUT_DIRECTORY [REPOSITORY_ROOT]
// All generated files stay in a fresh output directory. Existing releases are immutable.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const {spawnSync}=require('child_process');
const here=__dirname,repo=path.resolve(process.argv[3]||path.join(here,'../..'));
if(!process.argv[2])throw Error('Pass a new absent output directory');
const out=path.resolve(process.argv[2]);assert(!fs.existsSync(out),'Output must not exist');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const baseHash='fef9176e59383910de20f077882565c3ef44f35ca32147bf95b219647c727adf';
const finalHash='14103deee70be661f36874c3ebfaa7e883d35bab92abea12089bd42368bea440';
const prior=path.join(repo,'releases/ui-world-restore-20261107');
const priorTools=path.join(repo,'tools/boss-abilities/release-tools');
const {reassemble}=require(path.join(priorTools,'reassemble-demand-source.cjs'));
const {source}=reassemble(prior);assert.equal(sha(source),baseHash);
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'baseline.html'),source);
const run=(bin,args,cwd=out)=>{const r=spawnSync(bin,args,{cwd,encoding:'utf8'});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');assert.equal(r.status,0,bin+' '+args.join(' '));return r.stdout;};
run('python3',[path.join(here,'build-source.py'),path.join(out,'baseline.html'),path.join(out,'source/index.html')]);
for(const name of ['ARTWORK.md','GRAVITY_INTEGRATION.md','licenses'])fs.cpSync(path.join(prior,name),path.join(out,'source',name),{recursive:true});
const builderDir=path.join(out,'release-tools');fs.cpSync(priorTools,builderDir,{recursive:true});
const builderPath=path.join(builderDir,'build-demand-release.cjs');
let builder=fs.readFileSync(builderPath,'utf8');
const old="const RELEASE='releases/ui-world-restore-20261107';";
assert.equal(builder.split(old).length,2);builder=builder.replace(old,"const RELEASE='releases/header-refine-20261107';");fs.writeFileSync(builderPath,builder);
run(process.execPath,[builderPath,path.join(out,'source/index.html'),path.join(out,'package')]);
const result=path.join(out,'package/releases/header-refine-20261107');
const manifest=JSON.parse(fs.readFileSync(path.join(result,'manifest.json'),'utf8'));
assert.equal(manifest.sourceSha256,finalHash);
// The release intentionally reuses prior image bytes. Copy only its manifest-listed
// immutable shared assets into the isolated output tree to test reconstruction.
for(const asset of manifest.imageAssets){assert(/^\.\.\/(gravity-lazy-v3\/images|reconstructed-20261106\/assets|review-fixes-20261107\/images)\/[a-f0-9]{64}\.(png|webp)$/.test(asset.file));const dest=path.resolve(result,asset.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.resolve(prior,asset.file),dest);}
assert.equal(sha(reassemble(result).source),finalHash);
fs.mkdirSync(path.join(out,'validation/tests'),{recursive:true});
for(const name of ['zero-result-ui.cjs','pause-exit.cjs'])fs.copyFileSync(path.join(repo,'tests',name),path.join(out,'validation/tests',name));
fs.copyFileSync(path.join(here,'header-controls-current.cjs'),path.join(out,'validation/tests/header-controls-current.cjs'));
fs.copyFileSync(path.join(out,'source/index.html'),path.join(out,'validation/index.html'));
for(const name of ['header-controls-current.cjs','zero-result-ui.cjs'])fs.writeFileSync(path.join(out,name+'.log'),run(process.execPath,['tests/'+name],path.join(out,'validation')));
fs.mkdirSync(path.join(out,'tests'),{recursive:true});
for(const name of ['harness.cjs','integrated-bosses.cjs'])fs.copyFileSync(path.join(repo,'tools/boss-abilities/tests',name),path.join(out,'tests',name));
fs.copyFileSync(path.join(repo,'tools/boss-abilities/baseline-roster.json'),path.join(out,'baseline-roster.json'));
fs.writeFileSync(path.join(out,'integration-ready.log'),run(process.execPath,[path.join(out,'tests/integrated-bosses.cjs')]));
fs.writeFileSync(path.join(out,'release-loader-ready.log'),run(process.execPath,[path.join(repo,'tools/review-fixes/test-entry-loader-release.cjs'),result]));
fs.writeFileSync(path.join(out,'reproduction.json'),JSON.stringify({result:'PASS',sourceSHA256:finalHash,baseSourceSHA256:baseHash,release:'releases/header-refine-20261107',imageAssets:manifest.imageAssets.length,sharedImagePolicy:'Byte-identical manifest-listed prior images; no new images',tests:['header-controls-current.cjs','zero-result-ui.cjs','integrated-bosses.cjs','test-entry-loader-release.cjs']},null,2)+'\n');
console.log('REPRODUCTION PASS '+finalHash);
