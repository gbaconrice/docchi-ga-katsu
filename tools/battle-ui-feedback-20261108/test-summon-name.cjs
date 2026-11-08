'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const harness=process.env.ENGINE_HARNESS||process.env.HARNESS_PATH||path.join(root,'game-recovery-20261108/restored-v22/repository/tools/boss-abilities/tests/harness.cjs');
const game=process.env.GAME_HTML||path.join(root,'battle-ui-feedback/validation/summon-name/candidate.html');
const baselineFile=process.env.BASELINE_HTML;
const reportDir=process.env.REPORT_DIR||path.join(root,'battle-ui-feedback/validation/summon-name');
function load(file){process.env.GAME_HTML=file;delete require.cache[require.resolve(harness)];return require(harness);}
const candidate=load(game),ev=candidate.ev,plain=x=>JSON.parse(JSON.stringify(x)),name='シャドウクローラー';
const report={sha:candidate.sha,checks:[]};
const check=(label,fn)=>{const detail=fn();report.checks.push({label,pass:true,...(detail===undefined?{}:{detail})});console.log('PASS '+label);};
check('registered sprite and shared display name resolve to the verified crawler',()=>{
 assert.equal(ev('TYPES.goblin.name'),name);assert.equal(ev('DISPLAY_NAMES_KANA.goblin'),name);
 assert.equal(ev('LICENSED_CLIP_SPECS.goblin.sourceUnitId'),'f4_crawler');
 assert(ev('ROLE_NOTES.wraith').includes(name));assert(ev('UNIT_DETAILS.wraith').includes(name));
 assert(!ev('ROLE_NOTES.wraith+UNIT_DETAILS.wraith').includes('小鬼'));
 const bytes=Buffer.from(ev('SPRITE_ASSETS.goblinLicensed').split(',')[1],'base64');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),ev('LICENSED_CLIP_SPECS.goblin.sourceSha256'));
});
check('all 300 display feature terms stay at most eight characters',()=>{
 const rows=plain(ev(`CONTENT_ROSTER.selectable.map(k=>{const d=buildUnitComparisonDisplayFacts(TYPES[k]);return{k,terms:[d.actionDetail,...d.traits].filter(Boolean)}})`));
 assert.equal(rows.length,300);let terms=0,max=0;for(const row of rows)for(const term of row.terms){terms++;max=Math.max(max,Array.from(term).length);assert(Array.from(term).length<=8,row.k+': '+term);}
 const detail=plain(ev('buildUnitComparisonFacts(TYPES.wraith)')),display=plain(ev('buildUnitComparisonDisplayFacts(TYPES.wraith)'));
 assert(detail.traits.some(t=>t.startsWith(name+'最大'+ev('TYPES.wraith.summonCharges')+'体')));
 assert(display.traits.includes('クローラー召喚'));assert(!JSON.stringify([detail,display]).includes('ゴブリン'));
 return {roles:rows.length,terms,max};
});
check('prediction cards, battle detail cards and live unit selector use the new name',()=>{
 const result=plain(ev(`(()=>{units=[{k:'goblin',side:0,hp:TYPES.goblin.hp,dead:false},{k:'wraith',side:1,hp:TYPES.wraith.hp,dead:false}];initialUnits=units.slice();battleEnvironment=null;const create=document.createElement;document.createElement=undefined;try{fillUnitStats();}finally{document.createElement=create;}lastTraitKinds='';updateUnitTraits();return {prediction:document.querySelector('#redStats').textContent,battle:document.querySelector('#unitsRedStats').textContent,summoner:document.querySelector('#blueStats').textContent,options:document.querySelector('#unitKind').innerHTML,trait:document.querySelector('#unitTrait').textContent}})()`));
 for(const field of ['prediction','battle','options','trait'])assert(result[field].includes(name),field);
 assert(result.summoner.includes('クローラー召喚'));assert(!JSON.stringify(result).includes('ゴブリン'));
 return result;
});
const fight=`(()=>{BossAbilities.reset();elapsed=0;state='fight';winner=null;shots=[];pendingSummons=[];combatEvents=[];battleEnvironment=null;multiPlayback=null;units=[['wraith',0,80],['shield',1,420]].map(([k,side,x],id)=>({id,token:'rename:'+id,k,side,x,y:250,hp:TYPES[k].hp,cd:0,priority:(id+1)/1000,dead:false,originForward:side?-1:1}));const initial=units.map(u=>({...u})),rec=BattleLog.createRecorder(initial);const births=[];for(let tick=1;tick<=220;tick++){const before=new Set(units.map(u=>u.token));step(1/60);for(const child of units.filter(u=>!before.has(u.token))) {births.push({tick,token:child.token,k:child.k,ownerToken:child.ownerToken});rec.capture(tick,[{type:'summon_spawn',parentToken:child.ownerToken,childToken:child.token,k:child.k}],units);}}return {births,units:units.map(u=>({token:u.token,k:u.k,side:u.side,x:u.x,y:u.y,hp:u.hp,dead:u.dead,summoned:!!u.summoned,ownerToken:u.ownerToken})),log:rec.snapshot(),sentences:rec.rows().map(r=>BattleLog.describe(r,rec.catalog).sentence)};})()`;
const candidateFight=plain(ev(fight));
check('four real summons retain goblin identity and render the new actor name in logs',()=>{
 assert.equal(candidateFight.births.length,4);assert(candidateFight.births.every(u=>u.k==='goblin'));
 assert(candidateFight.units.filter(u=>u.summoned).every(u=>u.k==='goblin'));
 assert.equal(candidateFight.sentences.length,4);assert(candidateFight.sentences.every(s=>s.includes(name)&&!s.includes('ゴブリン')));
 assert(candidateFight.log.actors.filter(a=>a[4]>0).every(a=>a[2]==='goblin'));
 return {births:candidateFight.births,sentences:candidateFight.sentences};
});
if(baselineFile){
 const baseline=load(baselineFile),be=baseline.ev;report.baselineSha=baseline.sha;
 check('only goblin display name changes in TYPES; every other stat and type is unchanged',()=>{
  const before=plain(be('TYPES')),after=plain(ev('TYPES'));assert.equal(before.goblin.name,'ゴブリン');assert.equal(after.goblin.name,name);before.goblin.name=name;assert.deepEqual(after,before);
 });
 check('roster, costs, replay roles, sprite registration and gameplay functions are unchanged',()=>{
  for(const expression of ['CONTENT_ROSTER','COST','BALANCE_COST','CompactReplay.ROLES','LICENSED_CLIP_SPECS.goblin','step.toString()','spawnPosition.toString()','BattleLog.createRecorder.toString()','BattleLog.createPlayback.toString()'])assert.deepEqual(plain(ev(expression)),plain(be(expression)),expression);
  assert.equal(ev('SPRITE_ASSETS.goblinLicensed'),be('SPRITE_ASSETS.goblinLicensed'));
 });
 check('natural summon timing, units and serialized log payload match baseline exactly',()=>{
  const before=plain(be(fight));assert.deepEqual(candidateFight.births,before.births);assert.deepEqual(candidateFight.units,before.units);assert.deepEqual(candidateFight.log,before.log);
  assert.deepEqual(candidateFight.sentences,before.sentences.map(s=>s.replaceAll('ゴブリン',name)));
 });
}
fs.mkdirSync(reportDir,{recursive:true});fs.writeFileSync(path.join(reportDir,'summon-name-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sha:report.sha,passed:report.checks.length,baselineCompared:!!baselineFile}));
