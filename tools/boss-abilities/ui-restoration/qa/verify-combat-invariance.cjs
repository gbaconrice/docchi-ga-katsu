#!/usr/bin/env node
'use strict';
// Portable, read-only game verification. Only this checker's optional report is written.
// Usage: BASELINE_HTML=/path/old.html GAME_HTML=/path/new.html GAME_REPOSITORY=/path/repo \
//        node verify-combat-invariance.cjs --report /path/report.json
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const argv=process.argv.slice(2),opts={};
for(let i=0;i<argv.length;i++){
  if(argv[i]==='--help'){console.log('Required env: BASELINE_HTML, GAME_HTML, GAME_REPOSITORY. Options: --baseline PATH --game PATH --repository PATH --report PATH. REPORT_PATH is also supported. Report defaults to combat-invariance-report.json beside this checker.');process.exit(0);}
  if(!['--baseline','--game','--repository','--report'].includes(argv[i])||!argv[i+1])throw Error('Unknown/incomplete option: '+argv[i]);
  opts[argv[i].slice(2)]=argv[++i];
}
const required=(name,value)=>{if(!value)throw Error('Missing '+name);return path.resolve(value);};
const baselinePath=required('BASELINE_HTML',opts.baseline||process.env.BASELINE_HTML),gamePath=required('GAME_HTML',opts.game||process.env.GAME_HTML),repository=required('GAME_REPOSITORY',opts.repository||process.env.GAME_REPOSITORY);
const reportPath=path.resolve(opts.report||process.env.REPORT_PATH||path.join(__dirname,'combat-invariance-report.json'));
const testsRoot=fs.existsSync(path.join(repository,'tools/boss-abilities/tests/harness.cjs'))?path.join(repository,'tools/boss-abilities/tests'):path.join(repository,'tests');
const harnessPath=path.join(testsRoot,'harness.cjs'),fixturePath=path.join(testsRoot,'integrated-bosses.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const sourceHashes={baseline:sha(fs.readFileSync(baselinePath)),candidate:sha(fs.readFileSync(gamePath)),harness:sha(fs.readFileSync(harnessPath)),fixture:sha(fs.readFileSync(fixturePath))};
const fixtureMatch=fs.readFileSync(fixturePath,'utf8').match(/ev\(`(globalThis\.__setup=.*?)`\);/s);
if(!fixtureMatch)throw Error('Could not locate production setup fixture in '+fixturePath);
const report={version:1,created:new Date().toISOString(),paths:{baseline:baselinePath,candidate:gamePath,repository,harness:harnessPath,fixture:fixturePath},sha256:sourceHashes,method:{combatTicks:420,replayTicks:240,orientations:['normal','mirrored'],productionEntry:'step(1/60)',snapshot:'Full unrounded enumerable unit state including HP, coordinates, bossState, statuses and presentationFlags; full events; projectiles, pending summons, elapsed, state and winner, captured at tick 0 and after every production step.',numberHandling:'Exact IEEE-754 values. No rounding, tolerance, numeric masking or field omission. Tagged NaN/Infinity/-Infinity/-0/undefined values prevent JSON loss.',replay:'Direct JSON.stringify(recorder.finish(...)) byte equality, no normalization.',metadata:'All 50 registered specs including split child and all function source strings; all TYPES and COST values; explicit 49 boss costs, base HP, collision and target masks/effective layers; exact combat/target functions.',displayFields:'BossAbilities.facts display attackLabel and attackAriaLabel changes are reported, not treated as mechanics. All other facts and all numeric stats remain exact.',contentRevision:'ContentProfile.CONTENT_REVISION is recorded and independently validated as 64 lowercase hex; intentionally not required to match across a changed content release.'},counts:{checks:0,passed:0,failed:0,assertionsAttempted:0,assertionsPassed:0,pairedCombatExecutions:0,combatExecutions:0,pairedReplayExecutions:0,replayExecutions:0,combatTicksExecuted:0,replayTicksExecuted:0,combatFrameComparisons:0,unitObservationsCompared:0,eventObservationsCompared:0,replayBytesCompared:0},checks:[],combat:[],replays:[],bosses:[],displayChanges:[]};
function assertion(ok,message){report.counts.assertionsAttempted++;if(!ok)throw Error(message);report.counts.assertionsPassed++;}
function equal(actual,expected,message){assertion(actual===expected,message);}
function check(name,fn){report.counts.checks++;try{const detail=fn();report.checks.push({name,pass:true,detail});report.counts.passed++;console.log('PASS '+name);}catch(error){report.checks.push({name,pass:false,error:error.stack});report.counts.failed++;console.error('FAIL '+name+': '+error.message);}}
function snapshot(value){
  const seen=new Map();
  function enc(v,p){
    if(v===null)return ['null'];
    const t=typeof v;
    if(t==='number')return ['number',Number.isNaN(v)?'NaN':v===Infinity?'Infinity':v===-Infinity?'-Infinity':Object.is(v,-0)?'-0':v];
    if(t==='undefined')return ['undefined'];
    if(t==='function')return ['function',Function.prototype.toString.call(v)];
    if(t==='bigint')return ['bigint',String(v)];
    if(t!=='object')return [t,String(v)];
    if(seen.has(v))return ['reference',seen.get(v)];
    seen.set(v,p);
    const tag=Object.prototype.toString.call(v);
    if(tag==='[object Map]')return ['map',Array.from(v,([k,n],i)=>[enc(k,p+'.key'+i),enc(n,p+'.value'+i)])];
    if(tag==='[object Set]')return ['set',Array.from(v,(n,i)=>enc(n,p+'.set'+i))];
    if(tag==='[object Date]')return ['date',v.toISOString()];
    return [tag,Array.isArray(v)?v.length:null,Object.keys(v).sort().map(k=>[k,enc(v[k],p+'.'+k)])];
  }
  return JSON.stringify(enc(value,'$'));
}
function diffSnippet(actual,expected){let p=0;while(p<actual.length&&p<expected.length&&actual[p]===expected[p])p++;return JSON.stringify({offset:p,baseline:expected.slice(Math.max(0,p-120),p+240),candidate:actual.slice(Math.max(0,p-120),p+240)});}
function sameEncoded(actual,expected,label){equal(actual,expected,label+(actual===expected?'':' '+diffSnippet(actual,expected)));}
function load(html){const old=process.env.GAME_HTML;process.env.GAME_HTML=html;delete require.cache[require.resolve(harnessPath)];let h;try{h=require(harnessPath);}finally{if(old===undefined)delete process.env.GAME_HTML;else process.env.GAME_HTML=old;}
  h.ev(fixtureMatch[1]);
  h.ev('globalThis.__exactSnapshot='+snapshot.toString());
  h.ev(`globalThis.__exactRun=(id,ticks,mirror)=>{__setup(id,mirror);const frames=[],stats={units:0,events:0};const capture=()=>{stats.units+=units.length;stats.events+=combatEvents.length;return __exactSnapshot({units,events:combatEvents,shots,pendingSummons,elapsed,state,winner});};frames.push(capture());for(let tick=1;tick<=ticks;tick++){combatEvents=[];step(1/60);for(const u of units)if(![u.hp,u.x,u.y].every(Number.isFinite))throw Error(id+' nonfinite unit at '+tick);frames.push(capture());}return {frames,stats};};
  globalThis.__exactReplay=(id,ticks,mirror)=>{__setup(id,mirror);const recorder=CompactReplay.createCompactRecorder();const read=()=>({units,shots,effects:newEffects,statusFor:u=>CompactReplay.fourSpeciesPresentationFlags(u,elapsed,visualFor(u).moving)});recorder.capture(0,read(),true);for(let tick=1;tick<=ticks;tick++){step(1/60);recorder.capture(tick,read(),true);}return JSON.stringify(recorder.finish({ticks,winner:'draw'}));};`);
  return h;
}
const before=load(baselinePath),after=load(gamePath);
const read=(h,expression)=>h.ev('__exactSnapshot(('+expression+'))');
const ids=Array.from(before.ev('[...BossAbilities.specs.keys()].filter(k=>k!=="resilience_split_eye")'));
check('Exact 49 boss registrations plus one bounded split-child spec',()=>{
  equal(ids.length,49,'Baseline must contain 49 bosses');
  equal(before.ev('BossAbilities.specs.size'),50,'Baseline registration count');
  equal(after.ev('BossAbilities.specs.size'),50,'Candidate registration count');
  equal(after.ev('Object.keys(TYPES).filter(k=>BossAbilities.spec(k)).length'),49,'Candidate roster boss count');
  sameEncoded(read(after,'[...BossAbilities.specs.keys()]'),read(before,'[...BossAbilities.specs.keys()]'),'Registration keys/order changed');
  return {bosses:49,registeredSpecs:50};
});
check('Entire roster metadata and all costs unchanged',()=>{
  sameEncoded(read(after,'TYPES'),read(before,'TYPES'),'TYPES changed');sameEncoded(read(after,'COST'),read(before,'COST'),'COST changed');
  return {rosterTypes:before.ev('Object.keys(TYPES).length'),costEntries:before.ev('Object.keys(COST).length')};
});
check('Core production combat and target selection source unchanged',()=>{
  for(const fn of ['combatStep','layerOf','canTarget'])sameEncoded(read(after,fn),read(before,fn),fn+' changed');
  const names=Array.from(before.ev('Object.keys(BossAbilities).filter(k=>typeof BossAbilities[k]==="function"&&k!=="facts")'));
  for(const fn of names)sameEncoded(read(after,'BossAbilities['+JSON.stringify(fn)+']'),read(before,'BossAbilities['+JSON.stringify(fn)+']'),'BossAbilities.'+fn+' changed');
  return {functions:3+names.length};
});
check('Release content revisions valid and explicitly recorded',()=>{
  report.contentRevisions={baseline:before.ev('ContentProfile.CONTENT_REVISION'),candidate:after.ev('ContentProfile.CONTENT_REVISION')};
  for(const [key,value]of Object.entries(report.contentRevisions))assertion(/^[a-f0-9]{64}$/.test(value),key+' invalid contentRevision');
  return report.contentRevisions;
});
for(const id of Array.from(before.ev('[...BossAbilities.specs.keys()]')))check('Exact registered ability specification: '+id,()=>{
  sameEncoded(read(after,'BossAbilities.spec('+JSON.stringify(id)+')'),read(before,'BossAbilities.spec('+JSON.stringify(id)+')'),'Ability specification changed '+id);
  return {id};
});
for(const id of ids)check('Exact cost, base HP, target layer and facts: '+id,()=>{
  const literal=JSON.stringify(id),expr=`(()=>{__setup(${literal});const t=TYPES[${literal}],u=units[0];return {cost:COST[${literal}],baseHP:t.hp,maxHP:BossAbilities.maxHp(u),collisionLayer:t.collisionLayer,attackTargetMask:t.attackTargetMask,effectiveLayer:layerOf(u),flying:t.flying};})()`;
  sameEncoded(read(after,expr),read(before,expr),'Boss mechanical metadata changed '+id);
  const factExpr=`(()=>{const f={...BossAbilities.facts(TYPES[${literal}])};delete f.attackLabel;delete f.attackAriaLabel;return f;})()`;
  sameEncoded(read(after,factExpr),read(before,factExpr),'Non-label boss facts changed '+id);
  const labels=h=>JSON.parse(h.ev(`JSON.stringify((()=>{const f=BossAbilities.facts(TYPES[${literal}]);return {attackLabel:f.attackLabel,attackAriaLabel:f.attackAriaLabel};})())`));
  const a=labels(before),b=labels(after);if(JSON.stringify(a)!==JSON.stringify(b))report.displayChanges.push({id,baseline:a,candidate:b});
  const row=JSON.parse(after.ev(`JSON.stringify({id:${literal},cost:COST[${literal}],baseHP:TYPES[${literal}].hp,collisionLayer:TYPES[${literal}].collisionLayer,attackTargetMask:TYPES[${literal}].attackTargetMask})`));report.bosses.push(row);return row;
});
for(const mirror of [false,true])for(const id of ids)check('420-tick exact production fight '+(mirror?'mirrored ':'normal ')+id,()=>{
  const code=`__exactRun(${JSON.stringify(id)},420,${mirror})`;
  const a=before.ev(code);report.counts.combatExecutions++;report.counts.combatTicksExecuted+=420;
  const b=after.ev(code);report.counts.combatExecutions++;report.counts.combatTicksExecuted+=420;report.counts.pairedCombatExecutions++;
  equal(a.frames.length,421,'Baseline capture count');equal(b.frames.length,421,'Candidate capture count');
  for(let i=0;i<a.frames.length;i++){sameEncoded(b.frames[i],a.frames[i],id+' '+(mirror?'mirrored':'normal')+' tick '+i);report.counts.combatFrameComparisons++;}
  report.counts.unitObservationsCompared+=a.stats.units;report.counts.eventObservationsCompared+=a.stats.events;
  const row={id,orientation:mirror?'mirrored':'normal',ticks:420,frames:a.frames.length,unitObservations:a.stats.units,eventObservations:a.stats.events,baselineSha256:sha(a.frames.join('\n')),candidateSha256:sha(b.frames.join('\n'))};report.combat.push(row);return row;
});
for(const mirror of [false,true])for(const id of ids)check('240-tick exact compact replay '+(mirror?'mirrored ':'normal ')+id,()=>{
  const code=`__exactReplay(${JSON.stringify(id)},240,${mirror})`;
  const a=before.ev(code);report.counts.replayExecutions++;report.counts.replayTicksExecuted+=240;
  const b=after.ev(code);report.counts.replayExecutions++;report.counts.replayTicksExecuted+=240;report.counts.pairedReplayExecutions++;
  sameEncoded(b,a,id+' compact replay bytes differ');report.counts.replayBytesCompared+=Buffer.byteLength(a);
  const row={id,orientation:mirror?'mirrored':'normal',ticks:240,bytes:Buffer.byteLength(a),baselineSha256:sha(a),candidateSha256:sha(b)};report.replays.push(row);return row;
});
check('No game or test input files changed during verification',()=>{
  for(const [name,file]of Object.entries({baseline:baselinePath,candidate:gamePath,harness:harnessPath,fixture:fixturePath}))equal(sha(fs.readFileSync(file)),sourceHashes[name],name+' file changed while running');
});
report.completed=new Date().toISOString();report.result=report.counts.failed?'FAIL':'PASS';
fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:report.result,report:reportPath,sha256:sourceHashes,counts:report.counts},null,2));process.exitCode=report.counts.failed?1:0;
