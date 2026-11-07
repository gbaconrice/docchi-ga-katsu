// Demand-loading release variant: original canonical test is preserved.
const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split('for(const zeroPlayer')[0];
const source=fs.readFileSync('index.html','utf8'),edits=require('../tools/integration/semantic-text-colors.edits.json').edits.map(e=>({...e,before:e.before.replaceAll('Object.hasOwn(', 'Object.prototype.hasOwnProperty.call('),after:e.after.replaceAll('Object.hasOwn(', 'Object.prototype.hasOwnProperty.call(')}));
// Reviewed current log semantics survive semantic-color rollback/reapply.
// Adapt exactly one historical anchor in memory; preserve the original manifest on disk.
function adaptMeaningLogAnchor(edits){
 const entries=edits.filter(e=>e.name==='color non-actor action fragments');assert.equal(entries.length,1,'one reviewed log fragment anchor');
 const entry=entries[0],old='const template=spec.text;',current='let template=spec.text;'+"\n  if(row.type==='resolved_hit'&&d.delivery){const attacks={melee:'近接攻撃',projectile:'飛び道具',poison:'毒',counter:'反撃',counter_projectile:'反撃弾',death_explosion:'死亡時爆発',area:'範囲攻撃',cone:'範囲攻撃',cleave:'薙ぎ払い',direct:'攻撃'};args.attackName=Object.prototype.hasOwnProperty.call(attacks,d.delivery)?attacks[d.delivery]:'攻撃';template='{source} → {target}：{attackName}で{amount}ダメージ';}\n  if(['resolved_hit','heal'].includes(row.type)&&Number.isFinite(d.hpAfter)&&Number.isFinite(d.hpMax))template+='（HP {hpAfter}/{hpMax}）';\n  if(row.type==='retreat_start')template='{source}が攻撃後に後退';\n  if(row.type==='unit_defeated')template=d.reason==='self-destruct'?'{target}が自爆で戦闘不能':'{target}が戦闘不能';\n  if(row.type==='battle_finished'&&Number.isInteger(d.leftAlive)&&Number.isInteger(d.rightAlive)){args.resultReason=d.reason==='time-limit'?'60秒で時間切れ':d.leftAlive===0&&d.rightAlive===0?'両軍が全滅':d.rightAlive===0?'右が全滅':'左が全滅';template='戦闘終了：{status}。{resultReason}（残存 青{leftAlive}体・赤{rightAlive}体）';}";
 for(const key of ['before','after']){assert.equal(entry[key].split(old).length-1,1,'one historical template anchor in '+key);entry[key]=entry[key].replace(old,current.replace('let template=spec.text;',require('./fixtures/readability-template.json')));}
}
adaptMeaningLogAnchor(edits);
// Current readable outcome labels, with exact historical anchors preserved on disk.
for(const e of edits){for(const k of ['before','after'])e[k]=e[k].replace("'normal-priority':'通常攻撃へ切替'","'normal-priority':'通常攻撃に切り替えた'").replace("'ineligible':'復活対象外','no-space':'出現場所なし','battle-ended':'戦闘終了'","'ineligible':'復活させられない','no-space':'出現できる場所がない','battle-ended':'戦闘が終わった'");}

