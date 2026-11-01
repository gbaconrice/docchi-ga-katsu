const fs=require('fs'),vm=require('vm'),assert=require('assert');const h=fs.readFileSync(process.argv[2]||'index.html','utf8');const nodes={};for(const m of h.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)){const id=m[2].match(/id="([^"]+)"/);if(id)nodes['#'+id[1]]={hidden:/\bhidden\b/.test(m[2]),disabled:/\bdisabled\b/.test(m[2]),attrs:{},setAttribute(k,v){this.attrs[k]=v}}}let raf=[],images=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(const id of ['#field','#armyPreviewRed','#armyPreviewBlue'])nodes[id].getContext=()=>ctx;const c={console,TextEncoder,TextDecoder,btoa,atob,URLSearchParams,location:{search:''},document:{getElementById:id=>nodes['#'+id]||null,querySelector:s=>s==='canvas'?nodes['#field']:nodes[s]||null},requestAnimationFrame:f=>raf.push(f),Image:class{constructor(){this.complete=true;this.naturalWidth=1000;images.push(this)}}};c.window=c;const listeners={};c.addEventListener=(type,fn)=>{listeners[type]=fn};if(process.env.NO_ENCODER)c.TextEncoder=undefined;vm.createContext(c);for(const [i,m] of [...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){new vm.Script(m[1],{filename:'inline-'+i}).runInContext(c)};if(nodes['#bootStatus']&&!nodes['#bootStatus'].hidden)throw Error('boot monitor not cleared');
const run=s=>vm.runInContext(s,c);let now=0;
function frame(n=1){for(let i=0;i<n;i++){now+=100;const q=raf;raf=[];for(const f of q)f(now)}}
function click(id){assert(nodes[id],id);assert(!nodes[id].disabled,id+' disabled');assert.equal(typeof nodes[id].onclick,'function',id+' missing handler');nodes[id].onclick()}





click('#soloStart');
assert.equal(run('SHIELD_CLIP_REGISTRY.frames.length'),59);
run(`units=[{id:1,token:'shield',k:'shield',side:0,x:200,y:250,hp:TYPES.shield.hp,cd:0,dead:false,originForward:1},{id:2,token:'sword',k:'sword',side:1,x:220,y:250,hp:TYPES.sword.hp,cd:0,dead:false,originForward:-1}];initialUnits=JSON.parse(JSON.stringify(units));state='fight';elapsed=0;visualTime=0;visualUnits=new WeakMap();pendingSummons=[];shots=[];`);
run('spriteStep(1/60)');
assert.equal(run(`combatEvents.some(e=>e.type==='resolved_hit'&&e.sourceToken==='shield')`),true);
assert.equal(run('SHIELD_CLIP_REGISTRY.frames[spriteFrame(units[0])].local'),8);
run('visualTime+=.084');assert.equal(run('SHIELD_CLIP_REGISTRY.frames[spriteFrame(units[0])].local'),9);
run('units[0].dead=true;visualFor(units[0]).death=visualTime');assert.equal(run('SHIELD_CLIP_REGISTRY.frames[spriteFrame(units[0])].clip'),'death');
run('visualTime+=.9');assert.equal(run('SHIELD_CLIP_REGISTRY.frames[spriteFrame(units[0])].local'),10);
run(`units[0].dead=false;visualUnits=new WeakMap();units[0].cd=10;visualFor(units[0]).attack=visualTime;`);
assert.equal(run('SHIELD_CLIP_REGISTRY.frames[spriteFrame(units[0])].clip'),'idle','CD-only increase must not fake shield attack');
const calls=[];ctx.drawImage=(...a)=>calls.push(a);run('state="choose";drawArmyPreviews();drawSprite(units[0]);');
assert(calls.some(a=>a[0]===run('spriteImages.shieldLicensed')&&a[3]===80&&a[4]===80));
assert.equal(run('BASE_VISUAL_META.shield.visual_insets.join(",")'),'19,42,33,5');
const worldBefore=run('JSON.stringify({units,shots,elapsed,seed})');run('draw();drawArmyPreviews()');assert.equal(run('JSON.stringify({units,shots,elapsed,seed})'),worldBefore);
console.log('PASS fullclip actual contact8/death11frames/CD-only no attack/cards+field source80rect/render pure');
run(`units[0].dead=true;visualFor(units[0]).death=visualTime;state='result';`);
const beforeTail=run('JSON.stringify({units,shots,elapsed,seed,visualTime,walletState})');
run(`const testTail=buildShieldPresentationTail(units);if(testTail.durationTicks!==55)throw Error('tail-duration');updateResultClipTail('test-tail',0);updateResultClipTail('test-tail',913);`);
assert.equal(run('SHIELD_CLIP_REGISTRY.frames[spriteFrame(units[0])].local'),10);
assert.equal(run('JSON.stringify({units,shots,elapsed,seed,visualTime,walletState})'),beforeTail);
run(`const rec=CompactReplay.createCompactRecorder();rec.capture(0,{units,shots:[],frameFor:baseSpriteFrame});const rr=rec.finish({ticks:0,winner:'B',presentationTail:buildShieldPresentationTail(units)});const pp=CompactReplay.createPlayback(rr);const final=pp.atPresentationTail(55);if(final.units.find(u=>u.id===1).pose!==SHIELD_CLIP_REGISTRY.clips.death.frames[10].index)throw Error('canonical-tail');if(rr.ticks!==0||rr.winner!=='B')throw Error('tail-mutated-combat');`);
console.log('PASS host-recorded result tail completes death without simulation/time/ledger changes');
for(const [kind,frameIndex,eventName] of [['reaper_mantis',5,'resolved_hit'],['archer',20,'projectile_release'],['healer',7,'heal']]){
 run(`multiPlayback=null;multiSession=null;state='fight';elapsed=0;visualTime=0;visualUnits=new WeakMap();resultClipFrames=new Map();shots=[];pendingSummons=[];units=[{id:1,token:'source',k:'${kind}',side:0,x:200,y:250,hp:TYPES['${kind}'].hp,cd:0,dead:false,priority:.3,originForward:1},{id:2,token:'target',k:'sword',side:1,x:220,y:250,hp:TYPES.sword.hp,cd:1,dead:false,priority:.4,originForward:-1}];if('${kind}'==='healer')units.push({id:3,token:'ally',k:'shield',side:0,x:210,y:270,hp:10,cd:1,dead:false,priority:.5,originForward:1});spriteStep(1/60);`);
 assert.equal(run(`combatEvents.some(e=>e.type==='${eventName}'&&e.sourceToken==='source')`),true,kind+' actual event');
 assert.equal(run(`LICENSED_CLIP_REGISTRIES['${kind}'].frames[spriteFrame(units[0])].local`),frameIndex,kind+' contact/release/cast');
 assert.equal(run(`TYPES['${kind}'].collisionLayer`),'ground');
}
assert.equal(run('Object.values(LICENSED_CLIP_REGISTRIES).reduce((n,r)=>n+r.frames.length,0)'),263);
console.log('PASS four licensed roles: actual melee/release/heal frames8/5/20/7,263 runtime frames, air mechanics unchanged');
