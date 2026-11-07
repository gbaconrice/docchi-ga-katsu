'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),{spawnSync}=require('child_process');
const here=__dirname,repo=path.resolve(here,'../..'),out=path.resolve(process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),'docchi-restoration-report-')));
fs.mkdirSync(out,{recursive:true});
const work=process.argv[3]?path.resolve(process.argv[3]):path.join(fs.mkdtempSync(path.join(os.tmpdir(),'docchi-restoration-')),'source');
const summary={browserVerified:false,results:[]};
function run(label,args,env={}){const r=spawnSync(process.execPath,['--max-old-space-size=2048',...args],{encoding:'utf8',env:{...process.env,...env},maxBuffer:32*1024*1024,timeout:600000});fs.writeFileSync(path.join(out,label+'.log'),(r.stdout||'')+(r.stderr||''));summary.results.push({label,exitCode:r.status,signal:r.signal});if(r.status!==0)throw Error(label+' failed; inspect '+out);}
try{
 if(!process.argv[3])run('reproduce',[path.join(here,'reproduce.cjs'),work]);
 const input=path.join(work,'source/index.html'),sha=crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
 const current=JSON.parse(fs.readFileSync(path.join(repo,'CURRENT_PREVIEW_MANIFEST.json')));if(sha!==(process.env.EXPECTED_SOURCE_SHA256||current.reconstructedSourceSHA256))throw Error('Source differs from current release manifest');summary.sourceSHA256=sha;
 const baseline=path.join(out,'prior-boss-source.html');fs.writeFileSync(baseline,require(path.join(here,'release-tools/reassemble-demand-source.cjs')).reassemble(path.join(repo,'releases/boss-abilities-20261107')).source);
 const qa=path.join(here,'ui-restoration/qa'),approved=path.join(here,'approved-replacements'),env={GAME_REPOSITORY:repo,GAME_HTML:input,BASELINE_HTML:baseline};
 run('copy',[path.join(approved,'qa/copy-approved-regression.test.cjs')],env);
 run('loading',[path.join(qa,'legacy-loading.test.cjs')],env);
 run('loss-motion',[path.join(qa,'loss-motion.test.cjs')],{...env,REPORT_PATH:path.join(out,'loss-motion.json')});
 run('layout',[path.join(qa,'layout/run-layout-regressions.cjs'),path.join(out,'layout')],env);
 run('combat-invariance',[path.join(approved,'qa/verify-approved-invariance.cjs'),'--report',path.join(out,'combat-invariance.json')],env);
 run('replacement-mechanics',[path.join(approved,'mechanics.test.cjs')],{...env,REPORT_PATH:path.join(out,'replacement-mechanics.json')});
 run('replacement-renderer',[path.join(approved,'presentation/verify.cjs')],{...env,RENDER_OUT:path.join(out,'replacement-renders')});
 run('qa-helper-replay',[path.join(approved,'presentation/qa-helper-test.cjs')],{...env,RENDER_OUT:path.join(out,'replacement-renders')});
 run('replacement-balance',[path.join(approved,'check-balance.cjs'),path.join(out,'balance')],env);
 summary.success=true;
}catch(error){summary.success=false;summary.error=error.message;process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));}
