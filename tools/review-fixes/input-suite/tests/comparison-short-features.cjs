const fs=require('fs'),path=require('path'),assert=require('assert');
const harness=fs.readFileSync(path.join(__dirname,'bet-ui-smoke.cjs'),'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')","fs.readFileSync(process.env.GAME_HTML||'index.html','utf8')");
new Function('require','assert',harness+`
const ev=s=>vm.runInContext(s,context,{timeout:120000}),before=ev('JSON.stringify(TYPES)');
const rows=JSON.parse(ev('JSON.stringify(CONTENT_ROSTER.selectable.map(k=>({k,t:TYPES[k],base:buildUnitComparisonFacts(TYPES[k]),f:buildUnitComparisonDisplayFacts(TYPES[k])})))'));
assert.equal(rows.length,300);
for(const {k,t,base,f} of rows){
 for(const key of ['hp','attackValue','movement','distance','attackable'])assert.deepStrictEqual(f[key],base[key],k+' common numeric facts preserved '+key);
 assert.equal(f.traits.length,f.traitTones.length);
 const features=[f.actionDetail,...f.traits].filter(Boolean);
 assert.equal(features.length,new Set(features).size,k+' duplicate feature');
 for(const text of features){assert(text.length<=18,k+' verbose feature: '+text);assert(!/秒|%|倍|半径|準備|再使用|耐性|最大|ダメージ[0-9]/.test(text),k+' detailed parameter leaked: '+text);assert(!/[0-9]/.test(text.replace(/[2-6]連(?:撃|射)/g,'')),k+' numeric feature: '+text);}
 assert(!f.roleNote,k+' redundant role prose omitted');
 if(!f.attackable)assert(f.actionDetail,k+' support role lost');
}
const get=k=>rows.find(r=>r.k===k).f;
assert.equal(get('shockplate_drake').attackValue,'72');assert.equal(get('shockplate_drake').actionDetail,'衝撃で2連撃');assert(get('shockplate_drake').traits.includes('後の一撃が強い'));
assert.equal(get('spirit_fan_wolf').attackValue,'7');assert.equal(get('spirit_fan_wolf').actionDetail,'扇状に射撃');
assert(rows.some(r=>r.f.traits.includes('地上の敵を足止め')));
assert(rows.some(r=>r.f.actionDetail==='周囲にダメージ'));
assert.equal(get('crimson_mender').actionDetail,'複数の味方を回復');
for(const k of ['repair_pylon','embergrille_monument','eggshell_repairpod']){assert.equal(get(k).actionDetail,'自分を修復');assert(get(k).traits.includes('直接攻撃を反射'));}
class E{constructor(){this.children=[];this.attrs={};this.className='';this.textContent='';this.classList={add:()=>{}};}setAttribute(k,v){this.attrs[k]=String(v);}append(...xs){this.children.push(...xs);}appendChild(x){this.children.push(x);}replaceChildren(...xs){this.children=xs;}}
context.document.createElement=()=>new E();for(const id of ['#redStats','#blueStats','#unitsRedStats','#unitsBlueStats'])nodes.set(id,new E());
ev("initialUnits=CONTENT_ROSTER.selectable.map((k,i)=>({k,side:i%2}));fillUnitStats()");
const walk=n=>[n,...n.children.flatMap(walk)],all=['#redStats','#blueStats','#unitsRedStats','#unitsBlueStats'].flatMap(id=>walk(nodes.get(id)));
const groups=all.filter(n=>n.className==='comparison-stats');assert.equal(groups.length,600);
for(const group of groups){assert.deepStrictEqual(group.children.map(n=>n.children[0].textContent),['HP','攻撃']);assert(/^\\d+(?:\\.\\d+)?$/.test(group.children[1].children[1].textContent));}
const visibleTraits=all.filter(n=>n.className.startsWith('comparison-trait')&&n.className!=='comparison-traits');
assert(visibleTraits.some(n=>n.textContent==='衝撃で2連撃'));assert(visibleTraits.some(n=>n.textContent==='周囲にダメージ'));
for(const n of visibleTraits){assert(n.textContent.length<=18);assert(!/秒|%|倍|半径|準備|再使用|耐性|最大/.test(n.textContent));}
assert.equal(ev('JSON.stringify(TYPES)'),before,'no combat mutations');
console.log('PASS 300 concise feature sets and 600 rendered cards: common numerical stats preserved; no timing/multiplier/radius detail; short consistent action wording, real support roles and no combat mutations');
`)(require,assert);
