const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const html=fs.readFileSync('index.html','utf8'),script=html.match(/<script id="game-runtime">([\s\S]*?)<\/script>/)[1],calls=[];
const ctx=new Proxy({drawImage:(...a)=>calls.push(a),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),dummy={getContext:()=>ctx,setAttribute(){}};
const c={TextEncoder,TextDecoder,btoa,atob,document:{querySelector:()=>dummy},Math,requestAnimationFrame:()=>{},Image:class{complete=true;naturalWidth=1}};
vm.createContext(c);vm.runInContext(script,c);vm.runInContext("openSoloScreen()",c);const run=s=>vm.runInContext(s,c);
const assets=run('SPRITE_ASSETS'),effects=run('EFFECT_ASSETS'),meta=run('MONSTER_META'),fxMeta=run('EFFECT_META');
function bytes(data){return Buffer.from(data.split(',')[1],'base64')}
for(const [side,file] of [['red','gravity_units_atlas_red.png'],['blue','gravity_units_atlas.png'],['redExpansion','expansion/gravity_expansion_atlas_red.png'],['blueExpansion','expansion/gravity_expansion_atlas.png']])assert.equal(Buffer.compare(bytes(assets[side]),fs.readFileSync('assets/'+file)),0);
for(const [k,m] of Object.entries(meta))for(const side of ['red','blue'])assert.equal(Buffer.compare(bytes(assets[k+'_'+side]),fs.readFileSync('assets/monsters/'+(side==='red'?m.red_atlas:m.atlas))),0);
for(const [k,uri] of Object.entries(effects)){const b=bytes(uri),m=fxMeta[k];assert.equal(crypto.createHash('sha256').update(b).digest('hex'),m.sha256);assert.equal(Buffer.compare(b,fs.readFileSync('assets/effects/'+m.file.split('/').pop())),0)}
calls.length=0;
run(`(()=>{const prior=spriteFrame;for(const k of Object.keys(TYPES))for(const side of [0,1])for(let frame=0;frame<9;frame++){spriteFrame=()=>frame;const u={k,side,x:200,y:250,hp:TYPES[k].hp,dead:frame>=7};if(!drawSprite(u))throw Error(k+' absent')}spriteFrame=prior;
for(const kind of Object.keys(EFFECT_ASSETS))for(const m of [EFFECT_META[kind]])for(let frame=0;frame<m.frames;frame++)if(!drawEffect(kind,100,100,(frame+.1)*60/m.fps))throw Error('effect absent');
})()`);
for(const a of calls){const b=bytes(a[0].src),width=b.readUInt32BE(16),height=b.readUInt32BE(20);assert(a[1]>=0&&a[2]>=0&&a[1]+a[3]<=width&&a[2]+a[4]<=height);assert.equal(a[3],a[7]);assert.equal(a[4],a[8]);}
assert.equal(ctx.imageSmoothingEnabled,false);
console.log('PASS: 18 internal kinds x 2 teams x 9 frames; geometry bounds/native scale/nearest; 5 effects source SHA/bytes/frame bounds; no image modifications');
