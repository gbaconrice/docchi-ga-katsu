'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),crypto=require('crypto'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),'approved-contracts-')));fs.mkdirSync(out,{recursive:true});
const hashes=require('./preserved-test-hashes.json'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [name,digest]of Object.entries(hashes))assert.equal(hash(fs.readFileSync(path.join(root,name))),digest,'Historical test changed '+name);
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).sort();
const summary={sourceSHA256:hash(fs.readFileSync(process.env.GAME_HTML||path.join(root,'source/index.html'))),historicalTestsUnchanged:true,baselineModuleTests:['control.test.cjs','resilience.test.cjs'],note:'Historical failures remain failures. Current equivalents retire only approved capture/lift/root assumptions and extend the replay/FX contract. The replacement mechanics and real renderer suites validate the new production behavior.'};
function run(label,files){const r=spawnSync(process.execPath,['--expose-gc','--test','--test-reporter=tap','--test-concurrency=1',...files],{encoding:'utf8',env:process.env,maxBuffer:32*1024*1024,timeout:600000});const log=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(out,label+'.log'),log);return {exitCode:r.status,signal:r.signal,failedNames:[...log.matchAll(/^not ok \d+ - (.+)$/gm)].map(m=>path.basename(m[1])),counts:Object.fromEntries([...log.matchAll(/^# (tests|pass|fail) (\d+)$/gm)].map(m=>[m[1],Number(m[2])])),log};}
try{
 const raw=run('historical-raw',tests.map(n=>path.join(root,'tests',n)));fs.cpSync(path.join(root,'reports'),path.join(out,'historical-reports'),{recursive:true});
 const expected=['boss-status-interop.test.cjs','fidelity-mechanics.test.cjs','boss_fist_strike draws bounded finite geometry and expires','boss_pincer_snap draws bounded finite geometry and expires','boss_claw_counter draws bounded finite geometry and expires','all30 boss cue kinds registered including specific trajectories'];
 if(process.env.CANDIDATE_ONLY==='1')expected.push('legacy-equivalents.test.cjs');
 const actual=raw.failedNames.slice().sort();assert.deepEqual(actual,expected.slice().sort(),'Unexpected historical failure set');
 const statuses=JSON.parse(fs.readFileSync(path.join(root,'reports/boss-status-interop.json'))),fidelity=JSON.parse(fs.readFileSync(path.join(root,'reports/fidelity-mechanics.json')));
 assert.deepEqual(statuses.checks.filter(c=>!c.pass).map(c=>c.name),['actual treant/thornback/razor casts cleanse on next tick, never their application tick']);
 assert.deepEqual(fidelity.checks.filter(c=>!c.pass).map(c=>c.name),['two held enemies absorb damage','pincer lifts then crushes one target after delay']);
 summary.historical={exitCode:raw.exitCode,counts:raw.counts,failed:raw.failedNames,nestedKnownFailure:'Old <=1073741823 replay-flags assertion prints a failure despite the historical runner subsequently resetting its exit status. The current equivalent corrects the range and enforces nested exit failures.',allPassed:false};
 const equivalents=new Set(['boss-status-interop.test.cjs','fidelity-mechanics.test.cjs','presentation.test.cjs','current-contract.test.cjs','legacy-equivalents.test.cjs']);
 const current=run('current-equivalents',tests.map(n=>path.join(root,equivalents.has(n)?'approved-replacements/qa/equivalents':'tests',n)));
 summary.current={exitCode:current.exitCode,counts:current.counts,failed:current.failedNames};assert.equal(current.exitCode,0,'Current contracts failed');
 for(const [name,digest]of Object.entries(hashes))assert.equal(hash(fs.readFileSync(path.join(root,name))),digest,'Historical input changed during run '+name);
 summary.success=true;
}catch(e){summary.success=false;summary.error=e.stack;process.exitCode=1;}
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
