'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),{spawnSync}=require('child_process');
const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
const result=path.join(out,'results.json'),r=spawnSync(process.execPath,[path.join(__dirname,'balance-runner.cjs'),path.join(__dirname,'balance-jobs.json'),result],{encoding:'utf8',env:process.env,timeout:600000,maxBuffer:8*1024*1024});fs.writeFileSync(path.join(out,'run.log'),(r.stdout||'')+(r.stderr||''));assert.equal(r.status,0,'Balance execution');
const actual=JSON.parse(fs.readFileSync(result)),expected=require('./balance-expected.json');assert.equal(actual.length,156);assert.deepEqual(actual,expected,'Fixed-fixture balance changed from approved tuning');
const outcome=x=>x.winner===null?'draw':x.winner===Number(x.mirror)?'win':'loss',counts={};let mirroredPairs=0;
for(const row of actual){assert(!row.error);const c=counts[row.boss]??={win:0,loss:0,draw:0};c[outcome(row)]++;}
for(let i=0;i<actual.length;i+=2){const a=actual[i],b=actual[i+1];assert.equal(outcome(a),outcome(b));assert.equal(a.ticks,b.ticks);assert.deepEqual(a.hp,b.hp.slice().reverse());assert.deepEqual(a.alive,b.alive.slice().reverse());mirroredPairs++;}
const summary={sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(process.env.GAME_HTML)).digest('hex'),fixtures:156,mirroredPairs,counts,success:true,note:'Fixed fixtures include mirrors; these are not independent samples or global win rates.'};fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
