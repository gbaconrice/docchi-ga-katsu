const fs=require('fs'),path=require('path'),assert=require('assert');
const source=path.join(__dirname,'bet-ui-smoke.cjs');
const harness=fs.readFileSync(source,'utf8').split("for(const id of ['#red'")[0];
new Function('require','assert',harness+`
const ev=s=>vm.runInContext(s,context,{timeout:120000}),before=ev('JSON.stringify(TYPES)');
const rows=JSON.parse(ev('JSON.stringify(CONTENT_ROSTER.selectable.map(k=>({k,t:TYPES[k],f:buildUnitComparisonFacts(TYPES[k])})))'));
assert.equal(rows.length,300);
for(const {k,t,f} of rows){
 assert(/^\\d+(?:\\.\\d+)?$/.test(f.attackValue),k+' attack must be numerical');
 const expected=f.attackable?(t.explosionDamage||t.burstDamage||t.dmg)*(t.bossDamageScale||1):0;
 assert.equal(Number(f.attackValue),expected,k+' source-scaled first-hit damage');
 if(!f.attackable){assert(f.actionDetail,k+' support effect is retained');assert(f.roleNote,k+' no normal attack is explicit');}
 if(t.fanCount)assert(f.actionDetail.includes('最大'+t.fanCount+'発'));
 if(t.twoHitTicks)assert.equal(f.actionDetail,'2連撃');
 if(t.comboThirdTicks&&t.comboFinalDamage){assert(f.actionDetail.includes('連撃'));assert(f.actionDetail.includes('最後'+(t.comboFinalDamage*(t.bossDamageScale||1))));}
}
const shock=rows.find(x=>x.k==='shockplate_drake'),wolf=rows.find(x=>x.k==='spirit_fan_wolf');
assert.equal(shock.f.attackValue,'72');assert.equal(shock.f.actionDetail,'衝撃・2連撃（2撃目96）');
assert.equal(wolf.f.attackValue,'7');assert.equal(wolf.f.actionDetail,'扇射・最大3発');
class E{constructor(){this.children=[];this.attrs={};this.className='';this.textContent='';this.classList={add:()=>{}};}setAttribute(k,v){this.attrs[k]=String(v);}append(...xs){this.children.push(...xs);}appendChild(x){this.children.push(x);}replaceChildren(...xs){this.children=xs;}}
context.document.createElement=()=>new E();for(const id of ['#redStats','#blueStats','#unitsRedStats','#unitsBlueStats'])nodes.set(id,new E());
ev("initialUnits=CONTENT_ROSTER.selectable.map((k,i)=>({k,side:i%2}));fillUnitStats()");
const walk=n=>[n,...n.children.flatMap(walk)],all=['#redStats','#blueStats','#unitsRedStats','#unitsBlueStats'].flatMap(id=>walk(nodes.get(id)));
const groups=all.filter(n=>n.className==='comparison-stats');assert.equal(groups.length,600);
for(const group of groups){assert.equal(group.children.length,2);assert.deepStrictEqual(group.children.map(n=>n.children[0].textContent),['HP','攻撃']);assert(group.children.every(n=>!n.className.includes('wide')));assert(/^\\d+(?:\\.\\d+)?$/.test(group.children[1].children[1].textContent));}
assert(all.some(n=>n.className==='comparison-trait comparison-action-detail'&&n.textContent==='衝撃で2連撃'));
assert(all.some(n=>n.className==='comparison-trait comparison-action-detail'&&n.attrs['data-tone']==='support'&&n.attrs['data-emphasis']==='true'));
assert.equal(ev('JSON.stringify(TYPES)'),before);
console.log('PASS all 300 numerical attack values and 600 prediction/detail cards: common HP/attack columns, separate features, support effects, source scaling and unchanged combat definitions');
`)(require,assert);
