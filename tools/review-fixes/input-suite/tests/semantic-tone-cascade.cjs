// Demand-loading release variant: original canonical test is preserved.
// Bounded CSS cascade/contrast analysis, not browser computed styles or pixel QA.
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),{apply,manifest}=require('../tools/integration/apply-semantic-text-colors.cjs');
const parser=fs.readFileSync('tests/comparison-color-cascade.cjs','utf8').split('const body=')[0];
new Function('require',parser+`
const colors=Object.fromEntries(['attack','support','defense','control','mobility','summon','neutral'].map(k=>[k,'#f2e7d2']));
function luminance(hex){return hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)}
let minimum=Infinity;for(const id of ['battleLog','battleLogHistory']){
 const app=el('main','','app'),game=el('section','','gameScreen',app),host=el(id==='battleLog'?'button':'section',id==='battleLog'?'battle-log':'battle-log-history',id,game),entry=id==='battleLog'?host:el('li','battle-log-entry','',host),container=el('span',id==='battleLog'?'battle-log-name':'',id==='battleLog'?'battleLogSource':'',entry);assert.equal(resolved(container,'color'),'#f2e7d2',id+' ordinary prose');
 for(const [tone,want] of Object.entries(colors)){
  const text=el('span','','',container,{'data-tone':tone});assert.equal(resolved(text,'color'),want,id+' '+tone);
  // History's 88% background composited over white is its brightest possible backing.
  for(const bg of ['#3e3225','#2b3535']){const a=luminance(want),b=luminance(bg),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);minimum=Math.min(minimum,contrast);assert(contrast>=4.5,tone+' contrast '+contrast);}
 }
 for(const [side,want] of [['0','#a9d3ff'],['1','#ffb9ac']])assert.equal(resolved(el('span','','',container,{'data-side':side}),'color'),want,id+' actor '+side);
 for(const [attrs,want]of [[{'data-log-emphasis':'recovery'},'#a0edb4'],[{'data-log-winner':'0'},'#a9d3ff'],[{'data-log-winner':'1'},'#ffb9ac']]){assert.equal(resolved(el('span','','',container,attrs),'color'),want,id+' explicit meaning');for(const bg of ['#3e3225','#2b3535']){const a=luminance(want),b=luminance(bg),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);minimum=Math.min(minimum,contrast);assert(contrast>=4.5);}}

}
console.log('PASS 14 neutral category cases, 4 actor-color and 6 recovery/winner cases, minimum '+minimum.toFixed(2)+':1 static contrast; no real browser rendering claim');
`)(require);
// Adapt historical installer anchors in memory to the shipped older-WebKit API spelling.
// Keep the installer algorithm and original on-disk manifest unchanged.
for(const e of manifest.edits){e.before=e.before.replaceAll('Object.hasOwn(', 'Object.prototype.hasOwnProperty.call(');e.after=e.after.replaceAll('Object.hasOwn(', 'Object.prototype.hasOwnProperty.call(');}
// Reviewed current log semantics survive semantic-color rollback/reapply.
// Adapt exactly one historical anchor in memory; preserve the original manifest on disk.
function adaptMeaningLogAnchor(edits){
 const entries=edits.filter(e=>e.name==='color non-actor action fragments');assert.equal(entries.length,1,'one reviewed log fragment anchor');
 const entry=entries[0],old='const template=spec.text;',current='let template=spec.text;'+"\n  if(row.type==='resolved_hit'&&d.delivery){const attacks={melee:'近接攻撃',projectile:'飛び道具',poison:'毒',counter:'反撃',counter_projectile:'反撃弾',death_explosion:'死亡時爆発',area:'範囲攻撃',cone:'範囲攻撃',cleave:'薙ぎ払い',direct:'攻撃'};args.attackName=Object.prototype.hasOwnProperty.call(attacks,d.delivery)?attacks[d.delivery]:'攻撃';template='{source} → {target}：{attackName}で{amount}ダメージ';}\n  if(['resolved_hit','heal'].includes(row.type)&&Number.isFinite(d.hpAfter)&&Number.isFinite(d.hpMax))template+='（HP {hpAfter}/{hpMax}）';\n  if(row.type==='retreat_start')template='{source}が攻撃後に後退';\n  if(row.type==='unit_defeated')template=d.reason==='self-destruct'?'{target}が自爆で戦闘不能':'{target}が戦闘不能';\n  if(row.type==='battle_finished'&&Number.isInteger(d.leftAlive)&&Number.isInteger(d.rightAlive)){args.resultReason=d.reason==='time-limit'?'60秒で時間切れ':d.leftAlive===0&&d.rightAlive===0?'両軍が全滅':d.rightAlive===0?'右が全滅':'左が全滅';template='戦闘終了：{status}。{resultReason}（残存 青{leftAlive}体・赤{rightAlive}体）';}";
 for(const key of ['before','after']){assert.equal(entry[key].split(old).length-1,1,'one historical template anchor in '+key);entry[key]=entry[key].replace(old,current.replace('let template=spec.text;',require('./fixtures/readability-template.json')));}
}
adaptMeaningLogAnchor(manifest.edits);
// Current readable outcome labels, with exact historical anchors preserved on disk.
for(const e of manifest.edits){for(const k of ['before','after'])e[k]=e[k].replace("'normal-priority':'通常攻撃へ切替'","'normal-priority':'通常攻撃に切り替えた'").replace("'ineligible':'復活対象外','no-space':'出現場所なし','battle-ended':'戦闘終了'","'ineligible':'復活させられない','no-space':'出現できる場所がない','battle-ended':'戦闘が終わった'");}

