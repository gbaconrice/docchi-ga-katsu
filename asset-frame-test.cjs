const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),script=html.match(/<script>([\s\S]*)<\/script>/)[1];
const calls=[];const ctx=new Proxy({drawImage:(...a)=>calls.push(a),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const dummy={getContext:()=>ctx};const c={TextEncoder,TextDecoder,btoa,atob,document:{querySelector:()=>dummy},Math,requestAnimationFrame:()=>{},Image:class {complete=true;naturalWidth=432}};
vm.createContext(c);vm.runInContext(script,c);
const assets=vm.runInContext('SPRITE_ASSETS',c);
for(const side of ['red','blue','redExpansion','blueExpansion']){const b=Buffer.from(assets[side].split(',')[1],'base64');const expansion=side.includes('Expansion');assert.equal(b.readUInt32BE(16),expansion?576:432);assert.equal(b.readUInt32BE(20),expansion?256:144);assert.equal(Buffer.compare(b,fs.readFileSync((expansion?'assets/expansion/gravity_expansion_atlas':'assets/gravity_units_atlas')+(side.startsWith('red')?'_red':'')+'.png')),0)}
vm.runInContext(`(()=>{
  function check(v,msg){if(!v)throw Error(msg)}
  setup(7);state='fight';units=[{id:0,side:0,k:'sword',x:100,y:100,hp:100,cd:.1,dead:false},{id:100,side:1,k:'shield',x:120,y:100,hp:170,cd:10,dead:false}];
  let u=units[0];check(spriteFrame(u)===3,'windup');u.cd=0;step(1/60);
  check(spriteFrame(u)===4,'strike same tick as damage');check(units[1].hp===153,'melee applied');
  visualTime+=.09;check(spriteFrame(u)===5,'recover');visualTime+=.2;u.cd=1;check(spriteFrame(u)===0,'idle');
  visualFor(u).moving=true;visualTime=.05;visualFor(u).attack=-Infinity;check(spriteFrame(u)===1,'walk_a');visualTime=.2;check(spriteFrame(u)===2,'walk_b');
  visualFor(u).hit=visualTime;check(spriteFrame(u)===6,'hit');u.dead=true;visualFor(u).death=visualTime;check(spriteFrame(u)===7,'fall');visualTime+=.17;check(spriteFrame(u)===8,'down');
  setup(8);state='fight';units=[{id:0,side:0,k:'archer',x:100,y:100,hp:60,cd:0,dead:false},{id:100,side:1,k:'shield',x:200,y:100,hp:170,cd:10,dead:false}];
  step(1/60);check(spriteFrame(units[0])===4&&shots.length===1,'arrow spawn same strike tick');
  for(let k of ['spear','rider','cannon','healer']){
    setup(8);state='fight';units=[{id:0,side:0,k,x:100,y:100,hp:TYPES[k].hp,cd:0,dead:false},{id:100,side:1,k:'shield',x:120,y:100,hp:170,cd:10,dead:false}];
    if(k==='healer')units.push({id:1,side:0,k:'sword',x:105,y:100,hp:50,cd:10,dead:false});
    step(1/60);check(spriteFrame(units[0])===4,k+' strike event');
    if(k==='healer')check(units[2].hp===63,'heal cast same tick');
    if(k==='cannon')check(shots.length===1,'cannon projectile same tick');
    if(k==='spear'||k==='rider')check(units[1].hp===170-TYPES[k].dmg,'melee expanded same tick');
  }
  for(let k of ['sword','shield','archer','spear','cannon','rider','healer'])for(let side of [0,1]){let u={k,side,x:100,y:100,hp:TYPES[k].hp,cd:1,dead:false};check(drawSprite(u),'atlas role');}
  check(!drawSprite({k:'unknown'}),'unknown type fallback');
})()`,c);
for(const a of calls){const expanded=a[3]===64;assert(a[1]>=0&&a[1]+a[3]<=(expanded?576:432));assert(a[2]>=0&&a[2]+a[4]<=(expanded?256:144));assert.deepEqual(a.slice(5),expanded?[-29,-53,64,64]:[-21,-41,48,48]);}
assert.equal(ctx.imageSmoothingEnabled,false);
console.log('PASS: embedded PNG bytes, dimensions, 7 roles x 2 teams, frame bounds, anchor, nearest filter, attack/hit/death/walk frames, melee/arrow event sync');
