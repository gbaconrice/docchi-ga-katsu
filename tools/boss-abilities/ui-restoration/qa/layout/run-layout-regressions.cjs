'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
const {resolveInputs,hash,expected}=require('./resolve-inputs.cjs');
const {repository,sourcePath,testRoot}=resolveInputs();
const out=path.resolve(process.argv[2]||process.env.QA_REPORT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'docchi-layout-report-')));
fs.mkdirSync(out,{recursive:true});const work=path.join(out,'workspace');
if(fs.existsSync(work))throw Error('Refusing to overwrite an existing test workspace: '+work);
fs.mkdirSync(work);fs.cpSync(testRoot,path.join(work,'tests'),{recursive:true});fs.copyFileSync(sourcePath,path.join(work,'index.html'));
const sourceSha256=hash(fs.readFileSync(sourcePath)),logs=path.join(out,'logs');fs.mkdirSync(logs);
const env={...process.env,GAME_REPOSITORY:repository,GAME_HTML:path.join(work,'index.html'),GAME_TEST_ROOT:path.join(work,'tests'),COUNTER_HTML:path.join(work,'index.html')};
const equivalents=fs.readdirSync(path.join(__dirname,'equivalents')).filter(x=>x.endsWith('.cjs')).sort();if(equivalents.length!==15)throw Error('Expected15 explicit equivalents');
const summary={sourceSha256,canonicalTestsModified:false,browserVerified:false,equivalentCount:15,focusedCount:2,results:[]};
const save=()=>fs.writeFileSync(path.join(out,'layout-regression-summary.json'),JSON.stringify(summary,null,2)+'\n');
function execute(name,args,kind){
 const begin=Date.now(),r=spawnSync(process.execPath,['--max-old-space-size=768',...args],{cwd:work,env,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
 fs.writeFileSync(path.join(logs,name+'.log'),(r.stdout||'')+(r.stderr||''));summary.results.push({test:name,kind,status:r.status===0?'pass':'fail',code:r.status,signal:r.signal,error:r.error?.message,seconds:(Date.now()-begin)/1000});save();console.log((r.status===0?'PASS ':'FAIL ')+name);
}
for(const name of equivalents){
 const eq=path.join(__dirname,'equivalents',name);
 const script="const fs=require('fs'),Module=require('module'),path=require('path');const f=path.resolve('tests/"+name+"');const m=new Module(f,module);m.filename=f;m.paths=Module._nodeModulePaths(path.dirname(f));m._compile(fs.readFileSync("+JSON.stringify(eq)+",'utf8'),f);";
 execute(name,['-e',script],'explicit-historical-equivalent');
}
for(const name of ['test-prediction-entry.cjs','test-choose-controls.cjs'])execute(name,[path.join(__dirname,name)],'focused-real-handler-regression');
summary.sourceUnchanged=hash(fs.readFileSync(sourcePath))===sourceSha256&&hash(fs.readFileSync(path.join(work,'index.html')))===sourceSha256;
summary.all173OriginalTestsUnchanged=Object.entries(expected).every(([name,want])=>hash(fs.readFileSync(path.join(testRoot,name)))===want&&hash(fs.readFileSync(path.join(work,'tests',name)))===want);
summary.passed=summary.results.filter(x=>x.status==='pass').length;summary.failed=summary.results.length-summary.passed;summary.completed=true;save();console.log(JSON.stringify(summary));
process.exitCode=summary.failed||!summary.sourceUnchanged||!summary.all173OriginalTestsUnchanged?1:0;
