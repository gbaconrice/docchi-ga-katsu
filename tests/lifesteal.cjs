const fs=require('fs'),path=require('path'),assert=require('assert');
const game=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const harness=fs.readFileSync(path.resolve(__dirname,'reflect-cascade.cjs'),'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')",'fs.readFileSync('+JSON.stringify(game)+',"utf8")');
new Function('require','assert',harness+`
const run=(field,ratio=.25,health=50,enemyHp=1000,reflect=0)=>vm.runInContext(\`(()=>{
 const name=\${JSON.stringify(field)};let e;for(let i=0;i<10000;i++){let x=BattleFields.selectRunEnvironment(i);if(x.fieldId===name){e=x;break}}if(!e)throw Error('field unavailable');battleEnvironment=e;
 TYPES.willyee_ghoul.lifestealRatio=\${ratio};TYPES.shield.hp=1000;TYPES.shield.dmg=0;TYPES.shield.reflectionRatio=\${reflect};
 elapsed=0;state='fight';winner=null;combatEvents=[];pendingSummons=[];
 units=[{id:'a',token:'a',k:'willyee_ghoul',side:0,x:220,y:200,hp:\${health},cd:0,priority:.1,dead:false,originForward:1},{id:'b',token:'b',k:'shield',side:1,x:240,y:200,hp:\${enemyHp},cd:0,priority:.2,dead:false,originForward:-1}];
 const found=[];for(let i=0;i<120;i++){step(1/60);found.push(...combatEvents.filter(e=>e.type==='healing_pulse').map(e=>e.totalAmount));}
 return {hp:units[0].hp,enemy:units[1].hp,events:found,traits:buildUnitComparisonFacts(TYPES.willyee_ghoul).traits};
})()\`,context);
const g=run('grassland'),d=run('desert'),none=run('grassland',0),capped=run('grassland',.25,118),overkill=run('grassland',.25,50,1),reflect=run('grassland',.25,50,1000,1);
assert(g.hp>none.hp);assert(Math.abs((d.hp-50)/(g.hp-50)-.92)<1e-8,JSON.stringify({g,d}));assert(capped.hp<=118);assert(overkill.hp<=50.25+1e-8);assert(reflect.hp<g.hp);assert(g.events.length>0);assert(g.traits.some(x=>x.includes('25%')));assert.deepStrictEqual(JSON.parse(JSON.stringify(g)),JSON.parse(JSON.stringify(run('grassland'))));
console.log('PASS lifesteal actual hit, desert reduction, HP cap, overkill, reflection, event and deterministic replay',JSON.stringify({g,d,none,capped,overkill,reflect}));
`)(require,assert);
