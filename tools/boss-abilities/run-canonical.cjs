'use strict';
// Execute preserved historical contracts against freshly reconstructed current source.
// A nonzero exit with failed tests is intentional: this command never relabels them green.
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),{spawnSync}=require('child_process');
const here=__dirname,repo=path.resolve(here,'../..'),out=path.resolve(process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),'docchi-canonical-results-')));
fs.mkdirSync(out,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fresh=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'docchi-canonical-')),'source');
const excluded=['integrated-browser.cjs','map-emote-layout-browser.cjs'];
let summary={mode:'fresh-current-source-preserved-canonical',browserVerified:false,excludedBrowserTests:excluded,results:[]};
const save=()=>fs.writeFileSync(path.join(out,'canonical-summary.json'),JSON.stringify(summary,null,2)+'\n');
try{
 const prep=spawnSync(process.execPath,[path.join(here,'reproduce.cjs'),fresh],{env:{...process.env,GAME_REPOSITORY:repo},encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024});
 fs.writeFileSync(path.join(out,'reproduce.log'),(prep.stdout||'')+(prep.stderr||''));
 if(prep.status!==0)throw Error('Source reproduction failed: '+(prep.error?.message||prep.signal||prep.status));
 const metadata=JSON.parse(fs.readFileSync(path.join(repo,'CURRENT_PREVIEW_MANIFEST.json'))),source=fs.readFileSync(path.join(fresh,'source/index.html'));
 const sha=hash(source);if(sha!==(process.env.EXPECTED_SOURCE_SHA256||metadata.reconstructedSourceSHA256))throw Error('Reconstructed source does not match current manifest');
 const work=path.join(fresh,'validation-preview');
 // Supply the exact historical metadata fixture without changing the historical toolkit.
 fs.copyFileSync(path.join(here,'fixtures/CURRENT_PREVIEW_MANIFEST.review-fixes.json'),path.join(work,'CURRENT_PREVIEW_MANIFEST.json'));
 // No edits to the preserved tests or their historical fixtures. Replace this one input only.
 fs.writeFileSync(path.join(work,'index.html'),source);
 const tests=fs.readdirSync(path.join(work,'tests')).filter(f=>f.endsWith('.cjs')&&!excluded.includes(f)).sort();
 if(tests.length!==173)throw Error('Expected preserved173 tests, found '+tests.length);
 const inputHashes=Object.fromEntries(tests.map(f=>[f,hash(fs.readFileSync(path.join(work,'tests',f)))]));
 summary={...summary,inputHashes,sourceSha256:sha,expectedTests:tests.length};save();
 for(const test of tests){const begin=Date.now();const r=spawnSync(process.execPath,['--max-old-space-size='+(/semantic-tone-cascade/.test(test)?768:512),'tests/'+test],{cwd:work,env:{...process.env,GAME_REPOSITORY:repo,GAME_HTML:path.join(work,'index.html'),COUNTER_HTML:path.join(work,'index.html'),READABILITY_BASELINE_HTML:path.join(work,'readability-baseline.html')},encoding:'utf8',timeout:300000,maxBuffer:4*1024*1024});
  fs.writeFileSync(path.join(out,test+'.log'),(r.stdout||'')+(r.stderr||''));summary.results.push({test,code:r.status,signal:r.signal,seconds:(Date.now()-begin)/1000,error:r.error?.message,status:r.status===0?'pass':'fail'});save();console.log((r.status===0?'PASS ':'FAIL ')+test);
 }
 summary.inputsUnchanged=hash(fs.readFileSync(path.join(work,'index.html')))===sha&&tests.every(f=>hash(fs.readFileSync(path.join(work,'tests',f)))===inputHashes[f]);
 summary.passed=summary.results.filter(r=>r.status==='pass').length;summary.failed=summary.results.length-summary.passed;summary.failureNames=summary.results.filter(r=>r.status==='fail').map(r=>r.test);summary.completed=true;save();
 console.log(JSON.stringify({sourceSha256:sha,total:tests.length,passed:summary.passed,failed:summary.failed,inputsUnchanged:summary.inputsUnchanged,failureNames:summary.failureNames}));process.exitCode=summary.failed||!summary.inputsUnchanged?1:0;
}catch(e){summary.completed=false;summary.error=e.message;save();console.error(e.message);process.exitCode=1;}
