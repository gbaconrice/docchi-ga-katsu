const fs=require('fs'),vm=require('vm'),assert=require('assert');const script=fs.readFileSync('index.html','utf8').match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1];
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),d={getContext:()=>ctx,setAttribute(){}},c={TextEncoder,TextDecoder,btoa,atob,Math,document:{querySelector:()=>d},requestAnimationFrame:()=>{}};
vm.createContext(c);vm.runInContext(script,c);vm.runInContext("openSoloScreen()",c);const run=s=>vm.runInContext(s,c);
run(`function fixture(k,target='sword',distance=30){setup(1);units=[{id:0,k,side:0,x:100,y:150,hp:TYPES[k].hp,cd:0,priority:.1,dead:false},{id:100,k:target,side:1,x:100+distance,y:150,hp:TYPES[target].hp,cd:10,priority:.2,dead:false}];state='fight';}
fixture('golem');spriteStep(1/60);`);
assert(run("newEffects.some(e=>e.kind==='ground_slam')"));assert(run("newEffects.some(e=>e.kind==='hit_spark')"));assert.equal(run("spriteFrame(units[0])"),4);
run("fixture('cannon','shield',100);spriteStep(1/60)");
assert(run("newEffects.some(e=>e.kind==='muzzle_flash')"));assert.equal(run("shots.length"),1);
run("fixture('archer','shield',100);spriteStep(1/60)");assert.equal(run("shots[0].k"),'archer');assert(!run("newEffects.some(e=>e.kind==='muzzle_flash')"));
run("fixture('healer','drake',100);units.push({id:1,k:'sword',side:0,x:110,y:150,hp:50,cd:10,dead:false});spriteStep(1/60)");
assert(run("newEffects.some(e=>e.kind==='magic_sparkle')"));assert.equal(run("units[2].hp"),63);
run("fixture('wraith','shield',250);let spawnedCue=false;for(let i=0;i<20;i++){spriteStep(1/60);if(newEffects.some(e=>e.kind==='magic_sparkle'))spawnedCue=true}");
assert(run("spawnedCue"));assert(run("units.some(u=>u.summoned)"));
run("activeEffects=[];newEffects=[];consumeCombatEvents([{type:'heal',actualAmount:0,x:1,y:1}])");assert.equal(run("newEffects.length"),0);
run("for(let i=0;i<100;i++)admitEffect('hit_spark',i*20,100,1)");
assert.equal(run("activeEffects.length"),24);run("activeEffects=[];newEffects=[];lowEffects=true;for(let i=0;i<100;i++)admitEffect('hit_spark',i*20,100,1)");assert.equal(run("activeEffects.length"),12);
console.log('PASS: real resolved hit/golem contact/cannon release/heal despite air enemy/next-tick summon effects; zero-heal no cue; caps24/12; attack frame tick sync');
