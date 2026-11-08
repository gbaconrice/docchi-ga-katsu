// GAME_HTML=candidate ENGINE_HARNESS=/absolute/path/to/harness.cjs node this-file
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ev,context,nodes}=require(path.resolve(process.env.ENGINE_HARNESS));
const rows=JSON.parse(ev(`JSON.stringify(CONTENT_ROSTER.selectable.map(id=>{const t=TYPES[id],f=buildUnitComparisonDisplayFacts(t),o=buildUnitComparisonDisplayFactsSource(t);return {id,name:t.name,boss:BossAbilities.specs.has(id),traits:[...(f.actionDetail?[{text:f.actionDetail,tone:f.actionTone}]:[]),...f.traits.map((text,i)=>({text,tone:f.traitTones[i]}))],original:[o.actionDetail,...o.traits].filter(Boolean)};}))`));
assert.equal(rows.length,300);assert.equal(rows.filter(r=>r.boss).length,49);
for(const row of rows){
 assert(row.traits.every(t=>t.text.length<=8),row.id+' compact terms');
 assert(row.traits.every(t=>!/[0-9０-９]+(?:[.．][0-9０-９]+)?秒|特徴|ダメージを|敵から敵へ/.test(t.text)),row.id+' no redundant prose/timings');
 assert.equal(new Set(row.traits.map(t=>t.text)).size,row.traits.length,row.id+' deduplicated');
}
assert(ev(`Object.values(TYPES).every(type=>{const a=buildUnitComparisonDisplayFactsSource(type),b=buildUnitComparisonDisplayFacts(type);return Object.keys(a).filter(k=>!['actionDetail','traits','traitTones'].includes(k)).every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));})`));
class E{constructor(){this.children=[];this.className='';this.attrs={};this.textContent='';this.classList={add:()=>{}};}append(...items){this.children.push(...items)}appendChild(x){this.children.push(x)}replaceChildren(...items){this.children=items}setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]??null}}
context.document.createElement=()=>new E();
for(const id of ['#unitsRedStats','#unitsBlueStats','#redStats','#blueStats'])nodes.set(id,new E());
ev(`battleEnvironment=null;initialUnits=CONTENT_ROSTER.selectable.map(k=>({k,side:0}));fillUnitStats();`);
const walk=n=>[n,...n.children.flatMap(walk)],hasClass=(n,c)=>n.className.split(' ').includes(c);
for(const selector of ['#unitsRedStats','#redStats']){
 const units=walk(nodes.get(selector)).filter(n=>hasClass(n,'comparison-unit'));assert.equal(units.length,300,selector);
 units.forEach((unit,i)=>{
  const traits=walk(unit).filter(n=>hasClass(n,'comparison-trait')).map(n=>({text:n.textContent,tone:n.attrs['data-tone']}));
  assert.deepEqual(traits,rows[i].traits,selector+' '+rows[i].id);
 });
}
const cleanse=rows.filter(r=>r.original.includes('鈍足・足止め・弱点露出を解除'));
assert(cleanse.length);for(const r of cleanse){assert(r.traits.some(t=>t.text==='鈍足・足止め解除'));assert(r.traits.some(t=>t.text==='弱点露出解除'));}
assert(rows.find(r=>r.id==='iceclaw_legend').traits.some(t=>t.text==='凍結敵から氷拡散'));
for(const [id,expected] of [['gauntlet_combo_guard',['連打衝波','押し返し']],['ringhold_guardian',['味方光輪','破壊時反発']]]){
 const row=rows.find(r=>r.id===id);for(const term of expected)assert(row.traits.some(t=>t.text===term),id+' '+term);
}
const html=fs.readFileSync(process.env.GAME_HTML,'utf8');
assert(html.includes('@media (max-width: 360px) {\n  #unitsPanel .units-dialog { padding: 6px; }\n  #unitsPanel .units-side { padding: 4px; }\n  #unitsPanel .units-grid { gap: 6px; }'));
const types=JSON.parse(ev(`JSON.stringify(Object.keys(TYPES))`));
const unique=[...new Set(rows.flatMap(r=>r.traits.map(t=>t.text)))];
assert.equal(unique.length,152);
const report={rosterCount:rows.length,bossCount:49,totalTypes:types.length,nonRosterTypes:types.filter(id=>!rows.some(r=>r.id===id)),uniqueTerms:unique.length,maxCharacters:Math.max(...unique.map(t=>t.length)),overEightCharacterTerms:unique.filter(t=>t.length>8),renderedLists:['prediction','battle detail'],checks:'PASS'};
const out=path.resolve(process.env.REPORT_DIR||__dirname);fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'trait-terms.json'),JSON.stringify(rows,null,2)+'\n');
fs.writeFileSync(path.join(out,'trait-term-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
