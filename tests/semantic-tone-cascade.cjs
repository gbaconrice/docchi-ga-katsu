// Bounded CSS cascade/contrast analysis, not browser computed styles or pixel QA.
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),{apply,manifest}=require('../tools/integration/apply-semantic-text-colors.cjs');
const parser=fs.readFileSync('tests/comparison-color-cascade.cjs','utf8').split('const body=')[0];
new Function('require',parser+`
const colors={attack:'#ffaaa0',support:'#83e39b',defense:'#97c7ff',control:'#dab0ff',mobility:'#83dce2',summon:'#ffd095',neutral:'#eee0c3'};
function luminance(hex){return hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)}
let minimum=Infinity;for(const id of ['battleLog','battleLogHistory']){
 const host=el(id==='battleLog'?'button':'section',id==='battleLog'?'battle-log':'battle-log-history',id),container=el('span',id==='battleLog'?'battle-log-name':'','',host);
 for(const [tone,want] of Object.entries(colors)){
  const text=el('span','','',container,{'data-tone':tone});assert.equal(resolved(text,'color'),want,id+' '+tone);
  // History's 88% background composited over white is its brightest possible backing.
  for(const bg of ['#1d2c24','#2b3535']){const a=luminance(want),b=luminance(bg),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);minimum=Math.min(minimum,contrast);assert(contrast>=4.5,tone+' contrast '+contrast);}
 }
 for(const [side,want] of [['0','#9ed2ff'],['1','#ffb6ac']])assert.equal(resolved(el('span','','',container,{'data-side':side}),'color'),want,id+' actor '+side);
}
console.log('PASS 14 action-color cascade cases, 4 side-color cases, minimum '+minimum.toFixed(2)+':1 static contrast; no real browser rendering claim');
`)(require);
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
