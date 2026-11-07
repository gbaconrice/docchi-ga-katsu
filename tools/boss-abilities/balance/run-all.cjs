#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn}=require('child_process');
const args=process.argv.slice(2),opt={html:'index.html',out:'reports/balance',workers:'2'};
if(args.includes('--help')){console.log('Usage: node tools/boss-abilities/balance/run-all.cjs --html path/to/reconstructed.html --out reports/balance --workers 2 [--expect-sha SHA256]\nRuns exactly2208 controlled+196mixed+80lich+88cleaver executions. Node built-ins only.');process.exit(0);}
for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||!args[i+1])throw Error('Expected --option value');opt[args[i].slice(2)]=args[i+1];}
const workers=Number(opt.workers);if(!Number.isInteger(workers)||workers<1||workers>4)throw Error('workers must be1..4');
const html=path.resolve(opt.html),out=path.resolve(opt.out),sha=crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');
if(opt['expect-sha']&&sha!==opt['expect-sha'])throw Error('Source SHA mismatch: '+sha);
if(fs.existsSync(out))throw Error('Output directory already exists; choose a new --out directory: '+opt.out);
const expectedJobs=JSON.parse(fs.readFileSync(path.join(__dirname,'job-manifest.json'),'utf8'));
const expectedCounts={'controlled.json':2208,'mixed.json':196,'lich-support.json':80,'cleaver-support.json':88};
if(Object.keys(expectedJobs).sort().join('|')!==Object.keys(expectedCounts).sort().join('|'))throw Error('Unexpected job-manifest entries');
for(const [file,count]of Object.entries(expectedCounts)){const expected=expectedJobs[file],bytes=fs.readFileSync(path.join(__dirname,'jobs',file)),rows=JSON.parse(bytes),actualSha=crypto.createHash('sha256').update(bytes).digest('hex');if(expected.count!==count||!Array.isArray(rows)||rows.length!==count||!/^([a-f0-9]{64})$/.test(expected.sha256)||actualSha!==expected.sha256)throw Error('Job manifest verification failed: '+file);}
fs.mkdirSync(out,{recursive:true});
const specs=[['controlled0','combat-duels.cjs','controlled.json',0,2,1104],['controlled1','combat-duels.cjs','controlled.json',1,2,1104],['mixed','combat-duels.cjs','mixed.json',0,1,196],['lich-support','lich-duels.cjs','lich-support.json',0,1,80],['cleaver-support','cleaver-duels.cjs','cleaver-support.json',0,1,88]];
const manifest={sourceSha256:sha,nodeVersion:process.version,sourceFile:path.relative(process.cwd(),html),workers,jobManifestValidated:true,expectedExecutions:2572,cohorts:{controlled:2208,mixed:196,lichSupport:80,cleaverSupport:88},jobs:{}};
for(const f of ['controlled.json','mixed.json','lich-support.json','cleaver-support.json']){const p=path.join(__dirname,'jobs',f);manifest.jobs[f]={count:JSON.parse(fs.readFileSync(p)).length,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')};}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
let cursor=0;
async function worker(){while(cursor<specs.length){const [name,runner,jobs,part,parts,expected]=specs[cursor++],result=path.join(out,name+'.json'),fd=fs.openSync(path.join(out,name+'.log'),'w');
 console.log('START',name);
 try{await new Promise((resolve,reject)=>{const env={...process.env,GAME_HTML:html};delete env.FULL_STEP;delete env.CATALOG_OUT;if(name==='mixed')env.CATALOG_OUT=path.join(out,'catalog.json');const p=spawn(process.execPath,[path.join(__dirname,runner),path.join(__dirname,'jobs',jobs),result,String(part),String(parts)],{env,stdio:['ignore',fd,fd]});p.once('error',reject);p.once('close',code=>code===0?resolve():reject(Error(name+' failed with exit '+code)));});}finally{fs.closeSync(fd);}
 const rows=JSON.parse(fs.readFileSync(result));if(rows.length!==expected||rows.some(x=>x.error))throw Error(name+' incomplete or contains runtime errors');console.log('DONE',name,rows.length);
}}
Promise.all(Array.from({length:workers},worker)).then(()=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.join(__dirname,'summarize.cjs'),out],{stdio:'inherit'});p.once('close',code=>code===0?resolve():reject(Error('Summary failed')));p.once('error',reject);})).catch(e=>{console.error(e);process.exitCode=1;});
