const fs=require('fs'),assert=require('assert');
const harness=fs.readFileSync('tests/multiplayer-reconnect.cjs','utf8').split('for(const zeroPlayer')[0];
new Function('require','assert',harness+`
const run=s=>vm.runInContext(s,context,{timeout:60000});
const before=run('JSON.stringify(TYPES)');
const facts=JSON.parse(run('JSON.stringify(CONTENT_ROSTER.selectable.map(k=>({k,type:TYPES[k],facts:buildUnitComparisonFacts(TYPES[k])})))'));
assert.equal(facts.length,300);assert.equal(run('JSON.stringify(TYPES)'),before,'display facts do not mutate mechanics');
for(const row of facts){const t=row.type,f=row.facts;assert(f);assert(!/構え|準備|[1-6]→[1-6]段|2発目|追加弾/.test(f.timing),row.k+' timing leaked');if(t.comboStageContacts)assert.equal(f.distance,'',row.k+' per-stage contact geometry hidden');if(t.comboThirdTicks&&t.comboFinalDamage){const count=t.comboStageContacts?.length||([4,5,6].includes(t.comboContactCount)?t.comboContactCount:3);assert.equal(f.value,count+'連撃');assert.equal(f.timing,'');}else if(t.twoHitTicks){assert.equal(f.value,'2連撃');assert.equal(f.timing,'');}else if(t.highSecondTicks){assert.equal(f.value,'2連撃');assert.equal(f.timing,'');}else if(t.orbFollowTicks){assert.equal(f.value,'3連射');assert.equal(f.timing,'');}}
const reference=JSON.parse(run('JSON.stringify(comparisonStrengthReference())'));
const ordinary=r=>r.facts.attackable&&!r.facts.wide&&['攻撃','射撃'].includes(r.facts.label)&&Number.isFinite(Number(r.facts.value));
const sorted=values=>values.filter(v=>Number.isFinite(v)&&v>0).sort((a,b)=>a-b);
for(const delivery of ['melee','ranged']){const group=facts.filter(r=>ordinary(r)&&(r.type.projectile?'ranged':'melee')===delivery);assert.deepStrictEqual(reference.action[delivery],sorted(group.map(r=>Number(r.facts.value))));assert.deepStrictEqual(reference.distance[delivery],sorted(group.filter(r=>!r.type.comboStageContacts).map(r=>r.type.reach??r.type.range)));}
for(const layer of ['ground','air'])assert.deepStrictEqual(reference.movement[layer],sorted(facts.filter(r=>(r.type.collisionLayer==='air'||r.type.flying?'air':'ground')===layer).map(r=>r.type.speed)));
const emphasized=JSON.parse(run('JSON.stringify(CONTENT_ROSTER.selectable.map(k=>({k,f:buildUnitComparisonFacts(TYPES[k]),e:unitComparisonEmphasis(TYPES[k],buildUnitComparisonFacts(TYPES[k]),comparisonStrengthReference())})))'));
assert(emphasized.some(r=>r.e.metrics.length>=2),'multiple distinct high stats may be emphasized');
for(const r of emphasized)if(r.f.actionTone==='support'&&r.f.value!=='—')assert(r.e.metrics.includes('action'),'healing value itself emphasized: '+r.k);
class E{constructor(){this.children=[];this.attrs={};this.className='';this.textContent='';this.classList={add:()=>{}};}setAttribute(k,v){this.attrs[k]=String(v);}append(...xs){this.children.push(...xs);}appendChild(x){this.children.push(x);}replaceChildren(...xs){this.children=xs;}}
context.document.createElement=()=>new E();for(const id of ['#redStats','#blueStats','#unitsRedStats','#unitsBlueStats'])nodes.set(id,new E());
run("initialUnits=CONTENT_ROSTER.selectable.map((k,i)=>({k,side:i%2}));fillUnitStats()");
const walk=n=>[n,...n.children.flatMap(walk)],all=['#redStats','#blueStats','#unitsRedStats','#unitsBlueStats'].flatMap(id=>walk(nodes.get(id)));
assert(!all.some(e=>e.textContent.includes('◆')||/強み/.test(e.textContent)||e.className==='comparison-strength-mark'));
assert(all.some(e=>e.className.includes('comparison-stat')&&e.attrs['data-tone']==='support'&&e.attrs['data-emphasis']==='true'));
assert(all.filter(e=>e.className==='comparison-trait').every(e=>e.attrs['data-tone']));
assert.equal(run('JSON.stringify(TYPES)'),before,'rendering cannot change type values');
console.log('PASS all 300 facts: combo identity retained, micro-timing/geometry hidden, per-metric peer groups, multiple highlights, healing value and no redundant markers');
`)(require,assert);
const html=fs.readFileSync('index.html','utf8');assert(!html.includes('兵種')&&!html.includes('兵士'));assert(html.includes('タップで詳細確認'));assert(!html.includes('comparison-strength-mark'));assert(!html.includes("mark.textContent='◆'"));
assert(html.includes('text-shadow:none; box-shadow:none;'));
const css=html.slice(html.indexOf('/* Meaning lives in the actual value/trait text'),html.indexOf('/* Selection details stay in normal flow'));
for(const scope of ['#comparison .comparison-stat[data-emphasis="true"] .comparison-stat-value','#comparison .comparison-mobility-item[data-emphasis="true"] .comparison-mobility-value','#comparison .comparison-trait[data-tone]'])assert(css.includes(scope));
function lum(hex){return hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)}
const groups=[{from:'#comparison .comparison-list {',colors:['174e9a','a01d1a','12642c','7435a0','00626c','8b4b08','493823'],bgs:['f2dfb8','eadfca','f5e4bf']},{from:'.units-side .comparison-list {',colors:['97c7ff','ffaaa0','83e39b','dab0ff','83dce2','ffd095','eee0c3'],bgs:['1f2a24','3a4037','3b5140']}];let minimum=Infinity;
for(const g of groups){const block=css.slice(css.indexOf(g.from),css.indexOf('}',css.indexOf(g.from)));for(const fg of g.colors){assert(block.includes('#'+fg));for(const bg of g.bgs){const a=lum(fg),b=lum(bg),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);minimum=Math.min(minimum,contrast);assert(contrast>=4.5,fg+' on '+bg+' '+contrast);}}}
console.log('PASS meaning-based text colors and contrast, minimum '+minimum.toFixed(2)+':1');
// Narrow-width contract only: this does not claim browser rendering was tested.
for(const width of [280,320,350,390,430]){const outer=width-(width<=355?16:24)-8,gap=width<=350?6:8,card=(outer-gap)/2,inner=card-14-6,stat=(inner-4)/2-6;assert(inner>=105);assert(stat>=44.5);const comboWidth=3*18;assert(comboWidth<=inner,'combo text can wrap within its cell/card without fixed minimum');}
for(const required of ['grid-template-columns: repeat(2, minmax(0, 1fr))','overflow-wrap:anywhere','flex-wrap:wrap; white-space:normal','flex-direction:column; align-items:flex-start'])assert(html.includes(required));
console.log('PASS 280–430px width arithmetic, zero grid minima, wrapping names/traits/metrics (not browser pixel QA)');
