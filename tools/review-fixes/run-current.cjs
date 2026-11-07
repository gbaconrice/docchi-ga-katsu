'use strict';
// Reconstruct the published release and run its frozen source suite in a temporary worktree.
// This never edits the public entries and does not claim browser or native-SDK verification.
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('assert'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..'),meta=JSON.parse(fs.readFileSync(path.join(root,'CURRENT_PREVIEW_MANIFEST.json')));
const reportDir=path.resolve(process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),'docchi-review-results-')));fs.mkdirSync(reportDir,{recursive:true});
const work=fs.mkdtempSync(path.join(os.tmpdir(),'docchi-review-source-'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const {reassemble}=require('./reassemble-demand-source.cjs'),release=path.dirname(meta.release);
const {source}=reassemble(path.join(root,release));assert.equal(sha(source),meta.reconstructedSourceSHA256);
fs.cpSync(path.join(__dirname,'input-suite'),work,{recursive:true});fs.writeFileSync(path.join(work,'index.html'),source);
const old=require('../external-release/reassemble-source.cjs').reassemble(path.join(root,'releases/reconstructed-20261106')).source;
fs.writeFileSync(path.join(work,'baseline.html'),old);
const prior=reassemble(path.join(root,'releases/terrain-inline-20261106')).source;
fs.writeFileSync(path.join(work,'readability-baseline.html'),prior);
fs.writeFileSync(path.join(work,'CURRENT_PREVIEW_MANIFEST.json'),JSON.stringify(meta));
const candidate=JSON.parse(fs.readFileSync(path.join(work,'INTEGRATION_CANDIDATE_MANIFEST.json')));candidate.publishedIndexSHA256=meta.indexSHA256;candidate.candidateIndexSHA256=sha(source);candidate.contentRevision=source.match(/const CONTENT_REVISION="([a-f0-9]{64})"/)[1];fs.writeFileSync(path.join(work,'INTEGRATION_CANDIDATE_MANIFEST.json'),JSON.stringify(candidate));
const browserTests=['integrated-browser.cjs','map-emote-layout-browser.cjs'];
const tests=fs.readdirSync(path.join(work,'tests')).filter(f=>f.endsWith('.cjs')&&!browserTests.includes(f)).sort();assert.equal(tests.length,meta.validation.canonicalTests);
const report={sourceSHA256:sha(source),tests:tests.length,browserVerified:false,results:[]};
function run(script,args,label,cwd=work){const start=Date.now();const r=spawnSync(process.execPath,['--max-old-space-size='+(/semantic-tone-cascade/.test(script)?768:512),script,...args],{cwd,encoding:'utf8',timeout:300000,maxBuffer:4*1024*1024,env:{...process.env,GAME_HTML:path.join(work,'index.html'),COUNTER_HTML:path.join(work,'index.html'),DEMAND_BASELINE_HTML:path.join(work,'baseline.html'),READABILITY_BASELINE_HTML:path.join(work,'readability-baseline.html')}});fs.writeFileSync(path.join(reportDir,label+'.log'),(r.stdout||'')+(r.stderr||''));report.results.push({test:label,status:r.status===0?'pass':'fail',code:r.status,signal:r.signal,seconds:(Date.now()-start)/1000});fs.writeFileSync(path.join(reportDir,'summary.json'),JSON.stringify(report,null,2));console.log((r.status===0?'PASS ':'FAIL ')+label);}
for(const test of tests)run('tests/'+test,[],test);
run(path.join(__dirname,'verify-demand-release.cjs'),[root,path.join(work,'tests')],'external-packaging');
run(path.join(__dirname,'test-entry-loader.cjs'),[],'entry-loader');
run(path.join(__dirname,'test-entry-loader-release.cjs'),[path.join(root,release)],'actual-six-script-loader');
report.inputsUnchanged=sha(fs.readFileSync(path.join(work,'index.html')))===meta.reconstructedSourceSHA256;
report.passed=report.results.filter(x=>x.status==='pass').length;report.failed=report.results.length-report.passed;fs.writeFileSync(path.join(reportDir,'summary.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,results:undefined,reportDir,work}));process.exitCode=report.failed||!report.inputsUnchanged?1:0;