// Current color policy renders only named armies, effective recovery and the winner.
// Keep strict installer checks by adapting its one obsolete blanket-color renderer anchor.
{const entries=edits.filter(e=>e.name==='render action tone in summary and history');assert.equal(entries.length,1);assert.equal(entries[0].after,"if(part.side===0||part.side===1)span.setAttribute('data-side',String(part.side));else if(part.tone)span.setAttribute('data-tone',part.tone);return span;});node.replaceChildren(...children);}");entries[0].after="if(part.side===0||part.side===1)span.setAttribute('data-side',String(part.side));else if(part.logEmphasis==='recovery')span.setAttribute('data-log-emphasis','recovery');else if(part.logWinnerSide===0||part.logWinnerSide===1)span.setAttribute('data-log-winner',String(part.logWinnerSide));return span;});node.replaceChildren(...children);}";}
let original=source;for(const e of edits.slice().reverse()){assert(original.includes(e.after),e.name);original=original.replace(e.after,e.before);}
const start=original.indexOf('function buildUnitComparisonFacts(type) {'),end=original.indexOf('\n// Presentation-only comparisons:',start);
const baseline=original.slice(start,end).replace('function buildUnitComparisonFacts(','function baselineUnitComparisonFacts(');
new Function('require','assert','baseline',h+`
const run=s=>vm.runInContext(s,context,{timeout:120000});run(baseline);
const before=run('JSON.stringify(TYPES)');
const all=JSON.parse(run('JSON.stringify(CONTENT_ROSTER.selectable.map(k=>({k,type:TYPES[k],before:baselineUnitComparisonFacts(TYPES[k]),after:buildUnitComparisonFacts(TYPES[k])})))'));
assert.equal(all.length,300);
const air=all.filter(r=>r.type.targetPriority==='air');assert.deepStrictEqual(air.map(r=>r.k).sort(),['sky_harpooner','wingblade_duelist']);
for(const row of all){
 if(row.type.targetPriority!=='air'){assert.deepStrictEqual(row.after,row.before,row.k+' non-priority facts unchanged');continue;}
 const f=row.after,index=f.traits.findIndex(x=>x.includes('飛行を優先'));
 assert(index>=0,row.k+' flying priority must be visible before trait truncation');assert.equal(f.traitTones[index],'mobility');
 assert(row.type.attackTargetMask.includes('air'));assert(row.type.attackTargetMask.includes('ground'));assert(f.traits.length<=3);
 for(const key of Object.keys(f).filter(k=>!['traits','traitTones'].includes(k)))assert.deepStrictEqual(f[key],row.before[key],row.k+' '+key);
 if(row.type.airDamageMultiplier)assert(f.traits[index].includes('飛行に'+row.type.airDamageMultiplier+'倍'));
 if(row.k==='wingblade_duelist'){assert(f.traits.includes('飛行'));assert(f.traits.includes('追撃は中断あり'));assert.equal(f.value,'2連撃');}
}
assert.equal(run('JSON.stringify(TYPES)'),before);
console.log('PASS all 300 facts: only two real air-priority descriptions change; numerical values, action tones and 298 other descriptions preserved');
for(const kind of ['sky_harpooner','wingblade_duelist'])for(const side of [0,1])for(const withAir of [true,false]){
 const result=JSON.parse(run('JSON.stringify((()=>{battleEnvironment=null;elapsed=0;state="fight";winner=null;combatEvents=[];pendingSummons=[];shots=[];const k='+JSON.stringify(kind)+',side='+side+',direction=side?-1:1;const make=(token,k,otherSide,x,cd)=>({id:token,token,k,side:otherSide,x,y:200,hp:TYPES[k].hp,cd,priority:token==="actor"?.1:token==="ground"?.2:.3,dead:false,originForward:otherSide?-1:1});units=[make("actor",k,side,200,0),make("ground","sword",1-side,200+direction*(TYPES[k].radius+TYPES.sword.radius+1),999)];if('+withAir+')units.push(make("air","drake",1-side,200+direction*(TYPES[k].radius+TYPES.drake.radius+4),999));step(1/60);return combatEvents.filter(e=>e.sourceToken==="actor"&&e.targetToken).map(e=>({type:e.type,target:e.targetToken}));})())'));
 assert(result.length,kind+' no targeting event');assert(result.some(e=>e.target===(withAir?'air':'ground')),JSON.stringify({kind,side,withAir,result}));assert(!result.some(e=>e.target!==(withAir?'air':'ground')),JSON.stringify(result));
}
assert.equal(run('JSON.stringify(TYPES)'),before,'priority verification leaves definitions unchanged');
console.log('PASS both characters on both sides select a flying enemy over nearer ground and fall back to ground when no flying enemy exists (8 real combat cases)');
`)(require,assert,baseline);
