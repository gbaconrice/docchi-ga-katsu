'use strict';
// Standalone, read-only VM test. It does not write canonical sources or change their tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const requiredPath=name=>{if(!process.env[name])throw Error(name+' must point to an existing local input');return path.resolve(process.env[name]);};
const repo=requiredPath('GAME_REPOSITORY'),beforePath=requiredPath('BASELINE_HTML'),afterPath=requiredPath('GAME_HTML');
const harnessPath=path.join(repo,'tools/boss-abilities/tests/harness.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const beforeHTML=fs.readFileSync(beforePath,'utf8'),afterHTML=fs.readFileSync(afterPath,'utf8');
const report={baselineSha256:hash(beforeHTML),candidateSha256:hash(afterHTML),checks:[],limits:['VM DOM/image mocks; no browser screenshot or actual network timing verification.','Existing startPrediction behavior intentionally remains unchanged: pending images do not block prediction.','assetCanStart remains unused by startPrediction; this test does not claim it gates play.']};
function check(name,fn){try{const detail=fn();report.checks.push({name,pass:true,...(detail===undefined?{}:{detail})});console.log('PASS',name);}catch(error){report.checks.push({name,pass:false,error:error.stack});console.error('FAIL',name,error.message);}}
function load(file){const text=fs.readFileSync(harnessPath,'utf8').replace('module.exports={','module.exports={pendingImages,');const mod={exports:{}};const old=process.env.GAME_HTML;process.env.GAME_HTML=file;try{new Function('require','module','__dirname',text)(createRequire(harnessPath),mod,path.dirname(harnessPath));}finally{if(old===undefined)delete process.env.GAME_HTML;else process.env.GAME_HTML=old;}return mod.exports;}
const before=load(beforePath),after=load(afterPath),json=(game,expression)=>JSON.parse(game.ev('JSON.stringify('+expression+')'));
const protectedFiles=[harnessPath];
const protectedHashes=Object.fromEntries(protectedFiles.map(p=>[p,hash(fs.readFileSync(p))]));
report.baselineAttackLabels=json(before,"CONTENT_ROSTER.selectable.reduce((out,k)=>{const label=buildUnitComparisonDisplayFacts(TYPES[k]).attackLabel||'攻撃';out[label]=(out[label]||0)+1;return out;},{})");
const replaced=new Set(['gauntlet_combo_guard','kilnback_pincerbeast','razorclaw_reaver']);
const approved=`slime thornback_beast roarfang_beast spectral_scale_dragon iceclaw_legend accretion_burstcore gauntlet_combo_guard emberwing_drake skullflare_triad rootwarden_treant frosthorn_rhino pillar_hammerer flamering_magus domeback_colossus ringhold_guardian silverarm_vanguard fiery_coil_inceptor colossal_hornfist kilnback_pincerbeast golem shockplate_drake thunderhorn_beast carapace_slashbeast bonefan_reaper moonclaw_werewolf stormhorn_tripler stonepulse_kolossus darkfan_clawlord plated_dualdragon flameburst_mythron willyee_frost_dragon willyee_stone_golem basalt_titan frostbreath_lizard triad_chimera bluefist_colossus cinder_tailbeast emberfist_pillarer spikeburst_grinder veteran_flamewing redhorn_dualbeast cyanrise_silithar razorclaw_reaver cleaver_brute ringneck_prowler bluehorn_invoker bone_crown_lich spore_toad siege_crab`.split(' ');
check('source contains no alternate attack label or routine loading announcement',()=>{
 assert(!afterHTML.includes('基準威力'));
 assert(!/対戦画像を読み込み中です|画像を読み込み中です/.test(afterHTML));
 assert(afterHTML.includes("addStat('攻撃', facts.attackValue"));
});
check('300 selectable types and 49 ability descriptions, preserving46 and the approved3 replacements',()=>{
 assert.equal(after.ev('CONTENT_ROSTER.selectable.length'),300);
 assert.deepEqual(json(after,'Object.keys(BOSS_SHORT_COPY).sort()'),approved.slice().sort());
 for(const expression of ['TYPES','CONTENT_ROSTER','COST','LICENSED_CLIP_SPECS','LICENSED_CLIP_REGISTRIES','MULTISOURCE_ROLE_IMAGES'])assert.equal(after.ev('JSON.stringify('+expression+')'),before.ev('JSON.stringify('+expression+')'),expression);
 for(const id of approved.filter(k=>!replaced.has(k))){for(const expression of ['BOSS_SHORT_COPY['+JSON.stringify(id)+']','BossAbilities.spec('+JSON.stringify(id)+')'])assert.equal(after.ev('JSON.stringify('+expression+')'),before.ev('JSON.stringify('+expression+')'),expression);}
 // Embedded art is very large; compare hashes rather than repeating it in a report.
 assert.equal(hash(after.ev('JSON.stringify(SPRITE_ASSETS)')),hash(before.ev('JSON.stringify(SPRITE_ASSETS)')));
 return {selectable:300,newAbilities:49};
});
check('all300 fact and display entries use attack plus numeric value; ability descriptions stay separate',()=>{
 const expression='CONTENT_ROSTER.selectable.map(k=>({k,f:buildUnitComparisonFacts(TYPES[k]),d:buildUnitComparisonDisplayFacts(TYPES[k])}))';
 const old=json(before,expression),now=json(after,expression);let abilities=0;
 for(let i=0;i<now.length;i++){
  const {k,f,d}=now[i];
  for(const facts of [f,d]){
   assert.equal(facts.attackLabel||'攻撃','攻撃',k);
   assert.match(facts.attackValue,/^[0-9]+(?:[.][0-9]+)?$/,k);
   assert(!/大型|基準威力/.test((facts.attackLabel||'')+' '+facts.attackAriaLabel),k);
  }
  for(const key of ['f','d']){
   const x={...old[i][key]},y={...now[i][key]};
   delete x.attackLabel;delete y.attackLabel;delete x.attackAriaLabel;delete y.attackAriaLabel;
   if(!replaced.has(k))assert.deepEqual(y,x,k+' '+key+' preserves values, traits, timing and descriptions');
  }
  if(approved.includes(k)){
   abilities++;assert.equal(d.actionDetail,after.ev('BOSS_SHORT_COPY['+JSON.stringify(k)+']'));
   assert(d.actionDetail.length>0&&d.actionDetail.length<=18,k);
   assert.notEqual(d.actionDetail,d.attackValue,k);
   assert.equal(f.actionDetail,after.ev('BossAbilities.spec('+JSON.stringify(k)+').description'));
   assert.equal(d.traits[0],f.ability);
  }
 }
 assert.equal(abilities,49);return {facts:300,displayFacts:300,abilityDescriptions:49};
});
class E{constructor(){this.children=[];this.attrs={};this.className='';this.textContent='';this.classList={add:()=>{}};}setAttribute(k,v){this.attrs[k]=String(v);}append(...x){this.children.push(...x);}appendChild(x){this.children.push(x);}replaceChildren(...x){this.children=x;}}
const targets=['#redStats','#blueStats','#unitsRedStats','#unitsBlueStats'];
check('all300 cards render in both prediction/detail views and both armies (1200 rows)',()=>{
 const create=after.context.document.createElement;after.context.document.createElement=()=>new E();
 try{
  for(const id of targets)after.nodes.set(id,new E());
  after.ev('initialUnits=CONTENT_ROSTER.selectable.flatMap(k=>[{k,side:0},{k,side:1}]);fillUnitStats()');
  const walk=n=>[n,...n.children.flatMap(walk)];let total=0,abilityDetails=0;
  for(const id of targets){
   const all=walk(after.nodes.get(id)),groups=all.filter(n=>n.className==='comparison-stats');assert.equal(groups.length,300,id);
   for(const group of groups){
    assert.equal(group.children.length,2);assert.equal(group.children[0].children[0].textContent,'HP');
    const stat=group.children[1];assert.equal(stat.children[0].textContent,'攻撃');
    assert.equal(stat.children[0].attrs['aria-label'],'攻撃 / 1体');
    assert.match(stat.children[1].textContent,/^[0-9]+(?:[.][0-9]+)?$/);
    assert(!/基準威力|大型/.test(stat.children[1].attrs['aria-label']));
   }
   const copy=new Set(json(after,'Object.values(BOSS_SHORT_COPY)'));
   const details=all.filter(n=>n.className==='comparison-trait comparison-action-detail');
   assert.equal(details.filter(n=>copy.has(n.textContent)).length,49,id);
   abilityDetails+=49;total+=groups.length;
  }
  return {rows:total,abilityDescriptionRows:abilityDetails};
 }finally{after.context.document.createElement=create;}
});
check('text-only fallback uses same300 numeric attack values in every view',()=>{
 const create=after.context.document.createElement;after.context.document.createElement=undefined;
 try{
  for(const id of targets)after.nodes.set(id,new E());after.ev('fillUnitStats()');
  for(const id of targets){const text=after.nodes.get(id).textContent;assert.equal((text.match(/HP [0-9.]+ · 攻撃 [0-9.]+/g)||[]).length,300,id);assert(!/基準威力/.test(text));}
  return {rows:1200};
 }finally{after.context.document.createElement=create;}
});
check('mechanics, image work, readiness helper, retry, start and notice markup are unchanged',()=>{
 const functions=['combatStep','step','startPrediction','assetProgress','assetCanStart','retryImageAssets','beginLicensedOpening','retainLicensedSpawnRoles','retainLicensedReplay','endLicensedAssets','legacyImage','licensedImageForFrame','preloadLegacySpawns'];
 for(const fn of functions){let expected=before.ev(fn+'.toString()');if(fn==='step')expected=expected.replace('  for(const u of units){const flags=CompactReplay.fourSpeciesPresentationFlags','  for(const u of units)if(BOSS_REPLACEMENT_ROLES.has(u.k))bossReplacementFrame(u);\n  for(const u of units){const flags=CompactReplay.fourSpeciesPresentationFlags');assert.equal(after.ev(fn+'.toString()'),expected,fn);}
 // Integrated UI/VFX fixes may change layout CSS; this copy check only protects notice markup.
 assert.deepEqual(afterHTML.match(/<div id="assetNotice(?:Choose|Battle)"[^\n]*/g),beforeHTML.match(/<div id="assetNotice(?:Choose|Battle)"[^\n]*/g));
 return {unchangedFunctions:functions.length};
});
check('all pending/success/failure/slow/optional UI states preserve data and keep genuine failures visible',()=>{
 after.ev("licensedAssetEpoch='copy-state-fixture';globalThis.savedAssetProgress=assetProgress;assetBypass=false;");
 try{
  const states=[
   {pending:2,failed:0,optionalFailed:0,late:false,notice:false,text:''},
   {pending:0,failed:0,optionalFailed:0,late:false,notice:false,text:''},
   {pending:2,failed:1,optionalFailed:0,late:false,notice:true,text:'一部の画像を読み込めません。名前などの代替表示で続行できます。'},
   {pending:2,failed:0,optionalFailed:0,late:true,notice:true,text:'画像の読み込みに時間がかかっています。代替表示で続行できます。'},
   {pending:0,failed:0,optionalFailed:1,late:false,notice:true,text:'一部の演出画像を代替表示しています。'},
   {pending:2,failed:0,optionalFailed:1,late:false,notice:true,text:'一部の演出画像を代替表示しています。'}
  ];let cases=0;
  for(const multi of [false,true])for(const fixture of states){
   const data=Object.fromEntries(['pending','failed','optionalFailed','late'].map(k=>[k,fixture[k]]));
   after.context.copyAssetState=Object.freeze(data);
   after.ev('assetProgress=()=>copyAssetState;multiSession='+(multi?'{}':'null')+';assetRefreshUI()');
   assert.deepEqual(json(after,'assetProgress()'),data);
   for(const view of ['Choose','Battle']){
    assert.equal(after.nodes.get('#assetNotice'+view).hidden,!fixture.notice);
    assert.equal(after.nodes.get('#assetText'+view).textContent,fixture.text);
    assert.equal(after.nodes.get('#assetRetry'+view).hidden,!fixture.notice);
    assert.equal(after.nodes.get('#assetContinue'+view).hidden,!(fixture.failed||fixture.late)||view!=='Choose'||multi);
   }
   assert.equal(after.ev('assetCanStart()'),!data.pending&&!data.failed);
   cases++;
  }
  // Returning to pending after a warning removes the stale warning immediately.
  after.context.copyAssetState={pending:1,failed:0,optionalFailed:0,late:false};after.ev('assetRefreshUI()');
  for(const view of ['Choose','Battle'])assert.equal(after.nodes.get('#assetText'+view).textContent,'');
  return {cases};
 }finally{after.ev('assetProgress=savedAssetProgress;delete globalThis.savedAssetProgress;multiSession=null;licensedAssetEpoch=null;');}
});
check('real pending image work stays silent and startPrediction outcome is unchanged',()=>{
 const results=[];
 for(const game of [before,after]){
  game.nodes.get('#soloStart').onclick({isTrusted:true});
  const progress=json(game,'assetProgress()');assert(progress.pending>0);
  const count=game.pendingImages.length;
  game.ev('assetRefreshUI()');assert.deepEqual(json(game,'assetProgress()'),progress);assert.equal(game.pendingImages.length,count);
  if(game===after)for(const view of ['Choose','Battle']){assert.equal(game.nodes.get('#assetNotice'+view).hidden,true);assert.equal(game.nodes.get('#assetText'+view).textContent,'');}
  assert.equal(game.ev('assetCanStart()'),false,'existing helper returns false but is not a start gate');
  game.nodes.get('#red').onclick({isTrusted:true});game.nodes.get('#confirm').onclick({isTrusted:true});
  results.push(json(game,'({state,screenMode,choice})'));
 }
 assert.deepEqual(results[1],results[0]);assert.equal(results[1].state,'fight');return results[1];
});
check('actual failed-image callbacks show warning and retry creates replacements without interrupting battle',()=>{
 let failures=0;for(const image of [...after.pendingImages])if(typeof image.onerror==='function'){image.onerror(new Error('deliberate fixture failure'));failures++;}
 assert(failures>0);after.ev('assetRefreshUI()');
 assert.equal(after.nodes.get('#assetNoticeBattle').hidden,false);assert.equal(after.nodes.get('#assetRetryBattle').hidden,false);
 assert.match(after.nodes.get('#assetTextBattle').textContent,/読み込めません|代替表示/);
 const prior=after.pendingImages.length;after.nodes.get('#assetRetryBattle').onclick({isTrusted:true});
 assert(after.pendingImages.length>prior);assert.equal(after.ev('state'),'fight');
 assert(after.ev('assetProgress().pending')>0);return {failedCallbacks:failures,replacementImages:after.pendingImages.length-prior};
});
check('exact baseline/candidate inputs and shared harness remain unchanged',()=>{
 assert.equal(hash(fs.readFileSync(beforePath)),report.baselineSha256);
 assert.equal(hash(fs.readFileSync(afterPath)),report.candidateSha256);
 for(const [file,digest] of Object.entries(protectedHashes))assert.equal(hash(fs.readFileSync(file)),digest,file);
 return {baselineSha256:report.baselineSha256,candidateSha256:report.candidateSha256};
});
report.passed=report.checks.filter(x=>x.pass).length;report.failed=report.checks.filter(x=>!x.pass).length;
console.log('REPORT_JSON '+JSON.stringify(report));process.exitCode=report.failed?1:0;
