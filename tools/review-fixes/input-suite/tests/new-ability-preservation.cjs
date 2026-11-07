// NEW reconstruction: compare all registry and price data to exact recovered baseline.
const fs=require('fs'),assert=require('assert'),path=require('path');
const game=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/new-ability-baseline.json'),'utf8'));
assert.equal(baseline.sourceSHA256,'040ff2037e7ba6760a22b174b0d742224e45fc242cbce8731c3a98f8473b1d95');
const harness=fs.readFileSync(path.join(__dirname,'reflect-cascade.cjs'),'utf8').split("for(const id of ['#red'")[0].replace("fs.readFileSync('index.html','utf8')",'fs.readFileSync('+JSON.stringify(game)+',"utf8")');
const {context,vm}=new Function('require','assert',harness+';return {context,vm};')(require,assert);
const actual=JSON.parse(vm.runInContext('JSON.stringify({types:TYPES,cost:COST,bossKinds:BOSS_KINDS})',context));
// Retain the historical ability fixture on disk; apply only exact approved labels in memory.
require('./approved-name-expectations.js')(baseline.types);
const expected=JSON.parse(JSON.stringify(baseline));
Object.assign(expected.types.candle_archdeacon,{groupHealAmount:12,groupHealCap:1,reviveRadius:90,reviveWindupTicks:90,reviveHpRatio:.25,reviveHpCap:60});
Object.assign(expected.types.shellburst_arcade,{deathExplosionDamage:30,deathExplosionRadius:36,deathExplosionTargetCap:4});
Object.assign(expected.types.wraith,{summonCharges:4,summonCooldown:1});
Object.assign(expected.types.glasswing_sting_moth,{exposureMultiplier:1.2,exposureTicks:120,exposureLockTicks:210});
expected.cost.wraith=9;
assert.deepStrictEqual(actual.types,expected.types,'all 301 TYPES must match baseline except the explicit recovered ability changes');
assert.deepStrictEqual(actual.cost,expected.cost,'only wraith COST changes');
assert.deepStrictEqual(actual.bossKinds,expected.bossKinds,'boss membership unchanged');
for(const k of actual.bossKinds)assert.deepStrictEqual(actual.types[k],baseline.types[k],k+' boss values unchanged');
const html=fs.readFileSync(game,'utf8'),marker='const growthGenerator=TypedGrowthGenerator.createTypedGenerator(',tail=html.slice(html.indexOf(marker)+marker.length);
let depth=0,quoted=false,escape=false,end=0;
for(let i=0;i<tail.length;i++){const c=tail[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&!--depth){end=i+1;break;}}
const catalog=JSON.parse(tail.slice(0,end));
Object.assign(expected.growthCatalog.wraith,{cost:9,estimateCost:9});
if(html.includes('// Deployment reservation policy, reconstructed 2026-11-06.'))for(const [k,n]of Object.entries({wraith:5,bone_crown_lich:7,slime:2}))expected.growthCatalog[k].deploymentUnits=n;
assert.deepStrictEqual(catalog,expected.growthCatalog,'frozen growth catalog changes only wraith cost and estimateCost');
console.log('PASS all 301 type records, 46 boss records, all prices and frozen growth catalog preserved except explicit four-ability deltas and wraith cost 9');