// Current color policy renders only named armies, effective recovery and the winner.
// Keep strict installer checks by adapting its one obsolete blanket-color renderer anchor.
{const entries=manifest.edits.filter(e=>e.name==='render action tone in summary and history');assert.equal(entries.length,1);assert.equal(entries[0].after,"if(part.side===0||part.side===1)span.setAttribute('data-side',String(part.side));else if(part.tone)span.setAttribute('data-tone',part.tone);return span;});node.replaceChildren(...children);}");entries[0].after="if(part.side===0||part.side===1)span.setAttribute('data-side',String(part.side));else if(part.logEmphasis==='recovery')span.setAttribute('data-log-emphasis','recovery');else if(part.logWinnerSide===0||part.logWinnerSide===1)span.setAttribute('data-log-winner',String(part.logWinnerSide));return span;});node.replaceChildren(...children);}";}
let baseline=html;for(const e of manifest.edits.slice().reverse()){assert.equal(baseline.split(e.after).length-1,1,e.name+' installed once');baseline=baseline.replace(e.after,e.before);}
const result=apply(baseline);assert.equal(result.text,html);assert(result.changes.every(x=>x.status==='applied'));
assert.equal(apply(html).text,html,'idempotent');assert(apply(html).changes.every(x=>x.status==='already-applied'));
const independent='Object.assign(BATTLE_LOG_CATALOG,{revive_start:{s:["sourceToken"],t:["targetToken"],text:"復活を準備",extra:{}}});\n';
const anchor='// Display-only event history. It never changes unit state or consumes RNG.';
const extra=apply(baseline.replace(anchor,independent+anchor)).text;assert(extra.includes(independent),'unrelated new ability catalog survives');
assert.throws(()=>apply(baseline.replace(manifest.edits[0].before,'')),/Unsafe anchor/,'fail closed when target differs');
const cssEdit=manifest.edits.find(x=>x.name==='semantic log text CSS'),newCSS=cssEdit.after.slice(0,-cssEdit.before.length);
for(const m of newCSS.matchAll(/\{([^}]*)\}/g))assert(/^\s*color:#[0-9a-f]{6};\s*$/.test(m[1]),'new CSS may change color only');
const styles=s=>[...s.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
assert.equal(styles(html.replace(newCSS,'')),styles(baseline),'all geometry, shadows and previous comparison colors exactly preserved');
const combatStart=baseline.indexOf('function combatEventSinkAvailable(){'),combatEnd=baseline.indexOf('const MULTISOURCE_CLIP_IMAGE_MAP=');
assert(combatStart>0&&combatEnd>combatStart);assert.equal(html.slice(html.indexOf('function combatEventSinkAvailable(){'),html.indexOf('const MULTISOURCE_CLIP_IMAGE_MAP=')),baseline.slice(combatStart,combatEnd),'combat/event source unchanged');
console.log('PASS anchor application, idempotence, missing-anchor refusal, independent ability insertion, unchanged combat/events and color-only CSS');
